import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { FABRIC_ROOT, MANIFEST_PATH_JSON, MANIFEST_PATH_YAML, SLICE_LIST_FIELDS, KNOWN_PLACEHOLDER_PATTERNS } from './constants.mjs';

const require = createRequire(import.meta.url);
let yamlModule = null;
try {
  yamlModule = require('js-yaml');
} catch {
  yamlModule = null;
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeTextAtomic(filePath, text) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  ensureDir(filePath);
  fs.writeFileSync(tempPath, text, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function loadYamlIfAvailable(filePath) {
  if (!yamlModule) {
    throw new Error(
      `YAML parsing unavailable for ${filePath}. Use JSON inputs (fabric.json / fabric.values.json) or install js-yaml.`,
    );
  }
  return yamlModule.load(readText(filePath));
}

function loadStructuredFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    return JSON.parse(readText(filePath));
  }
  if (ext === '.yaml' || ext === '.yml') {
    return loadYamlIfAvailable(filePath);
  }
  throw new Error(`Unsupported file type: ${filePath}`);
}

function parseEnvKeys(filePath) {
  const keys = new Set();
  if (!fs.existsSync(filePath)) {
    return keys;
  }
  const text = readText(filePath);
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx <= 0) {
      continue;
    }
    keys.add(trimmed.slice(0, idx).trim());
  }
  return keys;
}

function parseScalar(raw) {
  if (raw == null) {
    return null;
  }
  const value = String(raw).trim().replace(/\s+#.*$/, '');
  if (value === 'null' || value === '~') {
    return null;
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function indentOf(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function parseStatusBlock(text) {
  const lines = text.split('\n');
  const status = {};
  let inStatus = false;
  let statusIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!inStatus && /^status:\s*$/.test(trimmed)) {
      inStatus = true;
      statusIndent = indentOf(line);
      continue;
    }
    if (inStatus) {
      const ind = indentOf(line);
      if (ind <= statusIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
        break;
      }
      const m = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (m) {
        status[m[1]] = parseScalar(m[2]);
      }
    }
  }

  return status;
}

function parseBlockScalars(text, blockName) {
  const lines = text.split('\n');
  const out = {};
  let inBlock = false;
  let blockIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!inBlock && new RegExp(`^${blockName}:\\s*$`).test(trimmed)) {
      inBlock = true;
      blockIndent = indentOf(line);
      continue;
    }
    if (inBlock) {
      const ind = indentOf(line);
      if (ind <= blockIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
        break;
      }
      const m = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (m) {
        out[m[1]] = parseScalar(m[2]);
      }
    }
  }

  return out;
}

function parseSectionList(text, sectionName, listKey) {
  const lines = text.split('\n');
  let inSection = false;
  let sectionIndent = 0;
  let keyIndent = null;
  let inList = false;
  const values = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inSection && new RegExp(`^${sectionName}:\\s*$`).test(trimmed)) {
      inSection = true;
      sectionIndent = indentOf(line);
      continue;
    }
    if (!inSection) {
      continue;
    }
    const ind = indentOf(line);
    if (ind <= sectionIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
      break;
    }
    if (new RegExp(`^${listKey}:\\s*\\[\\s*\\]\\s*$`).test(trimmed)) {
      return [];
    }
    if (!inList) {
      if (new RegExp(`^${listKey}:\\s*$`).test(trimmed)) {
        inList = true;
        keyIndent = ind;
      }
      continue;
    }
    if (ind <= keyIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
      break;
    }
    const listMatch = trimmed.match(/^-\s*(.*)$/);
    if (listMatch) {
      values.push(parseScalar(listMatch[1]));
    }
  }

  return values;
}

function parseSliceBlockWithLists(text) {
  const lines = text.split('\n');
  const slice = {};
  let inSlice = false;
  let sliceIndent = 0;
  let currentListKey = null;
  let currentListIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!inSlice && /^slice:\s*$/.test(trimmed)) {
      inSlice = true;
      sliceIndent = indentOf(line);
      continue;
    }
    if (!inSlice) {
      continue;
    }
    const ind = indentOf(line);
    if (ind <= sliceIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
      break;
    }
    if (currentListKey && ind > currentListIndent) {
      const listMatch = trimmed.match(/^-\s*(.*)$/);
      if (listMatch) {
        slice[currentListKey].push(parseScalar(listMatch[1]));
        continue;
      }
    }
    if (currentListKey && ind <= currentListIndent) {
      currentListKey = null;
    }
    const kvMatch = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!kvMatch) {
      continue;
    }
    const key = kvMatch[1];
    const rawValue = kvMatch[2];
    if (SLICE_LIST_FIELDS.has(key)) {
      const inlineEmptyList = rawValue.trim() === '[]';
      slice[key] = inlineEmptyList ? [] : [];
      if (!inlineEmptyList) {
        currentListKey = key;
        currentListIndent = ind;
      }
      continue;
    }
    slice[key] = parseScalar(rawValue);
  }
  for (const key of SLICE_LIST_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(slice, key)) {
      slice[key] = [];
    }
  }
  return slice;
}

function parseBacklogSlices(text) {
  const lines = text.split('\n');
  const slices = [];
  let inSlices = false;
  let slicesIndent = 0;
  let current = null;
  let currentItemIndent = 0;
  let currentListKey = null;
  let currentListIndent = 0;

  function flushCurrent() {
    if (!current) {
      return;
    }
    for (const key of SLICE_LIST_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        current[key] = [];
      }
    }
    slices.push(current);
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!inSlices && /^slices:\s*$/.test(trimmed)) {
      inSlices = true;
      slicesIndent = indentOf(line);
      continue;
    }
    if (!inSlices) {
      continue;
    }
    const ind = indentOf(line);
    if (ind <= slicesIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
      break;
    }

    const idMatch = trimmed.match(/^-\s*id:\s*(.*)$/);
    if (idMatch) {
      flushCurrent();
      current = { id: parseScalar(idMatch[1]) };
      currentItemIndent = ind;
      currentListKey = null;
      continue;
    }
    if (!current) {
      continue;
    }
    if (currentListKey && ind > currentListIndent) {
      const listMatch = trimmed.match(/^-\s*(.*)$/);
      if (listMatch) {
        current[currentListKey].push(parseScalar(listMatch[1]));
        continue;
      }
    }
    if (currentListKey && ind <= currentListIndent) {
      currentListKey = null;
    }
    if (ind <= currentItemIndent) {
      continue;
    }
    const kvMatch = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!kvMatch) {
      continue;
    }
    const key = kvMatch[1];
    const rawValue = kvMatch[2];
    if (SLICE_LIST_FIELDS.has(key)) {
      const inlineEmptyList = rawValue.trim() === '[]';
      current[key] = inlineEmptyList ? [] : [];
      if (!inlineEmptyList) {
        currentListKey = key;
        currentListIndent = ind;
      }
      continue;
    }
    current[key] = parseScalar(rawValue);
  }
  flushCurrent();
  return slices;
}

function sectionBounds(lines, sectionName) {
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed !== `${sectionName}:`) {
      continue;
    }
    const baseIndent = indentOf(lines[i]);
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      const candidate = lines[j].trim();
      if (!candidate) {
        continue;
      }
      if (indentOf(lines[j]) <= baseIndent && /^[a-zA-Z0-9_]+:/.test(candidate)) {
        end = j;
        break;
      }
    }
    return { start: i, end, baseIndent };
  }
  throw new Error(`Missing section '${sectionName}' while updating manifest`);
}

function setSectionScalar(text, sectionName, key, valueLiteral) {
  const lines = text.split('\n');
  const { start, end, baseIndent } = sectionBounds(lines, sectionName);
  const keyIndent = baseIndent + 2;
  const keyPrefix = `${' '.repeat(keyIndent)}${key}:`;
  let keyLineIndex = -1;
  for (let i = start + 1; i < end; i += 1) {
    if (lines[i].startsWith(keyPrefix)) {
      keyLineIndex = i;
      break;
    }
  }
  const replacement = `${keyPrefix} ${valueLiteral}`;
  if (keyLineIndex >= 0) {
    lines[keyLineIndex] = replacement;
    return lines.join('\n');
  }
  lines.splice(end, 0, replacement);
  return lines.join('\n');
}

function parseSectionListValues(text, sectionName, key) {
  return parseSectionList(text, sectionName, key).filter(Boolean);
}

function quoteYamlString(value) {
  return JSON.stringify(String(value));
}

function setSectionList(text, sectionName, key, values) {
  const lines = text.split('\n');
  const { start, end, baseIndent } = sectionBounds(lines, sectionName);
  const keyIndent = baseIndent + 2;
  const keyPrefix = `${' '.repeat(keyIndent)}${key}:`;
  let keyLineIndex = -1;

  for (let i = start + 1; i < end; i += 1) {
    if (lines[i].startsWith(keyPrefix)) {
      keyLineIndex = i;
      break;
    }
  }

  const replacementLines = values.length === 0
    ? [`${keyPrefix} []`]
    : [
      `${keyPrefix}`,
      ...values.map((value) => `${' '.repeat(keyIndent + 2)}- ${quoteYamlString(value)}`),
    ];

  if (keyLineIndex < 0) {
    lines.splice(end, 0, ...replacementLines);
    return lines.join('\n');
  }

  let replaceEnd = keyLineIndex + 1;
  while (replaceEnd < end) {
    const trimmed = lines[replaceEnd].trim();
    if (!trimmed) {
      replaceEnd += 1;
      continue;
    }
    const ind = indentOf(lines[replaceEnd]);
    if (ind <= keyIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
      break;
    }
    replaceEnd += 1;
  }

  lines.splice(keyLineIndex, replaceEnd - keyLineIndex, ...replacementLines);
  return lines.join('\n');
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function listAllPlaceholderMatches(text) {
  const hits = [];
  const source = String(text || '');
  for (const { label, pattern } of KNOWN_PLACEHOLDER_PATTERNS) {
    if (pattern.test(source)) {
      hits.push(label);
    }
    pattern.lastIndex = 0;
  }
  return hits;
}

function parseReviewAssessment(reviewText) {
  const text = String(reviewText || '');
  const patterns = [
    /^Assessment:\s*`?([a-zA-Z_ -]+)`?\s*$/im,
    /^Review Assessment:\s*`?([a-zA-Z_ -]+)`?\s*$/im,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeWhitespace(match[1]).toLowerCase().replace(/\s+/g, '_');
    }
  }
  return null;
}

function parseSliceBlock(text) {
  const lines = text.split('\n');
  const slice = {};
  let inSlice = false;
  let sliceIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!inSlice && /^slice:\s*$/.test(trimmed)) {
      inSlice = true;
      sliceIndent = indentOf(line);
      continue;
    }
    if (inSlice) {
      const ind = indentOf(line);
      if (ind <= sliceIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
        break;
      }
      const m = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (m) {
        slice[m[1]] = parseScalar(m[2]);
      }
    }
  }

  return slice;
}

function parseBacklogSliceStatus(text, targetSliceId) {
  if (!targetSliceId) {
    return null;
  }
  const lines = text.split('\n');
  let inSlices = false;
  let slicesIndent = 0;
  let currentId = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!inSlices && /^slices:\s*$/.test(trimmed)) {
      inSlices = true;
      slicesIndent = indentOf(line);
      continue;
    }
    if (inSlices) {
      const ind = indentOf(line);
      if (ind <= slicesIndent && /^[a-zA-Z0-9_]+:/.test(trimmed)) {
        break;
      }
      const idMatch = trimmed.match(/^-\s*id:\s*(.*)$/);
      if (idMatch) {
        currentId = parseScalar(idMatch[1]);
        continue;
      }
      const statusMatch = trimmed.match(/^status:\s*(.*)$/);
      if (statusMatch && currentId === targetSliceId) {
        return parseScalar(statusMatch[1]);
      }
    }
  }

  return null;
}

function isBootstrapInitialization(targetRoot) {
  const foundation = [
    '.system/project-manifest.yaml',
    '.system/artifact-registry.yaml',
    '.system/workflow-rules.yaml',
    'docs/product/backlog.yaml',
    'docs/product/current-slice.yaml',
  ];
  return foundation.some((rel) => !fs.existsSync(path.join(targetRoot, rel)));
}

function parseBriefApprovalStatus(text) {
  const patterns = [
    /^Brief Approval Status:\s*`?([a-zA-Z_ -]+)`?\s*$/im,
    /^brief_approval_status:\s*([a-zA-Z_ -]+)\s*$/im,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return String(match[1]).trim().toLowerCase();
    }
  }
  return null;
}

function listFilesRecursive(dirPath, rootPath = dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath, rootPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(path.relative(rootPath, entryPath).replaceAll(path.sep, '/'));
    }
  }
  return files;
}

function loadUtf8TextOrNull(filePath) {
  const buffer = fs.readFileSync(filePath);
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  if (sample.includes(0)) {
    return null;
  }
  return buffer.toString('utf8');
}

function setTopLevelScalar(text, key, valueLiteral) {
  const lines = text.split('\n');
  const prefix = `${key}:`;
  for (let i = 0; i < lines.length; i += 1) {
    if (indentOf(lines[i]) === 0 && lines[i].trim().startsWith(prefix)) {
      lines[i] = `${prefix} ${valueLiteral}`;
      return lines.join('\n');
    }
  }
  lines.push(`${prefix} ${valueLiteral}`);
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = value;
    } else {
      args._.push(item);
    }
  }
  return args;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function tokensIn(text) {
  const matches = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

function render(text, values) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return String(values[key]);
    }
    throw new Error(`Missing token value: ${key}`);
  });
}

function metadataHeader(targetRel, sourceRel, fabricVersion, generatedAt) {
  const isMarkdown = targetRel.endsWith('.md');
  if (isMarkdown) {
    return [
      `<!-- generated_from: ${sourceRel} -->`,
      `<!-- fabric_version: ${fabricVersion} -->`,
      `<!-- generated_at: ${generatedAt} -->`,
      '',
    ].join('\n');
  }

  return [
    `# generated_from: ${sourceRel}`,
    `# fabric_version: ${fabricVersion}`,
    `# generated_at: ${generatedAt}`,
    '',
  ].join('\n');
}

function stripGeneratedAt(content) {
  return content
    .split('\n')
    .filter((line) => !line.includes('generated_at:'))
    .join('\n')
    .trimEnd();
}

function firstDiffLine(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i += 1) {
    if ((aLines[i] ?? '') !== (bLines[i] ?? '')) {
      return i + 1;
    }
  }
  return 0;
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH_JSON)) {
    return loadStructuredFile(MANIFEST_PATH_JSON);
  }
  if (fs.existsSync(MANIFEST_PATH_YAML)) {
    return loadStructuredFile(MANIFEST_PATH_YAML);
  }
  throw new Error(
    `Fabric manifest missing. Expected one of: ${MANIFEST_PATH_JSON}, ${MANIFEST_PATH_YAML}`,
  );
}

function loadValues(valuesPath) {
  if (!fs.existsSync(valuesPath)) {
    throw new Error(`Values file missing: ${valuesPath}`);
  }
  return loadStructuredFile(valuesPath) || {};
}

function initValuesFile(valuesPath, forceValues) {
  const sourceExample = path.join(FABRIC_ROOT, 'fabric.values.example.json');
  if (!fs.existsSync(sourceExample)) {
    throw new Error(`Values example file missing: ${sourceExample}`);
  }
  if (fs.existsSync(valuesPath) && !forceValues) {
    throw new Error(
      `Refusing to overwrite existing values file without --force-values: ${path.relative(
        process.cwd(),
        valuesPath,
      )}`,
    );
  }
  ensureDir(valuesPath);
  fs.copyFileSync(sourceExample, valuesPath);
  console.log(`fabric init-factory: initialized values file at ${valuesPath}`);
}

function verifyRequiredTokens(manifest, values) {
  const missing = (manifest.required_tokens || []).filter(
    (token) => !Object.prototype.hasOwnProperty.call(values, token),
  );
  if (missing.length > 0) {
    throw new Error(`Missing required tokens: ${missing.join(', ')}`);
  }
}

function verifyTemplateTokens(manifest, values) {
  return verifyTemplateTokensForEntries(manifest, values, manifest.source_of_truth || []);
}

function templateTokensForEntries(entries) {
  const tokens = new Set();
  for (const entry of entries || []) {
    if (entry.render === false) {
      continue;
    }
    const sourcePath = path.join(FABRIC_ROOT, entry.source);
    const text = readText(sourcePath);
    for (const token of tokensIn(text)) {
      tokens.add(token);
    }
  }
  return [...tokens].sort();
}

function verifyTemplateTokensForEntries(manifest, values, entries) {
  const missing = templateTokensForEntries(entries).filter(
    (token) => !Object.prototype.hasOwnProperty.call(values, token),
  );
  if (missing.length > 0) {
    throw new Error(`Missing template tokens: ${missing.join(', ')}`);
  }
}

function expectedContent(entry, manifest, values, generatedAt) {
  const sourcePath = path.join(FABRIC_ROOT, entry.source);
  const sourceText = readText(sourcePath);
  const body = entry.render === false ? sourceText : render(sourceText, values);
  const header = metadataHeader(entry.target, entry.source, manifest.fabric_version, generatedAt);
  return `${header}${body}`.replace(/\s+$/, '') + '\n';
}

function upsertPackageScripts(packageJsonPath, scriptMap) {
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Missing package.json: ${packageJsonPath}`);
  }
  const pkg = JSON.parse(readText(packageJsonPath));
  pkg.scripts = pkg.scripts || {};
  let changed = false;

  for (const [name, command] of Object.entries(scriptMap || {})) {
    if (pkg.scripts[name] !== command) {
      pkg.scripts[name] = command;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  }
  return changed;
}

function toPackageName(input, fallback = 'app-factory-project') {
  const base = String(input || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_.\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return base || fallback;
}

function ensurePackageJson(packageJsonPath, values) {
  if (fs.existsSync(packageJsonPath)) {
    return false;
  }
  const packageName = toPackageName(values?.project_id || values?.project_name);
  const minimalPackage = {
    name: packageName,
    private: true,
    type: 'module',
    version: '0.1.0',
    scripts: {},
  };
  ensureDir(packageJsonPath);
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(minimalPackage, null, 2)}\n`, 'utf8');
  return true;
}

function isGeneratedFile(content) {
  return content.includes('generated_from:') && content.includes('fabric_version:');
}

function writeEntries({ targetRoot, valuesPath, force, entries, checkBriefApproval, allowMissingValues = false }) {
  const manifest = loadManifest();
  let values = {};
  if (!valuesPath || !fs.existsSync(valuesPath)) {
    if (!allowMissingValues) {
      values = loadValues(valuesPath);
    } else {
      const requiredTokens = templateTokensForEntries(entries);
      if (requiredTokens.length > 0) {
        const relValuesPath = valuesPath ? path.relative(process.cwd(), valuesPath) : 'fabric.values.json';
        const valuesArg = relValuesPath && relValuesPath.length > 0 ? relValuesPath : 'fabric.values.json';
        throw new Error(
          `Values file missing for init-factory render path: ${valuesPath}. Required template tokens: ${requiredTokens.join(', ')}. `
          + `Recovery: run ./fabric/company/v1/fabric init-factory --target ${targetRoot === process.cwd() ? '.' : '<project-root>'} --values ${valuesArg} --init-values `
          + 'or run pm:derive-values first to create values from approved brief context.',
        );
      }
      values = {};
    }
  } else {
    values = loadValues(valuesPath);
    verifyTemplateTokensForEntries(manifest, values, entries);
  }

  if (checkBriefApproval) {
    assertApprovedBrief(targetRoot);
  }

  const generatedAt = new Date().toISOString();
  const outputs = [];

  for (const entry of entries || []) {
    const outPath = path.join(targetRoot, entry.target);
    if (fs.existsSync(outPath) && !force) {
      const existing = readText(outPath);
      if (!isGeneratedFile(existing)) {
        throw new Error(
          `Refusing to overwrite non-generated file without --force: ${entry.target}`,
        );
      }
    }

    const output = expectedContent(entry, manifest, values, generatedAt);
    ensureDir(outPath);
    fs.writeFileSync(outPath, output, 'utf8');
    outputs.push(entry.target);
  }

  return outputs;
}

function assertApprovedBrief(targetRoot) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  if (!fs.existsSync(briefPath)) {
    throw new Error(
      'Bootstrap gate failed: missing docs/product/project-brief.md. Create/approve brief before bootstrap instantiate.',
    );
  }
  const briefStatus = parseBriefApprovalStatus(readText(briefPath));
  if (briefStatus !== 'approved') {
    throw new Error(
      `Bootstrap gate failed: project brief not approved (current status: ${String(
        briefStatus ?? 'missing',
      )}). Set 'Brief Approval Status: approved'.`,
    );
  }
}

function customerInputEvidenceFiles(targetRoot) {
  const customerInputRoot = path.join(targetRoot, 'docs/customer-input');
  const files = listFilesRecursive(customerInputRoot, customerInputRoot);
  return files.filter((rel) => {
    const base = path.basename(rel).toLowerCase();
    return !(base === 'readme' || base === 'readme.md' || base.startsWith('readme.'));
  });
}

function assertMinimumCustomerInput(targetRoot) {
  const intakePath = path.join(targetRoot, 'docs/product/intake-note.md');
  const hasIntake = fs.existsSync(intakePath) && readText(intakePath).trim().length > 0;
  const hasCustomerInputDocs = customerInputEvidenceFiles(targetRoot).length > 0;

  if (!hasIntake && !hasCustomerInputDocs) {
    throw new Error(
      'Input sufficiency gate failed: provide docs/product/intake-note.md or at least one document under docs/customer-input/ before format-from-brief.',
    );
  }
}

function getBootstrapReviewRelPaths(values = {}) {
  return {
    foundation: values.bootstrap_foundation_review_path || 'docs/reviews/product-manager/bootstrap-foundation-review.md',
    backlogSlice:
      values.bootstrap_backlog_slice_review_path
      || 'docs/reviews/product-manager/bootstrap-backlog-slice-review.md',
  };
}

function loadValuesIfPresent(valuesPath) {
  if (!valuesPath || !fs.existsSync(valuesPath)) {
    return {};
  }
  return loadValues(valuesPath);
}

function factoryInitTargets(manifest) {
  const entries = Array.isArray(manifest?.factory_init_source_of_truth)
    ? manifest.factory_init_source_of_truth
    : [];
  return entries
    .map((entry) => String(entry?.target || '').trim())
    .filter((target) => target.length > 0);
}

function getMissingFactoryInitTargets(targetRoot) {
  const manifest = loadManifest();
  const targets = factoryInitTargets(manifest);
  return targets.filter((target) => !fs.existsSync(path.join(targetRoot, target)));
}

export {
  readText,
  writeTextAtomic,
  loadYamlIfAvailable,
  loadStructuredFile,
  parseEnvKeys,
  parseScalar,
  indentOf,
  parseStatusBlock,
  parseBlockScalars,
  parseSectionList,
  parseSliceBlockWithLists,
  parseBacklogSlices,
  sectionBounds,
  setSectionScalar,
  parseSectionListValues,
  quoteYamlString,
  setSectionList,
  normalizeWhitespace,
  listAllPlaceholderMatches,
  parseReviewAssessment,
  parseSliceBlock,
  parseBacklogSliceStatus,
  isBootstrapInitialization,
  parseBriefApprovalStatus,
  listFilesRecursive,
  loadUtf8TextOrNull,
  setTopLevelScalar,
  parseArgs,
  ensureDir,
  tokensIn,
  render,
  metadataHeader,
  stripGeneratedAt,
  firstDiffLine,
  loadManifest,
  loadValues,
  initValuesFile,
  verifyRequiredTokens,
  verifyTemplateTokens,
  verifyTemplateTokensForEntries,
  templateTokensForEntries,
  expectedContent,
  upsertPackageScripts,
  toPackageName,
  ensurePackageJson,
  isGeneratedFile,
  writeEntries,
  assertApprovedBrief,
  customerInputEvidenceFiles,
  assertMinimumCustomerInput,
  getBootstrapReviewRelPaths,
  loadValuesIfPresent,
  getMissingFactoryInitTargets,
  FABRIC_ROOT,
  MANIFEST_PATH_JSON,
  MANIFEST_PATH_YAML,
  SLICE_LIST_FIELDS,
  KNOWN_PLACEHOLDER_PATTERNS,
};
