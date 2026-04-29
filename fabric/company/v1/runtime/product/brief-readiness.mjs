import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import {
  readText,
  ensureDir,
  customerInputEvidenceFiles,
} from '../lib/core.mjs';
import { evaluateBriefInputCoverage } from './evidence-reader.mjs';

const BRIEF_READINESS_REVIEW_REL_PATH = 'docs/reviews/product-manager/brief-readiness-review.md';
const BRIEF_READINESS_SNAPSHOT_REL_PATH = 'docs/reviews/product-manager/brief-readiness-snapshot.json';
const CUSTOMER_INFORMATION_REQUEST_REL_PATH = 'docs/reviews/product-manager/customer-information-request.md';

function normalizeRelPath(relPath) {
  return String(relPath || '').replaceAll(path.sep, '/');
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function collectReadinessFingerprintRelPaths(targetRoot) {
  const relPaths = new Set();
  const intakeNoteRelPath = 'docs/product/intake-note.md';
  const intakeNotePath = path.join(targetRoot, intakeNoteRelPath);
  if (fs.existsSync(intakeNotePath) && fs.statSync(intakeNotePath).isFile()) {
    relPaths.add(intakeNoteRelPath);
  }

  for (const rel of customerInputEvidenceFiles(targetRoot)) {
    relPaths.add(normalizeRelPath(path.posix.join('docs/customer-input', rel)));
  }

  const intakeSourcesRelPath = 'docs/pm/intake/sources.json';
  const intakeReportRelPath = 'docs/pm/intake/intake-report.md';
  const intakeSourcesPath = path.join(targetRoot, intakeSourcesRelPath);
  const intakeReportPath = path.join(targetRoot, intakeReportRelPath);
  if (fs.existsSync(intakeSourcesPath) && fs.statSync(intakeSourcesPath).isFile()) {
    relPaths.add(intakeSourcesRelPath);
  }
  if (fs.existsSync(intakeReportPath) && fs.statSync(intakeReportPath).isFile()) {
    relPaths.add(intakeReportRelPath);
  }

  const extractedRootRelPath = 'docs/pm/intake/extracted-text';
  const extractedRoot = path.join(targetRoot, extractedRootRelPath);
  if (fs.existsSync(extractedRoot) && fs.statSync(extractedRoot).isDirectory()) {
    for (const fileName of fs.readdirSync(extractedRoot)) {
      const absPath = path.join(extractedRoot, fileName);
      if (!fs.statSync(absPath).isFile()) {
        continue;
      }
      relPaths.add(normalizeRelPath(path.posix.join(extractedRootRelPath, fileName)));
    }
  }

  return [...relPaths].sort((a, b) => a.localeCompare(b));
}

function buildReadinessInputFingerprint(targetRoot) {
  const relPaths = collectReadinessFingerprintRelPaths(targetRoot);
  const files = [];
  let totalBytes = 0;

  for (const relPath of relPaths) {
    const absPath = path.join(targetRoot, relPath);
    const content = fs.readFileSync(absPath);
    totalBytes += content.length;
    files.push({
      path: normalizeRelPath(relPath),
      sizeBytes: content.length,
      sha256: sha256Hex(content),
    });
  }

  const material = {
    schemaVersion: 1,
    files,
  };

  return {
    schemaVersion: 1,
    fileCount: files.length,
    totalBytes,
    sha256: sha256Hex(JSON.stringify(material)),
    files,
  };
}

function summarizeReadinessFailure(analysis) {
  const lines = [];
  if (analysis.unreadableFiles.length > 0) {
    lines.push(`unreadable files: ${analysis.unreadableFiles.length}`);
    for (const file of analysis.unreadableFiles) {
      lines.push(`  - docs/customer-input/${file.path}: ${file.reason}`);
    }
  }
  if (analysis.missingDimensions.length > 0) {
    if (analysis.missingRequiredDimensions.length > 0) {
      lines.push('missing required coverage dimensions:');
      for (const dim of analysis.missingRequiredDimensions) {
        lines.push(`  - ${dim.label}`);
      }
    }
    if (analysis.warningDimensions.length > 0) {
      lines.push('warning-only missing coverage dimensions:');
      for (const dim of analysis.warningDimensions) {
        lines.push(`  - ${dim.label}`);
      }
    }
  }
  if (!analysis.hasMinimumContentVolume) {
    lines.push(
      `combined readable content too small: ${String(analysis.totalChars)} chars (required >= 400)`,
    );
  }
  return lines;
}

function logReadinessWarnings(analysis) {
  if (analysis.warningDimensions.length > 0) {
    console.warn('fabric pm:brief-readiness: WARNING');
    console.warn('- non-blocking missing coverage dimensions:');
    for (const dim of analysis.warningDimensions) {
      console.warn(`  - ${dim.label}`);
    }
  }
}

function buildCustomerInformationRequests(analysis) {
  const requests = [];

  if (analysis.unreadableFiles.length > 0) {
    requests.push(
      'Provide readable source material for unreadable files (or convert each to .md/.txt) and re-run readiness check.',
    );
  }

  for (const dim of analysis.missingRequiredDimensions) {
    if (dim.id === 'problem_and_outcome') {
      requests.push(
        'Clarify the problem statement and intended business/user outcome, including success criteria.',
      );
    } else if (dim.id === 'target_users') {
      requests.push(
        'Specify primary target users/personas and their key workflows.',
      );
    } else if (dim.id === 'mvp_scope') {
      requests.push(
        'Define MVP scope: core capabilities in scope and explicit out-of-scope boundaries.',
      );
    }
  }

  if (!analysis.hasMinimumContentVolume) {
    requests.push(
      'Provide additional detail (examples, workflows, acceptance expectations) to reach minimum briefing depth.',
    );
  }

  return [...new Set(requests)];
}

function writeCustomerInformationRequest(targetRoot, requests) {
  const outPath = path.join(targetRoot, CUSTOMER_INFORMATION_REQUEST_REL_PATH);
  ensureDir(outPath);
  const timestamp = new Date().toISOString();
  const lines = [
    '# Customer Information Request',
    '',
    `Date: \`${timestamp}\``,
    'Requested by: `Product Manager`',
    'Status: `open`',
    '',
    '## Requested Information',
    '',
  ];

  if (requests.length === 0) {
    lines.push('- Additional clarification required. See readiness review for details.');
  } else {
    for (const item of requests) {
      lines.push(`- ${item}`);
    }
  }

  lines.push(
    '',
    '## Next Step',
    '',
    'After customer response is captured in `docs/customer-input/*` and/or `docs/product/intake-note.md`, re-run:',
    '',
    '`./fabric/company/v1/fabric pm:brief-readiness --target <project-root>`',
  );

  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  return outPath;
}

function writeBriefReadinessReview(targetRoot, { hasIntake, evidenceFiles, analysis }) {
  const outPath = path.join(targetRoot, BRIEF_READINESS_REVIEW_REL_PATH);
  ensureDir(outPath);
  const timestamp = new Date().toISOString();
  const verdict = analysis.sufficient ? 'sufficient' : 'insufficient';
  const lines = [
    '# Brief Readiness Review',
    '',
    `Date: \`${timestamp}\``,
    'Reviewed by: `Product Manager`',
    `Verdict: \`${verdict}\``,
    '',
    '## Input Sources Evaluated',
    '',
    `- Intake note present: \`${hasIntake ? 'yes' : 'no'}\``,
    `- Customer input documents found: \`${String(evidenceFiles.length)}\``,
    `- Customer input documents read successfully: \`${String(analysis.reviewedFiles.length)}\``,
    `- Combined readable input size: \`${String(analysis.totalChars)} chars\``,
  ];

  if (analysis.reviewedFiles.length > 0) {
    lines.push('', '### Customer Input Documents', '');
    for (const file of analysis.reviewedFiles) {
      lines.push(`- \`docs/customer-input/${file.path}\` (${file.lines} lines, ${file.chars} chars)`);
    }
  }

  if (analysis.unreadableFiles.length > 0) {
    lines.push('', '### Unreadable Customer Input Documents', '');
    for (const file of analysis.unreadableFiles) {
      lines.push(`- \`docs/customer-input/${file.path}\`: ${file.reason}`);
    }
  }

  lines.push('', '## Coverage Check', '');
  for (const item of analysis.coverage) {
    lines.push(`- ${item.label}: \`${item.matched ? 'covered' : 'missing'}\``);
  }

  lines.push('', `- Minimum content volume (>= 400 chars): \`${analysis.hasMinimumContentVolume ? 'pass' : 'fail'}\``);

  lines.push('', '## Decision');
  if (analysis.sufficient) {
    lines.push(
      '',
      '- Input is sufficient to draft a project brief.',
      '- Proceed with `./fabric/company/v1/fabric pm:brief-draft --target <project-root>`.',
    );
  } else {
    lines.push(
      '',
      '- Input is not sufficient to draft a reliable project brief.',
      '- Request additional customer information before drafting continues.',
      '- Resolve all missing coverage items and unreadable source files listed above.',
      '',
      '### Missing Information Request (Template)',
      '',
      '- Problem context and business objective',
      '- Primary user groups and workflows',
      '- MVP scope and out-of-scope boundaries',
      '- Key constraints, dependencies, and timeline expectations',
    );
  }

  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  return outPath;
}

function writeBriefReadinessSnapshot(targetRoot, {
  hasIntake,
  evidenceFiles,
  analysis,
  reviewPath,
  inputFingerprint,
}) {
  const outPath = path.join(targetRoot, BRIEF_READINESS_SNAPSHOT_REL_PATH);
  ensureDir(outPath);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'pm:brief-readiness',
    reviewPath: normalizeRelPath(path.relative(targetRoot, reviewPath)),
    verdict: analysis.sufficient ? 'sufficient' : 'insufficient',
    hasIntake,
    evidenceFiles,
    inputFingerprint,
    analysis,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return outPath;
}

function evaluateBriefReadinessSnapshot({ targetRoot, onProgress }) {
  const intakePath = path.join(targetRoot, 'docs/product/intake-note.md');
  const hasIntake = fs.existsSync(intakePath) && readText(intakePath).trim().length > 0;
  const evidenceFiles = customerInputEvidenceFiles(targetRoot);
  const intakeText = hasIntake ? readText(intakePath) : '';
  const customerInputRoot = path.join(targetRoot, 'docs/customer-input');
  const analysis = evaluateBriefInputCoverage({
    intakeText,
    customerInputRoot,
    evidenceFiles,
    onProgress,
  });

  return {
    hasIntake,
    evidenceFiles,
    intakeText,
    customerInputRoot,
    analysis,
  };
}

function readLatestBriefReadinessReview(targetRoot) {
  const reviewPath = path.join(targetRoot, BRIEF_READINESS_REVIEW_REL_PATH);
  if (!fs.existsSync(reviewPath)) {
    return null;
  }
  const text = readText(reviewPath);
  const verdictMatch = text.match(/^Verdict:\s*`?([a-zA-Z_ -]+)`?\s*$/im);
  const verdict = verdictMatch ? String(verdictMatch[1]).trim().toLowerCase() : 'unknown';
  return {
    reviewPath,
    text,
    verdict,
  };
}

function readLatestBriefReadinessSnapshot(targetRoot) {
  const snapshotPath = path.join(targetRoot, BRIEF_READINESS_SNAPSHOT_REL_PATH);
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }
  const text = readText(snapshotPath);
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Cannot run pm:brief-draft: invalid JSON in ${BRIEF_READINESS_SNAPSHOT_REL_PATH}. Re-run pm:brief-readiness.`,
    );
  }
  return {
    snapshotPath,
    data,
  };
}

function assertBriefReadinessPassed(targetRoot) {
  const review = readLatestBriefReadinessReview(targetRoot);
  if (!review) {
    throw new Error(
      `Cannot run pm:brief-draft: missing ${BRIEF_READINESS_REVIEW_REL_PATH}. Run pm:brief-readiness first.`,
    );
  }
  if (review.verdict !== 'sufficient') {
    throw new Error(
      `Cannot run pm:brief-draft: readiness verdict is '${review.verdict}', expected 'sufficient'. Fix inputs then re-run pm:brief-readiness.`,
    );
  }
  return review;
}

function assertBriefReadinessSnapshotFresh(targetRoot) {
  const snapshotRecord = readLatestBriefReadinessSnapshot(targetRoot);
  if (!snapshotRecord) {
    throw new Error(
      `Cannot run pm:brief-draft: missing ${BRIEF_READINESS_SNAPSHOT_REL_PATH}. Run pm:brief-readiness first.`,
    );
  }

  const snapshot = snapshotRecord.data || {};
  const storedFingerprint = String(snapshot?.inputFingerprint?.sha256 || '').trim();
  if (!storedFingerprint) {
    throw new Error(
      `Cannot run pm:brief-draft: readiness snapshot is missing input fingerprint at ${BRIEF_READINESS_SNAPSHOT_REL_PATH}. Re-run pm:brief-readiness.`,
    );
  }

  const currentFingerprint = buildReadinessInputFingerprint(targetRoot);
  if (storedFingerprint !== currentFingerprint.sha256) {
    throw new Error(
      [
        'Cannot run pm:brief-draft: readiness input fingerprint changed since the last readiness check.',
        `stored=${storedFingerprint.slice(0, 12)}`,
        `current=${currentFingerprint.sha256.slice(0, 12)}`,
        'Run pm:brief-readiness again to refresh the readiness gate.',
      ].join(' '),
    );
  }

  return {
    snapshotPath: snapshotRecord.snapshotPath,
    snapshot,
    currentFingerprint,
  };
}

async function pmBriefReadiness({ targetRoot }) {
  console.log('fabric pm:brief-readiness: starting');
  console.log(`- target root: ${targetRoot}`);
  console.log('- checking intake note and customer-input evidence...');
  const snapshot = evaluateBriefReadinessSnapshot({
    targetRoot,
    onProgress: (message) => console.log(`  - ${message}`),
  });

  console.log(`- intake note present: ${snapshot.hasIntake ? 'yes' : 'no'}`);
  console.log(`- customer input documents discovered: ${String(snapshot.evidenceFiles.length)}`);
  console.log('- writing brief-readiness review note...');
  const reviewPath = writeBriefReadinessReview(targetRoot, {
    hasIntake: snapshot.hasIntake,
    evidenceFiles: snapshot.evidenceFiles,
    analysis: snapshot.analysis,
  });
  const inputFingerprint = buildReadinessInputFingerprint(targetRoot);
  const snapshotPath = writeBriefReadinessSnapshot(targetRoot, {
    hasIntake: snapshot.hasIntake,
    evidenceFiles: snapshot.evidenceFiles,
    analysis: snapshot.analysis,
    reviewPath,
    inputFingerprint,
  });
  console.log(`- readiness snapshot: ${path.relative(targetRoot, snapshotPath)}`);
  console.log(`- readiness fingerprint: ${inputFingerprint.sha256.slice(0, 12)}`);

  if (!snapshot.analysis.sufficient) {
    console.error('fabric pm:brief-readiness: FAIL');
    console.error('- readiness: insufficient');
    const details = summarizeReadinessFailure(snapshot.analysis);
    for (const detail of details) {
      console.error(`- ${detail}`);
    }
    const requests = buildCustomerInformationRequests(snapshot.analysis);
    const requestPath = writeCustomerInformationRequest(targetRoot, requests);
    if (requests.length > 0) {
      console.error('- customer information requested:');
      for (const item of requests) {
        console.error(`  - ${item}`);
      }
    }
    console.error(`- review: ${path.relative(targetRoot, reviewPath)}`);
    console.error(`- information request: ${path.relative(targetRoot, requestPath)}`);
    console.error('- fix customer input before drafting');
    const error = new Error('fabric pm:brief-readiness failed: readiness is insufficient');
    error.alreadyLogged = true;
    error.code = 'FABRIC_PM_BRIEF_READINESS_FAILED';
    throw error;
  }

  logReadinessWarnings(snapshot.analysis);
  console.log('fabric pm:brief-readiness: OK');
  console.log('- readiness: sufficient');
  console.log(`- review: ${path.relative(targetRoot, reviewPath)}`);
  console.log('- no project brief was generated');
  console.log('- next: ./fabric/company/v1/fabric pm:brief-draft --target .');
}

export {
  BRIEF_READINESS_REVIEW_REL_PATH,
  BRIEF_READINESS_SNAPSHOT_REL_PATH,
  readLatestBriefReadinessReview,
  readLatestBriefReadinessSnapshot,
  assertBriefReadinessPassed,
  assertBriefReadinessSnapshotFresh,
  buildReadinessInputFingerprint,
  evaluateBriefReadinessSnapshot,
  pmBriefReadiness,
};
