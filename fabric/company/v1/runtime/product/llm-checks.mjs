import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { readText, ensureDir, loadValues } from '../lib/core.mjs';
import { getLlmCheckReport, runPostEditSemanticValidation } from '../lib/llm/brief-draft.mjs';

function readOptionalMarkdown(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return readText(filePath);
}


function normalizeCustomerReviewLine(value, fallback = 'none') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || String(fallback || 'none');
}


function customerReviewIssueKey(entry) {
  return [
    String(entry?.rule || '').trim().toLowerCase(),
    String(entry?.section || '').trim().toLowerCase(),
    String(entry?.line || '').trim().toLowerCase(),
  ].join('||');
}


function formatCustomerReviewSuggestionText(entry) {
  if (!entry) return 'none';
  const bestWayForward = normalizeCustomerReviewLine(entry.best_way_forward, 'none');
  const confidence = normalizeCustomerReviewLine(entry.confidence, 'medium');
  const rationale = normalizeCustomerReviewLine(entry.rationale, 'none');
  const implementationNote = normalizeCustomerReviewLine(entry.implementation_note, 'none');
  return `${bestWayForward} (confidence=${confidence}; rationale=${rationale}; implementation note=${implementationNote})`;
}


function buildCustomerReviewEntries(issueList, suggestionList) {
  const issues = Array.isArray(issueList) ? issueList : [];
  const suggestions = Array.isArray(suggestionList) ? suggestionList : [];
  const suggestionsByIssue = new Map();

  for (const suggestion of suggestions) {
    const key = customerReviewIssueKey(suggestion);
    if (!suggestionsByIssue.has(key)) suggestionsByIssue.set(key, []);
    suggestionsByIssue.get(key).push(suggestion);
  }

  return issues.map((issue) => {
    const key = customerReviewIssueKey(issue);
    const matches = suggestionsByIssue.get(key) || [];
    const suggestionText = matches.length > 0
      ? matches.map((entry) => formatCustomerReviewSuggestionText(entry)).join(' | ')
      : 'none';
    return {
      finding: normalizeCustomerReviewLine(`[${issue.rule}] ${issue.section}: "${issue.line}"`),
      recommendedFix: normalizeCustomerReviewLine(issue.recommended_fix, 'none'),
      suggestion: normalizeCustomerReviewLine(suggestionText),
    };
  });
}


function appendPostEditSemanticValidationRun({
  targetRoot,
  briefPath,
  verdict,
  findings,
  suggestions,
}) {
  const outPath = path.join(targetRoot, 'docs/reviews/product-manager/brief-clarity-review.md');
  ensureDir(outPath);
  const timestamp = new Date().toISOString();
  const issueList = Array.isArray(findings) ? findings : [];
  const suggestionList = Array.isArray(suggestions) ? suggestions : [];
  const briefRelPath = path.relative(targetRoot, briefPath);
  const runLines = [
    `### Run ${timestamp}`,
    '',
    `- Input brief path: \`${briefRelPath}\``,
    '- Mode: `semantic_only`',
    `- Verdict: \`${verdict}\``,
    `- Issue count: \`${String(issueList.length)}\``,
    '',
  ];

  const customerReviewEntries = buildCustomerReviewEntries(issueList, suggestionList);
  runLines.push('# FOR CUSTOMER REVIEW:', '');
  if (customerReviewEntries.length === 0) {
    runLines.push('None.', '');
  } else {
    customerReviewEntries.forEach((item, index) => {
      runLines.push(`${String(index + 1)})`);
      runLines.push(`\tFinding: ${item.finding}`);
      runLines.push(`\tRecommended fix: ${item.recommendedFix}`);
      runLines.push(`\tSuggestion: ${item.suggestion}`);
      runLines.push('');
    });
  }

  const runBlock = `${runLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
  if (!fs.existsSync(outPath)) {
    const initial = [
      '# Brief Clarity Review',
      '',
      '## Post-Edit Semantic Validation Runs',
      '',
      runBlock.trimEnd(),
      '',
    ].join('\n');
    fs.writeFileSync(outPath, initial, 'utf8');
    return outPath;
  }

  const existing = readText(outPath);
  const hasPostEditSection = /^##\s+Post-Edit Semantic Validation Runs\s*$/m.test(existing);
  const sectionPrefix = hasPostEditSection
    ? '\n\n'
    : '\n\n## Post-Edit Semantic Validation Runs\n\n';
  fs.appendFileSync(outPath, `${sectionPrefix}${runBlock}`, 'utf8');
  return outPath;
}


function llmCheck({ targetRoot, valuesPath }) {
  const values = valuesPath && fs.existsSync(valuesPath) ? loadValues(valuesPath) : {};
  const report = getLlmCheckReport(values);
  if (!report.validation.ok) {
    console.error('fabric llm:check: FAILED');
    for (const error of report.validation.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('fabric llm:check: OK');
  console.log(`- provider: ${report.settings.provider}`);
  console.log(`- model: ${report.settings.model}`);
  if (report.settings.apiKeyEnv) console.log(`- api key env: ${report.settings.apiKeyEnv}`);
  console.log(`- brief quality gate: ${report.settings.briefQualityGateEnabled ? 'enabled' : 'disabled'}`);
  console.log(`- brief retry count: ${String(report.settings.briefRetryCount)}`);
  console.log(`- semantic clarity gate: ${report.settings.semanticClarityGateEnabled ? 'enabled' : 'disabled'}`);
}


async function pmBriefSemanticCheck({ targetRoot, valuesPath, briefPath }) {
  const defaultBriefRelPath = 'docs/reviews/product-manager/project-brief.failed.md';
  const requestedBriefPath = String(briefPath || defaultBriefRelPath).trim() || defaultBriefRelPath;
  const inputBriefPath = path.resolve(targetRoot, requestedBriefPath);
  const inputBriefRelPath = path.relative(targetRoot, inputBriefPath);
  const evidencePath = path.join(targetRoot, 'docs/product/source-evidence-pack.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  const synthesisPath = path.join(targetRoot, 'docs/product/source-synthesis.md');

  console.log('fabric pm:brief-semantic-check: starting');
  console.log(`- target root: ${targetRoot}`);
  console.log(`- file checked: ${inputBriefRelPath}`);
  if (!fs.existsSync(inputBriefPath)) {
    console.error('fabric pm:brief-semantic-check: FAILED');
    console.error(`- missing brief file: ${inputBriefRelPath}`);
    process.exit(1);
  }
  const briefMarkdown = readText(inputBriefPath);
  if (briefMarkdown.trim().length === 0) {
    console.error('fabric pm:brief-semantic-check: FAILED');
    console.error(`- brief file is empty: ${inputBriefRelPath}`);
    process.exit(1);
  }

  const evidenceContext = readOptionalMarkdown(evidencePath);
  const framingContext = readOptionalMarkdown(framingPath);
  const synthesisContext = readOptionalMarkdown(synthesisPath);
  console.log(`- evidence context: ${evidenceContext.trim().length > 0 ? 'present' : 'missing (optional)'}`);
  console.log(`- framing context: ${framingContext.trim().length > 0 ? 'present' : 'missing (optional)'}`);
  console.log(`- synthesis context: ${synthesisContext.trim().length > 0 ? 'present' : 'missing (optional)'}`);

  const values = valuesPath && fs.existsSync(valuesPath) ? loadValues(valuesPath) : {};
  try {
    const outcome = await runPostEditSemanticValidation({
      targetRoot,
      values,
      briefMarkdown,
      evidenceContext,
      framingContext,
      synthesisContext,
      onProgress: (message) => console.log(`  - ${message}`),
    });
    const verdict = outcome.review.ok ? 'pass' : 'fail';
    const reviewPath = appendPostEditSemanticValidationRun({
      targetRoot,
      briefPath: inputBriefPath,
      verdict,
      findings: outcome.findings,
      suggestions: outcome.suggestions,
    });

    console.log(`- semantic verdict: ${verdict}`);
    console.log(`- issue count: ${String(outcome.review.issues.length)}`);
    console.log(`- review file path: ${path.relative(targetRoot, reviewPath)}`);
    if (!outcome.review.ok) {
      process.exit(1);
    }
    console.log('fabric pm:brief-semantic-check: OK');
  } catch (error) {
    console.error('fabric pm:brief-semantic-check: FAILED');
    console.error(`- ${String(error?.message || error)}`);
    process.exit(1);
  }
}

export {
  llmCheck,
  pmBriefSemanticCheck,
};
