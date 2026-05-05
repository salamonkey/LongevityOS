import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  readText,
  writeTextAtomic,
  parseSliceBlockWithLists,
  loadValuesIfPresent,
} from '../lib/core.mjs';
import { resolveFirstValidLlmSettings } from '../lib/llm/config.mjs';
import { invokeStructured } from '../lib/llm/brief-context.mjs';
import { loadRoleContractForModule } from '../lib/llm/role-contracts.mjs';
import {
  semanticUxContractRelPathForSlice,
  semanticUxReviewJsonRelPathForSlice,
} from './semantic-ux-validation.mjs';

const TESTER_REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'summary', 'findings'],
  properties: {
    status: { type: 'string', enum: ['pass', 'fail'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['classification', 'finding', 'expected', 'observed', 'required_repair', 'auto_repairable'],
        properties: {
          classification: { type: 'string', enum: ['A', 'B', 'C'] },
          finding: { type: 'string' },
          expected: { type: 'string' },
          observed: { type: 'string' },
          required_repair: { type: 'string' },
          auto_repairable: { type: 'boolean' },
        },
      },
    },
  },
};

function normalizeSliceIdForPath(sliceId) {
  return String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
}

function checklistRelPathForSlice(sliceId) {
  return `docs/testing/${normalizeSliceIdForPath(sliceId)}-user-checklist.md`;
}

function testerReviewJsonRelPathForSlice(sliceId) {
  return `docs/reviews/testing/${normalizeSliceIdForPath(sliceId)}-validation-report.json`;
}

function testerReviewMdRelPathForSlice(sliceId) {
  return `docs/reviews/testing/${normalizeSliceIdForPath(sliceId)}-validation-report.md`;
}

function sectionBodyByHeading(markdownText, headingPattern) {
  const lines = String(markdownText || '').replace(/\r\n?/g, '\n').split('\n');
  const startIndex = lines.findIndex((line) => headingPattern.test(line));
  if (startIndex < 0) return '';
  const out = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (/^\s*##\s+/.test(line)) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

function replaceSectionBody(markdownText, headingPattern, headingTitle, bodyText) {
  const source = String(markdownText || '').replace(/\r\n?/g, '\n');
  const lines = source.split('\n');
  const headingRegex = headingPattern;
  const replacement = String(bodyText || '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  const replacementLines = replacement.length > 0 ? replacement.split('\n') : [''];
  const startIndex = lines.findIndex((line) => headingRegex.test(line));

  if (startIndex < 0) {
    const suffix = source.trimEnd().length > 0 ? '\n\n' : '';
    return `${source.trimEnd()}${suffix}## ${headingTitle}\n${replacement}\n`;
  }

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (/^\s*##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }
  const next = [
    ...lines.slice(0, startIndex + 1),
    ...replacementLines,
    ...lines.slice(endIndex),
  ].join('\n');
  return next.endsWith('\n') ? next : `${next}\n`;
}

function parseChecklistWhatToTest(checklistText) {
  const body = sectionBodyByHeading(checklistText, /^\s*##\s+What to test\s*$/i);
  if (!body) return [];
  const out = [];
  for (const line of body.split('\n')) {
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)\s*$/);
    if (numbered) {
      out.push(String(numbered[1] || '').trim());
      continue;
    }
    const bullet = line.match(/^\s*-\s+(.+)\s*$/);
    if (bullet) {
      out.push(String(bullet[1] || '').trim());
    }
  }
  return [...new Set(out.filter(Boolean))].slice(0, 32);
}

function parseChecklistResultState(checklistText) {
  const hasResultSection = /^\s*##\s+Result\s*$/im.test(String(checklistText || ''));
  const resultBody = sectionBodyByHeading(checklistText, /^\s*##\s+Result\s*$/i);
  if (!hasResultSection) return 'missing_result_section';
  if (!resultBody) return 'unresolved';
  const explicitStatus = resultBody.match(/^\s*Status\s*:\s*(Pass|Fail|Pending)\s*$/im);
  if (explicitStatus) {
    const value = explicitStatus[1].toLowerCase();
    return value === 'pending' ? 'unresolved' : value;
  }
  if (/^\s*-\s*Pass\s*\/\s*Fail\b/im.test(resultBody)) return 'unresolved';
  if (/^\s*-\s*Fail\b/im.test(resultBody)) return 'fail';
  if (/^\s*-\s*Pass\b/im.test(resultBody)) return 'pass';
  return 'unresolved';
}

function parseChecklistSliceMetadata(checklistText) {
  const body = sectionBodyByHeading(checklistText, /^\s*##\s+Slice\s*$/i);
  const idMatch = body.match(/^\s*-\s*ID\s*:\s*([^\n]+)\s*$/im);
  const titleMatch = body.match(/^\s*-\s*Title\s*:\s*([^\n]+)\s*$/im);
  return {
    id: idMatch ? String(idMatch[1] || '').trim() : '',
    title: titleMatch ? String(titleMatch[1] || '').trim() : '',
  };
}

function parseExpectedResultLines(checklistText) {
  const body = sectionBodyByHeading(checklistText, /^\s*##\s+Expected results\s*$/i);
  if (!body) return [];
  const lines = String(body || '').replace(/\r\n?/g, '\n').split('\n');
  return lines
    .map((line) => line.match(/^\s*-\s+(.*)\s*$/)?.[1] || '')
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function isGenericInvariantLine(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return (
    /^app loads without blank screen or runtime error\b/.test(normalized)
    || /^the onboarding entry screen is visible and clear\b/.test(normalized)
  );
}

function collectCarryForwardInvariants({ targetRoot, activeSliceId }) {
  const testingDir = path.join(targetRoot, 'docs/testing');
  if (!fs.existsSync(testingDir)) return [];
  const files = fs.readdirSync(testingDir)
    .filter((name) => /^SL-[A-Za-z0-9_-]+-user-checklist\.md$/i.test(name))
    .sort();

  const invariants = [];
  for (const file of files) {
    const absPath = path.join(testingDir, file);
    const text = readText(absPath);
    const resultState = parseChecklistResultState(text);
    if (resultState !== 'pass') continue;
    const meta = parseChecklistSliceMetadata(text);
    const sliceId = String(meta.id || '').trim();
    if (!sliceId || sliceId === String(activeSliceId || '').trim()) continue;
    const expected = parseExpectedResultLines(text).filter((line) => !isGenericInvariantLine(line));
    const whatToTest = parseChecklistWhatToTest(text).filter((line) => !isGenericInvariantLine(line));
    const assertions = [...new Set([...expected, ...whatToTest])].slice(0, 8);
    if (assertions.length === 0) continue;
    invariants.push({
      sliceId,
      title: meta.title || sliceId,
      assertions,
    });
  }
  return invariants;
}

function slugifySliceTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'slice';
}

function validateCarryForwardRegressionEvidence({ targetRoot, slice, invariants }) {
  if (!Array.isArray(invariants) || invariants.length === 0) {
    return { issues: [], testRelPath: '' };
  }
  const testRelPath = `tests/${slugifySliceTitle(slice?.title || '')}/carry-forward-invariants.test.mjs`;
  const testAbsPath = path.join(targetRoot, testRelPath);
  if (!fs.existsSync(testAbsPath)) {
    return {
      testRelPath,
      issues: [`missing carry-forward regression evidence file: ${testRelPath}`],
    };
  }
  const text = readText(testAbsPath);
  const missingSlices = invariants
    .map((entry) => String(entry.sliceId || '').trim())
    .filter(Boolean)
    .filter((sliceId) => !text.includes(sliceId));
  if (missingSlices.length > 0) {
    return {
      testRelPath,
      issues: [
        `carry-forward regression file ${testRelPath} does not reference prior passed slices: ${missingSlices.join(', ')}`,
      ],
    };
  }
  return { issues: [], testRelPath };
}

function extractChangedFilesFromImplementationNotes(notesText) {
  const lines = String(notesText || '').split('\n');
  const out = [];
  let inChangedFilesSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inChangedFilesSection && /^##\s*5\.\s*Changed Files\s*$/i.test(trimmed)) {
      inChangedFilesSection = true;
      continue;
    }
    if (!inChangedFilesSection) {
      continue;
    }
    if (/^##\s+\d+\.\s+/i.test(trimmed)) {
      break;
    }
    const match = line.match(/^\s*-\s+(.*)$/);
    if (match && String(match[1]).trim().length > 0) {
      out.push(String(match[1]).trim());
    }
  }
  return [...new Set(out)];
}

function loadSourceContexts(targetRoot, implementationNotesText) {
  const changedFiles = extractChangedFilesFromImplementationNotes(implementationNotesText);
  const preferred = [...changedFiles];
  if (!preferred.includes('src/App.jsx')) preferred.push('src/App.jsx');
  const contexts = [];
  for (const relPath of preferred.slice(0, 10)) {
    const absPath = path.join(targetRoot, relPath);
    if (!fs.existsSync(absPath)) continue;
    let text = '';
    try {
      text = readText(absPath);
    } catch (_) {
      continue;
    }
    const snippet = String(text || '').slice(0, 5000).trim();
    if (!snippet) continue;
    contexts.push({ relPath, snippet });
  }
  return contexts;
}

function normalizeClassification(value) {
  const upper = String(value || '').trim().toUpperCase();
  if (upper === 'A' || upper === 'B' || upper === 'C') return upper;
  return 'A';
}

function normalizeFindings(findings = []) {
  const out = [];
  for (const entry of findings) {
    const finding = String(entry?.finding || '').trim();
    const expected = String(entry?.expected || '').trim();
    const observed = String(entry?.observed || '').trim();
    const requiredRepair = String(entry?.required_repair || '').trim();
    if (!finding && !expected && !observed && !requiredRepair) continue;
    out.push({
      classification: normalizeClassification(entry?.classification),
      finding: finding || 'Checklist expectation appears unmet.',
      expected: expected || 'Behavior should match the current slice checklist.',
      observed: observed || 'Observed behavior does not fully match checklist intent.',
      required_repair: requiredRepair || 'Implement the missing behavior and verify against checklist steps.',
      auto_repairable: Boolean(entry?.auto_repairable),
    });
  }
  return out.slice(0, 12);
}

function renderManualQaFindingsBody(findings = []) {
  const lines = [
    '',
    'Use this section when manual review finds something that should be repaired before closeout.',
    'If the checklist passes, leave this section as `None.`',
    '',
  ];
  if (!Array.isArray(findings) || findings.length === 0) {
    lines.push('None.', '');
    return lines.join('\n');
  }
  for (let index = 0; index < findings.length; index += 1) {
    const item = findings[index];
    const cls = normalizeClassification(item.classification);
    lines.push(`### Finding ${index + 1}`);
    lines.push('');
    lines.push('Classification:');
    lines.push(`- [${cls === 'A' ? 'x' : ' '}] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.`);
    lines.push(`- [${cls === 'B' ? 'x' : ' '}] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.`);
    lines.push(`- [${cls === 'C' ? 'x' : ' '}] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.`);
    lines.push('');
    lines.push('Finding:');
    lines.push(`- ${String(item.finding || '').trim()}`);
    lines.push('');
    lines.push('Expected:');
    lines.push(`- ${String(item.expected || '').trim()}`);
    lines.push('');
    lines.push('Observed:');
    lines.push(`- ${String(item.observed || '').trim()}`);
    lines.push('');
    lines.push('Required repair:');
    lines.push(`- ${String(item.required_repair || '').trim()}`);
    lines.push('');
  }
  return lines.join('\n');
}

function renderResultBody(status) {
  const normalized = String(status || '').toLowerCase() === 'pass' ? 'Pass' : 'Fail';
  return [
    `Status: ${normalized}`,
    '',
    'Use one of:',
    '- Pending',
    '- Pass',
    '- Fail',
    '',
  ].join('\n');
}

function renderTesterReviewMarkdown(review) {
  const lines = [
    '# Tester Validation Report - Current Slice',
    '',
    `- Status: \`${review.status}\``,
    `- Slice: \`${review.slice_id}\` ${review.slice_title || ''}`.trimEnd(),
    `- Generated: \`${review.generated_at_utc}\``,
    `- LLM status: \`${review.llm_status}\``,
    `- LLM reviewer: ${review.llm_reviewer || '[not run]'}`,
    `- Carry-forward invariants inherited: ${String(review.carry_forward_invariants_count || 0)}`,
    `- Carry-forward evidence file: ${review.carry_forward_regression_evidence || '[not required]'}`,
    `- Findings: ${String(Array.isArray(review.findings) ? review.findings.length : 0)}`,
    '',
    '## Summary',
    '',
    review.summary || (review.status === 'pass' ? 'Tester validation passed.' : 'Tester validation failed.'),
    '',
    '## Findings',
    '',
  ];
  if (!Array.isArray(review.findings) || review.findings.length === 0) {
    lines.push('- None');
  } else {
    review.findings.forEach((finding, index) => {
      lines.push(`### ${index + 1}. ${finding.finding || 'Checklist gap'}`);
      lines.push('');
      lines.push(`- Classification: \`${finding.classification || 'A'}\``);
      lines.push(`- Expected: ${finding.expected || '[not provided]'}`);
      lines.push(`- Observed: ${finding.observed || '[not provided]'}`);
      lines.push(`- Required repair: ${finding.required_repair || '[not provided]'}`);
      lines.push(`- Auto-repairable: \`${finding.auto_repairable ? 'true' : 'false'}\``);
      lines.push('');
    });
  }
  lines.push('');
  return lines.join('\n');
}

async function runLlmTesterReview({
  targetRoot,
  values,
  slice,
  checklistRelPath,
  checklistText,
  implementationNotesRelPath,
  implementationNotesText,
  semanticReviewRelPath,
  semanticReviewJson,
  semanticContractRelPath,
  semanticContractText,
  carryForwardInvariants = [],
  carryForwardEvidence = { issues: [], testRelPath: '' },
  onProgress,
}) {
  const testerRole = loadRoleContractForModule({
    importMetaUrl: import.meta.url,
    roleId: 'tester',
    fallbackRelPath: 'team/tester.md',
  });
  const { settings, purpose } = resolveFirstValidLlmSettings(
    values,
    process.env,
    ['tester', 'review', 'uiux', 'coder', 'planning'],
  );
  const checklistItems = parseChecklistWhatToTest(checklistText);
  const sourceContexts = loadSourceContexts(targetRoot, implementationNotesText);
  const systemPrompt = [
    'You are the Tester role in a virtual software company.',
    'Validate whether the current implementation satisfies the checklist items.',
    'Enforce carry-forward behavior from previously passed slices unless explicitly redefined by the current slice.',
    'Return JSON only according to the schema.',
    'Do not invent scope outside the checklist and slice objective.',
    'If something is clearly missing or regressed, produce a finding.',
    'Use classification A for defects, B for UX/content quality issues, C for requirement-gap-like ambiguity.',
  ].join('\n');
  const userPrompt = [
    `Slice ID: ${String(slice?.id || 'UNKNOWN')}`,
    `Slice Title: ${String(slice?.title || 'Current Slice')}`,
    '',
    `Tester role contract (source: ${testerRole.relPath}):`,
    String(testerRole.roleContract || '').trim(),
    '',
    `Checklist (${checklistRelPath}):`,
    String(checklistText || '').trim(),
    '',
    `Checklist What-to-test items (${String(checklistItems.length)}):`,
    ...(checklistItems.length > 0
      ? checklistItems.map((item, index) => `${index + 1}. ${item}`)
      : ['[none parsed; inspect checklist text directly]']),
    '',
    `Implementation notes (${implementationNotesRelPath}):`,
    String(implementationNotesText || '').trim(),
    '',
    `Semantic UX review (${semanticReviewRelPath}):`,
    JSON.stringify(semanticReviewJson || {}, null, 2),
    '',
    `Semantic UX contract (${semanticContractRelPath}):`,
    String(semanticContractText || '').trim(),
    '',
    'Auto-inherited carry-forward capabilities to preserve:',
    ...(carryForwardInvariants.length > 0
      ? carryForwardInvariants.flatMap((entry) => [
        `- [${entry.sliceId}] ${entry.title}`,
        ...entry.assertions.map((assertion) => `  - ${assertion}`),
      ])
      : ['- None (no prior passed slices detected).']),
    ...(carryForwardEvidence?.testRelPath
      ? [
        '',
        `Carry-forward regression evidence file: ${carryForwardEvidence.testRelPath}`,
        ...(Array.isArray(carryForwardEvidence.issues) && carryForwardEvidence.issues.length > 0
          ? carryForwardEvidence.issues.map((issue) => `- Evidence issue: ${issue}`)
          : ['- Evidence appears present for prior passed slices.']),
      ]
      : []),
    '',
    'Relevant source snippets:',
    ...(sourceContexts.length > 0
      ? sourceContexts.flatMap((entry) => [
        `### ${entry.relPath}`,
        '```text',
        entry.snippet,
        '```',
      ])
      : ['[none available]']),
    '',
    'Decision policy:',
    '- status=pass only when checklist appears satisfied and no clear gaps remain.',
    '- status=fail when any inherited carry-forward capability appears missing or regressed.',
    '- status=fail when one or more checklist expectations are missing, broken, or clearly regressed.',
    '- Keep findings concrete and repair-oriented.',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'tester_validate_current_slice',
    caller: 'tester-validation.runLlmTesterReview',
    targetRoot,
    systemPrompt,
    userPrompt,
    schema: TESTER_REVIEW_SCHEMA,
    promptSourceFiles: [
      'docs/product/current-slice.yaml',
      checklistRelPath,
      implementationNotesRelPath,
      semanticReviewRelPath,
      semanticContractRelPath,
      ...sourceContexts.map((item) => item.relPath),
      String(testerRole.relPath || ''),
    ],
    onProgress,
  });

  const findings = normalizeFindings(output?.findings || []);
  const llmStatus = String(output?.status || 'fail').toLowerCase() === 'pass' && findings.length === 0 ? 'pass' : 'fail';
  return {
    purpose,
    settings,
    llmStatus,
    summary: String(output?.summary || '').trim(),
    findings,
  };
}

async function testerValidateCurrentSlice({ targetRoot, valuesPath, onProgress } = {}) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run tester:validate-current-slice: missing docs/product/current-slice.yaml');
  }
  const slice = parseSliceBlockWithLists(readText(currentSlicePath));
  if (!String(slice?.id || '').trim()) {
    throw new Error('Cannot run tester:validate-current-slice: active slice has no id');
  }

  const checklistRelPath = checklistRelPathForSlice(slice.id);
  const checklistPath = path.join(targetRoot, checklistRelPath);
  if (!fs.existsSync(checklistPath)) {
    throw new Error(`Cannot run tester:validate-current-slice: missing ${checklistRelPath}; run uiux:generate-current-slice-flow first`);
  }

  const implementationNotesRelPath = `docs/implementation/${normalizeSliceIdForPath(slice.id)}-implementation-notes.md`;
  const implementationNotesPath = path.join(targetRoot, implementationNotesRelPath);
  if (!fs.existsSync(implementationNotesPath)) {
    throw new Error(`Cannot run tester:validate-current-slice: missing ${implementationNotesRelPath}; run coder:prepare-current-slice first`);
  }

  const semanticReviewRelPath = semanticUxReviewJsonRelPathForSlice(slice.id);
  const semanticReviewPath = path.join(targetRoot, semanticReviewRelPath);
  if (!fs.existsSync(semanticReviewPath)) {
    throw new Error(`Cannot run tester:validate-current-slice: missing ${semanticReviewRelPath}; run uiux:review-current-slice-semantics first`);
  }

  const semanticContractRelPath = semanticUxContractRelPathForSlice(slice.id);
  const semanticContractPath = path.join(targetRoot, semanticContractRelPath);
  if (!fs.existsSync(semanticContractPath)) {
    throw new Error(`Cannot run tester:validate-current-slice: missing ${semanticContractRelPath}; run uiux:generate-current-slice-flow first`);
  }

  const checklistText = readText(checklistPath);
  const implementationNotesText = readText(implementationNotesPath);
  const semanticReviewJson = JSON.parse(readText(semanticReviewPath));
  const semanticContractText = readText(semanticContractPath);
  const values = loadValuesIfPresent(valuesPath);
  const generatedAt = new Date().toISOString();
  const carryForwardInvariants = collectCarryForwardInvariants({
    targetRoot,
    activeSliceId: slice.id,
  });
  const carryForwardEvidence = validateCarryForwardRegressionEvidence({
    targetRoot,
    slice,
    invariants: carryForwardInvariants,
  });

  if (String(semanticReviewJson?.status || '').toLowerCase() !== 'pass') {
    throw new Error(`Cannot run tester:validate-current-slice: semantic UX review is not pass in ${semanticReviewRelPath}; resolve Step 21b/21c first`);
  }

  if (typeof onProgress === 'function') {
    onProgress('running LLM tester validation...');
  }

  const llmResult = await runLlmTesterReview({
    targetRoot,
    values,
    slice,
    checklistRelPath,
    checklistText,
    implementationNotesRelPath,
    implementationNotesText,
    semanticReviewRelPath,
    semanticReviewJson,
    semanticContractRelPath,
    semanticContractText,
    carryForwardInvariants,
    carryForwardEvidence,
    onProgress,
  });

  const deterministicCarryForwardFindings = (carryForwardEvidence.issues || []).map((issue) => ({
    classification: 'A',
    finding: String(issue),
    expected: carryForwardEvidence.testRelPath
      ? `Preserve prior passed-slice capabilities and keep evidence in ${carryForwardEvidence.testRelPath}.`
      : 'Preserve prior passed-slice capabilities with explicit regression evidence.',
    observed: String(issue),
    required_repair: carryForwardEvidence.testRelPath
      ? `Add/update ${carryForwardEvidence.testRelPath} and implement missing preserved behavior from prior slices.`
      : 'Add carry-forward regression evidence and repair missing preserved behavior from prior slices.',
    auto_repairable: true,
  }));
  const combinedFindings = [...llmResult.findings, ...deterministicCarryForwardFindings].slice(0, 20);
  const status = combinedFindings.length > 0 || llmResult.llmStatus !== 'pass' ? 'fail' : 'pass';
  const review = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    slice_id: String(slice.id || 'UNKNOWN'),
    slice_title: String(slice.title || 'Current Slice'),
    status,
    summary: llmResult.summary || (status === 'pass'
      ? 'LLM tester validation passed all checklist expectations.'
      : 'LLM tester found checklist gaps that require repair.'),
    llm_status: llmResult.llmStatus,
    llm_reviewer: `${llmResult.settings.provider}/${llmResult.settings.model}`,
    checklist: checklistRelPath,
    carry_forward_invariants_count: carryForwardInvariants.length,
    carry_forward_regression_evidence: carryForwardEvidence.testRelPath || '',
    findings: combinedFindings,
  };

  let updatedChecklist = checklistText;
  updatedChecklist = replaceSectionBody(
    updatedChecklist,
    /^\s*##\s+Result\s*$/i,
    'Result',
    renderResultBody(status),
  );
  updatedChecklist = replaceSectionBody(
    updatedChecklist,
    /^\s*##\s+Manual QA Findings\s*$/i,
    'Manual QA Findings',
    renderManualQaFindingsBody(review.findings),
  );
  writeTextAtomic(checklistPath, updatedChecklist.endsWith('\n') ? updatedChecklist : `${updatedChecklist}\n`);

  const jsonRelPath = testerReviewJsonRelPathForSlice(slice.id);
  const mdRelPath = testerReviewMdRelPathForSlice(slice.id);
  writeTextAtomic(path.join(targetRoot, jsonRelPath), `${JSON.stringify(review, null, 2)}\n`);
  writeTextAtomic(path.join(targetRoot, mdRelPath), renderTesterReviewMarkdown(review));

  const label = review.status === 'pass' ? 'PASS' : 'FAIL';
  console.log(`fabric tester:validate-current-slice: ${label}`);
  console.log(`- slice: ${review.slice_id} ${review.slice_title}`);
  console.log(`- status: ${review.status}`);
  console.log(`- findings: ${String(review.findings.length)}`);
  console.log(`- wrote: ${jsonRelPath}`);
  console.log(`- wrote: ${mdRelPath}`);
  console.log(`- updated: ${checklistRelPath}`);
  if (review.status !== 'pass') {
    console.log('- next: run coder:repair-implementation-findings to address tester findings');
    console.log('  ./fabric/company/v1/fabric coder:repair-implementation-findings --target . --values ./fabric.values.json');
    const error = new Error(`tester validation failed with ${String(review.findings.length)} finding(s)`);
    error.alreadyLogged = true;
    error.code = 'TESTER_VALIDATION_FAILED';
    throw error;
  }
  return review;
}

export {
  testerValidateCurrentSlice,
};
