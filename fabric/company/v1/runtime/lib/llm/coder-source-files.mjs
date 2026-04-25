import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolveFirstValidLlmSettings } from './config.mjs';
import { invokeStructured } from './brief-context.mjs';

const FABRIC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const CODER_SOURCE_FILES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'files',
  ],
  properties: {
    files: {
      type: 'array',
      minItems: 4,
      maxItems: 40,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'content'],
        properties: {
          path: { type: 'string', minLength: 1, maxLength: 240 },
          content: { type: 'string', minLength: 1, maxLength: 120000 },
        },
      },
    },
  },
};

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeSpecPath(rawValue) {
  return String(rawValue || '').trim().replace(/^['"]|['"]$/g, '');
}

function resolveRoleSpecPathFromRolesYaml({ roleId }) {
  const rolesPath = path.join(FABRIC_ROOT, 'team/roles.yaml');
  if (!fs.existsSync(rolesPath)) return null;
  const text = readText(rolesPath);
  const blockMatch = text.match(new RegExp(`-\\s+id:\\s*${String(roleId)}\\b[\\s\\S]*?(?=\\n-\\s+id:|$)`));
  if (!blockMatch) return null;
  const specMatch = blockMatch[0].match(/^\s*spec_path:\s*(.+)\s*$/m);
  if (!specMatch) return null;
  return normalizeSpecPath(specMatch[1]);
}

function loadCoderRoleContract() {
  const fallbackRelPath = 'team/coder.md';
  const relPath = resolveRoleSpecPathFromRolesYaml({ roleId: 'coder' }) || fallbackRelPath;
  const absPath = path.join(FABRIC_ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return { relPath, roleContract: '' };
  }
  return {
    relPath,
    roleContract: readText(absPath).trim(),
  };
}

function normalizeSliceIdForPath(sliceId) {
  return String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
}

function normalizeSliceTitleSlug(sliceTitle) {
  const raw = String(sliceTitle || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw || 'current-slice';
}

function normalizeGeneratedPath(rawPath) {
  const normalized = String(rawPath || '')
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/{2,}/g, '/');
  if (!normalized) return '';
  if (path.posix.isAbsolute(normalized)) return '';
  if (normalized.includes('../')) return '';
  if (normalized.startsWith('..')) return '';
  return normalized;
}

function isAllowedGeneratedPath(relPath) {
  if (relPath === 'index.html') return true;
  if (relPath.startsWith('src/')) return true;
  if (relPath.startsWith('tests/')) return true;
  return false;
}

function normalizeGeneratedFiles(rawFiles = []) {
  const files = Array.isArray(rawFiles) ? rawFiles : [];
  const out = new Map();
  const issues = [];
  for (const item of files) {
    const relPath = normalizeGeneratedPath(item?.path);
    if (!relPath) {
      issues.push('encountered an empty/invalid generated file path');
      continue;
    }
    if (!isAllowedGeneratedPath(relPath)) {
      issues.push(`path outside allowed write scope: ${relPath}`);
      continue;
    }
    const content = String(item?.content || '').replace(/\r\n?/g, '\n');
    if (!content.trim()) {
      issues.push(`empty file content for ${relPath}`);
      continue;
    }
    out.set(relPath, content.endsWith('\n') ? content : `${content}\n`);
  }
  const requiredPaths = ['index.html', 'src/main.jsx', 'src/App.jsx'];
  const missingRequired = requiredPaths.filter((requiredPath) => !out.has(requiredPath));
  for (const missingPath of missingRequired) {
    issues.push(`missing required generated file: ${missingPath}`);
  }
  if (issues.length > 0) {
    throw new Error(`Invalid coder source file payload: ${issues.join('; ')}`);
  }
  return out;
}

function resolvePositiveInt(candidates, fallback) {
  for (const value of candidates) {
    if (value === undefined || value === null || String(value).trim() === '') {
      continue;
    }
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isFinite(parsed) && !Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function estimateTokenCountFromChars(charCount) {
  const chars = Number.isFinite(charCount) ? Math.max(0, Math.floor(charCount)) : 0;
  return Math.ceil(chars / 4);
}

function truncateTextForModelContext(text, maxChars) {
  const raw = String(text || '');
  if (raw.length <= maxChars) {
    return raw;
  }
  const hardCap = Math.max(0, Math.floor(maxChars));
  const breakCandidates = [
    raw.lastIndexOf('\n\n', hardCap),
    raw.lastIndexOf('\n', hardCap),
    raw.lastIndexOf('. ', hardCap),
    raw.lastIndexOf(' ', hardCap),
  ];
  let cutIndex = hardCap;
  for (const candidate of breakCandidates) {
    if (candidate >= Math.floor(hardCap * 0.6)) {
      cutIndex = candidate;
      break;
    }
  }
  const head = raw.slice(0, cutIndex).trimEnd();
  return `${head}\n[truncated]`;
}

function uniqueStrings(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const item = String(value || '').trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function tokenizeWords(text) {
  return String(text || '').toLowerCase().match(/[a-z0-9]{4,}/g) || [];
}

function isLikelyHardRuleLine(line) {
  return /\b(must|required|only|exactly|never|do not|cannot|without|in scope|out of scope|forbidden|prohibited)\b/i.test(String(line || ''));
}

function lineHasSliceKeyword(line, keywordSet) {
  const words = tokenizeWords(line);
  for (const word of words) {
    if (keywordSet.has(word)) return true;
  }
  return false;
}

function buildSliceKeywordSet({ sliceContext = {}, fileTargets = [] }) {
  const rawValues = [
    sliceContext.id,
    sliceContext.title,
    sliceContext.objective,
    ...(Array.isArray(sliceContext.in_scope) ? sliceContext.in_scope : []),
    ...(Array.isArray(sliceContext.out_of_scope) ? sliceContext.out_of_scope : []),
    ...(Array.isArray(sliceContext.acceptance_criteria) ? sliceContext.acceptance_criteria : []),
    ...(Array.isArray(fileTargets) ? fileTargets : []),
    'scope',
    'onboarding',
    'profile',
    'dashboard',
    'deterministic',
    'acceptance',
    'criteria',
    'constraints',
    'rules',
    'mvp',
    'today',
    'soon',
    'later',
  ];
  const words = [];
  for (const value of rawValues) {
    words.push(...tokenizeWords(value));
  }
  return new Set(words);
}

function splitMarkdownSections(markdown) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const sections = [{ heading: '', lines: [] }];
  let current = sections[0];
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line.trim())) {
      current = { heading: line.trim(), lines: [] };
      sections.push(current);
      continue;
    }
    current.lines.push(line);
  }
  return sections;
}

function scoreMarkdownSection(section, keywordSet) {
  const heading = String(section?.heading || '');
  const body = Array.isArray(section?.lines) ? section.lines.join('\n') : '';
  const headingScore = (
    /scope|objective|acceptance|criteria|constraints|rules|non-goal|out[- ]of[- ]scope|in[- ]scope|workflow|journey|technical|privacy|deterministic|dashboard|onboarding|profile|mvp/i.test(heading)
    || lineHasSliceKeyword(heading, keywordSet)
  ) ? 2 : 0;
  let keywordHits = 0;
  let hardRuleHits = 0;
  for (const line of body.split('\n')) {
    if (lineHasSliceKeyword(line, keywordSet)) keywordHits += 1;
    if (isLikelyHardRuleLine(line)) hardRuleHits += 1;
  }
  return headingScore + Math.min(6, keywordHits) + Math.min(4, hardRuleHits * 2);
}

function extractDeterministicMarkdownFocus(markdown, {
  keywordSet,
  maxChars = 3200,
}) {
  const source = String(markdown || '').trim();
  if (!source) {
    return '';
  }
  const sections = splitMarkdownSections(source);
  const scored = sections.map((section, index) => ({
    section,
    index,
    score: scoreMarkdownSection(section, keywordSet),
  }));
  let selected = scored.filter((item) => item.score > 0);
  if (selected.length === 0) {
    selected = scored.slice(0, Math.min(3, scored.length));
  }
  selected.sort((a, b) => a.index - b.index);

  const renderSectionFull = (section) => {
    const lines = [];
    if (section.heading) lines.push(section.heading);
    lines.push(...section.lines);
    lines.push('');
    return lines;
  };
  const fullLines = selected.flatMap((item) => renderSectionFull(item.section));
  let rendered = fullLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (rendered.length <= maxChars) {
    return `${rendered}\n`;
  }

  const condensedLines = [];
  for (const item of selected) {
    const section = item.section;
    if (section.heading) condensedLines.push(section.heading);
    let paragraphLinesKept = 0;
    for (const line of section.lines) {
      const trimmed = String(line || '').trim();
      if (!trimmed) {
        if (condensedLines.length > 0 && condensedLines[condensedLines.length - 1] !== '') {
          condensedLines.push('');
        }
        continue;
      }
      const isBullet = /^([-*]|\d+\.)\s+/.test(trimmed);
      const keep = (
        isBullet
        || isLikelyHardRuleLine(trimmed)
        || lineHasSliceKeyword(trimmed, keywordSet)
        || paragraphLinesKept < 2
      );
      if (!keep) continue;
      condensedLines.push(line);
      if (!isBullet) {
        paragraphLinesKept += 1;
      }
    }
    condensedLines.push('');
  }
  rendered = condensedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return `${truncateTextForModelContext(rendered, maxChars)}\n`;
}

const EXISTING_IMPLEMENTATION_CONTEXT_REL_PATHS = [
  'index.html',
  'src/main.jsx',
  'src/App.jsx',
  'src/styles.css',
  'src/features/onboarding/OnboardingPage.jsx',
  'src/features/profile/ProfileForm.jsx',
  'src/routes/onboarding.jsx',
  'tests/onboarding/onboarding.smoke.test.mjs',
];

const ESSENTIAL_EXISTING_CONTEXT_REL_PATHS = new Set([
  'index.html',
  'src/main.jsx',
  'src/App.jsx',
]);

const PROMPT_TOKEN_BUDGET_TARGET = 8000;
const PROMPT_TOKEN_BUDGET_SOFT_WARN = 8000;
const PROMPT_TOKEN_BUDGET_HARD_COMPACT = 10000;

function collectExistingImplementationContext({ targetRoot, sliceSlug }) {
  const candidateRelPaths = [
    ...EXISTING_IMPLEMENTATION_CONTEXT_REL_PATHS,
    `src/features/${sliceSlug}/SliceEntryBridge.jsx`,
    `src/routes/${sliceSlug}.jsx`,
    `tests/${sliceSlug}/${sliceSlug}.smoke.test.mjs`,
  ];
  const seen = new Set();
  const contexts = [];
  for (const relPath of candidateRelPaths) {
    const normalizedRelPath = normalizeGeneratedPath(relPath);
    if (!normalizedRelPath) continue;
    if (seen.has(normalizedRelPath)) continue;
    seen.add(normalizedRelPath);
    const absPath = path.join(targetRoot, normalizedRelPath);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      continue;
    }
    const text = readText(absPath);
    contexts.push({
      relPath: normalizedRelPath,
      text: text.length > 30000 ? `${text.slice(0, 30000).trimEnd()}\n[truncated]` : text,
    });
  }
  return contexts;
}

function buildSuggestedPaths({ sliceSlug }) {
  const base = [
    'index.html',
    'src/main.jsx',
    'src/App.jsx',
    'src/styles.css',
    'src/features/onboarding/OnboardingPage.jsx',
    'src/features/profile/ProfileForm.jsx',
    'src/routes/onboarding.jsx',
    'tests/onboarding/onboarding.smoke.test.mjs',
  ];
  if (sliceSlug !== 'onboarding') {
    base.push(`src/features/${sliceSlug}/SliceEntryBridge.jsx`);
    base.push(`src/routes/${sliceSlug}.jsx`);
    base.push(`tests/${sliceSlug}/${sliceSlug}.smoke.test.mjs`);
  }
  return base;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTargetPattern(rawPattern) {
  return String(rawPattern || '')
    .replace(/\s*\(.*\)\s*$/g, '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '');
}

function pathMatchesPattern(relPath, pattern) {
  const normalizedPath = normalizeGeneratedPath(relPath);
  const normalizedPattern = normalizeTargetPattern(pattern);
  if (!normalizedPath || !normalizedPattern) return false;

  if (normalizedPattern.includes('*')) {
    const regex = new RegExp(`^${normalizedPattern.split('*').map((item) => escapeRegex(item)).join('.*')}$`);
    return regex.test(normalizedPath);
  }

  if (normalizedPattern.endsWith('/')) {
    return normalizedPath.startsWith(normalizedPattern);
  }

  return normalizedPath === normalizedPattern || normalizedPath.startsWith(`${normalizedPattern}/`);
}

function isScopeRelevantContextPath(relPath, {
  fileTargets = [],
  sliceSlug,
}) {
  if (ESSENTIAL_EXISTING_CONTEXT_REL_PATHS.has(relPath)) {
    return true;
  }
  for (const target of fileTargets) {
    if (pathMatchesPattern(relPath, target)) {
      return true;
    }
  }
  if (sliceSlug && sliceSlug !== 'onboarding') {
    if (relPath.includes(`/${sliceSlug}/`) || relPath.includes(`${sliceSlug}.`)) {
      return true;
    }
  }
  return false;
}

function isLegacyBridgeContextPath(relPath, sliceSlug) {
  if (relPath.endsWith('SliceEntryBridge.jsx')) return true;
  if (sliceSlug && sliceSlug !== 'onboarding') {
    if (relPath === `src/routes/${sliceSlug}.jsx`) return true;
    if (relPath === `tests/${sliceSlug}/${sliceSlug}.smoke.test.mjs`) return true;
  }
  return false;
}

function renderExistingImplementationContextPrompt(contexts = []) {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return [
      'Existing implementation context:',
      '- [none]',
      '',
    ];
  }
  return [
    'Existing implementation context (preserve behavior that still applies unless contradicted by slice scope):',
    ...contexts.flatMap((item) => [
      `### ${item.relPath}`,
      '```text',
      String(item.text || '').trim(),
      '```',
    ]),
    '',
  ];
}

function renderExistingContextSignatureSnippet(text) {
  const rawLines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const selectedLineIndexes = new Set();
  const markIndex = (index) => {
    if (index >= 0 && index < rawLines.length) selectedLineIndexes.add(index);
  };

  for (let i = 0; i < Math.min(18, rawLines.length); i += 1) {
    markIndex(i);
  }

  const signaturePattern = /^\s*(import|export|function\s+|const\s+[A-Za-z0-9_$]+\s*=|class\s+|test\s*\(|describe\s*\()/;
  for (let i = 0; i < rawLines.length; i += 1) {
    if (!signaturePattern.test(rawLines[i])) continue;
    markIndex(i - 1);
    markIndex(i);
    markIndex(i + 1);
  }

  const ordered = [...selectedLineIndexes].sort((a, b) => a - b).slice(0, 80);
  const out = ordered.map((index) => rawLines[index]);
  const rendered = out.join('\n').trim();
  if (!rendered) {
    return truncateTextForModelContext(String(text || '').trim(), 1200);
  }
  return `${truncateTextForModelContext(rendered, 2200)}\n[signature_view]`;
}

function buildUserPrompt({
  sliceContext,
  coderRole,
  baselineMarkdown,
  uxFlowMarkdown,
  briefMarkdown,
  framingMarkdown,
  existingContext,
  suggestedPaths,
  normalizedSliceId,
}) {
  const existingContextPrompt = renderExistingImplementationContextPrompt(existingContext);
  return [
    'Active slice (structured):',
    '```json',
    JSON.stringify(sliceContext, null, 2),
    '```',
    '',
    `Coder role contract (source: ${coderRole.relPath}):`,
    '```markdown',
    String(coderRole.roleContract || '').trim(),
    '```',
    '',
    'Architecture baseline markdown:',
    '```markdown',
    String(baselineMarkdown || '').trim(),
    '```',
    '',
    'Current slice UX flow markdown:',
    '```markdown',
    String(uxFlowMarkdown || '').trim(),
    '```',
    '',
    'Approved project brief markdown (optional):',
    '```markdown',
    String(briefMarkdown || '').trim(),
    '```',
    '',
    'Product system framing markdown (optional):',
    '```markdown',
    String(framingMarkdown || '').trim(),
    '```',
    '',
    ...existingContextPrompt,
    'Output constraints:',
    '- Allowed generated paths: index.html, src/**, tests/**.',
    '- Include at least these files: index.html, src/main.jsx, src/App.jsx.',
    `- Keep flow aligned to active slice id ${normalizedSliceId}.`,
    '- Keep code runnable with React + Vite conventions.',
    '- Add or update tests under tests/** that validate the primary slice flow.',
    '- Keep styling and copy concise; prioritize correctness and testability.',
    '- Never include non-code narrative in file content.',
    '',
    'Suggested file set (adapt if needed but stay in allowed path scope):',
    ...suggestedPaths.map((item) => `- ${item}`),
  ].join('\n');
}

function calculatePromptEstimate(systemPrompt, userPrompt) {
  const chars = String(systemPrompt || '').length + String(userPrompt || '').length;
  return {
    chars,
    estimatedTokens: estimateTokenCountFromChars(chars),
  };
}

function collectPromptSourceFiles({
  coderRole,
  normalizedSliceId,
  briefMarkdown,
  framingMarkdown,
  existingContext,
}) {
  const sourceFiles = [];
  if (String(coderRole?.roleContract || '').trim()) {
    sourceFiles.push(String(coderRole.relPath || ''));
  }
  sourceFiles.push('docs/product/current-slice.yaml');
  sourceFiles.push(`docs/architecture/${normalizedSliceId}-baseline.md`);
  sourceFiles.push(`docs/ux/${normalizedSliceId}-current-slice-flow.md`);
  if (String(briefMarkdown || '').trim()) {
    sourceFiles.push('docs/product/project-brief.md');
  }
  if (String(framingMarkdown || '').trim()) {
    sourceFiles.push('docs/product/product-system-framing.md');
  }
  for (const item of existingContext || []) {
    sourceFiles.push(String(item.relPath || '').trim());
  }
  return uniqueStrings(sourceFiles);
}

function timestampForLogFile(dateMs) {
  const iso = new Date(dateMs).toISOString();
  return iso
    .replace(/\./g, '-')
    .replace(/:/g, '-');
}

function sanitizeLogToken(value, fallback) {
  const token = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return token || fallback;
}

function writePromptVariantLog({
  targetRoot,
  baseFileStem,
  taskName,
  caller,
  variantName,
  systemPrompt,
  userPrompt,
  promptSourceFiles,
  compactedSourceFiles,
  excludedSourceFiles,
  notes = [],
}) {
  const outDir = path.join(targetRoot, '.llm-logs');
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `${baseFileStem}-${sanitizeLogToken(variantName, 'variant')}-prompt.md`;
  const outPath = path.join(outDir, fileName);
  const promptChars = String(systemPrompt || '').length + String(userPrompt || '').length;
  const promptTokens = estimateTokenCountFromChars(promptChars);
  const lines = [
    '# LLM Prompt Variant Log',
    '',
    `- task: ${String(taskName || '')}`,
    `- caller: ${String(caller || '')}`,
    `- variant: ${String(variantName || '')}`,
    `- started_utc: ${new Date().toISOString()}`,
    `- prompt_chars: ${String(promptChars)}`,
    `- prompt_estimated_tokens: ${String(promptTokens)}`,
    '- prompt_sources:',
    ...(Array.isArray(promptSourceFiles) && promptSourceFiles.length > 0
      ? promptSourceFiles.map((item) => `  - ${item}`)
      : ['  - [none]']),
    '- compacted_sources:',
    ...(Array.isArray(compactedSourceFiles) && compactedSourceFiles.length > 0
      ? compactedSourceFiles.map((item) => `  - ${item}`)
      : ['  - [none]']),
    '- excluded_sources:',
    ...(Array.isArray(excludedSourceFiles) && excludedSourceFiles.length > 0
      ? excludedSourceFiles.map((item) => `  - ${item}`)
      : ['  - [none]']),
    '- compression_notes:',
    ...(Array.isArray(notes) && notes.length > 0
      ? notes.map((item) => `  - ${item}`)
      : ['  - [none]']),
    '',
    '## System Prompt',
    '```text',
    String(systemPrompt || ''),
    '```',
    '',
    '## User Prompt',
    '```text',
    String(userPrompt || ''),
    '```',
    '',
  ];
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return `.llm-logs/${fileName}`;
}

function formatPathList(label, paths = []) {
  const items = uniqueStrings(paths);
  const lines = [`${label}:`];
  if (items.length === 0) {
    lines.push('\t\t- [none]');
    return lines.join('\n');
  }
  for (const item of items) {
    lines.push(`\t\t- ${item}`);
  }
  return lines.join('\n');
}

export async function generateCurrentSliceImplementationSourceFiles({
  targetRoot,
  values = {},
  slice = {},
  fileTargets = [],
  baselineMarkdown = '',
  uxFlowMarkdown = '',
  briefMarkdown = '',
  framingMarkdown = '',
  onProgress,
}) {
  const progress = typeof onProgress === 'function' ? onProgress : null;
  const coderRole = loadCoderRoleContract();
  const { settings, purpose } = resolveFirstValidLlmSettings(
    values,
    undefined,
    ['coder'],
  );
  const normalizedSliceId = normalizeSliceIdForPath(slice?.id);
  const sliceSlug = normalizeSliceTitleSlug(slice?.title);
  const suggestedPaths = buildSuggestedPaths({ sliceSlug });
  const existingContext = collectExistingImplementationContext({
    targetRoot,
    sliceSlug,
  });
  const systemPrompt = [
    'You are the Coder role in a virtual software company.',
    'Generate concrete source files for the active slice.',
    'Return JSON only following the schema.',
    'Do not wrap code in markdown fences.',
    'Only emit files that should be written now.',
    'Do not include placeholders, TODOs, or unresolved markers.',
    'Stay inside MVP slice scope and required acceptance criteria.',
  ].join('\n');

  const sliceContext = {
    id: String(slice?.id || '').trim(),
    title: String(slice?.title || '').trim(),
    objective: String(slice?.objective || '').trim(),
    in_scope: Array.isArray(slice?.in_scope) ? slice.in_scope : [],
    out_of_scope: Array.isArray(slice?.out_of_scope) ? slice.out_of_scope : [],
    acceptance_criteria: Array.isArray(slice?.acceptance_criteria) ? slice.acceptance_criteria : [],
    dependencies: Array.isArray(slice?.dependencies) ? slice.dependencies : [],
    implementation_targets: Array.isArray(fileTargets) ? fileTargets : [],
  };
  const keywordSet = buildSliceKeywordSet({
    sliceContext,
    fileTargets,
  });
  const rawPromptSourceFiles = collectPromptSourceFiles({
    coderRole,
    normalizedSliceId,
    briefMarkdown,
    framingMarkdown,
    existingContext,
  });
  const rawUserPrompt = buildUserPrompt({
    sliceContext,
    coderRole,
    baselineMarkdown,
    uxFlowMarkdown,
    briefMarkdown,
    framingMarkdown,
    existingContext,
    suggestedPaths,
    normalizedSliceId,
  });
  const rawEstimate = calculatePromptEstimate(systemPrompt, rawUserPrompt);

  let finalBriefMarkdown = String(briefMarkdown || '');
  let finalFramingMarkdown = String(framingMarkdown || '');
  let finalExistingContext = [...existingContext];
  const compactedFiles = [];
  const excludedFiles = [];
  const compressionNotes = [];

  let runningEstimate = rawEstimate;
  if (runningEstimate.estimatedTokens > PROMPT_TOKEN_BUDGET_SOFT_WARN) {
    compressionNotes.push(
      `soft budget warning: raw prompt is ${String(runningEstimate.estimatedTokens)} est tokens (> ${String(PROMPT_TOKEN_BUDGET_SOFT_WARN)})`,
    );
  }
  if (runningEstimate.estimatedTokens > PROMPT_TOKEN_BUDGET_HARD_COMPACT) {
    const filtered = [];
    for (const item of finalExistingContext) {
      const relPath = String(item.relPath || '').trim();
      const isLowValue = (
        isLegacyBridgeContextPath(relPath, sliceSlug)
        || (!ESSENTIAL_EXISTING_CONTEXT_REL_PATHS.has(relPath) && !isScopeRelevantContextPath(relPath, {
          fileTargets,
          sliceSlug,
        }))
      );
      if (isLowValue) {
        excludedFiles.push(relPath);
        continue;
      }
      filtered.push(item);
    }
    finalExistingContext = filtered;
    compressionNotes.push('hard compaction step 1: excluded low-value existing implementation files');
    runningEstimate = calculatePromptEstimate(
      systemPrompt,
      buildUserPrompt({
        sliceContext,
        coderRole,
        baselineMarkdown,
        uxFlowMarkdown,
        briefMarkdown: finalBriefMarkdown,
        framingMarkdown: finalFramingMarkdown,
        existingContext: finalExistingContext,
        suggestedPaths,
        normalizedSliceId,
      }),
    );
  }

  if (runningEstimate.estimatedTokens > PROMPT_TOKEN_BUDGET_HARD_COMPACT) {
    const compactBrief = extractDeterministicMarkdownFocus(finalBriefMarkdown, {
      keywordSet,
      maxChars: 2600,
    });
    const compactFraming = extractDeterministicMarkdownFocus(finalFramingMarkdown, {
      keywordSet,
      maxChars: 2600,
    });
    if (compactBrief.trim() && compactBrief.trim() !== String(finalBriefMarkdown || '').trim()) {
      finalBriefMarkdown = compactBrief;
      compactedFiles.push('docs/product/project-brief.md');
    }
    if (compactFraming.trim() && compactFraming.trim() !== String(finalFramingMarkdown || '').trim()) {
      finalFramingMarkdown = compactFraming;
      compactedFiles.push('docs/product/product-system-framing.md');
    }
    compressionNotes.push('hard compaction step 2: compacted project brief + product system framing to slice-focused extracts');
    runningEstimate = calculatePromptEstimate(
      systemPrompt,
      buildUserPrompt({
        sliceContext,
        coderRole,
        baselineMarkdown,
        uxFlowMarkdown,
        briefMarkdown: finalBriefMarkdown,
        framingMarkdown: finalFramingMarkdown,
        existingContext: finalExistingContext,
        suggestedPaths,
        normalizedSliceId,
      }),
    );
  }

  if (runningEstimate.estimatedTokens > PROMPT_TOKEN_BUDGET_HARD_COMPACT) {
    finalExistingContext = finalExistingContext.map((item) => ({
      relPath: item.relPath,
      text: renderExistingContextSignatureSnippet(item.text),
    }));
    compactedFiles.push(...finalExistingContext.map((item) => item.relPath));
    compressionNotes.push('hard compaction step 3: reduced existing implementation files to signatures + key snippets');
    runningEstimate = calculatePromptEstimate(
      systemPrompt,
      buildUserPrompt({
        sliceContext,
        coderRole,
        baselineMarkdown,
        uxFlowMarkdown,
        briefMarkdown: finalBriefMarkdown,
        framingMarkdown: finalFramingMarkdown,
        existingContext: finalExistingContext,
        suggestedPaths,
        normalizedSliceId,
      }),
    );
  }

  const finalUserPrompt = buildUserPrompt({
    sliceContext,
    coderRole,
    baselineMarkdown,
    uxFlowMarkdown,
    briefMarkdown: finalBriefMarkdown,
    framingMarkdown: finalFramingMarkdown,
    existingContext: finalExistingContext,
    suggestedPaths,
    normalizedSliceId,
  });
  const finalEstimate = calculatePromptEstimate(systemPrompt, finalUserPrompt);
  const finalPromptSourceFiles = collectPromptSourceFiles({
    coderRole,
    normalizedSliceId,
    briefMarkdown: finalBriefMarkdown,
    framingMarkdown: finalFramingMarkdown,
    existingContext: finalExistingContext,
  });
  const includedFiles = uniqueStrings(finalPromptSourceFiles);
  const compactedSourceFiles = uniqueStrings(compactedFiles);
  const excludedSourceFiles = uniqueStrings(excludedFiles);

  const startedAt = Date.now();
  const baseFileStem = [
    timestampForLogFile(startedAt),
    sanitizeLogToken('coder-source-files.generateCurrentSliceImplementationSourceFiles', 'caller'),
    sanitizeLogToken('coder_current_slice_source_files', 'task'),
  ].join('-');

  const rawPromptLog = writePromptVariantLog({
    targetRoot,
    baseFileStem,
    taskName: 'coder_current_slice_source_files',
    caller: 'coder-source-files.generateCurrentSliceImplementationSourceFiles',
    variantName: 'raw',
    systemPrompt,
    userPrompt: rawUserPrompt,
    promptSourceFiles: rawPromptSourceFiles,
    compactedSourceFiles: [],
    excludedSourceFiles: [],
    notes: [
      `raw prompt baseline before compression treatment`,
      `prompt_estimated_tokens=${String(rawEstimate.estimatedTokens)}`,
    ],
  });

  const compressedPromptLog = writePromptVariantLog({
    targetRoot,
    baseFileStem,
    taskName: 'coder_current_slice_source_files',
    caller: 'coder-source-files.generateCurrentSliceImplementationSourceFiles',
    variantName: 'compressed',
    systemPrompt,
    userPrompt: finalUserPrompt,
    promptSourceFiles: finalPromptSourceFiles,
    compactedSourceFiles,
    excludedSourceFiles,
    notes: [
      ...compressionNotes,
      `prompt_estimated_tokens=${String(finalEstimate.estimatedTokens)}`,
      `budget_target_tokens<=${String(PROMPT_TOKEN_BUDGET_TARGET)}`,
      `soft_warn_tokens>${String(PROMPT_TOKEN_BUDGET_SOFT_WARN)}`,
      `hard_compaction_tokens>${String(PROMPT_TOKEN_BUDGET_HARD_COMPACT)}`,
    ],
  });

  if (progress) {
    progress(`llm raw prompt log: ${rawPromptLog}`);
    progress(`llm compressed prompt log: ${compressedPromptLog}`);
    progress(`prompt budget: target<=${String(PROMPT_TOKEN_BUDGET_TARGET)} soft_warn>${String(PROMPT_TOKEN_BUDGET_SOFT_WARN)} hard_compaction>${String(PROMPT_TOKEN_BUDGET_HARD_COMPACT)}`);
    progress(`prompt estimate: raw=${String(rawEstimate.estimatedTokens)} tokens, final=${String(finalEstimate.estimatedTokens)} tokens`);
    progress(formatPathList('included files', includedFiles));
    progress(formatPathList('compacted files', compactedSourceFiles));
    progress(formatPathList('excluded files', excludedSourceFiles));
  }

  const output = await invokeStructured({
    settings,
    taskName: 'coder_current_slice_source_files',
    caller: 'coder-source-files.generateCurrentSliceImplementationSourceFiles',
    targetRoot,
    systemPrompt,
    userPrompt: finalUserPrompt,
    schema: CODER_SOURCE_FILES_SCHEMA,
    promptSourceFiles: finalPromptSourceFiles,
    onProgress,
    timeoutMs: resolvePositiveInt([
      values?.coder_llm_timeout_ms,
      values?.llm_timeout_ms,
      process.env.CODER_LLM_TIMEOUT_MS,
      process.env.LLM_TIMEOUT_MS,
    ], 600000),
  });

  return {
    purpose,
    settings,
    files: normalizeGeneratedFiles(output?.files),
    summary: '',
  };
}
