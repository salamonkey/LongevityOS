import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  ensureDir,
  getMissingFactoryInitTargets,
  listFilesRecursive,
  loadUtf8TextOrNull,
  writeTextAtomic,
} from '../lib/core.mjs';
import { readPdfText } from './evidence-reader.mjs';

const INPUT_DIR_REL = 'docs/customer-input';
const OUTPUT_DIR_REL = 'docs/pm/intake';
const EXTRACTED_TEXT_DIR_REL = `${OUTPUT_DIR_REL}/extracted-text`;
const SOURCES_JSON_REL = `${OUTPUT_DIR_REL}/sources.json`;
const INTAKE_REPORT_REL = `${OUTPUT_DIR_REL}/intake-report.md`;

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.md', '.txt', '.json']);
const IGNORED_BASENAMES = new Set(['.ds_store', 'thumbs.db']);

function toPosixPath(value) {
  return String(value || '').replaceAll(path.sep, '/');
}

function estimateTokens(characters) {
  return Math.round(Number(characters || 0) / 4);
}

function escapeMarkdownCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br/>');
}

function isIgnoredPath(relPath) {
  const normalized = toPosixPath(relPath);
  const basename = path.basename(normalized).toLowerCase();
  if (!basename) {
    return true;
  }
  if (IGNORED_BASENAMES.has(basename)) {
    return true;
  }
  if (basename.endsWith('~') || basename.endsWith('.swp') || basename.endsWith('.tmp')) {
    return true;
  }
  const parts = normalized.split('/').filter(Boolean);
  return parts.some((part) => part.startsWith('.'));
}

function normalizeExtractedText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeName(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
}

function makeExtractedTextFilename(relPath, sourceIndex, usedNames) {
  const ext = path.extname(relPath);
  const baseNoExt = ext ? relPath.slice(0, -ext.length) : relPath;
  const normalized = toPosixPath(baseNoExt).split('/').filter(Boolean).join('--');
  const fallback = `source-${String(sourceIndex + 1).padStart(3, '0')}`;
  const base = sanitizeName(normalized) || fallback;

  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}-${String(suffix)}`;
    suffix += 1;
  }
  usedNames.add(candidate);
  return `${candidate}.txt`;
}

function readSupportedSourceText(filePath, extension) {
  if (extension === '.pdf') {
    const result = readPdfText(filePath);
    if (!result.text) {
      return {
        status: 'failed',
        text: '',
        error: result.reason || 'pdf extraction failed',
      };
    }
    const normalized = normalizeExtractedText(result.text);
    return {
      status: normalized.length > 0 ? 'ok' : 'empty',
      text: normalized,
      error: null,
    };
  }

  const utf8Text = loadUtf8TextOrNull(filePath);
  if (utf8Text == null) {
    return {
      status: 'failed',
      text: '',
      error: 'binary or non-UTF8 file',
    };
  }

  let prepared = utf8Text;
  if (extension === '.json') {
    try {
      const parsed = JSON.parse(utf8Text);
      prepared = JSON.stringify(parsed, null, 2);
    } catch {
      prepared = utf8Text;
    }
  }

  const normalized = normalizeExtractedText(prepared);
  return {
    status: normalized.length > 0 ? 'ok' : 'empty',
    text: normalized,
    error: null,
  };
}

function buildWarnings(sources) {
  const warnings = [];
  for (const source of sources) {
    if (source.status === 'failed') {
      warnings.push(`${source.relativePath}: failed (${source.error || 'unknown error'})`);
    } else if (source.status === 'empty') {
      warnings.push(`${source.relativePath}: extracted text was empty`);
    }
  }
  return warnings;
}

function renderIntakeReport({
  generatedAt,
  inputDir,
  outputDir,
  summary,
  sources,
  warnings,
}) {
  const lines = [
    '# PM Intake Report',
    '',
    `Generated at: \`${generatedAt}\``,
    `Input directory: \`${inputDir}\``,
    `Output directory: \`${outputDir}\``,
    '',
    '## Source Summary',
    '',
    `- Sources detected: \`${String(summary.sourceCount)}\``,
    `- Usable sources: \`${String(summary.usableSourceCount)}\``,
    `- Failed sources: \`${String(summary.failedSourceCount)}\``,
    `- Total extracted characters: \`${String(summary.totalCharacters)}\``,
    `- Estimated tokens (chars / 4): \`${String(summary.estimatedTokens)}\``,
    '',
    '## Sources',
    '',
    '| ID | Source | Type | Size (bytes) | Status | Characters | Est. tokens | Extracted text | Error |',
    '| --- | --- | --- | ---: | --- | ---: | ---: | --- | --- |',
  ];

  for (const source of sources) {
    lines.push(
      `| ${escapeMarkdownCell(source.id)} | ${escapeMarkdownCell(source.relativePath)} | ${escapeMarkdownCell(source.extension)} | ${String(source.sizeBytes)} | ${escapeMarkdownCell(source.status)} | ${String(source.characters)} | ${String(source.estimatedTokens)} | ${escapeMarkdownCell(source.extractedTextPath || '-')} | ${escapeMarkdownCell(source.error || '-')} |`,
    );
  }

  lines.push('', '## Warnings', '');
  if (warnings.length === 0) {
    lines.push('- none');
  } else {
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  lines.push(
    '',
    '## Recommended Next Command',
    '',
    '`./fabric/company/v1/fabric pm:brief-readiness --target .`',
    '',
  );

  return lines.join('\n');
}

async function pmIntake({ targetRoot }) {
  const missingFactoryInitTargets = getMissingFactoryInitTargets(targetRoot);
  if (missingFactoryInitTargets.length > 0) {
    const preview = missingFactoryInitTargets.slice(0, 4).join(', ');
    const overflowCount = Math.max(0, missingFactoryInitTargets.length - 4);
    const overflowSuffix = overflowCount > 0 ? ` (+${String(overflowCount)} more)` : '';
    console.error('fabric pm:intake: FAIL');
    console.error('- init-factory prerequisite not satisfied');
    console.error(`- missing factory-init artifacts: ${preview}${overflowSuffix}`);
    console.error('- run: ./fabric/company/v1/fabric init-factory --target .');
    process.exit(1);
  }

  const inputDirAbs = path.join(targetRoot, INPUT_DIR_REL);
  const extractedDirAbs = path.join(targetRoot, EXTRACTED_TEXT_DIR_REL);

  if (!fs.existsSync(inputDirAbs) || !fs.statSync(inputDirAbs).isDirectory()) {
    console.error('fabric pm:intake: FAIL');
    console.error(`- missing input directory: ${INPUT_DIR_REL}/`);
    console.error('- add customer source files, then run again');
    process.exit(1);
  }

  const discovered = listFilesRecursive(inputDirAbs, inputDirAbs)
    .map((rel) => toPosixPath(rel))
    .filter((rel) => !isIgnoredPath(rel))
    .filter((rel) => SUPPORTED_EXTENSIONS.has(path.extname(rel).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  if (discovered.length === 0) {
    console.error('fabric pm:intake: FAIL');
    console.error(`- no supported customer input files found in ${INPUT_DIR_REL}/`);
    console.error('- supported: .pdf, .md, .txt, .json');
    process.exit(1);
  }

  fs.mkdirSync(extractedDirAbs, { recursive: true });

  const usedExtractedNames = new Set();
  const sources = [];
  let usableSourceCount = 0;
  let failedSourceCount = 0;
  let totalCharacters = 0;

  for (let index = 0; index < discovered.length; index += 1) {
    const relPath = discovered[index];
    const absPath = path.join(inputDirAbs, relPath);
    const extension = path.extname(relPath).toLowerCase();
    const filename = path.basename(relPath);
    const sizeBytes = fs.statSync(absPath).size;

    let extraction;
    try {
      extraction = readSupportedSourceText(absPath, extension);
    } catch (error) {
      extraction = {
        status: 'failed',
        text: '',
        error: `read error: ${String(error?.message || error)}`,
      };
    }

    const extractedFilename = makeExtractedTextFilename(relPath, index, usedExtractedNames);
    const extractedAbsPath = path.join(extractedDirAbs, extractedFilename);
    const extractedRelPath = toPosixPath(path.relative(targetRoot, extractedAbsPath));

    if (extraction.status !== 'failed') {
      ensureDir(extractedAbsPath);
      fs.writeFileSync(
        extractedAbsPath,
        extraction.text.length > 0 ? `${extraction.text}\n` : '',
        'utf8',
      );
    }

    const characters = extraction.status === 'ok' ? extraction.text.length : 0;
    const estimatedTokens = estimateTokens(characters);

    if (extraction.status === 'ok') {
      usableSourceCount += 1;
      totalCharacters += characters;
    }
    if (extraction.status === 'failed') {
      failedSourceCount += 1;
    }

    sources.push({
      id: `source_${String(index + 1).padStart(3, '0')}`,
      filename,
      relativePath: `${INPUT_DIR_REL}/${toPosixPath(relPath)}`,
      extension,
      sizeBytes,
      status: extraction.status,
      characters,
      estimatedTokens,
      extractedTextPath: extraction.status === 'failed' ? null : extractedRelPath,
      error: extraction.status === 'failed' ? extraction.error : null,
    });
  }

  const generatedAt = new Date().toISOString();
  const summary = {
    sourceCount: sources.length,
    usableSourceCount,
    failedSourceCount,
    totalCharacters,
    estimatedTokens: estimateTokens(totalCharacters),
  };
  const warnings = buildWarnings(sources);

  const sourcesPayload = {
    generatedAt,
    inputDir: INPUT_DIR_REL,
    outputDir: OUTPUT_DIR_REL,
    summary,
    sources,
  };

  const sourcesJsonPath = path.join(targetRoot, SOURCES_JSON_REL);
  writeTextAtomic(sourcesJsonPath, `${JSON.stringify(sourcesPayload, null, 2)}\n`);

  const reportPath = path.join(targetRoot, INTAKE_REPORT_REL);
  const reportMarkdown = renderIntakeReport({
    generatedAt,
    inputDir: INPUT_DIR_REL,
    outputDir: OUTPUT_DIR_REL,
    summary,
    sources,
    warnings,
  });
  writeTextAtomic(reportPath, reportMarkdown);

  if (usableSourceCount === 0) {
    console.error('fabric pm:intake: FAIL');
    console.error(`- sources detected: ${String(summary.sourceCount)}`);
    console.error('- usable sources: 0');
    console.error('- no usable text extracted');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('fabric pm:intake: WARNING');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  console.log('fabric pm:intake: OK');
  console.log(`- sources detected: ${String(summary.sourceCount)}`);
  console.log(`- usable sources: ${String(summary.usableSourceCount)}`);
  console.log(`- failed sources: ${String(summary.failedSourceCount)}`);
  console.log(`- extracted text: ${EXTRACTED_TEXT_DIR_REL}/`);
  console.log(`- report: ${INTAKE_REPORT_REL}`);
  console.log('- next: ./fabric/company/v1/fabric pm:brief-readiness --target .');
}

export {
  pmIntake,
};
