import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadUtf8TextOrNull } from '../lib/core.mjs';

const BRIEF_READINESS_DIMENSIONS = [
  {
    id: 'problem_and_outcome',
    label: 'Problem and Intended Outcome',
    required: true,
    patterns: [
      /\bproblem\b/i,
      /\boutcome\b/i,
      /\bgoal\b/i,
      /\bobjective\b/i,
      /\bvalue\b/i,
      /\bsuccess\b/i,
    ],
  },
  {
    id: 'target_users',
    label: 'Target Users',
    required: true,
    patterns: [
      /\buser\b/i,
      /\baudience\b/i,
      /\bcustomer\b/i,
      /\bpersona\b/i,
      /\boperator\b/i,
    ],
  },
  {
    id: 'mvp_scope',
    label: 'MVP Scope',
    required: true,
    patterns: [
      /\bmvp\b/i,
      /\bscope\b/i,
      /\bfeature\b/i,
      /\bcapabilit(y|ies)\b/i,
      /\bmust[- ]have\b/i,
      /\bdeliverable\b/i,
    ],
  },
  {
    id: 'constraints_and_nonnegotiables',
    label: 'Constraints and Non-Negotiables',
    required: false,
    patterns: [
      /\bconstraint\b/i,
      /\bnon[- ]negotiable\b/i,
      /\bassumption\b/i,
      /\bdependency\b/i,
      /\bdeadline\b/i,
      /\bcompliance\b/i,
      /\bsecurity\b/i,
      /\bbudget\b/i,
    ],
  },
];

function readPdfText(filePath) {
  const res = spawnSync('pdftotext', ['-q', filePath, '-'], { encoding: 'utf8' });
  if (res.error) {
    if (res.error.code === 'ENOENT') {
      return { text: null, reason: 'pdftotext not available in PATH' };
    }
    return { text: null, reason: `pdftotext error: ${String(res.error.message || 'unknown')}` };
  }
  if (res.status !== 0) {
    const stderr = String(res.stderr || '').trim();
    return { text: null, reason: `pdftotext failed (exit ${String(res.status)}): ${stderr || 'no stderr'}` };
  }
  const text = String(res.stdout || '');
  if (text.trim().length === 0) {
    return { text: null, reason: 'pdf text extraction returned empty output' };
  }
  return { text, reason: null };
}


function readEvidenceText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    return readPdfText(filePath);
  }
  try {
    const text = loadUtf8TextOrNull(filePath);
    if (text == null) {
      return { text: null, reason: 'binary or non-UTF8 file' };
    }
    return { text, reason: null };
  } catch (error) {
    return { text: null, reason: `read error: ${String(error?.message || error)}` };
  }
}


function evaluateBriefInputCoverage({ intakeText, customerInputRoot, evidenceFiles, onProgress }) {
  const progress = typeof onProgress === 'function' ? onProgress : null;
  const reviewedFiles = [];
  const unreadableFiles = [];
  const texts = [];
  const documents = [];
  if (progress) {
    progress(`scanning customer input files: ${String(evidenceFiles.length)} found`);
  }

  for (let index = 0; index < evidenceFiles.length; index += 1) {
    const rel = evidenceFiles[index];
    if (progress) {
      progress(`reading customer input ${String(index + 1)}/${String(evidenceFiles.length)}: docs/customer-input/${rel}`);
    }
    const absPath = path.join(customerInputRoot, rel);
    const result = readEvidenceText(absPath);
    if (!result.text) {
      unreadableFiles.push({
        path: rel,
        reason: result.reason || 'unreadable file',
      });
      if (progress) {
        progress(`unreadable: docs/customer-input/${rel} (${result.reason || 'unreadable file'})`);
      }
      continue;
    }
    const text = result.text;
    const lines = text.split('\n').length;
    reviewedFiles.push({
      path: rel,
      chars: text.length,
      lines,
    });
    if (progress) {
      progress(`readable: docs/customer-input/${rel} (${String(lines)} lines, ${String(text.length)} chars)`);
    }
    texts.push(text);
    documents.push({
      path: `docs/customer-input/${rel}`,
      text,
    });
  }

  if (intakeText && intakeText.trim().length > 0) {
    if (progress) {
      progress(`including intake note: docs/product/intake-note.md (${String(intakeText.length)} chars)`);
    }
    texts.push(intakeText);
    documents.push({
      path: 'docs/product/intake-note.md',
      text: intakeText,
    });
  }

  const combinedText = texts.join('\n\n').toLowerCase();
  const totalChars = combinedText.length;
  const coverage = BRIEF_READINESS_DIMENSIONS.map((dimension) => {
    const matched = dimension.patterns.some((pattern) => pattern.test(combinedText));
    return {
      id: dimension.id,
      label: dimension.label,
      required: Boolean(dimension.required),
      matched,
    };
  });

  const missingDimensions = coverage.filter((c) => !c.matched);
  const missingRequiredDimensions = missingDimensions.filter((c) => c.required);
  const warningDimensions = missingDimensions.filter((c) => !c.required);
  const hasMinimumContentVolume = totalChars >= 400;
  const sufficient =
    texts.length > 0 &&
    unreadableFiles.length === 0 &&
    hasMinimumContentVolume &&
    missingRequiredDimensions.length === 0;
  if (progress) {
    progress(`coverage analysis complete: ${sufficient ? 'sufficient' : 'insufficient'}`);
    progress(`summary: readable=${String(reviewedFiles.length)}, unreadable=${String(unreadableFiles.length)}, combined_chars=${String(totalChars)}`);
  }

  return {
    reviewedFiles,
    unreadableFiles,
    coverage,
    missingDimensions,
    missingRequiredDimensions,
    warningDimensions,
    totalChars,
    hasMinimumContentVolume,
    documents,
    sufficient,
  };
}

export {
  readPdfText,
  readEvidenceText,
  evaluateBriefInputCoverage,
};
