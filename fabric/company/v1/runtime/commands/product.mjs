import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { FABRIC_ROOT } from '../lib/constants.mjs';
import {
  SLICE_LIST_FIELDS,
  readText,
  writeTextAtomic,
  ensureDir,
  loadValues,
  loadManifest,
  loadValuesIfPresent,
  metadataHeader,
  parseSectionListValues,
  parseStatusBlock,
  parseBlockScalars,
  parseSliceBlockWithLists,
  parseSliceBlock,
  parseBacklogSlices,
  normalizeWhitespace,
  listAllPlaceholderMatches,
  parseReviewAssessment,
  quoteYamlString,
  setSectionScalar,
  setSectionList,
  setTopLevelScalar,
  assertApprovedBrief,
  getBootstrapReviewRelPaths,
  customerInputEvidenceFiles,
  loadUtf8TextOrNull,
} from '../lib/core.mjs';
import {
  generateIntakeArtifactsWithModel,
  getLlmCheckReport,
  runPostEditSemanticValidation,
} from '../lib/llm/intake.mjs';
import { generateExecutionSlicePlan } from '../lib/llm/planning.mjs';
import {
  ARCHITECT_CONSULTABLE_TOKENS,
  generateArchitectValueRecommendations,
} from '../lib/llm/architect-values.mjs';
import { generateArchitectureBaselinePlaybook } from '../lib/llm/architect-baseline.mjs';
import { generateCurrentSliceUxPlaybook } from '../lib/llm/uiux-flow.mjs';

const MIN_SLICE_COUNT = 5;
const MAX_SLICE_COUNT = 8;

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

function normalizeLine(line) {
  return line
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/[`*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoiseLine(line) {
  if (!line) {
    return true;
  }
  const lower = line.toLowerCase();
  if (
    /\bconfidential\b/.test(lower) ||
    /\bmvp project document\b/.test(lower) ||
    /\ball rights reserved\b/.test(lower) ||
    /^page\s+\d+/.test(lower)
  ) {
    return true;
  }
  if (/^\d+$/.test(line)) {
    return true;
  }
  const letters = line.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 12) {
    const upper = letters.replace(/[^A-Z]/g, '').length;
    if (upper / letters.length > 0.8) {
      return true;
    }
  }
  return false;
}

function toCandidateLines(text) {
  return text
    .split('\n')
    .map(normalizeLine)
    .filter((line) => line.length >= 18 && !isNoiseLine(line));
}

function uniqueLines(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(line);
  }
  return out;
}

function findLinesByKeywords(lines, keywords) {
  return uniqueLines(
    lines.filter((line) => {
      const lower = line.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    }),
  );
}

function splitListValue(raw) {
  return raw
    .split(/,|;| and /gi)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
}

function extractUsers(lines) {
  const explicit = [];
  for (const line of lines) {
    const m = line.match(/\b(target users?|users?|audience|personas?)\b\s*:\s*(.+)$/i);
    if (m) {
      explicit.push(...splitListValue(m[2]));
    }
  }
  if (explicit.length > 0) {
    return uniqueLines(explicit).filter((x) => x.length <= 90).slice(0, 4);
  }
  const userLines = findLinesByKeywords(lines, ['user', 'audience', 'persona', 'operator']).filter(
    (line) =>
      line.length <= 120 &&
      !/\b(purpose|core promise|build|mvp scope|out of scope|product description)\b/i.test(line),
  );
  return userLines.slice(0, 3);
}

function extractScopeItems(lines) {
  const explicit = [];
  for (const line of lines) {
    const m = line.match(/\b(mvp scope|scope|features?|capabilities?|deliverables?)\b\s*:\s*(.+)$/i);
    if (m) {
      explicit.push(...splitListValue(m[2]));
    }
  }
  if (explicit.length > 0) {
    return uniqueLines(explicit).slice(0, 3);
  }
  return findLinesByKeywords(lines, ['mvp', 'scope', 'feature', 'capability', 'deliverable'])
    .filter((line) => !/\b(out of scope|principle|success criteria|target users?)\b/i.test(line))
    .slice(0, 6);
}

function extractSuccessCriteria(lines) {
  const criteria = findLinesByKeywords(lines, ['success', 'outcome', 'metric', 'kpi', '%', 'reduce', 'improve']);
  return criteria.slice(0, 3);
}

function detectSectionKey(line) {
  if (/:+\s*\S+/.test(line)) {
    return null;
  }
  const lower = line.toLowerCase();
  const heading = lower.replace(/[:.]+$/, '').trim();
  if (heading.includes('product description') || heading.includes('purpose')) {
    return 'product_description';
  }
  if (heading.includes('target users') || heading.includes('audience')) {
    return 'target_users';
  }
  if (heading.includes('core mvp scope') || heading.includes('mvp scope') || heading.includes('scope')) {
    return 'core_mvp_scope';
  }
  if (heading.includes('ux and tone') || heading.includes('user experience') || heading.includes('tone')) {
    return 'ux_tone';
  }
  if (heading.includes('product principles') || heading.includes('principles')) {
    return 'product_principles';
  }
  if (heading.includes('out of scope')) {
    return 'out_of_scope';
  }
  if (heading.includes('success criteria')) {
    return 'success_criteria';
  }
  return null;
}

function collectSectionBuckets(documents) {
  const buckets = {
    product_description: [],
    target_users: [],
    core_mvp_scope: [],
    ux_tone: [],
    product_principles: [],
    out_of_scope: [],
    success_criteria: [],
  };

  for (const doc of documents) {
    let active = null;
    const rawLines = String(doc.text || '').split('\n');
    for (const rawLine of rawLines) {
      const line = normalizeLine(rawLine);
      if (!line) {
        continue;
      }
      const section = detectSectionKey(line);
      if (section) {
        active = section;
        continue;
      }
      if (!active || isNoiseLine(line)) {
        continue;
      }
      buckets[active].push(line);
    }
  }

  for (const key of Object.keys(buckets)) {
    buckets[key] = uniqueLines(buckets[key]);
  }

  return buckets;
}

function humanizeValue(value, fallback) {
  const raw = String(value || fallback || '');
  return raw
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTechValue(value, fallback) {
  const raw = String(value || fallback || '').toLowerCase();
  const known = {
    saas_web_app: 'SaaS web app',
    web_application: 'Web application',
    mobile_application: 'Mobile application',
    nodejs_typescript: 'Node.js + TypeScript',
    react_typescript: 'React + TypeScript',
    postgres: 'Postgres',
    modular_monolith: 'Modular monolith',
  };
  if (known[raw]) {
    return known[raw];
  }
  return humanizeValue(value, fallback);
}

function takeBestLines(lines, count, minLength = 18) {
  return uniqueLines(lines.filter((line) => line.length >= minLength && !isNoiseLine(line))).slice(0, count);
}

function cleanProjectName(value) {
  return String(value || '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferProjectNameFromDocuments(documents, allLines) {
  const candidates = [];

  for (const doc of documents) {
    const lines = String(doc.text || '').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }
      const headingMatch = line.match(/app factory input brief\s*[—-]\s*(.+)$/i);
      if (headingMatch) {
        candidates.push(cleanProjectName(headingMatch[1]));
      }
      const projectMatch = line.match(/^\s*project(?:\s+candidate)?\s*:\s*(.+)$/i);
      if (projectMatch) {
        candidates.push(cleanProjectName(projectMatch[1]));
      }
      const buildMatch = line.match(/\bbuild\s+([A-Z][A-Za-z0-9][A-Za-z0-9 \-]{2,60}?)(?:,|\s+that|\s+which|\.|$)/);
      if (buildMatch) {
        candidates.push(cleanProjectName(buildMatch[1]));
      }
      const productNamedMatch = line.match(/\b(?:app|product|platform|os)\s*[:\-]\s*([A-Z][A-Za-z0-9][A-Za-z0-9 \-]{2,80})/i);
      if (productNamedMatch) {
        candidates.push(cleanProjectName(productNamedMatch[1]));
      }
    }
  }

  for (const line of allLines) {
    const projectMatch = line.match(/^\s*Project(?:\s+Candidate)?\s*:\s*(.+)$/i);
    if (projectMatch) {
      candidates.push(cleanProjectName(projectMatch[1]));
    }
    const titleLikeMatch = line.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}\s+(?:OS|App|Platform))\b/);
    if (titleLikeMatch) {
      candidates.push(cleanProjectName(titleLikeMatch[1]));
    }
  }

  for (const doc of documents) {
    const topLines = String(doc.text || '')
      .split('\n')
      .map((l) => cleanProjectName(l))
      .filter((l) => l.length >= 6 && l.length <= 80 && !isNoiseLine(l))
      .slice(0, 20);
    for (const line of topLines) {
      const topTitleMatch = line.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5}(?:\s+(?:OS|App|Platform))?)\b/);
      if (!topTitleMatch) {
        continue;
      }
      const maybe = cleanProjectName(topTitleMatch[1]);
      if (/\b(project|brief|input|document|mvp)\b/i.test(maybe)) {
        continue;
      }
      candidates.push(maybe);
    }
  }

  return uniqueLines(candidates.filter((c) => c.length >= 3 && c.length <= 80))[0] || null;
}

function containsPhrase(text, phrase) {
  if (!text || !phrase) {
    return false;
  }
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function resolveProjectName({ valuesProjectName, inferredProjectName, combinedText }) {
  const valueName = cleanProjectName(valuesProjectName);
  const inferredName = cleanProjectName(inferredProjectName);
  const placeholders = new Set(['asset risk manager', 'tbd project', 'project']);

  if (!valueName) {
    return inferredName || 'Project to be confirmed';
  }
  if (!inferredName) {
    return valueName;
  }
  if (placeholders.has(valueName.toLowerCase())) {
    return inferredName;
  }
  const valueInDocs = containsPhrase(combinedText, valueName);
  const inferredInDocs = containsPhrase(combinedText, inferredName);
  if (!valueInDocs && inferredInDocs) {
    return inferredName;
  }
  return valueName;
}

function composeProductDescription({
  projectName,
  problemOutcome,
  allLines,
  scopeCapabilities,
}) {
  const definitionSignals = findLinesByKeywords(
    allLines,
    ['build', 'helps', 'guide', 'what', 'when', 'why', 'proactive', 'prevention', 'clarity', 'execution', 'not a medical record', 'core promise'],
  );
  const flowSignals = findLinesByKeywords(
    allLines,
    ['onboarding', 'profile', 'checklist', 'dashboard', 'next best action', 'priorit', 'now / soon / later', 'today / soon / later', 'mark', 'reminder', 'family', 'plan'],
  );

  function sanitizeSentenceArtifacts(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/^(purpose|core promise|product description|description)\s*:\s*/i, '')
      .replace(/\s+,/g, ',')
      .replace(/,+\s*$/g, '')
      .replace(/,\s*\./g, '.')
      .replace(/\.\.+/g, '.')
      .replace(/!\./g, '!')
      .replace(/\?\./g, '?')
      .replace(/\s+([.?!,;:])/g, '$1')
      .trim();
  }

  function isCompleteSentenceCandidate(text) {
    const cleaned = sanitizeSentenceArtifacts(text).toLowerCase();
    if (!cleaned || cleaned.length < 24) {
      return false;
    }
    if (/[:;]\s*$/.test(cleaned)) {
      return false;
    }
    if (/\b(on|when|with|for|to|at|from|by|about|into|focused on)\.?$/.test(cleaned)) {
      return false;
    }
    if (/^(purpose|core promise|target users?|mvp scope|scope detail|features?|success criteria|out of scope)\b/.test(cleaned)) {
      return false;
    }
    return true;
  }

  function asSentence(text) {
    const cleaned = sanitizeSentenceArtifacts(cleanLeadingLabel(text));
    if (!cleaned) {
      return '';
    }
    const first = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return /[.!?]$/.test(first) ? first : `${first}.`;
  }

  function isNarrativeCandidate(line) {
    const lower = String(line || '').toLowerCase();
    if (!line || !isCompleteSentenceCandidate(line)) {
      return false;
    }
    if (/^(target users?|mvp scope|scope detail|features?|capabilities?|success criteria|out of scope|constraints|dependencies)/i.test(line)) {
      return false;
    }
    if (/,\s*[^,]+,\s*[^,]+/.test(line) && !/\b(helps|guide|show|allow|generate|prioriti|deliver|support|provide)\b/i.test(lower)) {
      return false;
    }
    return /\b(is|are|helps|guide|deliver|provide|show|allow|generate|prioriti|support|lets)\b/i.test(lower);
  }

  function pickUniqueNarrative(lines, count) {
    const out = [];
    const seen = new Set();
    for (const line of lines) {
      if (!isNarrativeCandidate(line)) {
        continue;
      }
      const cleaned = asSentence(line);
      if (!cleaned) {
        continue;
      }
      if (!isCompleteSentenceCandidate(cleaned)) {
        continue;
      }
      const key = cleaned.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(cleaned);
      if (out.length >= count) {
        break;
      }
    }
    return out;
  }

  const definitionLead = definitionSignals.find((line) => /\bbuild\b/i.test(line)) || problemOutcome.find((line) => line.length >= 24) || '';
  const definitionSentence1 = definitionLead
    ? asSentence(`Build **${projectName}**, ${sanitizeSentenceArtifacts(definitionLead).replace(/^build\s+/i, '')}`)
    : asSentence(`Build **${projectName}**, a focused product that turns customer intent into practical user value`);
  const extraDefinition = pickUniqueNarrative(definitionSignals, 2);
  const definitionSentence2 = extraDefinition[0]
    ? asSentence(extraDefinition[0])
    : asSentence('The product should guide users on what to do next, when to do it, and why it matters');
  const definitionSentence3 = extraDefinition[1]
    ? asSentence(extraDefinition[1])
    : asSentence('The experience should remain clear, trustworthy, and operationally simple');

  const capabilityPreview = scopeCapabilities.slice(0, 3).map((c) => c.title).join(', ');
  const flowSentence1 = capabilityPreview
    ? asSentence(`The MVP should deliver clear value immediately after onboarding through ${capabilityPreview}`)
    : asSentence('The MVP should deliver clear value immediately after onboarding with prioritized, actionable guidance');
  const extraFlow = pickUniqueNarrative(flowSignals, 2);
  const flowSentence2 = extraFlow[0]
    ? asSentence(extraFlow[0])
    : asSentence('Users should receive a prioritized action plan and understand why each action matters');
  const flowSentence3 = extraFlow[1]
    ? asSentence(extraFlow[1])
    : asSentence('Users should be able to complete actions, track progress, and schedule reminders without friction');

  const paragraph1 = [definitionSentence1, definitionSentence2, definitionSentence3]
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
  const paragraph2 = [flowSentence1, flowSentence2, flowSentence3]
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');

  return [paragraph1, '', paragraph2].join('\n');
}

function stripLeadLabel(line) {
  return String(line || '')
    .replace(/^(problem|purpose|outcome|goal|objective|target users?|users?|mvp scope|scope|features?|principles?|success criteria)\s*:\s*/i, '')
    .trim();
}

function toSentence(line) {
  const cleaned = stripLeadLabel(normalizeLine(line));
  if (!cleaned) {
    return '';
  }
  if (/[.!?]$/.test(cleaned)) {
    return cleaned;
  }
  return `${cleaned}.`;
}

function titleCaseWord(word) {
  if (!word) {
    return '';
  }
  return word[0].toUpperCase() + word.slice(1);
}

function toScopeSentence(item) {
  const cleaned = stripLeadLabel(item);
  if (!cleaned) {
    return '';
  }
  if (cleaned.split(' ').length <= 4) {
    return `Provide ${cleaned} with clear user action and status visibility.`;
  }
  return toSentence(cleaned);
}

function cleanLeadingLabel(line) {
  return line
    .replace(/^(purpose|core promise|problem|outcome goal|target users?|mvp scope and features|scope and features|features?|capabilities?|success criteria|out of scope|constraints and non-negotiables|dependencies and assumptions)\s*:\s*/i, '')
    .trim();
}

function sentenceCase(line) {
  const trimmed = cleanLeadingLabel(String(line || '').trim());
  if (!trimmed) {
    return '';
  }
  const normalized = trimmed.replace(/\s+/g, ' ');
  const first = normalized.charAt(0).toUpperCase();
  const rest = normalized.slice(1);
  const withPeriod = /[.!?]$/.test(rest) ? `${first}${rest}` : `${first}${rest}.`;
  return withPeriod;
}

function normalizeBullet(line) {
  return sentenceCase(String(line || '').replace(/[.;]+$/, ''));
}

function normalizeScopeItem(line) {
  const cleaned = cleanLeadingLabel(line).replace(/\b(today|now)\s*\/\s*(soon|later)\b/gi, 'Now / Soon / Later');
  return sentenceCase(cleaned);
}

function titleCaseText(value) {
  return String(value || '')
    .split(/\s+/)
    .map((token) => {
      if (!token) {
        return token;
      }
      const lower = token.toLowerCase();
      if (['and', 'or', 'of', 'for', 'to', 'the', 'a'].includes(lower)) {
        return lower;
      }
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\bMvp\b/g, 'MVP')
    .replace(/\bUx\b/g, 'UX');
}

function parseScopedList(line) {
  const m = String(line || '').match(/\b(mvp scope(?: and features)?|scope(?: detail)?|features?|capabilities?|deliverables?)\b\s*:\s*(.+)$/i);
  if (!m) {
    return [];
  }
  return splitListValue(m[2]).map((item) => cleanLeadingLabel(item));
}

function isScopeNoise(line) {
  const lower = String(line || '').toLowerCase();
  return [
    'backend',
    'frontend',
    'architecture',
    'modular',
    'database',
    'no doctor integration',
    'no external api',
    'no complex analytics',
    'privacy',
    'compliance',
    'security',
    'rule-based logic',
    'simple backend',
    'cross-platform',
    'web app',
  ].some((term) => lower.includes(term));
}

function canonicalCapabilityKey(label) {
  const lower = String(label || '').toLowerCase();
  if (/onboard/.test(lower)) return 'onboarding';
  if (/health\s*plan|plan/.test(lower)) return 'health_plan';
  if (/dashboard/.test(lower)) return 'dashboard';
  if (/detail|item detail/.test(lower)) return 'item_detail';
  if (/vaccin/.test(lower)) return 'vaccination_tracker';
  if (/family/.test(lower)) return 'family_mode';
  if (/reminder/.test(lower)) return 'reminder_system';
  if (/profile|settings?/.test(lower)) return 'profile_settings';
  return lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'capability';
}

function capabilityTitleFromKey(key, rawLabel) {
  const known = {
    onboarding: 'Onboarding',
    health_plan: 'Personal Health Plan',
    dashboard: 'Dashboard',
    item_detail: 'Health Item Detail',
    vaccination_tracker: 'Vaccination Tracker',
    family_mode: 'Family Mode',
    reminder_system: 'Reminder System',
    profile_settings: 'Profile / Settings',
  };
  if (known[key]) {
    return known[key];
  }
  return titleCaseText(cleanLeadingLabel(rawLabel || key).replaceAll('_', ' '));
}

function capabilityPlaybook(key) {
  const map = {
    onboarding: [
      'Welcome flow with lightweight initial profile capture.',
      'Collect the minimum data needed to activate a first useful plan.',
    ],
    health_plan: [
      'Generate a profile-based checklist of actionable items.',
      'Show rationale, status, and cadence for each plan item.',
    ],
    dashboard: [
      'Prioritize actions in a clear Now / Soon / Later model.',
      'Highlight the next best action with completion visibility.',
    ],
    item_detail: [
      'Show why the item matters, current status, and recommended frequency.',
      'Provide direct actions such as complete, plan, and reminder setup.',
    ],
    vaccination_tracker: [
      'Support manual vaccination entry and status overview.',
      'Surface upcoming booster guidance based on known history.',
    ],
    family_mode: [
      'Support multiple profiles under one account.',
      'Provide per-profile overview of due and completed actions.',
    ],
    reminder_system: [
      'Allow reminder presets and custom scheduling.',
      'Keep reminder logic simple and deterministic for MVP.',
    ],
    profile_settings: [
      'Provide essential account and profile preferences.',
      'Support manageable updates without deep configuration complexity.',
    ],
  };
  return map[key] || null;
}

function deriveScopeCapabilities(scopeLines, allLines, combinedText) {
  const candidates = [];
  for (const line of scopeLines) {
    if (isScopeNoise(line)) {
      continue;
    }
    const parsed = parseScopedList(line);
    if (parsed.length > 0) {
      candidates.push(...parsed);
      continue;
    }
    const cleaned = cleanLeadingLabel(line);
    if (cleaned.length >= 4 && cleaned.length <= 60 && !/[.!?]$/.test(cleaned)) {
      candidates.push(cleaned);
    }
  }

  const text = combinedText.toLowerCase();
  if (/onboard/.test(text)) candidates.push('Onboarding');
  if (/dashboard/.test(text)) candidates.push('Dashboard');
  if (/plan/.test(text)) candidates.push('Health Plan');
  if (/reminder/.test(text)) candidates.push('Reminder System');
  if (/family/.test(text)) candidates.push('Family Mode');
  if (/vaccin/.test(text)) candidates.push('Vaccination Tracker');
  if (/profile|settings/.test(text)) candidates.push('Profile / Settings');

  const unique = [];
  const seen = new Set();
  for (const raw of candidates) {
    const key = canonicalCapabilityKey(raw);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push({ key, raw });
  }

  const fromLines = findLinesByKeywords(
    allLines,
    ['onboard', 'dashboard', 'plan', 'reminder', 'family', 'vaccin', 'profile', 'settings', 'detail'],
  );

  return unique.slice(0, 8).map(({ key, raw }) => {
    const title = capabilityTitleFromKey(key, raw);
    const playbook = capabilityPlaybook(key);
    if (playbook) {
      return { title, bullets: playbook };
    }
    const supporting = fromLines
      .filter((line) => line.toLowerCase().includes(key.split('_')[0]))
      .slice(0, 2)
      .map((line) => sentenceCase(line));
    const bullets = supporting.length > 0
      ? supporting
      : [
        sentenceCase(raw),
        'Define clear user action and completion state for this capability.',
      ];
    return { title, bullets };
  });
}

function shortRoleLabel(line) {
  const cleaned = cleanLeadingLabel(line)
    .replace(/^primary\s+/i, '')
    .replace(/\.$/, '')
    .trim();
  const parts = cleaned.split(/,|\/| and /i).map((p) => p.trim()).filter(Boolean);
  const pick = parts[0] || cleaned;
  return titleCaseText(pick).replace(/\.$/, '');
}

function deriveTargetUserProfiles(usersForBrief, allLines) {
  const evidence = findLinesByKeywords(
    allLines,
    ['user', 'audience', 'persona', 'family', 'parent', 'professional', 'operator', 'manager'],
  );
  const fallbackBullets = [
    'Needs a clear next action with minimal cognitive load.',
    'Needs confidence that priorities are relevant and actionable.',
  ];
  return usersForBrief.slice(0, 4).map((user, idx) => {
    const title = shortRoleLabel(user) || `User Segment ${idx + 1}`;
    const related = evidence
      .filter((line) => line.toLowerCase().includes(title.split(' ')[0].toLowerCase()))
      .slice(0, 2)
      .map((line) => normalizeBullet(line));
    const bullets = related.length > 0 ? related : fallbackBullets;
    return { title, bullets };
  });
}

function deriveUxPillars(uxLines) {
  const defaults = [
    'Clear and low-cognitive-load workflows.',
    'Calm and trustworthy visual language.',
    'Action-oriented guidance with explicit next steps.',
  ];
  const lines = uxLines.length > 0 ? uxLines : defaults;
  return lines.slice(0, 4).map((line) => ({
    title: titleCaseText(cleanLeadingLabel(line).replace(/\.$/, '')),
    bullets: [
      normalizeBullet(line),
      'Ensure this is visible in primary user flows, not only in styling.',
    ],
  }));
}

function derivePrincipleCards(principles) {
  const defaults = [
    'Deliver smallest end-to-end value first.',
    'Prefer clarity over feature density.',
    'Keep scope explicitly bounded for MVP.',
  ];
  const lines = principles.length > 0 ? principles : defaults;
  return lines.slice(0, 5).map((line) => ({
    title: titleCaseText(cleanLeadingLabel(line).replace(/\.$/, '')),
    bullets: [
      normalizeBullet(line),
      'Use this principle to resolve scope and design tradeoffs during implementation.',
    ],
  }));
}

function deriveOutOfScopeCards(lines) {
  const defaults = [
    'Non-essential advanced features deferred until post-MVP validation.',
    'Integrations not required for MVP are deferred to later phases.',
  ];
  const source = lines.length > 0 ? lines : defaults;
  return source.slice(0, 5).map((line) => ({
    title: titleCaseText(cleanLeadingLabel(line).replace(/\.$/, '')),
    bullets: [
      normalizeBullet(line),
      'Reconsider only after core MVP outcomes are validated with real users.',
    ],
  }));
}

function deriveSuccessCards(lines) {
  const defaults = [
    'Users can complete the core workflow without facilitator support.',
    'The MVP delivers measurable value in initial pilot usage.',
  ];
  const source = lines.length > 0 ? lines : defaults;
  return source.slice(0, 4).map((line) => ({
    title: titleCaseText(cleanLeadingLabel(line).replace(/\.$/, '')),
    bullets: [
      normalizeBullet(line),
      'Define an observable signal or metric for this criterion during delivery.',
    ],
  }));
}

function inferProjectType(combinedText) {
  if (/\bmobile\b|\bapp\b|\bios\b|\bandroid\b/i.test(combinedText)) {
    return 'mobile_application';
  }
  if (/\bsaas\b|\bplatform\b|\bweb\b/i.test(combinedText)) {
    return 'web_application';
  }
  return 'digital_product';
}

function synthesizeProjectBriefDraft({ analysis, values }) {
  const allLines = uniqueLines(
    analysis.documents.flatMap((doc) => toCandidateLines(doc.text)),
  );
  const sectionBuckets = collectSectionBuckets(analysis.documents);
  const combinedText = analysis.documents.map((doc) => doc.text).join('\n\n');

  const problemOutcomeFallback = findLinesByKeywords(allLines, ['problem', 'outcome', 'goal', 'objective', 'value']);
  const problemOutcome = sectionBuckets.product_description.length > 0
    ? takeBestLines(sectionBuckets.product_description, 4, 24)
    : problemOutcomeFallback;
  const targetUsers = sectionBuckets.target_users.length > 0
    ? takeBestLines(sectionBuckets.target_users, 4, 10)
    : extractUsers(allLines);
  const scopeItems = sectionBuckets.core_mvp_scope.length > 0
    ? takeBestLines(sectionBuckets.core_mvp_scope, 8, 12)
    : extractScopeItems(allLines);
  const uxTone = sectionBuckets.ux_tone.length > 0
    ? takeBestLines(sectionBuckets.ux_tone, 4, 10)
    : findLinesByKeywords(allLines, ['ux', 'experience', 'tone', 'copy', 'clarity', 'simple', 'intuitive']).slice(0, 3);
  const principles = sectionBuckets.product_principles.length > 0
    ? takeBestLines(sectionBuckets.product_principles, 5, 10)
    : findLinesByKeywords(allLines, ['principle', 'must', 'should', 'focus', 'priority']).slice(0, 3);
  const outOfScope = sectionBuckets.out_of_scope.length > 0
    ? takeBestLines(sectionBuckets.out_of_scope, 6, 10)
    : findLinesByKeywords(allLines, ['out of scope', 'not in scope', 'exclude', 'later', 'phase 2']).slice(0, 4);
  const successCriteria = extractSuccessCriteria(allLines);
  const successSection = sectionBuckets.success_criteria.length > 0
    ? takeBestLines(sectionBuckets.success_criteria, 5, 10)
    : [];

  const inferredUxTone = [
    'Clear and low-cognitive-load workflows for primary operators.',
    'Practical, trustworthy language with direct action cues.',
  ];
  const inferredPrinciples = [
    'Deliver smallest end-to-end value first and validate quickly.',
    'Keep decisions traceable and operationally actionable.',
  ];
  const inferredOutOfScope = [
    'Non-essential advanced features deferred until post-MVP validation.',
    'Integrations not required for MVP are deferred to later phases.',
  ];
  const inferredSuccess = [
    'Users can complete the core workflow without facilitator support.',
    'Core MVP objectives are measurable and verifiably achieved in pilot usage.',
  ];

  const summaryLines = problemOutcome.length > 0
    ? problemOutcome.slice(0, 3)
    : ['Build an MVP that addresses the documented customer problem with a practical, review-ready scope.'];
  const inferredProjectName = inferProjectNameFromDocuments(analysis.documents, allLines);
  const projectName = resolveProjectName({
    valuesProjectName: values?.project_name,
    inferredProjectName,
    combinedText,
  });
  const productType = values?.product_type || inferProjectType(combinedText);
  const backend = values?.backend_stack || 'to be confirmed';
  const frontend = values?.frontend_stack || 'to be confirmed';
  const database = values?.database_stack || 'to be confirmed';
  const architecture = values?.architecture_preference || 'modular and pragmatic';

  const usersForBrief = targetUsers.length > 0 ? targetUsers : ['Primary user group to be confirmed from customer review'];
  const scopeForBrief = scopeItems.length > 0 ? scopeItems : ['Core MVP capability set to be finalized with customer'];
  const scopeCapabilities = deriveScopeCapabilities(scopeForBrief, allLines, combinedText);
  const summary = composeProductDescription({
    projectName,
    problemOutcome: summaryLines,
    allLines,
    scopeCapabilities,
  });
  const uxForBrief = uxTone.length > 0 ? uxTone : inferredUxTone;
  const principlesForBrief = principles.length > 0 ? principles : inferredPrinciples;
  const outOfScopeForBrief = outOfScope.length > 0 ? outOfScope : inferredOutOfScope;
  const successForBrief = successSection.length > 0
    ? successSection
    : (() => {
      const metricCandidate = findLinesByKeywords(allLines, ['reduce', 'increase', 'improve', 'outcome', 'goal', '%'])
        .filter((line) => !/\b(du bist|up to date|lucius|booster)\b/i.test(line))[0];
      if (metricCandidate) {
        return [metricCandidate, ...inferredSuccess];
      }
      if (successCriteria.length > 0) {
        const filtered = successCriteria.filter((line) => !/\b(du bist|up to date|lucius|booster)\b/i.test(line));
        if (filtered.length > 0) {
          return filtered;
        }
      }
      return inferredSuccess;
    })();
  const userProfiles = deriveTargetUserProfiles(usersForBrief, allLines);
  const uxPillars = deriveUxPillars(uxForBrief);
  const principleCards = derivePrincipleCards(principlesForBrief);
  const outOfScopeCards = deriveOutOfScopeCards(outOfScopeForBrief);
  const successCards = deriveSuccessCards(successForBrief);

  return [
    '# Project Brief',
    '',
    `Date: \`${new Date().toISOString().slice(0, 10)}\``,
    'Prepared by: `Product Manager`',
    `Project: \`${projectName}\``,
    'Brief Approval Status: `draft`',
    '',
    '## 1. Product Description',
    '',
    summary,
    '',
    '## 2. Target Users',
    '',
    'Primary user segments and what they need from the MVP:',
    '',
    ...userProfiles.flatMap((profile, i) => [
      `${i + 1}. **${profile.title}**`,
      ...profile.bullets.slice(0, 2).map((b) => `   - ${normalizeBullet(b)}`),
      '',
    ]),
    '',
    '## 3. Core MVP Scope',
    '',
    'The following capabilities define the first shippable product slice:',
    '',
    ...scopeCapabilities.flatMap((capability, i) => [
      `${i + 1}. **${capability.title}**`,
      ...capability.bullets.slice(0, 3).map((b) => `   - ${normalizeBullet(b)}`),
      '',
    ]),
    '',
    '## 4. UX and Tone',
    '',
    'Experience pillars that should be visible in every primary flow:',
    '',
    ...uxPillars.flatMap((pillar, i) => [
      `${i + 1}. **${pillar.title}**`,
      ...pillar.bullets.slice(0, 2).map((b) => `   - ${normalizeBullet(b)}`),
      '',
    ]),
    '',
    '## 5. Product Principles',
    '',
    'Decision principles for PM, Design, and Engineering alignment:',
    '',
    ...principleCards.flatMap((card, i) => [
      `${i + 1}. **${card.title}**`,
      ...card.bullets.slice(0, 2).map((b) => `   - ${normalizeBullet(b)}`),
      '',
    ]),
    '',
    '## 6. Technical Direction',
    '',
    `- Product type: \`${formatTechValue(productType, 'digital product')}\``,
    `- Backend: \`${formatTechValue(backend, 'to be confirmed')}\``,
    `- Frontend: \`${formatTechValue(frontend, 'to be confirmed')}\``,
    `- Database: \`${formatTechValue(database, 'to be confirmed')}\``,
    `- Architecture: \`${formatTechValue(architecture, 'modular and pragmatic')}\``,
    '',
    '## 7. Explicit Out of Scope (MVP)',
    '',
    'Items intentionally deferred to protect MVP focus:',
    '',
    ...outOfScopeCards.flatMap((card, i) => [
      `${i + 1}. **${card.title}**`,
      ...card.bullets.slice(0, 2).map((b) => `   - ${normalizeBullet(b)}`),
      '',
    ]),
    '',
    '## 8. Primary Success Criteria',
    '',
    'A first release is successful when these conditions are true:',
    '',
    ...successCards.flatMap((card, i) => [
      `${i + 1}. **${card.title}**`,
      ...card.bullets.slice(0, 2).map((b) => `   - ${normalizeBullet(b)}`),
      '',
    ]),
    '',
    '## 9. Source Basis',
    '',
    ...analysis.documents.map((doc) => `- \`${doc.path}\``),
    '',
  ].join('\n');
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
  const outPath = path.join(targetRoot, 'docs/reviews/product-manager/customer-information-request.md');
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
    '`./fabric/company/v1/fabric pm:brief-readiness --target <project-root> --values <project-root>/fabric.values.json`',
  );

  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  return outPath;
}

function setBriefApproved(briefText) {
  const statusLine = 'Brief Approval Status: `approved`';
  if (/^Brief Approval Status:\s*`?.*`?\s*$/im.test(briefText)) {
    return briefText.replace(/^Brief Approval Status:\s*`?.*`?\s*$/im, statusLine);
  }
  const lines = briefText.split('\n');
  const out = [];
  let inserted = false;
  for (const line of lines) {
    out.push(line);
    if (!inserted && /^Project:\s*/i.test(line.trim())) {
      out.push(statusLine);
      inserted = true;
    }
  }
  if (!inserted) {
    out.unshift(statusLine);
  }
  return `${out.join('\n').replace(/\s+$/, '')}\n`;
}

function parseBriefSections(text) {
  const sections = {};
  const headingRegex = /^##\s+\d+\.\s+(.+?)\s*$/gm;
  const matches = [...text.matchAll(headingRegex)];
  for (let i = 0; i < matches.length; i += 1) {
    const title = matches[i][1].trim().toLowerCase();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections[title] = text.slice(start, end).trim();
  }
  return sections;
}

function sectionLines(sectionText) {
  return String(sectionText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBullets(sectionText) {
  return sectionLines(sectionText)
    .map((line) => line.match(/^\s*[-*]\s+(.*)$/)?.[1] || line.match(/^\s+\-\s+(.*)$/)?.[1] || null)
    .filter(Boolean)
    .map((line) => cleanLeadingLabel(line));
}

function parseNumberedTitles(sectionText) {
  const lines = sectionLines(sectionText);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    if (m) {
      out.push(m[1].trim());
      continue;
    }
    const m2 = line.match(/^\d+\.\s+(.+)$/);
    if (m2) {
      out.push(cleanLeadingLabel(m2[1]));
    }
  }
  return out;
}

function firstParagraph(sectionText) {
  const chunks = String(sectionText || '')
    .split(/\n\s*\n/g)
    .map((c) => c.trim())
    .filter(Boolean);
  return chunks[0] || '';
}

function parseTechDirection(sectionText) {
  const tech = {};
  for (const line of sectionLines(sectionText)) {
    const m = line.match(/^-+\s*([^:]+):\s*`?(.+?)`?\s*$/);
    if (!m) {
      continue;
    }
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (key.includes('product type')) tech.product_type = value;
    if (key === 'backend') tech.backend_stack = value;
    if (key === 'frontend') tech.frontend_stack = value;
    if (key === 'database') tech.database_stack = value;
    if (key.includes('architecture')) tech.architecture_preference = value;
  }
  return tech;
}

function normalizeTechToken(value) {
  const lower = String(value || '').toLowerCase();
  const map = {
    'saas web app': 'saas_web_app',
    'web application': 'web_application',
    'mobile application': 'mobile_application',
    'node.js + typescript': 'nodejs_typescript',
    'react + typescript': 'react_typescript',
    postgres: 'postgres',
    'modular monolith': 'modular_monolith',
  };
  return map[lower] || lower.replace(/\s+/g, '_');
}

const DEFAULT_MARKER_PREFIX = '__DEFAULT__';

const BRIEF_FIRST_STATIC_DEFAULTS = Object.freeze({
  release_verification_command: 'npm run verify:release',
  release_preflight_command: 'npm run release:preflight',
  release_deploy_command: 'npm run release:deploy',
  db_migration_status_command: 'npm run db:migrate:status',
  db_migration_command: 'npm run db:migrate:deploy',
  customer_checkpoint_template_path: 'docs/templates/customer-checkpoint-template.md',
  slice_closeout_review_template_path: 'docs/templates/slice-closeout-review-template.md',
  bootstrap_foundation_review_path: 'docs/reviews/product-manager/bootstrap-foundation-review.md',
  bootstrap_backlog_slice_review_path: 'docs/reviews/product-manager/bootstrap-backlog-slice-review.md',
  bootstrap_status: 'in_progress',
  current_mode: 'bootstrap',
  active_slice_id: 'SL-001',
  active_slice_state: 'planned',
  active_milestone: 'SL001_planning',
  owner_role: 'Product Manager',
  slice_id: 'SL-XXX',
  customer_review_tenant_id: '00000000-0000-4000-8000-000000000000',
  database_url_example: 'postgresql://postgres:postgres@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require',
});

function defaultMarkerForToken(token) {
  const normalized = String(token || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  return `${DEFAULT_MARKER_PREFIX}${normalized}__`;
}

function isDefaultMarker(value) {
  return typeof value === 'string' && /^__DEFAULT_/.test(String(value));
}

function isUnsetLike(value) {
  if (value == null) {
    return true;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return true;
  }
  if (isDefaultMarker(normalized)) {
    return true;
  }
  if (/^unset_/i.test(normalized)) {
    return true;
  }
  return false;
}

function neutralDefaultValueForToken(token) {
  if (Object.prototype.hasOwnProperty.call(BRIEF_FIRST_STATIC_DEFAULTS, token)) {
    return BRIEF_FIRST_STATIC_DEFAULTS[token];
  }
  if (token === 'slice_title') {
    return '__DEFAULT_SLICE_TITLE__';
  }
  return defaultMarkerForToken(token);
}

function buildNeutralValuesSeed(manifest) {
  const requiredTokens = Array.isArray(manifest?.required_tokens) ? manifest.required_tokens : [];
  const seed = {};
  for (const token of requiredTokens) {
    seed[token] = neutralDefaultValueForToken(token);
  }
  seed.defaulted_fields = [...requiredTokens].sort();
  seed.values_seed_mode = 'brief_first_defaults_v1';
  seed.values_seed_source = 'pm:approve-brief';
  return seed;
}

const ARCHITECT_TECH_TOKENS = new Set([
  'product_type',
  'backend_stack',
  'frontend_stack',
  'database_stack',
  'orm_choice',
  'architecture_preference',
]);

function architectConsultCandidateTokens(values) {
  return ARCHITECT_CONSULTABLE_TOKENS.filter((token) => isUnsetLike(values[token]));
}

function normalizeArchitectConsultValue(token, rawValue) {
  const text = String(rawValue || '').replace(/\s+/g, ' ').trim();
  if (!text || isUnsetLike(text)) {
    return '';
  }
  if (ARCHITECT_TECH_TOKENS.has(token)) {
    return normalizeTechToken(text);
  }
  return text;
}

function unresolvedRequiredTokens(manifest, values) {
  const requiredTokens = Array.isArray(manifest?.required_tokens) ? manifest.required_tokens : [];
  return requiredTokens.filter((token) => isUnsetLike(values[token]));
}

function toProjectIdFromName(projectName) {
  const normalized = String(projectName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return normalized || 'default-project-id';
}

function deriveValuesFromBrief(briefText, existingValues) {
  const derived = {};
  const projectMatch = briefText.match(/^Project:\s*`?(.+?)`?\s*$/im);
  if (projectMatch) {
    derived.project_name = cleanProjectName(projectMatch[1]);
    if (isUnsetLike(existingValues.project_id)) {
      derived.project_id = toProjectIdFromName(derived.project_name);
    }
  }

  const sections = parseBriefSections(briefText);
  const descSection = sections['product description'];
  const usersSection = sections['target users'];
  const scopeSection = sections['core mvp scope'];
  const principlesSection = sections['product principles'];
  const outOfScopeSection = sections['explicit out of scope (mvp)'];
  const successSection = sections['primary success criteria'];
  const techSection = sections['technical direction'];

  const projectSummary = firstParagraph(descSection).replace(/\s+/g, ' ').trim();
  if (projectSummary) {
    derived.project_summary = projectSummary;
    derived.primary_goal = projectSummary;
  }

  const users = [...parseBullets(usersSection), ...parseNumberedTitles(usersSection)];
  if (users[0]) derived.primary_user_1 = cleanLeadingLabel(users[0]);
  if (users[1]) derived.primary_user_2 = cleanLeadingLabel(users[1]);

  const scopeTitles = parseNumberedTitles(scopeSection);
  if (scopeTitles[0]) derived.v1_priority_1 = cleanLeadingLabel(scopeTitles[0]);
  if (scopeTitles[1]) derived.v1_priority_2 = cleanLeadingLabel(scopeTitles[1]);
  if (scopeTitles[0]) derived.workflow_step_1 = `Users complete ${cleanLeadingLabel(scopeTitles[0]).toLowerCase()}`;
  if (scopeTitles[1]) derived.workflow_step_2 = `Users complete ${cleanLeadingLabel(scopeTitles[1]).toLowerCase()}`;
  if (scopeTitles[2]) derived.workflow_step_3 = `Users complete ${cleanLeadingLabel(scopeTitles[2]).toLowerCase()}`;

  const principles = [...parseNumberedTitles(principlesSection), ...parseBullets(principlesSection)];
  if (principles[0]) derived.concept_1 = cleanLeadingLabel(principles[0]);
  if (principles[1]) derived.concept_2 = cleanLeadingLabel(principles[1]);
  if (principles[2]) derived.concept_3 = cleanLeadingLabel(principles[2]);

  const outOfScope = [...parseNumberedTitles(outOfScopeSection), ...parseBullets(outOfScopeSection)];
  if (outOfScope[0]) derived.out_of_scope_1 = cleanLeadingLabel(outOfScope[0]);
  if (outOfScope[1]) derived.out_of_scope_2 = cleanLeadingLabel(outOfScope[1]);

  const success = [...parseNumberedTitles(successSection), ...parseBullets(successSection)];
  if (success[0]) derived.success_criterion_1 = cleanLeadingLabel(success[0]);
  if (success[1]) derived.success_criterion_2 = cleanLeadingLabel(success[1]);

  const tech = parseTechDirection(techSection);
  if (tech.product_type) derived.product_type = normalizeTechToken(tech.product_type);
  if (tech.backend_stack) derived.backend_stack = normalizeTechToken(tech.backend_stack);
  if (tech.frontend_stack) derived.frontend_stack = normalizeTechToken(tech.frontend_stack);
  if (tech.database_stack) derived.database_stack = normalizeTechToken(tech.database_stack);
  if (tech.architecture_preference) derived.architecture_preference = normalizeTechToken(tech.architecture_preference);

  const nowIso = new Date().toISOString();
  derived.generated_at_utc = nowIso;
  derived.bootstrap_completed_at_utc = isUnsetLike(existingValues.bootstrap_completed_at_utc)
    ? nowIso
    : existingValues.bootstrap_completed_at_utc;
  return derived;
}

function writeBriefReadinessReview(
  targetRoot,
  { hasIntake, evidenceFiles, analysis },
) {
  const outPath = path.join(targetRoot, 'docs/reviews/product-manager/brief-readiness-review.md');
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
      '- Proceed with drafting `docs/product/project-brief.md` from the fabric template.',
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

function readOptionalMarkdown(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return readText(filePath);
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

  if (issueList.length > 0) {
    runLines.push('- Findings:');
    for (const issue of issueList) {
      runLines.push(
        `  - [${issue.rule}] ${issue.section}: "${issue.line}"`,
      );
    }
    runLines.push('- Recommended fixes:');
    for (const issue of issueList) {
      runLines.push(
        `  - [${issue.rule}] ${issue.section}: ${issue.recommended_fix}`,
      );
    }
  } else {
    runLines.push('- Findings: none');
    runLines.push('- Recommended fixes: none');
  }

  if (suggestionList.length > 0) {
    runLines.push('- Suggestions:');
    for (const suggestion of suggestionList) {
      runLines.push(
        `  - [${suggestion.rule}] ${suggestion.section}: ${suggestion.best_way_forward} (confidence=${suggestion.confidence})`,
      );
      runLines.push(`    rationale: ${suggestion.rationale}`);
      runLines.push(`    implementation note: ${suggestion.implementation_note}`);
    }
  } else {
    runLines.push('- Suggestions: none');
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

async function pmBriefReadiness({ targetRoot, valuesPath }) {
  console.log('fabric pm:brief-readiness: starting');
  console.log(`- target root: ${targetRoot}`);
  console.log('- checking intake note and customer-input evidence...');
  const intakePath = path.join(targetRoot, 'docs/product/intake-note.md');
  const hasIntake = fs.existsSync(intakePath) && readText(intakePath).trim().length > 0;
  const evidenceFiles = customerInputEvidenceFiles(targetRoot);
  console.log(`- intake note present: ${hasIntake ? 'yes' : 'no'}`);
  console.log(`- customer input documents discovered: ${String(evidenceFiles.length)}`);
  const intakeText = hasIntake ? readText(intakePath) : '';
  const customerInputRoot = path.join(targetRoot, 'docs/customer-input');
  console.log('- evaluating input coverage...');
  const analysis = evaluateBriefInputCoverage({
    intakeText,
    customerInputRoot,
    evidenceFiles,
    onProgress: (message) => console.log(`  - ${message}`),
  });
  console.log('- writing brief-readiness review note...');
  const reviewPath = writeBriefReadinessReview(targetRoot, { hasIntake, evidenceFiles, analysis });
  console.log(`- review note written: ${path.relative(targetRoot, reviewPath)}`);

  if (!analysis.sufficient) {
    console.error('fabric pm:brief-readiness: FAILED');
    const details = summarizeReadinessFailure(analysis);
    for (const detail of details) console.error(`- ${detail}`);
    const requests = buildCustomerInformationRequests(analysis);
    const requestPath = writeCustomerInformationRequest(targetRoot, requests);
    if (requests.length > 0) {
      console.error('- customer information requested:');
      for (const item of requests) console.error(`  - ${item}`);
    }
    console.error(`- information request: ${path.relative(targetRoot, requestPath)}`);
    console.error(`- full review: ${path.relative(targetRoot, reviewPath)}`);
    process.exit(1);
  }

  const values = valuesPath && fs.existsSync(valuesPath) ? loadValues(valuesPath) : {};
  const modelDriven = String(values.intake_llm_enabled ?? values.llm_enabled ?? process.env.INTAKE_LLM_ENABLED ?? process.env.LLM_ENABLED ?? 'false').toLowerCase() === 'true';

  if (modelDriven) {
    console.log('- intake LLM mode: enabled');
    console.log('- generating model-driven intake artifacts (this may take a while)...');
    const outcome = await generateIntakeArtifactsWithModel({
      targetRoot,
      values,
      analysis,
      onProgress: (message) => console.log(`  - ${message}`),
    });
    console.log('fabric pm:brief-readiness: created model-driven intake artifacts');
    console.log(`- evidence pack: ${path.relative(targetRoot, outcome.evidencePath)}`);
    console.log(`- source synthesis: ${path.relative(targetRoot, outcome.synthesisPath)}`);
    console.log(`- product framing: ${path.relative(targetRoot, outcome.framingPath)}`);
    console.log(`- brief draft: ${path.relative(targetRoot, outcome.briefPath)}`);
    if (outcome.clarityReviewPath) {
      console.log(`- brief clarity review: ${path.relative(targetRoot, outcome.clarityReviewPath)}`);
    }
    if (outcome.clarityLedgerPath) {
      console.log(`- brief clarity ledger: ${path.relative(targetRoot, outcome.clarityLedgerPath)}`);
    }
    if (Array.isArray(outcome.briefAttemptSnapshotPaths) && outcome.briefAttemptSnapshotPaths.length > 0) {
      console.log(`- brief attempt snapshots: ${String(outcome.briefAttemptSnapshotPaths.length)} written`);
    }
    if (outcome.clarity) {
      console.log(`- brief clarity gate: ${outcome.clarity.gateEnabled ? 'enabled' : 'disabled'}`);
      console.log(`- brief clarity attempts: ${String(outcome.clarity.attempts)} (retries used: ${String(outcome.clarity.retriesUsed)})`);
      console.log(`- brief clarity verdict: ${outcome.clarity.passed ? 'pass' : 'fail'}`);
    }
    console.log(`- model provider: ${outcome.settings.provider}`);
    console.log(`- model: ${outcome.settings.model}`);
  } else {
    console.log('- intake LLM mode: disabled (using local synthesis)');
    const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
    if (!fs.existsSync(briefPath)) {
      console.log('- synthesizing docs/product/project-brief.md from coverage analysis...');
      const content = synthesizeProjectBriefDraft({ analysis, values });
      ensureDir(briefPath);
      fs.writeFileSync(briefPath, `${content.replace(/\s+$/, '')}
`, 'utf8');
      console.log('fabric pm:brief-readiness: created synthesized docs/product/project-brief.md (draft)');
    } else {
      console.log('fabric pm:brief-readiness: docs/product/project-brief.md already exists (left unchanged)');
    }
  }

  logReadinessWarnings(analysis);
  console.log('fabric pm:brief-readiness: OK');
  console.log(`- review note: ${path.relative(targetRoot, reviewPath)}`);
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

async function pmApproveBrief({ targetRoot, valuesPath }) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  if (!fs.existsSync(briefPath)) {
    throw new Error('Cannot approve brief: missing docs/product/project-brief.md');
  }

  const briefText = readText(briefPath);
  const approvedBrief = setBriefApproved(briefText);
  fs.writeFileSync(briefPath, approvedBrief, 'utf8');

  const manifest = loadManifest();
  let values = {};
  let seededDefaults = null;
  if (!fs.existsSync(valuesPath)) {
    seededDefaults = buildNeutralValuesSeed(manifest);
    ensureDir(valuesPath);
    fs.writeFileSync(valuesPath, `${JSON.stringify(seededDefaults, null, 2)}\n`, 'utf8');
    values = seededDefaults;
  } else {
    values = loadValues(valuesPath);
  }
  const derived = deriveValuesFromBrief(approvedBrief, values);
  const merged = { ...values, ...derived };

  const architectCandidates = architectConsultCandidateTokens(merged);
  let architectConsultAttempted = false;
  let architectConsultPurpose = null;
  let architectConsultProviderModel = null;
  let architectAppliedTokens = [];

  if (architectCandidates.length > 0) {
    const architectRolePath = path.join(FABRIC_ROOT, 'team/architect.md');
    const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
    if (!fs.existsSync(architectRolePath)) {
      console.warn(
        `fabric pm:approve-brief: architect consult skipped (missing role contract: ${path.relative(targetRoot, architectRolePath)})`,
      );
    } else if (!fs.existsSync(framingPath)) {
      console.warn(
        'fabric pm:approve-brief: architect consult skipped (missing docs/product/product-system-framing.md)',
      );
    } else {
      architectConsultAttempted = true;
      const architectRoleMarkdown = readText(architectRolePath);
      const framingMarkdown = readText(framingPath);
      try {
        console.log(
          `fabric pm:approve-brief: consulting architect for unresolved defaults (${String(architectCandidates.length)} token(s))...`,
        );
        const consult = await generateArchitectValueRecommendations({
          values: merged,
          unresolvedTokens: architectCandidates,
          briefMarkdown: approvedBrief,
          framingMarkdown,
          architectRoleMarkdown,
          currentValues: merged,
          onProgress: (message) => {
            console.log(`  - ${String(message)}`);
          },
        });
        architectConsultPurpose = consult.purpose;
        if (consult?.settings?.provider && consult?.settings?.model) {
          architectConsultProviderModel = `${consult.settings.provider}/${consult.settings.model}`;
        }
        for (const token of architectCandidates) {
          if (!isUnsetLike(merged[token])) {
            continue;
          }
          const recommendation = consult.byToken?.[token];
          if (!recommendation) {
            continue;
          }
          const normalized = normalizeArchitectConsultValue(token, recommendation.value);
          if (!normalized || isUnsetLike(normalized)) {
            continue;
          }
          merged[token] = normalized;
          architectAppliedTokens.push(token);
        }
      } catch (error) {
        console.warn(
          `fabric pm:approve-brief: architect consult unavailable (${String(error?.message || error)})`,
        );
      }
    }
  }

  const unresolvedTokens = unresolvedRequiredTokens(manifest, merged);
  merged.defaulted_fields = unresolvedTokens.sort();
  if (seededDefaults) {
    merged.values_seed_mode = 'brief_first_defaults_v1';
    merged.values_seed_source = 'pm:approve-brief';
  }

  fs.writeFileSync(valuesPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  const updatedKeys = Object.keys(derived).sort();
  console.log('fabric pm:approve-brief: OK');
  console.log(`- brief updated: ${path.relative(targetRoot, briefPath)}`);
  console.log(`- values updated: ${path.relative(targetRoot, valuesPath)}`);
  if (seededDefaults) {
    console.log(`- values created from neutral defaults: ${path.relative(targetRoot, valuesPath)}`);
  }
  if (architectConsultAttempted) {
    if (architectConsultPurpose) {
      console.log(`- architect consult profile: ${architectConsultPurpose}`);
    }
    if (architectConsultProviderModel) {
      console.log(`- architect consult model: ${architectConsultProviderModel}`);
    }
    console.log(`- architect-applied fields: ${String(architectAppliedTokens.length)}`);
    architectAppliedTokens.sort().forEach((token) => console.log(`  - ${token}`));
  }
  console.log(`- defaulted fields remaining: ${String(merged.defaulted_fields.length)}`);
  console.log(`- derived keys: ${updatedKeys.length}`);
  updatedKeys.forEach((k) => console.log(`  - ${k}`));
}

function evaluateBootstrapReviewApprovals({ targetRoot, valuesPath }) {
  const values = loadValuesIfPresent(valuesPath);
  const relPaths = getBootstrapReviewRelPaths(values);
  const checks = [];

  for (const [key, relPath] of Object.entries(relPaths)) {
    const absPath = path.join(targetRoot, relPath);
    if (!fs.existsSync(absPath)) {
      checks.push({
        key,
        relPath,
        exists: false,
        assessment: null,
        placeholders: [],
      });
      continue;
    }
    const text = readText(absPath);
    checks.push({
      key,
      relPath,
      exists: true,
      assessment: parseReviewAssessment(text),
      placeholders: listAllPlaceholderMatches(text),
    });
  }

  const issues = [];
  for (const check of checks) {
    if (!check.exists) {
      issues.push(`missing bootstrap review file: ${check.relPath}`);
      continue;
    }
    if (check.placeholders.length > 0) {
      issues.push(
        `${check.relPath}: contains unresolved placeholders (${check.placeholders.join(', ')})`,
      );
    }
    if (check.assessment !== 'approved') {
      issues.push(
        `${check.relPath}: assessment must be 'approved' (current: ${String(check.assessment || 'missing')})`,
      );
    }
  }

  return { checks, issues };
}

function extractFirstSliceFromCurrentSlice(currentSliceText) {
  const slice = parseSliceBlockWithLists(currentSliceText);
  return {
    id: slice.id || null,
    milestone: slice.milestone || null,
    status: slice.status || null,
  };
}


function renderBootstrapReviewDoc({
  title,
  reviewTarget,
  assessment,
  findings,
  requiredActions,
  generatedAt,
}) {
  const lines = [
    `# ${title}`,
    '',
    `Date: \`${String(generatedAt).slice(0, 10)}\``,
    `Review Target: \`${reviewTarget}\``,
    `Assessment: \`${assessment}\``,
    '',
    '## Findings',
    '',
    ...(findings.length > 0 ? findings.map((item) => `- ${item}`) : ['- No material issues detected.']),
    '',
    '## Required Actions',
    '',
    ...(requiredActions.length > 0 ? requiredActions.map((item) => `- ${item}`) : ['- Continue.']),
    '',
  ];
  return `${lines.join('\n')}`;
}

function finalizeBootstrapFoundationReview({ targetRoot }) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  const artifactRegistryPath = path.join(targetRoot, '.system/artifact-registry.yaml');
  const workflowRulesPath = path.join(targetRoot, '.system/workflow-rules.yaml');
  const required = [
    ['Project manifest', manifestPath],
    ['Artifact registry', artifactRegistryPath],
    ['Workflow rules', workflowRulesPath],
  ];
  const findings = [];
  const issues = [];
  for (const [label, absPath] of required) {
    if (!fs.existsSync(absPath)) {
      issues.push(`${label} is missing.`);
    } else {
      findings.push(`${label} exists and is readable.`);
    }
  }
  const assessment = issues.length === 0 ? 'approved' : 'needs_revision';
  const requiredActions = assessment === 'approved'
    ? ['Proceed to slice-planning and bootstrap signoff.']
    : ['Regenerate missing bootstrap foundation artifacts, then re-run pm:finalize-bootstrap-reviews.'];
  return {
    assessment,
    content: renderBootstrapReviewDoc({
      title: 'Bootstrap Foundation Review',
      reviewTarget: 'Bootstrap Foundation Artifacts',
      assessment,
      findings: assessment === 'approved' ? findings : issues,
      requiredActions,
      generatedAt: new Date().toISOString(),
    }),
  };
}

function finalizeBootstrapBacklogSliceReview({ targetRoot }) {
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const findings = [];
  const issues = [];
  if (!fs.existsSync(backlogPath)) {
    issues.push('Backlog artifact is missing.');
  }
  if (!fs.existsSync(currentSlicePath)) {
    issues.push('Current slice artifact is missing.');
  }

  let backlogSlices = [];
  let currentSlice = {};
  if (issues.length === 0) {
    backlogSlices = parseBacklogSlices(readText(backlogPath));
    currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));

    if (backlogSlices.length === 0) {
      issues.push('Backlog does not contain any slices.');
    } else {
      findings.push(`Backlog contains ${String(backlogSlices.length)} planned slices.`);
    }

    if (!currentSlice.id || !currentSlice.title || !currentSlice.objective) {
      issues.push('Current slice is missing one or more core fields (id, title, objective).');
    } else {
      findings.push(`Current slice ${String(currentSlice.id)} (${String(currentSlice.title)}) is defined.`);
    }

    const placeholders = listAllPlaceholderMatches(JSON.stringify({ backlogSlices, currentSlice }));
    if (placeholders.length > 0) {
      issues.push(`Backlog/current-slice still contain unresolved placeholders (${[...new Set(placeholders)].join(', ')}).`);
    }

    if (backlogSlices.length > 0 && currentSlice.id) {
      const match = backlogSlices.find((slice) => String(slice.id || '') === String(currentSlice.id));
      if (!match) {
        issues.push(`Current slice ${String(currentSlice.id)} is not present in backlog.`);
      } else {
        findings.push(`Current slice ${String(currentSlice.id)} is represented in backlog.`);
      }
    }
  }

  const assessment = issues.length === 0 ? 'approved' : 'needs_revision';
  const requiredActions = assessment === 'approved'
    ? ['Proceed to bootstrap signoff.']
    : ['Regenerate or repair backlog/current-slice artifacts, then re-run pm:finalize-bootstrap-reviews.'];
  return {
    assessment,
    content: renderBootstrapReviewDoc({
      title: 'Bootstrap Backlog and Slice Review',
      reviewTarget: 'Initial Backlog and Current Slice',
      assessment,
      findings: assessment === 'approved' ? findings : issues,
      requiredActions,
      generatedAt: new Date().toISOString(),
    }),
  };
}

function pmFinalizeBootstrapReviews({ targetRoot, valuesPath }) {
  const values = loadValuesIfPresent(valuesPath);
  const relPaths = getBootstrapReviewRelPaths(values);
  const foundation = finalizeBootstrapFoundationReview({ targetRoot });
  const backlogSlice = finalizeBootstrapBacklogSliceReview({ targetRoot });
  const outputs = [
    { relPath: relPaths.foundation, content: foundation.content, assessment: foundation.assessment },
    { relPath: relPaths.backlogSlice, content: backlogSlice.content, assessment: backlogSlice.assessment },
  ];
  for (const item of outputs) {
    const absPath = path.join(targetRoot, item.relPath);
    ensureDir(absPath);
    writeTextAtomic(absPath, `${item.content.trimEnd()}
`);
  }
  console.log('fabric pm:finalize-bootstrap-reviews: OK');
  console.log(`- foundation review: ${relPaths.foundation} (${foundation.assessment})`);
  console.log(`- backlog/slice review: ${relPaths.backlogSlice} (${backlogSlice.assessment})`);
}

function normalizeSliceScopeLabel(slice) {
  return `${String(slice.id || 'SL-XXX')} ${String(slice.title || 'Current Slice')}`.trim();
}

function pickOnboardingMode(details) {
  const text = String(details || '').toLowerCase();
  return /family/.test(text) ? 'family-aware onboarding' : 'single-profile onboarding';
}

function architecturePlaybookForSlice(sliceTitle, productFramingText, briefText) {
  const lower = String(sliceTitle || '').toLowerCase();
  const framing = `${String(productFramingText || '')}
${String(briefText || '')}`.toLowerCase();
  if (/onboard/.test(lower)) {
    return {
      context: 'This baseline enables the onboarding slice. The slice must capture the minimum profile information required to personalize the next product state and must leave the system in a valid onboarding-complete state for downstream health-plan and dashboard flows.',
      decisions: [
        'Introduce a UserProfile as the onboarding-owned core entity.',
        'Persist only the minimum required onboarding fields for MVP: age, gender, onboarding completion status, and family-mode choice.',
        `Treat the onboarding mode as ${pickOnboardingMode(framing)} for MVP; full family-profile management remains outside this slice unless explicitly required.`,
        'Onboarding completion becomes the prerequisite state for downstream plan-generation and dashboard flows.',
      ],
      guardrails: [
        'A profile cannot be marked onboarding-complete unless required fields are present and valid.',
        'The system must not expose downstream personalized guidance from incomplete onboarding state.',
        'This slice owns profile capture and completion state, not reminder, dashboard, or analytics behavior.',
      ],
      verification: [
        'Verify that valid age and gender input allows completion of onboarding.',
        'Verify that missing or invalid required inputs prevent completion with deterministic errors.',
        'Verify that onboarding completion persists profile state and next-step eligibility.',
      ],
      constraints: [
        'Keep the data model minimal and MVP-safe.',
        'Do not introduce provider integrations, external APIs, or real AI logic in this slice.',
        'Keep structure simple enough to support immediate follow-on slices for health plan generation and dashboard prioritization.',
      ],
      openQuestions: [
        'Should onboarding completion directly trigger health-plan generation in the same slice, or only unlock it for the next slice?',
      ],
    };
  }
  if (/dashboard/.test(lower)) {
    return {
      context: 'This baseline enables the dashboard slice. The slice must render a prioritized overview of user health actions and expose the next meaningful action clearly and consistently.',
      decisions: [
        'Introduce a DashboardProjection derived from user profile state and health-plan items.',
        'Support urgency buckets such as Now / Soon / Later as a derived presentation rule, not a standalone persisted entity.',
        'Dashboard rendering depends on completed onboarding and available plan-item state.',
      ],
      guardrails: [
        'Dashboard content must only reflect valid profile and plan-item state.',
        'Priority grouping must remain deterministic and explainable.',
      ],
      verification: [
        'Verify that dashboard sections populate from valid health-plan state.',
        'Verify that empty and partially populated states are handled explicitly.',
      ],
      constraints: [
        'Do not introduce advanced analytics or provider integrations in this slice.',
      ],
      openQuestions: ['What minimum scoring/summary logic belongs in dashboard MVP versus a later slice?'],
    };
  }
  return {
    context: `This baseline enables the active slice ${String(sliceTitle || 'Current Slice')} and defines the minimum structural decisions required to implement it safely without over-designing future behavior.`,
    decisions: [
      'Define only the entities and relationships required for the active slice.',
      'Keep responsibilities modular and directly traceable to the product-system framing.',
    ],
    guardrails: [
      'Do not introduce speculative abstractions beyond current-slice needs.',
      'All state transitions must be explicit and verifiable.',
    ],
    verification: [
      'Verify the slice works end-to-end against current acceptance criteria.',
    ],
    constraints: [
      'Keep structure simple, bounded, and implementable by the current code slice.',
    ],
    openQuestions: ['None at this time.'],
  };
}

function renderArchitectureBaseline({
  slice,
  productFramingText,
  briefText,
  generatedAt,
  fabricVersion,
  playbookOverride = null,
}) {
  const playbook = playbookOverride || architecturePlaybookForSlice(slice.title, productFramingText, briefText);
  const lines = [
    '<!-- generated_from: templates/architecture-baseline-template.md -->',
    `<!-- fabric_version: ${fabricVersion} -->`,
    `<!-- generated_at: ${generatedAt} -->`,
    '# Architecture Baseline',
    '',
    `Date: \`${generatedAt.slice(0,10)}\``,
    'Status: `Ready for implementation`',
    `Scope: Current slice \`${normalizeSliceScopeLabel(slice)}\``,
    '',
    '## 1. Context',
    '',
    playbook.context,
    '',
    '## 2. Decisions',
    '',
    ...playbook.decisions.map((item) => `- ${item}`),
    '',
    '## 3. Invariant and Guardrail Decisions',
    '',
    ...playbook.guardrails.map((item) => `- ${item}`),
    '',
    '## 4. Verification Decisions',
    '',
    ...playbook.verification.map((item) => `- ${item}`),
    '',
    '## 5. Constraints',
    '',
    ...playbook.constraints.map((item) => `- ${item}`),
    '',
    '## 6. Open Questions',
    '',
    ...playbook.openQuestions.map((item) => `- ${item}`),
    '',
  ];
  return `${lines.join('\n')}`;
}

function uxPlaybookForSlice(sliceTitle, productFramingText, briefText) {
  const lower = String(sliceTitle || '').toLowerCase();
  const combined = `${String(productFramingText || '')}
${String(briefText || '')}`.toLowerCase();
  if (/onboard/.test(lower)) {
    return {
      context: 'This slice defines the first-run onboarding experience. The flow must feel clear, calm, and trustworthy, and must capture only the minimum information needed to unlock the next meaningful product state.',
      primaryFlow: {
        entry: 'User opens the app for the first time and lands on the welcome screen.',
        behaviors: [
          'Show a simple welcome state with a clear start action.',
          'Collect age and gender with low-friction input controls.',
          'Offer a simple choice between planning for self only or enabling family mode.',
          'Complete onboarding and transition the user to the next intended product state.',
        ],
      },
      failurePaths: [
        'Missing or invalid required inputs block continuation and show direct corrective guidance.',
        'If family mode has not been selected yet, prompt the user clearly before completion.',
      ],
      rules: [
        'Required fields: age and gender.',
        'Primary CTA labels should remain simple and direct.',
        'Tone must remain calm, clear, and lightly motivating.',
      ],
      constraints: [
        'Do not add extra onboarding questions beyond MVP minimum.',
        'Do not overload onboarding with medical detail or advanced personalization choices.',
      ],
      acceptance: [
        'User can complete onboarding end-to-end with valid required inputs.',
        'Invalid or missing required inputs prevent completion with clear feedback.',
        'Successful completion leaves the user in a valid next-step state.',
      ],
    };
  }
  if (/dashboard/.test(lower)) {
    return {
      context: 'This slice defines the first dashboard experience. The flow must immediately show the user what matters now, what matters soon, and what action to take next.',
      primaryFlow: {
        entry: 'User enters the dashboard after onboarding or returning to the app.',
        behaviors: [
          'Show a clear header and health summary.',
          'Group actions into simple priority buckets.',
          'Allow the user to drill into the next most relevant action.',
        ],
      },
      failurePaths: [
        'If no plan data exists yet, show an explicit empty-state path.',
      ],
      rules: [
        'Priority grouping must remain visually obvious and stable.',
        'The next action should be visible without scrolling through unrelated content.',
      ],
      constraints: [
        'Do not overload the dashboard with analytics or secondary navigation.',
      ],
      acceptance: [
        'User immediately understands what is important now and what to do next.',
      ],
    };
  }
  return {
    context: `This slice defines the minimum user-visible flow required for ${String(sliceTitle || 'the active slice')}.`,
    primaryFlow: {
      entry: 'User enters the current slice from the primary application flow.',
      behaviors: [
        'Complete the slice objective in the smallest coherent flow.',
      ],
    },
    failurePaths: ['Handle one clear recovery path for invalid or incomplete user action.'],
    rules: ['Keep interactions simple, direct, and aligned to current-slice scope.'],
    constraints: ['Avoid adding user-facing complexity outside the active slice.'],
    acceptance: ['Acceptance criteria map directly to visible user behavior.'],
  };
}

function renderUxCurrentSliceFlow({
  slice,
  productFramingText,
  briefText,
  generatedAt,
  fabricVersion,
  playbookOverride = null,
}) {
  const playbook = playbookOverride || uxPlaybookForSlice(slice.title, productFramingText, briefText);
  const lines = [
    '<!-- generated_from: templates/ux-current-slice-flow-template.md -->',
    `<!-- fabric_version: ${fabricVersion} -->`,
    `<!-- generated_at: ${generatedAt} -->`,
    '# UX Flow - Current Slice',
    '',
    `Date: \`${generatedAt.slice(0,10)}\``,
    'Status: `Ready for implementation`',
    `Scope: \`${normalizeSliceScopeLabel(slice)}\``,
    '',
    '## 1. Context',
    '',
    playbook.context,
    '',
    '## 2. Flow Definition',
    '',
    '### Flow A - Primary Path',
    '',
    `- Entry: ${playbook.primaryFlow.entry}`,
    '- Expected behavior:',
    ...playbook.primaryFlow.behaviors.map((item) => `  - ${item}`),
    '',
    '### Flow B - Failure and Recovery Paths',
    '',
    ...playbook.failurePaths.map((item) => `- ${item}`),
    '',
    '## 3. Interaction and Validation Rules',
    '',
    ...playbook.rules.map((item) => `- ${item}`),
    '',
    '## 4. Implementation Constraints',
    '',
    ...playbook.constraints.map((item) => `- ${item}`),
    '',
    '## 5. Acceptance Mapping',
    '',
    ...playbook.acceptance.map((item) => `- ${item}`),
    '',
  ];
  return `${lines.join('\n')}`;
}

function listFromMaybe(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/\r?\n/).map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  }
  return [];
}

function deriveChecklistGoal(slice) {
  const candidates = [
    slice.goal,
    slice.objective,
    slice.outcome,
    ...listFromMaybe(slice.acceptance_criteria),
    ...listFromMaybe(slice.acceptance),
  ].map((item) => String(item || '').trim()).filter(Boolean);
  if (candidates.length > 0) {
    return candidates[0].replace(/^[-*]\s*/, '');
  }
  return `Confirm the user can complete the ${slice.title || 'current slice'} flow successfully.`;
}

function deriveChecklistSteps(slice, uxFlowText) {
  const lines = String(uxFlowText || '').split(/\r?\n/).map((line) => line.trim());
  const steps = [];
  for (const line of lines) {
    if (/^(?:\d+[.)]|[-*])\s+/.test(line) && !/^[-*]\s*(Acceptance|Constraints?|Notes?|Status|Out of Scope)\b/i.test(line)) {
      steps.push(line.replace(/^(?:\d+[.)]|[-*])\s+/, '').trim());
    }
  }
  if (steps.length > 0) {
    return [...new Set(steps)].slice(0, 8);
  }
  const title = String(slice.title || '').toLowerCase();
  if (title.includes('onboarding')) {
    return [
      'Open the app.',
      'Confirm the welcome or onboarding screen appears.',
      'Enter the required profile inputs.',
      'Continue to the next step.',
      'Confirm the next view loads without crashing.',
    ];
  }
  return [
    `Open the app and navigate to the ${slice.title || 'current'} flow.`,
    'Complete the primary user action for this slice.',
    'Confirm the expected next view or state appears without errors.',
  ];
}

function deriveExpectedResults(slice, uxFlowText) {
  const results = [
    ...listFromMaybe(slice.acceptance_criteria),
    ...listFromMaybe(slice.acceptance),
  ];
  if (!results.some((item) => /without (?:error|crash)|loads?/i.test(item))) {
    results.unshift('App loads without blank screen or runtime error.');
  }
  const uxHints = String(uxFlowText || '');
  if (/dashboard|health plan/i.test(uxHints) && !results.some((item) => /dashboard|health plan/i.test(item))) {
    results.push('The dashboard or health-plan view appears when the flow is completed.');
  }
  if (/welcome|onboarding/i.test(uxHints) && !results.some((item) => /welcome|onboarding/i.test(item))) {
    results.push('The onboarding entry screen is visible and clear.');
  }
  return [...new Set(results.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 10);
}

function deriveFailConditions(slice) {
  const title = slice.title || 'current slice';
  return [
    'Blank page or broken layout.',
    'Required input cannot be completed.',
    'Primary action does nothing or leads to an error.',
    'App crashes during the flow.',
    `Expected next state for ${title} does not appear.`,
  ];
}

function deriveOutOfScope(slice, implementationNotesText) {
  const explicit = [
    ...listFromMaybe(slice.out_of_scope),
    ...listFromMaybe(slice.outOfScope),
  ];
  if (explicit.length > 0) {
    return [...new Set(explicit)].slice(0, 8);
  }
  const title = String(slice.title || '').toLowerCase();
  if (title.includes('onboarding')) {
    return [
      'Reminder flows.',
      'Vaccination tracking.',
      'Family mode and profile switching.',
      'Advanced personalization beyond the onboarding slice.',
    ];
  }
  const notes = String(implementationNotesText || '');
  if (/schema change/i.test(notes)) {
    return ['Any database or schema changes not explicitly required by this slice.'];
  }
  return ["Items not explicitly covered by this slice's acceptance criteria."];
}

function renderCurrentSliceUserChecklist({ slice, uxFlowText, implementationNotesText }) {
  const steps = deriveChecklistSteps(slice, uxFlowText);
  const expectedResults = deriveExpectedResults(slice, uxFlowText);
  const failConditions = deriveFailConditions(slice);
  const outOfScope = deriveOutOfScope(slice, implementationNotesText);
  return [
    '# Current Slice User Checklist',
    '',
    '## Slice',
    `- ID: ${slice.id || 'UNKNOWN'}`,
    `- Title: ${slice.title || 'Current Slice'}`,
    '',
    '## Goal',
    deriveChecklistGoal(slice),
    '',
    '## Preconditions',
    '- App is running locally.',
    '- User starts from a fresh session unless noted otherwise.',
    '- Required demo or seed data is available if needed.',
    '',
    '## What to test',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Expected results',
    ...expectedResults.map((item) => `- ${item}`),
    '',
    '## Fail conditions',
    ...failConditions.map((item) => `- ${item}`),
    '',
    '## Out of scope for this slice',
    ...outOfScope.map((item) => `- ${item}`),
    '',
    '## Result',
    '- Pass / Fail',
    '- Notes:',
    '',
  ].join('\n');
}

function writeCurrentSliceUserChecklist({ targetRoot, slice, uxFlowText, implementationNotesText = '' }) {
  const normalizedSliceId = String(slice?.id || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  const outPath = path.join(targetRoot, `docs/testing/${normalizedSliceId}-user-checklist.md`);
  writeTextAtomic(outPath, `${renderCurrentSliceUserChecklist({ slice, uxFlowText, implementationNotesText }).trimEnd()}\n`);
  return outPath;
}

async function architectFinalizeBaseline({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  const outPath = path.join(targetRoot, 'docs/architecture/baseline.md');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot finalize architecture baseline: missing docs/product/current-slice.yaml');
  }
  const slice = parseSliceBlockWithLists(readText(currentSlicePath));
  const briefText = fs.existsSync(briefPath) ? readText(briefPath) : '';
  const productFramingText = fs.existsSync(framingPath) ? readText(framingPath) : '';
  const generatedAt = new Date().toISOString();
  const manifest = loadManifest();
  let baselineMode = 'heuristic';
  let playbookOverride = null;
  try {
    const values = loadValuesIfPresent(valuesPath);
    console.log('fabric architect:finalize-baseline: starting model-driven baseline generation...');
    const { settings, purpose, playbook } = await generateArchitectureBaselinePlaybook({
      values,
      slice,
      briefMarkdown: briefText,
      framingMarkdown: productFramingText,
      onProgress: (message) => {
        console.log(`fabric architect:finalize-baseline: ${String(message)}`);
      },
    });
    playbookOverride = playbook;
    baselineMode = 'model_driven';
    if (purpose) {
      console.log(`fabric architect:finalize-baseline: llm profile ${purpose}`);
    }
    console.log(`fabric architect:finalize-baseline: model planner ${settings.provider}/${settings.model}`);
  } catch (error) {
    const reason = error?.message ? String(error.message) : String(error);
    console.warn(`fabric architect:finalize-baseline: model-driven baseline unavailable (${reason})`);
    console.warn('fabric architect:finalize-baseline: falling back to heuristic baseline generation.');
    baselineMode = 'heuristic_fallback';
  }

  const content = renderArchitectureBaseline({
    slice,
    productFramingText,
    briefText,
    generatedAt,
    fabricVersion: manifest.fabric_version,
    playbookOverride,
  });
  writeTextAtomic(outPath, `${content.trimEnd()}
`);
  const checklistPath = writeCurrentSliceUserChecklist({
    targetRoot,
    slice,
    uxFlowText: '',
    implementationNotesText: '',
  });
  console.log('fabric architect:finalize-baseline: OK');
  console.log(`- scope: ${normalizeSliceScopeLabel(slice)}`);
  console.log(`- wrote: ${path.relative(targetRoot, outPath)}`);
  console.log(`- wrote: ${path.relative(targetRoot, checklistPath)}`);
  console.log(`- baseline mode: ${baselineMode}`);
  console.log('- status: Ready for implementation');
}

function uxFlowRelPathForSlice(sliceId) {
  const normalizedSliceId = String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  return `docs/ux/${normalizedSliceId}-current-slice-flow.md`;
}

async function uiuxFinalizeCurrentSliceFlow({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot finalize UX flow: missing docs/product/current-slice.yaml');
  }
  const slice = parseSliceBlockWithLists(readText(currentSlicePath));
  const outRelPath = uxFlowRelPathForSlice(slice.id);
  const outPath = path.join(targetRoot, outRelPath);
  const briefText = fs.existsSync(briefPath) ? readText(briefPath) : '';
  const productFramingText = fs.existsSync(framingPath) ? readText(framingPath) : '';
  const generatedAt = new Date().toISOString();
  const manifest = loadManifest();
  let uxMode = 'heuristic';
  let playbookOverride = null;
  try {
    const values = loadValuesIfPresent(valuesPath);
    console.log('fabric uiux:finalize-current-slice-flow: starting model-driven UX flow generation...');
    const { settings, purpose, playbook } = await generateCurrentSliceUxPlaybook({
      values,
      slice,
      briefMarkdown: briefText,
      framingMarkdown: productFramingText,
      onProgress: (message) => {
        console.log(`fabric uiux:finalize-current-slice-flow: ${String(message)}`);
      },
    });
    playbookOverride = playbook;
    uxMode = 'model_driven';
    if (purpose) {
      console.log(`fabric uiux:finalize-current-slice-flow: llm profile ${purpose}`);
    }
    console.log(`fabric uiux:finalize-current-slice-flow: model ux ${settings.provider}/${settings.model}`);
  } catch (error) {
    const reason = error?.message ? String(error.message) : String(error);
    console.warn(`fabric uiux:finalize-current-slice-flow: model-driven flow unavailable (${reason})`);
    console.warn('fabric uiux:finalize-current-slice-flow: falling back to heuristic UX flow generation.');
    uxMode = 'heuristic_fallback';
  }
  const content = renderUxCurrentSliceFlow({
    slice,
    productFramingText,
    briefText,
    generatedAt,
    fabricVersion: manifest.fabric_version,
    playbookOverride,
  });
  writeTextAtomic(outPath, `${content.trimEnd()}
`);
  const checklistPath = writeCurrentSliceUserChecklist({
    targetRoot,
    slice,
    uxFlowText: content,
    implementationNotesText: '',
  });
  console.log('fabric uiux:finalize-current-slice-flow: OK');
  console.log(`- scope: ${normalizeSliceScopeLabel(slice)}`);
  console.log(`- wrote: ${outRelPath}`);
  console.log(`- wrote: ${path.relative(targetRoot, checklistPath)}`);
  console.log(`- ux mode: ${uxMode}`);
  console.log('- status: Ready for implementation');
}

function pmBootstrapSignoff({ targetRoot, valuesPath }) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Cannot run pm:bootstrap-signoff: missing .system/project-manifest.yaml');
  }
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run pm:bootstrap-signoff: missing docs/product/current-slice.yaml');
  }

  const reviewEval = evaluateBootstrapReviewApprovals({ targetRoot, valuesPath });
  if (reviewEval.issues.length > 0) {
    console.error('fabric pm:bootstrap-signoff: FAILED');
    reviewEval.issues.forEach((issue) => console.error(`- ${issue}`));
    console.error('- bootstrap review artifacts are still drafts or not approved');
    console.error(`- recovery: run ./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target ${targetRoot === process.cwd() ? '.' : '<project-root>'} --values ${valuesPath ? path.relative(targetRoot, valuesPath) || 'fabric.values.json' : 'fabric.values.json'}`);
    process.exit(1);
  }

  const currentSlice = extractFirstSliceFromCurrentSlice(readText(currentSlicePath));
  if (!currentSlice.id || !currentSlice.status || !currentSlice.milestone) {
    throw new Error(
      'Cannot run pm:bootstrap-signoff: current slice must include id, status, and milestone.',
    );
  }

  const now = new Date().toISOString();
  let manifestText = readText(manifestPath);
  manifestText = setSectionScalar(manifestText, 'operating_model', 'bootstrap_status', '"completed"');
  manifestText = setSectionScalar(
    manifestText,
    'operating_model',
    'bootstrap_completed_at_utc',
    quoteYamlString(now),
  );
  manifestText = setSectionScalar(manifestText, 'operating_model', 'current_mode', '"delivery"');
  manifestText = setSectionScalar(manifestText, 'status', 'active_slice', quoteYamlString(currentSlice.id));
  manifestText = setSectionScalar(
    manifestText,
    'status',
    'active_slice_state',
    quoteYamlString(currentSlice.status),
  );
  manifestText = setSectionScalar(
    manifestText,
    'status',
    'active_milestone',
    quoteYamlString(currentSlice.milestone),
  );

  const existingApproved = parseSectionListValues(manifestText, 'status', 'approved_reviews');
  const approvedReviewPaths = [
    ...existingApproved,
    ...reviewEval.checks.map((check) => check.relPath),
  ];
  const uniqueApproved = [...new Set(approvedReviewPaths.filter(Boolean))];
  manifestText = setSectionList(manifestText, 'status', 'approved_reviews', uniqueApproved);
  manifestText = setTopLevelScalar(manifestText, 'last_updated_utc', quoteYamlString(now));
  if (!manifestText.endsWith('\n')) {
    manifestText = `${manifestText}\n`;
  }
  writeTextAtomic(manifestPath, manifestText);

  console.log('fabric pm:bootstrap-signoff: OK');
  console.log('- bootstrap reviews verified as approved');
  console.log('- manifest transitioned to delivery mode with approved review references');
}

function normalizeSliceTitle(value) {
  const cleaned = titleCaseText(cleanLeadingLabel(String(value || '').replace(/\.$/, '').trim()));
  return cleaned || '';
}

function slugifyPlannedSliceTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'slice';
}

function derivePlannedImplementationTargets(title) {
  const normalizedTitle = String(title || '').toLowerCase();
  if (normalizedTitle.includes('onboarding')) {
    return [
      'src/features/onboarding/',
      'src/features/profile/',
      'src/routes/onboarding*',
      'tests/onboarding/',
    ];
  }
  const slug = slugifyPlannedSliceTitle(title);
  return [
    `src/features/${slug}/`,
    `src/routes/${slug}*`,
    `tests/${slug}/`,
  ];
}

function deriveInitialSliceTitlesFromBrief(briefText) {
  const sections = parseBriefSections(briefText);
  const scopeSection = sections['core mvp scope'] || '';
  const out = [];
  const seen = new Set();
  const candidates = [
    ...parseNumberedTitles(scopeSection),
    ...parseBullets(scopeSection),
  ];
  for (const raw of candidates) {
    const title = normalizeSliceTitle(raw);
    if (!title) {
      continue;
    }
    const key = title.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(title);
  }

  const fallback = [
    'Onboarding',
    'Dashboard',
    'Personal Health Plan',
    'Reminder System',
    'Family Mode',
    'Vaccination Tracker',
    'Provider Directory',
    'Notification Preferences',
  ];
  for (const title of fallback) {
    if (out.length >= MIN_SLICE_COUNT) {
      break;
    }
    const key = title.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(title);
  }

  return out.slice(0, MAX_SLICE_COUNT);
}

function buildInitialSlicePlan(briefText) {
  const titles = deriveInitialSliceTitlesFromBrief(briefText);
  if (titles.length === 0) {
    throw new Error('Cannot plan slices: unable to derive slice titles from approved brief.');
  }
  const slices = titles.map((title, index) => {
    const n = String(index + 1).padStart(3, '0');
    const id = `SL-${n}`;
    const milestone = `SL${n}_delivery`;
    const dependency = index === 0 ? 'Approved project brief and bootstrap reviews are complete.' : `Dependencies from SL-${String(index).padStart(3, '0')} are resolved.`;
    const checklistRelPath = `docs/testing/${id}-user-checklist.md`;
    const implementationNotesRelPath = `docs/implementation/${id}-implementation-notes.md`;
    const targetList = derivePlannedImplementationTargets(title);
    return {
      id,
      title,
      milestone,
      status: 'planned',
      owner_role: 'Product Manager',
      objective: `Deliver ${title} as an MVP-ready vertical slice with clear user value and bounded scope.`,
      in_scope: [
        `Implement the core ${title.toLowerCase()} user flow end-to-end.`,
        `Include required persistence, validation, and visible completion status for ${title.toLowerCase()}.`,
      ],
      out_of_scope: [
        `Advanced automation and non-MVP integrations for ${title.toLowerCase()}.`,
      ],
      acceptance_criteria: [
        `${title} flow works end-to-end in the local review environment.`,
        'Happy path and one failure/recovery path are verified.',
      ],
      dependencies: [dependency],
      done_definition: [
        `${checklistRelPath} is completed and marked Pass for ${id}.`,
        `Implementation artifacts exist for ${id} targets: ${targetList.join(', ')}.`,
        `${implementationNotesRelPath} is updated with verification evidence and changed files for ${id}.`,
        'fabric doctor passes without bootstrap semantic issues.',
      ],
    };
  });
  return slices.slice(0, Math.max(MIN_SLICE_COUNT, Math.min(MAX_SLICE_COUNT, slices.length)));
}

function normalizePlanList(rawValues, fallback = []) {
  const source = Array.isArray(rawValues) && rawValues.length > 0 ? rawValues : fallback;
  const out = [];
  const seen = new Set();
  for (const value of source) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function appendUniqueCaseInsensitive(values, candidate) {
  const text = String(candidate || '').trim();
  if (!text) {
    return;
  }
  const key = text.toLowerCase();
  if (values.some((item) => String(item || '').trim().toLowerCase() === key)) {
    return;
  }
  values.push(text);
}

function buildSlicePlanFromStructuredSpecs(rawSpecs) {
  const specs = Array.isArray(rawSpecs) ? rawSpecs : [];
  if (specs.length < MIN_SLICE_COUNT || specs.length > MAX_SLICE_COUNT) {
    throw new Error(
      `Cannot plan slices: expected ${String(MIN_SLICE_COUNT)}-${String(MAX_SLICE_COUNT)} slices, received ${String(specs.length)}.`,
    );
  }

  const titleCounts = new Map();
  return specs.map((spec, index) => {
    const n = String(index + 1).padStart(3, '0');
    const id = `SL-${n}`;
    const milestone = `SL${n}_delivery`;
    const baseTitle = normalizeSliceTitle(spec?.title || `Slice ${String(index + 1)}`) || `Slice ${String(index + 1)}`;
    const baseKey = baseTitle.toLowerCase();
    const seenCount = titleCounts.get(baseKey) || 0;
    titleCounts.set(baseKey, seenCount + 1);
    const title = seenCount === 0 ? baseTitle : `${baseTitle} (${String(seenCount + 1)})`;
    const lowerTitle = title.toLowerCase();
    const checklistRelPath = `docs/testing/${id}-user-checklist.md`;
    const implementationNotesRelPath = `docs/implementation/${id}-implementation-notes.md`;
    const targetList = derivePlannedImplementationTargets(title);
    const dependencyFallback = index === 0
      ? ['Approved project brief and bootstrap reviews are complete.']
      : [`Dependencies from SL-${String(index).padStart(3, '0')} are resolved.`];

    const doneDefinition = normalizePlanList(spec?.done_definition, [
      `${checklistRelPath} is completed and marked Pass for ${id}.`,
      `Implementation artifacts exist for ${id} targets: ${targetList.join(', ')}.`,
      `${implementationNotesRelPath} is updated with verification evidence and changed files for ${id}.`,
      'fabric doctor passes without bootstrap semantic issues.',
    ]);
    appendUniqueCaseInsensitive(doneDefinition, `${checklistRelPath} is completed and marked Pass for ${id}.`);
    appendUniqueCaseInsensitive(doneDefinition, `Implementation artifacts exist for ${id} targets: ${targetList.join(', ')}.`);
    appendUniqueCaseInsensitive(doneDefinition, `${implementationNotesRelPath} is updated with verification evidence and changed files for ${id}.`);
    appendUniqueCaseInsensitive(doneDefinition, 'fabric doctor passes without bootstrap semantic issues.');

    return {
      id,
      title,
      milestone,
      status: 'planned',
      owner_role: 'Product Manager',
      objective: normalizePlanList(
        spec?.objective ? [spec.objective] : [],
        [`Deliver ${title} as an MVP-ready vertical slice with clear user value and bounded scope.`],
      )[0],
      in_scope: normalizePlanList(spec?.in_scope, [
        `Implement the core ${lowerTitle} user flow end-to-end.`,
        `Include required persistence, validation, and visible completion status for ${lowerTitle}.`,
      ]),
      out_of_scope: normalizePlanList(spec?.out_of_scope, [
        `Advanced automation and non-MVP integrations for ${lowerTitle}.`,
      ]),
      acceptance_criteria: normalizePlanList(spec?.acceptance_criteria, [
        `${title} flow works end-to-end in the local review environment.`,
        'Happy path and one failure/recovery path are verified.',
      ]),
      dependencies: normalizePlanList(spec?.dependencies, dependencyFallback),
      done_definition: doneDefinition,
    };
  });
}

function renderYamlList(indent, values) {
  if (!values || values.length === 0) {
    return [`${' '.repeat(indent)}[]`];
  }
  return values.map((value) => `${' '.repeat(indent)}- ${quoteYamlString(value)}`);
}

function renderBacklogBody(slices, generatedAt) {
  const lines = [
    'schema_version: 1',
    `generated_at_utc: ${quoteYamlString(generatedAt)}`,
    'backlog:',
    '  slices:',
  ];
  for (const slice of slices) {
    lines.push(`    - id: ${quoteYamlString(slice.id)}`);
    lines.push(`      title: ${quoteYamlString(slice.title)}`);
    lines.push(`      objective: ${quoteYamlString(slice.objective)}`);
    lines.push(`      status: ${quoteYamlString(slice.status)}`);
    lines.push(`      owner_role: ${quoteYamlString(slice.owner_role)}`);
    lines.push('      in_scope:');
    lines.push(...renderYamlList(8, slice.in_scope));
    lines.push('      out_of_scope:');
    lines.push(...renderYamlList(8, slice.out_of_scope));
    lines.push('      acceptance_criteria:');
    lines.push(...renderYamlList(8, slice.acceptance_criteria));
    lines.push('      dependencies:');
    lines.push(...renderYamlList(8, slice.dependencies));
    lines.push('      done_definition:');
    lines.push(...renderYamlList(8, slice.done_definition));
  }
  return `${lines.join('\n')}\n`;
}

function renderCurrentSliceBody(slice, generatedAt) {
  const lines = [
    'schema_version: 1',
    `generated_at_utc: ${quoteYamlString(generatedAt)}`,
    'slice:',
    `  id: ${quoteYamlString(slice.id)}`,
    `  title: ${quoteYamlString(slice.title)}`,
    `  milestone: ${quoteYamlString(slice.milestone)}`,
    `  owner_role: ${quoteYamlString(slice.owner_role)}`,
    `  status: ${quoteYamlString(slice.status)}`,
    `  objective: ${quoteYamlString(slice.objective)}`,
    '  in_scope:',
    ...renderYamlList(4, slice.in_scope),
    '  out_of_scope:',
    ...renderYamlList(4, slice.out_of_scope),
    '  acceptance_criteria:',
    ...renderYamlList(4, slice.acceptance_criteria),
    '  dependencies:',
    ...renderYamlList(4, slice.dependencies),
    '  done_definition:',
    ...renderYamlList(4, slice.done_definition),
  ];
  return `${lines.join('\n')}\n`;
}

function escapeMarkdownCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function renderInlineList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }
  return items.map((item, index) => `${String(index + 1)}) ${String(item)}`).join(' ');
}

function resolveStatusValuesArg({ targetRoot, valuesPath }) {
  const relValuesPath = path.relative(targetRoot, valuesPath);
  const normalized = relValuesPath && relValuesPath.length > 0 ? relValuesPath : path.basename(valuesPath);
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

function parseImplementationStatusFromNotesText(text) {
  const sliceMatch = text.match(/^Slice:\s*`?([A-Za-z0-9_-]+)\b.*`?\s*$/im);
  const statusMatch = text.match(/^Status:\s*`?([A-Za-z0-9_ -]+)`?\s*$/im);
  if (!sliceMatch || !statusMatch) {
    return null;
  }
  return {
    sliceId: String(sliceMatch[1]).trim(),
    status: String(statusMatch[1]).trim(),
  };
}

function parseImplementationStatusBySlice(targetRoot) {
  const out = new Map();
  const implDirPath = path.join(targetRoot, 'docs/implementation');
  if (fs.existsSync(implDirPath) && fs.statSync(implDirPath).isDirectory()) {
    const noteFiles = fs.readdirSync(implDirPath)
      .filter((name) => /-implementation-notes\.md$/i.test(name))
      .sort();
    for (const fileName of noteFiles) {
      const notesPath = path.join(implDirPath, fileName);
      const parsed = parseImplementationStatusFromNotesText(readText(notesPath));
      if (!parsed) {
        continue;
      }
      out.set(parsed.sliceId, parsed.status);
    }
  }

  const legacyPath = path.join(targetRoot, 'docs/implementation/current-slice-notes.md');
  if (fs.existsSync(legacyPath)) {
    const parsed = parseImplementationStatusFromNotesText(readText(legacyPath));
    if (parsed && !out.has(parsed.sliceId)) {
      out.set(parsed.sliceId, parsed.status);
    }
  }
  return out;
}

function readOrchestratorState(targetRoot) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  if (!fs.existsSync(manifestPath)) {
    return {
      mode: 'unknown',
      activeSlice: '(not set)',
      activeSliceState: '(not set)',
      activeMilestone: '(not set)',
    };
  }
  const manifestText = readText(manifestPath);
  const status = parseStatusBlock(manifestText);
  const operatingModel = parseBlockScalars(manifestText, 'operating_model');
  return {
    mode: String(operatingModel.current_mode || 'unknown'),
    activeSlice: String(status.active_slice || '(not set)'),
    activeSliceState: String(status.active_slice_state || '(not set)'),
    activeMilestone: String(status.active_milestone || '(not set)'),
  };
}

function resolveImplementationStatus({ pipelineStatus, explicitStatus }) {
  if (explicitStatus) {
    return explicitStatus;
  }
  const normalized = String(pipelineStatus || '').toLowerCase();
  if (normalized === 'planned') {
    return 'Not Started';
  }
  if (normalized === 'completed') {
    return 'Completed (inferred)';
  }
  if (normalized === 'in_progress') {
    return 'Not Recorded';
  }
  return 'Not Recorded';
}

function resolveNextCommandForInProgress({ pipelineStatus, implementationStatus, valuesArg }) {
  const pipeline = String(pipelineStatus || '').toLowerCase();
  if (pipeline !== 'in_progress') {
    return '';
  }
  const implementation = String(implementationStatus || '').toLowerCase();
  if (implementation === 'implemented' || implementation === 'completed' || implementation === 'completed (inferred)') {
    return `./fabric/company/v1/fabric coder:close-current-slice --target . --values ${valuesArg}`;
  }
  return `./fabric/company/v1/fabric coder:implement-current-slice --target . --values ${valuesArg}`;
}

function buildStatusRows({ slices, valuesArg, implementationStatusBySlice, orchestratorState }) {
  const rows = slices.map((slice) => {
    const pipelineStatus = String(slice.status || '');
    const implementationStatus = resolveImplementationStatus({
      pipelineStatus,
      explicitStatus: implementationStatusBySlice.get(slice.id) || null,
    });
    return {
      slice,
      id: String(slice.id || ''),
      title: String(slice.title || ''),
      objective: String(slice.objective || ''),
      pipelineStatus,
      implementationStatus,
      acceptanceCriteria: slice.acceptance_criteria || [],
      doneDefinition: slice.done_definition || [],
      nextCommand: '',
    };
  });

  const inProgressRows = rows.filter((row) => String(row.pipelineStatus).toLowerCase() === 'in_progress');
  if (inProgressRows.length > 0) {
    for (const row of inProgressRows) {
      row.nextCommand = resolveNextCommandForInProgress({
        pipelineStatus: row.pipelineStatus,
        implementationStatus: row.implementationStatus,
        valuesArg,
      });
    }
    return rows;
  }

  const activeSliceId = String(orchestratorState.activeSlice || '');
  const activeSliceState = String(orchestratorState.activeSliceState || '').toLowerCase();
  const activeRowIndex = rows.findIndex((row) => row.id === activeSliceId);
  if (activeRowIndex >= 0) {
    const activeRow = rows[activeRowIndex];
    const activePipeline = String(activeRow.pipelineStatus || '').toLowerCase();
    const activeImplementation = String(activeRow.implementationStatus || '').toLowerCase();
    if (activePipeline === 'planned' && activeImplementation === 'not started') {
      activeRow.nextCommand = `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ${valuesArg}`;
      return rows;
    }
  }

  const firstNotStartedIndex = rows.findIndex((row) => String(row.implementationStatus).toLowerCase() === 'not started');
  if (firstNotStartedIndex >= 0) {
    if (activeSliceState === 'completed') {
      rows[firstNotStartedIndex].nextCommand = `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ${valuesArg}`;
    } else if (activeSliceState === 'planned') {
      rows[firstNotStartedIndex].nextCommand = `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ${valuesArg}`;
    }
  }

  return rows;
}

function printOrchestratorStateTerminal(orchestratorState) {
  console.log('Orchestrator State:');
  console.log(`  Mode: ${orchestratorState.mode}`);
  console.log(`  Active Slice: ${orchestratorState.activeSlice}`);
  console.log(`  Active Slice State: ${orchestratorState.activeSliceState}`);
  console.log(`  Active Milestone: ${orchestratorState.activeMilestone}`);
}

function printOrchestratorStateMarkdown(orchestratorState) {
  console.log('## Orchestrator State');
  console.log('');
  console.log(`- mode: ${escapeMarkdownCell(orchestratorState.mode)}`);
  console.log(`- active slice: ${escapeMarkdownCell(orchestratorState.activeSlice)}`);
  console.log(`- active slice state: ${escapeMarkdownCell(orchestratorState.activeSliceState)}`);
  console.log(`- active milestone: ${escapeMarkdownCell(orchestratorState.activeMilestone)}`);
  console.log('');
}

function printStatusMarkdownTable({ rows, orchestratorState }) {
  printOrchestratorStateMarkdown(orchestratorState);

  const headers = [
    'slice number',
    'slice title',
    'slice objective',
    'pipeline status',
    'implementation status',
    'acceptance criteria',
    'done definition',
    'next command',
  ];
  const separator = headers.map(() => '---');

  console.log(`| ${headers.join(' | ')} |`);
  console.log(`| ${separator.join(' | ')} |`);

  for (const rowData of rows) {
    const row = [
      escapeMarkdownCell(rowData.id),
      escapeMarkdownCell(rowData.title),
      escapeMarkdownCell(rowData.objective),
      escapeMarkdownCell(rowData.pipelineStatus),
      escapeMarkdownCell(rowData.implementationStatus),
      escapeMarkdownCell(renderInlineList(rowData.acceptanceCriteria)),
      escapeMarkdownCell(renderInlineList(rowData.doneDefinition)),
      escapeMarkdownCell(rowData.nextCommand),
    ];
    console.log(`| ${row.join(' | ')} |`);
  }
}

function printStatusTerminalView({ rows, orchestratorState }) {
  console.log(`fabric pm:status: ${String(rows.length)} slices`);
  console.log('');
  printOrchestratorStateTerminal(orchestratorState);
  for (const rowData of rows) {
    console.log('');
    console.log(`[${rowData.id}] ${rowData.title}`);
    console.log(`Pipeline Status: ${rowData.pipelineStatus}`);
    console.log(`Implementation Status: ${rowData.implementationStatus}`);
    console.log(`Objective: ${rowData.objective}`);
    console.log('Acceptance Criteria:');
    for (let index = 0; index < rowData.acceptanceCriteria.length; index += 1) {
      console.log(`  ${String(index + 1)}. ${String(rowData.acceptanceCriteria[index])}`);
    }
    console.log('Done Definition:');
    for (let index = 0; index < rowData.doneDefinition.length; index += 1) {
      console.log(`  ${String(index + 1)}. ${String(rowData.doneDefinition[index])}`);
    }
    if (rowData.nextCommand.length > 0) {
      console.log(`Next Command: ${rowData.nextCommand}`);
    }
  }
}

function pmStatus({ targetRoot, valuesPath, format = 'terminal' }) {
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  if (!fs.existsSync(backlogPath)) {
    throw new Error('Cannot run pm:status: missing docs/product/backlog.yaml');
  }

  const slices = parseBacklogSlices(readText(backlogPath));
  if (slices.length === 0) {
    throw new Error('Cannot run pm:status: no slices found in docs/product/backlog.yaml');
  }

  const implementationStatusBySlice = parseImplementationStatusBySlice(targetRoot);

  const valuesArg = resolveStatusValuesArg({ targetRoot, valuesPath });
  const orchestratorState = readOrchestratorState(targetRoot);
  const rows = buildStatusRows({
    slices,
    valuesArg,
    implementationStatusBySlice,
    orchestratorState,
  });

  const normalizedFormat = String(format || 'terminal').toLowerCase();
  if (normalizedFormat === 'markdown' || normalizedFormat === 'md') {
    printStatusMarkdownTable({ rows, orchestratorState });
    return;
  }
  if (normalizedFormat === 'terminal' || normalizedFormat === 'tty') {
    printStatusTerminalView({ rows, orchestratorState });
    return;
  }
  throw new Error("Cannot run pm:status: unsupported --format value. Use 'terminal' or 'markdown'.");
}

async function pmPlanSlices({ targetRoot, valuesPath, modelDriven = false, heuristic = false }) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  if (modelDriven && heuristic) {
    throw new Error('Cannot run pm:plan-slices with both --model-driven and --heuristic.');
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Cannot run pm:plan-slices: missing .system/project-manifest.yaml');
  }
  if (!fs.existsSync(briefPath)) {
    throw new Error('Cannot run pm:plan-slices: missing docs/product/project-brief.md');
  }
  assertApprovedBrief(targetRoot);

  const briefText = readText(briefPath);
  let slices = [];
  let planningMode = 'heuristic';
  if (!heuristic) {
    try {
      const values = loadValues(valuesPath);
      const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
      const framingMarkdown = fs.existsSync(framingPath) ? readText(framingPath) : '';
      console.log('fabric pm:plan-slices: starting model-driven planning...');
      const { settings, purpose, slices: structuredSlices } = await generateExecutionSlicePlan({
        values,
        briefMarkdown: briefText,
        framingMarkdown,
        onProgress: (message) => {
          console.log(`fabric pm:plan-slices: ${String(message)}`);
        },
      });
      slices = buildSlicePlanFromStructuredSpecs(structuredSlices);
      planningMode = 'model_driven';
      if (purpose) {
        console.log(`fabric pm:plan-slices: llm profile ${purpose}`);
      }
      console.log(`fabric pm:plan-slices: model planner ${settings.provider}/${settings.model}`);
    } catch (error) {
      const reason = error?.message ? String(error.message) : String(error);
      console.warn(`fabric pm:plan-slices: model-driven planning unavailable (${reason})`);
      console.warn('fabric pm:plan-slices: falling back to heuristic planning. Use --heuristic to skip model calls.');
      slices = buildInitialSlicePlan(briefText);
      planningMode = 'heuristic_fallback';
    }
  } else {
    slices = buildInitialSlicePlan(briefText);
  }

  const activeSlice = slices[0];
  const generatedAt = new Date().toISOString();
  const fabricManifest = loadManifest();

  const backlogHeader = metadataHeader(
    'docs/product/backlog.yaml',
    'templates/backlog.template.yaml',
    fabricManifest.fabric_version,
    generatedAt,
  );
  const currentSliceHeader = metadataHeader(
    'docs/product/current-slice.yaml',
    'templates/current-slice.template.yaml',
    fabricManifest.fabric_version,
    generatedAt,
  );
  writeTextAtomic(backlogPath, `${backlogHeader}${renderBacklogBody(slices, generatedAt)}`);
  writeTextAtomic(currentSlicePath, `${currentSliceHeader}${renderCurrentSliceBody(activeSlice, generatedAt)}`);

  let updatedManifest = readText(manifestPath);
  updatedManifest = setSectionScalar(
    updatedManifest,
    'status',
    'active_slice',
    quoteYamlString(activeSlice.id),
  );
  updatedManifest = setSectionScalar(
    updatedManifest,
    'status',
    'active_slice_state',
    quoteYamlString(activeSlice.status),
  );
  updatedManifest = setSectionScalar(
    updatedManifest,
    'status',
    'active_milestone',
    quoteYamlString(activeSlice.milestone),
  );
  updatedManifest = setTopLevelScalar(updatedManifest, 'last_updated_utc', quoteYamlString(generatedAt));
  if (!updatedManifest.endsWith('\n')) {
    updatedManifest = `${updatedManifest}\n`;
  }
  writeTextAtomic(manifestPath, updatedManifest);

  console.log('fabric pm:plan-slices: OK');
  console.log(`- planned slices: ${String(slices.length)}`);
  console.log(`- active slice: ${activeSlice.id} (${activeSlice.status})`);
  console.log(`- planning mode: ${planningMode}`);
  console.log('- backlog/current-slice regenerated from approved brief');
}

export {
  llmCheck,
  pmBriefReadiness,
  pmBriefSemanticCheck,
  pmApproveBrief,
  pmStatus,
  pmFinalizeBootstrapReviews,
  pmBootstrapSignoff,
  pmPlanSlices,
  architectFinalizeBaseline,
  uiuxFinalizeCurrentSliceFlow,
};
