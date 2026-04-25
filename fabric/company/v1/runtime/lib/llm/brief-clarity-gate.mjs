import path from 'node:path';
import { writeTextAtomic } from '../core.mjs';
import { invokeStructured } from './brief-context.mjs';

const AMBIGUOUS_TERMS = ['should', 'could', 'may', 'simple', 'lean', 'scalable'];
const ACTION_VERB_PREFIX = '(build|deliver|provide|capture|support|allow|enable|show|present|generate|maintain|limit|exclude|include|collect|store|use|keep|create|treat|preserve|route|validate|trigger|schedule|mark|track|display|record|send|manage|prioritize|surface|launch|release|write|read|update|remove|defer|avoid|list|request|lock|hold|ship|add|set)';
const ACTION_SUBJECTS = '(users?|user|system|app|service|team|qa|product|workflow|flow|dashboard|onboarding|reminder(s)?)';
const NON_ACTION_STARTERS = new Set([
  'the', 'this', 'that', 'these', 'those', 'there', 'it', 'they', 'he', 'she',
  'a', 'an', 'and', 'or', 'but', 'if', 'when', 'while', 'because',
  'today', 'soon', 'later', 'mvp', 'v1',
]);
const DECISION_SECTIONS_FOR_ALTERNATIVES = [
  '5. mvp objective',
  '6. core mvp scope',
  '9. technical direction',
  '12. delivery expectations',
];
const DECISION_SECTIONS_FOR_AMBIGUITY = [
  '5. mvp objective',
  '6. core mvp scope',
  '9. technical direction',
  '10. data and privacy constraints',
  '11. explicit out of scope (mvp)',
  '12. delivery expectations',
  '13. primary success criteria',
];
const CLARITY_RULES_CONTRACT = [
  'Clarity rules contract (mandatory):',
  '- Keep the exact 15-section shape and section intent boundaries.',
  '- Keep one decision per bullet.',
  '- Resolve alternatives with one default decision or explicit default wording.',
  '- Avoid soft terms ("should/could/may/simple/lean/scalable") unless concretely bounded in the same line.',
  '- In "Primary Success Criteria", every bullet must include an observable signal (time/count/threshold or binary completion condition).',
  '- In "Core MVP Scope", every bullet must be action-oriented and explicitly bounded.',
  '- Do not output malformed lines (broken quoting/punctuation artifacts, concatenated fragments, or unresolved placeholders).',
  '- Do not hard-lock channel/formula/canonical decisions unless they are explicitly supported by provided evidence/framing.',
  '- Keep output compact; do not increase verbosity to add caveats.',
  '- During retries, fix flagged issues without introducing any new clarity-rule violations.',
  '- Before returning, run a full self-check across all clarity rules, not only flagged items.',
].join('\n');
const CLARITY_RULE_IDS = [
  'unresolved_alternative',
  'ambiguous_term',
  'missing_observable_signal',
  'scope_not_action_oriented',
  'scope_not_bounded',
  'draft_integrity_issue',
  'source_overreach',
];
const SCOPE_BOUNDARY_TYPES = [
  'temporal',
  'cardinality',
  'channel',
  'platform',
  'data_source',
  'in_out_scope',
  'actor',
  'workflow_state',
  'other',
  'none',
];

const CLARITY_FINDING_ADJUDICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['assessments'],
  properties: {
    assessments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'is_violation', 'detail', 'boundary_type', 'evidence_span'],
        properties: {
          id: { type: 'string' },
          is_violation: { type: 'boolean' },
          detail: { type: 'string' },
          boundary_type: { type: 'string', enum: SCOPE_BOUNDARY_TYPES },
          evidence_span: { type: 'string' },
        },
      },
    },
  },
};

const CLARITY_SEMANTIC_REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['issues'],
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['rule', 'section', 'line', 'detail', 'boundary_type', 'evidence_span'],
        properties: {
          rule: { type: 'string', enum: CLARITY_RULE_IDS },
          section: { type: 'string' },
          line: { type: 'string' },
          detail: { type: 'string' },
          boundary_type: { type: 'string', enum: SCOPE_BOUNDARY_TYPES },
          evidence_span: { type: 'string' },
        },
      },
    },
  },
};

const CLARITY_SUGGESTIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'best_way_forward', 'rationale', 'confidence', 'implementation_note'],
        properties: {
          id: { type: 'string' },
          best_way_forward: { type: 'string' },
          rationale: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          implementation_note: { type: 'string' },
        },
      },
    },
  },
};

function findSectionBlocks(markdown) {
  const text = String(markdown || '');
  const regex = /^##\s+(.+?)\s*$/gm;
  const matches = [...text.matchAll(regex)];
  const sections = [];
  for (let i = 0; i < matches.length; i += 1) {
    const title = String(matches[i][1] || '').trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections.push({
      title,
      normalizedTitle: title.toLowerCase(),
      body: text.slice(start, end).trim(),
    });
  }
  return sections;
}

function findSectionByTitle(sections, titlePrefix) {
  const key = String(titlePrefix || '').trim().toLowerCase();
  return sections.find((section) => section.normalizedTitle.startsWith(key)) || null;
}

function extractBulletLines(sectionBody) {
  return String(sectionBody || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);
}

function trimForIssue(line) {
  const normalized = String(line || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= 150) return normalized;
  return `${normalized.slice(0, 147)}...`;
}

function includesUnresolvedAlternative(line) {
  const text = String(line || '');
  if (!/\bor\b/i.test(text)) return false;
  if (/\brather than\b/i.test(text)) return false;
  if (/\bdefault\s*:/i.test(text)) return false;
  if (/\bdefaults?\s+to\b/i.test(text)) return false;
  if (/\bchoose\s+/i.test(text)) return false;
  return true;
}

function hasQualifier(line) {
  return /(\d+|%|<=|>=|<|>|\bonly\b|\bwithin\b|\bat most\b|\bat least\b|\bno more than\b|\bless than\b|\bmore than\b|\bdefault\b|\bexactly\b|\bone\b|\btwo\b|\bthree\b|\bmanual\b|\bwithout\b|\bwith no\b)/i.test(String(line || ''));
}

function hasAmbiguousTerm(line) {
  const text = String(line || '').toLowerCase();
  return AMBIGUOUS_TERMS.some((term) => text.includes(term));
}

function hasObservableSignal(line) {
  const text = String(line || '');
  if (/\d+([.,]\d+)?/.test(text)) return true;
  if (/%|<=|>=|<|>/.test(text)) return true;
  if (/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i.test(text)) return true;
  if (/\b(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months)\b/i.test(text)) return true;
  if (/\b(at least|at most|no more than|less than|more than|minimum|maximum|within|under|over)\b/i.test(text)) return true;
  if (/\b(can|cannot|must|is|are)\b.{0,40}\b(done|complete|completed|available|present|blocked|succeeds|fails)\b/i.test(text)) return true;
  if (/\b(includes?|contains?|covers?|supports?)\b.{0,80}\b(all|each|every)\b/i.test(text)) return true;
  if (/\bend to end\b/i.test(text) && /\b(all|each|every|full)\b/i.test(text)) return true;
  return false;
}

function isActionOrientedScopeBullet(line) {
  const text = String(line || '').trim();
  if (!text) return false;
  if (/^for each\b/i.test(text)) return true;

  // Imperative action style: "List ...", "Request ...", "Generate ...".
  if (new RegExp(`^${ACTION_VERB_PREFIX}\\b`, 'i').test(text)) return true;

  // Actor + action style: "Users can ...", "System will ...", "Dashboard shows ...".
  if (new RegExp(`^${ACTION_SUBJECTS}\\s+(can|must|will|shall|needs?\\s+to|is\\s+required\\s+to|are\\s+required\\s+to|${ACTION_VERB_PREFIX})\\b`, 'i').test(text)) {
    return true;
  }

  // Semantic fallback: accept when sentence starts with a plausible verb phrase
  // and avoids common non-action leading tokens.
  const firstWord = text.split(/\s+/)[0]?.toLowerCase() || '';
  if (NON_ACTION_STARTERS.has(firstWord)) return false;
  if (/^[a-z][a-z-]{2,}$/.test(firstWord)) {
    // Noun-heavy suffixes are usually not imperative verbs.
    if (/(tion|ment|ness|ity|ship|ance|ence|sion|hood|ism|ist)$/.test(firstWord)) return false;
    return true;
  }
  return false;
}

function isBoundedScopeBullet(line) {
  return /(\d+|%|<=|>=|<|>|\bonly\b|\bwithin\b|\bup to\b|\bat most\b|\bat least\b|\bno more than\b|\bless than\b|\bmore than\b|\bsingle\b|\bone\b|\btwo\b|\bthree\b|\bmvp\b|\bv1\b|\bmanual\b|\bwithout\b|\bwith no\b|\blimited\b|\bbounded\b|\bper\b|\beach\b|\bdefault\b)/i.test(String(line || ''));
}

function hasControlCharacters(text) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(String(text || ''));
}

function hasMalformedDraftFragments(text) {
  const line = String(text || '');
  if (/['"`]\s*,\s*['"`]/.test(line)) return true;
  if (/\.\s*['"`]\s*,/.test(line)) return true;
  if (/,\s*['"`][A-Za-z]/.test(line)) return true;
  if (/['"`]\s*,\s*[A-Za-z]/.test(line)) return true;
  return false;
}

function hasUnresolvedPlaceholder(text) {
  const line = String(text || '');
  if (/\{\{[^}]+\}\}/.test(line)) return true;
  if (/\[\[[^\]]+\]\]/.test(line)) return true;
  if (/\b(TODO|FIXME|TBD)\b/i.test(line)) return true;
  return false;
}

function looksTruncatedFragment(text) {
  const line = String(text || '').trim();
  if (line.length < 24) return false;
  if (/[.!?]$/.test(line)) return false;
  if (/\b(to|and|or|for|with|in|on|of|from|the|a|an)\s*$/i.test(line)) return true;
  if (/\s[a-z]$/.test(line)) return true;
  return false;
}

function collectDraftIntegrityIssues({ sections }) {
  const issues = [];
  const dedupe = new Set();
  const addIssue = (section, line, detail) => {
    const key = `${String(section).toLowerCase()}||${String(line).toLowerCase()}||${String(detail).toLowerCase()}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    issues.push({
      rule: 'draft_integrity_issue',
      section,
      line,
      detail,
    });
  };

  for (const section of sections) {
    const bodyLines = String(section.body || '').split('\n');
    for (const rawLine of bodyLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      const content = trimmed
        .replace(/^-\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .trim();
      if (!content) continue;

      if (hasControlCharacters(content)) {
        addIssue(section.title, content, 'Contains control characters or invalid text artifacts.');
      }
      if (hasMalformedDraftFragments(content)) {
        addIssue(section.title, content, 'Contains malformed quoting/punctuation artifacts.');
      }
      if (hasUnresolvedPlaceholder(content)) {
        addIssue(section.title, content, 'Contains unresolved placeholder tokens.');
      }
      if (looksTruncatedFragment(content)) {
        addIssue(section.title, content, 'Looks truncated or syntactically incomplete.');
      }
    }
  }

  const scopeSection = findSectionByTitle(sections, '6. core mvp scope');
  if (scopeSection) {
    for (const rawLine of String(scopeSection.body || '').split('\n')) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      if (/^###\s+/.test(trimmed)) continue;
      if (/^-\s+/.test(trimmed)) continue;
      addIssue(
        scopeSection.title,
        trimmed,
        'Core MVP Scope must contain only section headings (###) and bullet lines (-).',
      );
    }
  }

  return issues;
}

export function reviewGeneratedBriefClarity(markdown) {
  const sections = findSectionBlocks(markdown);
  const issues = [];
  const addIssue = ({ rule, section, line, detail }) => {
    issues.push({
      rule,
      section,
      line: trimForIssue(line),
      detail,
    });
  };

  for (const sectionKey of DECISION_SECTIONS_FOR_ALTERNATIVES) {
    const section = findSectionByTitle(sections, sectionKey);
    if (!section) continue;
    for (const line of extractBulletLines(section.body)) {
      if (includesUnresolvedAlternative(line)) {
        addIssue({
          rule: 'unresolved_alternative',
          section: section.title,
          line,
          detail: 'Replace alternatives with one default decision or an explicit default statement.',
        });
      }
    }
  }

  for (const sectionKey of DECISION_SECTIONS_FOR_AMBIGUITY) {
    const section = findSectionByTitle(sections, sectionKey);
    if (!section) continue;
    for (const line of extractBulletLines(section.body)) {
      if (hasAmbiguousTerm(line) && !hasQualifier(line)) {
        addIssue({
          rule: 'ambiguous_term',
          section: section.title,
          line,
          detail: 'Use explicit bounds or measurable qualifiers when using soft terms.',
        });
      }
    }
  }

  const successSection = findSectionByTitle(sections, '13. primary success criteria');
  const successBullets = extractBulletLines(successSection?.body || '');
  for (const line of successBullets) {
    if (!hasObservableSignal(line)) {
      addIssue({
        rule: 'missing_observable_signal',
        section: successSection?.title || '13. Primary Success Criteria',
        line,
        detail: 'Add time/count/threshold signal or a binary completion condition.',
      });
    }
  }

  const scopeSection = findSectionByTitle(sections, '6. core mvp scope');
  const scopeBullets = extractBulletLines(scopeSection?.body || '');
  for (const line of scopeBullets) {
    if (!isActionOrientedScopeBullet(line)) {
      addIssue({
        rule: 'scope_not_action_oriented',
        section: scopeSection?.title || '6. Core MVP Scope',
        line,
        detail: 'Start with an action verb and describe the concrete action.',
      });
    }
    if (!isBoundedScopeBullet(line)) {
      addIssue({
        rule: 'scope_not_bounded',
        section: scopeSection?.title || '6. Core MVP Scope',
        line,
        detail: 'Add explicit boundaries (only/within/manual/v1/count/threshold).',
      });
    }
  }

  for (const issue of collectDraftIntegrityIssues({ sections })) {
    addIssue(issue);
  }

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      sectionCount: sections.length,
      successCriteriaCount: successBullets.length,
      scopeBulletCount: scopeBullets.length,
    },
  };
}

function formatIssue(issue, index) {
  return `${index + 1}. [${issue.rule}] ${issue.section}: "${issue.line}" (${issue.detail})`;
}

function recommendedFixForIssue(issue) {
  const rule = String(issue?.rule || '').trim();
  if (rule === 'unresolved_alternative') {
    return 'Choose one default decision and rewrite without open alternatives.';
  }
  if (rule === 'ambiguous_term') {
    return 'Replace soft wording with measurable bounds (time/count/threshold) in the same line.';
  }
  if (rule === 'missing_observable_signal') {
    return 'Add an observable success signal: numeric threshold, time bound, or binary completion condition.';
  }
  if (rule === 'scope_not_action_oriented') {
    return 'Rewrite as a concrete action statement with a clear actor and verb.';
  }
  if (rule === 'scope_not_bounded') {
    return 'Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.';
  }
  if (rule === 'draft_integrity_issue') {
    return 'Repair malformed text artifacts and ensure line is syntactically complete and structurally valid markdown.';
  }
  if (rule === 'source_overreach') {
    return 'Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.';
  }
  return 'Rewrite the line to satisfy the clarity rules while preserving section intent and compactness.';
}

function normalizeCustomerReviewLine(value, fallback = 'none') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || String(fallback || 'none');
}

function formatCustomerReviewSuggestionText(entry) {
  if (!entry) return 'none';
  const bestWayForward = normalizeCustomerReviewLine(entry.bestWayForward, 'none');
  const confidence = normalizeCustomerReviewLine(entry.confidence, 'medium');
  const rationale = normalizeCustomerReviewLine(entry.rationale, 'none');
  const implementationNote = normalizeCustomerReviewLine(entry.implementationNote, 'none');
  return `${bestWayForward} (confidence=${confidence}; rationale=${rationale}; implementation note=${implementationNote})`;
}

function buildCustomerReviewEntries({ issues, suggestions }) {
  const issueList = Array.isArray(issues) ? issues : [];
  const suggestionList = Array.isArray(suggestions) ? suggestions : [];
  const suggestionsByIssue = new Map();

  for (const suggestion of suggestionList) {
    const key = issueKey(suggestion);
    if (!suggestionsByIssue.has(key)) suggestionsByIssue.set(key, []);
    suggestionsByIssue.get(key).push(suggestion);
  }

  return issueList.map((issue) => {
    const boundaryMeta = issue.boundaryType && issue.boundaryType !== '-'
      ? ` (boundary_type=${issue.boundaryType}${issue.evidenceSpan ? `; evidence="${issue.evidenceSpan}"` : ''})`
      : '';
    const key = issueKey(issue);
    const matches = suggestionsByIssue.get(key) || [];
    const suggestionText = matches.length > 0
      ? matches.map((entry) => formatCustomerReviewSuggestionText(entry)).join(' | ')
      : 'none';
    return {
      finding: normalizeCustomerReviewLine(`[${issue.rule}] ${issue.section}: "${issue.line}"${boundaryMeta}`),
      recommendedFix: normalizeCustomerReviewLine(recommendedFixForIssue(issue)),
      suggestion: normalizeCustomerReviewLine(suggestionText),
    };
  });
}

function issueKey(issue) {
  return [
    String(issue?.rule || '').trim().toLowerCase(),
    String(issue?.section || '').trim().toLowerCase(),
    String(issue?.line || '').trim().toLowerCase(),
  ].join('||');
}

function mergePassOneAndSemanticReviews({ passOneReview, semanticReview }) {
  const first = passOneReview || { ok: true, issues: [], stats: {} };
  const second = semanticReview || { ok: true, issues: [], stats: {} };
  const merged = new Map();
  for (const issue of first.issues || []) merged.set(issueKey(issue), issue);
  // Semantic issues overwrite pass-1 issue metadata when the key matches.
  for (const issue of second.issues || []) merged.set(issueKey(issue), issue);

  const semanticOnlyIssueCount = (second.issues || [])
    .filter((issue) => !first.issues.some((candidate) => issueKey(candidate) === issueKey(issue)))
    .length;

  const issues = [...merged.values()];
  return {
    ok: issues.length === 0,
    issues,
    passOneDiagnostics: Array.isArray(first.passOneDiagnostics) ? first.passOneDiagnostics : [],
    passOneIssues: first.issues || [],
    semanticIssues: second.issues || [],
    stats: {
      ...(first.stats || {}),
      ...(second.stats || {}),
      passOneIssueCount: (first.issues || []).length,
      semanticIssueCount: (second.issues || []).length,
      semanticOnlyIssueCount,
      mergedIssueCount: issues.length,
    },
  };
}

function tokenizeSimilarity(text) {
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'only', 'when', 'then',
    'user', 'users', 'one', 'two', 'three', 'four', 'five', 'mvp', 'v1',
  ]);
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function overlapScore(aText, bText) {
  const a = tokenizeSimilarity(aText);
  const b = tokenizeSimilarity(bText);
  if (a.length === 0 || b.length === 0) return 0;
  const bSet = new Set(b);
  let score = 0;
  for (const token of a) {
    if (bSet.has(token)) score += 1;
  }
  return score;
}

function inferResolvedLine({ issue, nextMarkdown }) {
  const sections = findSectionBlocks(nextMarkdown);
  const section = sections.find((entry) => entry.title === issue.section) || null;
  if (!section) return '-';
  const bullets = extractBulletLines(section.body);
  if (bullets.length === 0) return '-';
  let best = bullets[0];
  let bestScore = overlapScore(issue.line, best);
  for (let i = 1; i < bullets.length; i += 1) {
    const score = overlapScore(issue.line, bullets[i]);
    if (score > bestScore) {
      best = bullets[i];
      bestScore = score;
    }
  }
  if (bestScore <= 0) return '-';
  return trimForIssue(best);
}

function writeBriefClarityLedger({ targetRoot, attempts }) {
  const outPath = path.join(targetRoot, 'docs/reviews/product-manager/brief-clarity-ledger.md');
  const uniqueIssues = [];
  const indexByKey = new Map();
  for (const attempt of attempts) {
    for (const issue of attempt.review.issues || []) {
      const key = issueKey(issue);
      let entry = indexByKey.get(key);
      if (!entry) {
        entry = {
          key,
          rule: issue.rule,
          section: issue.section,
          flaggedLine: issue.line,
          boundaryType: issue.boundaryType || '-',
          evidenceSpan: issue.evidenceSpan || '-',
          firstAttempt: attempt.attempt,
          lastAttempt: attempt.attempt,
          firstAttemptSnapshotRelPath: attempt.snapshotRelPath,
        };
        indexByKey.set(key, entry);
        uniqueIssues.push(entry);
      } else {
        entry.lastAttempt = attempt.attempt;
      }
    }
  }

  const lines = [
    '# Brief Clarity Ledger',
    '',
    `Date: \`${new Date().toISOString()}\``,
    `Attempts analyzed: \`${String(attempts.length)}\``,
    `Unique issues tracked: \`${String(uniqueIssues.length)}\``,
    '',
    '| Issue ID | Rule | Section | Flagged Line | First Seen | Boundary Type | Evidence Span | Status | Resolved Line |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  uniqueIssues.forEach((entry, idx) => {
    const issueId = `ISS-${String(idx + 1).padStart(3, '0')}`;
    const status = entry.lastAttempt >= attempts.length ? 'persisting' : 'resolved';
    let resolvedLine = '-';
    if (status === 'resolved') {
      const nextAttempt = attempts.find((a) => a.attempt === entry.lastAttempt + 1);
      if (nextAttempt && nextAttempt.briefMarkdown) {
        resolvedLine = inferResolvedLine({
          issue: { rule: entry.rule, section: entry.section, line: entry.flaggedLine },
          nextMarkdown: nextAttempt.briefMarkdown,
        });
      }
    }
    const firstSeen = `A${String(entry.firstAttempt)} (${entry.firstAttemptSnapshotRelPath || '-'})`;
    const boundaryType = String(entry.boundaryType || '-');
    const evidenceSpan = String(entry.evidenceSpan || '-');
    lines.push(
      `| ${issueId} | ${entry.rule} | ${entry.section} | ${entry.flaggedLine.replace(/\|/g, '\\|')} | ${firstSeen} | ${boundaryType.replace(/\|/g, '\\|')} | ${evidenceSpan.replace(/\|/g, '\\|')} | ${status} | ${String(resolvedLine).replace(/\|/g, '\\|')} |`,
    );
  });

  writeTextAtomic(outPath, `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);
  return outPath;
}

function writeBriefClarityReview({ targetRoot, gateEnabled, retryBudget, attempts, finalReview }) {
  const outPath = path.join(targetRoot, 'docs/reviews/product-manager/brief-clarity-review.md');
  const lines = [
    '# Brief Clarity Review',
    '',
    `Date: \`${new Date().toISOString()}\``,
    'Reviewed by: `Product Manager Intake Engine`',
    `Gate enabled: \`${gateEnabled ? 'yes' : 'no'}\``,
    `Retry budget: \`${String(retryBudget)}\``,
    `Attempts executed: \`${String(attempts.length)}\``,
    `Verdict: \`${gateEnabled ? (finalReview.ok ? 'pass' : 'fail') : 'skipped'}\``,
    '',
    '## Attempts',
    '',
  ];

  for (const entry of attempts) {
    const status = entry.review.ok ? 'pass' : 'fail';
    lines.push(`### Attempt ${String(entry.attempt)}`, '');
    lines.push(`- Status: \`${status}\``);
    if (entry.reviewMode) {
      lines.push(`- Review mode: \`${entry.reviewMode}\``);
    }
    if (entry.draftingMode) {
      lines.push(`- Drafting mode: \`${entry.draftingMode}\``);
    }
    if (entry.repairPlan) {
      lines.push(`- Targeted editable paths: \`${String(entry.repairPlan.editablePaths || 0)}\``);
      lines.push(`- Targeted patched paths: \`${String(entry.repairPlan.patchedPaths || 0)}\``);
      lines.push(`- Targeted unmapped findings: \`${String(entry.repairPlan.unmappedIssues || 0)}\``);
    }
    lines.push(`- Issues: \`${String(entry.review.issues.length)}\``);
    if (typeof entry.review?.stats?.deterministicIssueCount === 'number') {
      lines.push(`- Deterministic pass-1 findings: \`${String(entry.review.stats.deterministicIssueCount)}\``);
    }
    if (typeof entry.review?.stats?.semanticAdjudicationDismissed === 'number') {
      lines.push(`- Semantically dismissed findings: \`${String(entry.review.stats.semanticAdjudicationDismissed)}\``);
    }
    if (typeof entry.review?.stats?.semanticIssueCount === 'number') {
      lines.push(`- Global semantic findings: \`${String(entry.review.stats.semanticIssueCount)}\``);
    }
    if (typeof entry.review?.stats?.semanticOnlyIssueCount === 'number') {
      lines.push(`- Semantic-only findings (not in pass-1): \`${String(entry.review.stats.semanticOnlyIssueCount)}\``);
    }
    if (entry.snapshotRelPath) {
      lines.push(`- Draft snapshot: \`${entry.snapshotRelPath}\``);
    }
    if (Array.isArray(entry.review?.passOneDiagnostics) && entry.review.passOneDiagnostics.length > 0) {
      const dismissed = entry.review.passOneDiagnostics.filter((item) => item.disposition === 'dismissed_semantic').length;
      const kept = entry.review.passOneDiagnostics.length - dismissed;
      lines.push(`- Pass-1 finding ledger entries: \`${String(entry.review.passOneDiagnostics.length)}\``);
      lines.push(`- Pass-1 findings kept after semantic review: \`${String(kept)}\``);
      lines.push(`- Pass-1 findings dismissed after semantic review: \`${String(dismissed)}\``);
      lines.push('- Pass-1 finding ledger:');
      for (const finding of entry.review.passOneDiagnostics) {
        const boundaryMeta = finding.boundaryType && finding.boundaryType !== 'none'
          ? ` (boundary_type=${finding.boundaryType}${finding.evidenceSpan ? `; evidence="${finding.evidenceSpan}"` : ''})`
          : '';
        lines.push(
          `  - [${finding.disposition}] [${finding.rule}] ${finding.section}: "${finding.line}" — ${finding.adjudicationDetail}${boundaryMeta}`,
        );
      }
    }
    const customerReviewEntries = buildCustomerReviewEntries({
      issues: entry.review.issues,
      suggestions: entry.suggestions,
    });
    lines.push('# FOR CUSTOMER REVIEW:', '');
    if (customerReviewEntries.length === 0) {
      lines.push('None.', '');
    } else {
      customerReviewEntries.forEach((item, index) => {
        lines.push(`${String(index + 1)})`);
        lines.push(`\tFinding: ${item.finding}`);
        lines.push(`\tRecommended fix: ${item.recommendedFix}`);
        lines.push(`\tSuggestion: ${item.suggestion}`);
        lines.push('');
      });
    }
    lines.push('');
  }

  writeTextAtomic(outPath, `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);
  return outPath;
}

function semanticFindingId(index) {
  return `finding-${String(index + 1).padStart(3, '0')}`;
}

function normalizeSemanticIssues(rawIssues) {
  return (Array.isArray(rawIssues) ? rawIssues : [])
    .filter((entry) => CLARITY_RULE_IDS.includes(String(entry?.rule || '')))
    .map((entry) => {
      const issue = {
        rule: String(entry.rule),
        section: String(entry.section || '').trim() || 'Unknown Section',
        line: trimForIssue(String(entry.line || '').trim()),
        detail: String(entry.detail || '').trim() || 'Semantic clarity validation flagged this line.',
      };
      const boundaryType = String(entry.boundary_type || '').trim();
      const evidenceSpan = String(entry.evidence_span || '').trim();
      if (issue.rule === 'scope_not_bounded') {
        issue.boundaryType = SCOPE_BOUNDARY_TYPES.includes(boundaryType) ? boundaryType : 'none';
        issue.evidenceSpan = trimForIssue(evidenceSpan);
      }
      return issue;
    })
    .filter((issue) => issue.line.length > 0);
}

async function adjudicatePassOneFindingsWithSemantic({ targetRoot, settings, markdown, findings, onProgress }) {
  const seededFindings = findings.map((issue, idx) => ({
    id: semanticFindingId(idx),
    rule: issue.rule,
    section: issue.section,
    line: issue.line,
    detail: issue.detail,
  }));

  const systemPrompt = [
    'You adjudicate candidate clarity findings in a project brief.',
    'Return JSON only according to the schema.',
    'Judge semantics, not keyword presence.',
    'Mark is_violation=true only when the candidate is a real decision-quality problem in context.',
    'Mark is_violation=false when wording is acceptable in context.',
    'Never dismiss draft_integrity_issue findings. They are always violations.',
    'For unresolved_alternative, treat threshold forms like "or less", "or more", "or later" as non-violations unless they create an unresolved decision.',
    'For missing_observable_signal, accept concrete binary completion conditions even without numbers.',
    'For scope_not_bounded, use boundary_type and evidence_span to indicate enforceable boundary evidence when present.',
    'For scope_not_bounded with no enforceable boundary, set boundary_type=none and evidence_span=""',
    'For all other rules, set boundary_type=none and evidence_span=""',
  ].join('\n');

  const userPrompt = [
    'Project brief markdown:',
    '```markdown',
    String(markdown || '').trim(),
    '```',
    '',
    'Candidate findings JSON:',
    '```json',
    JSON.stringify(seededFindings, null, 2),
    '```',
    '',
    'Adjudicate each candidate by id.',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'brief_clarity_finding_adjudication',
    caller: 'brief-clarity-gate.adjudicatePassOneFindingsWithSemantic',
    targetRoot,
    systemPrompt,
    userPrompt,
    schema: CLARITY_FINDING_ADJUDICATION_SCHEMA,
    promptSourceFiles: [
      'docs/product/project-brief.md',
    ],
    onProgress,
  });
  const assessments = Array.isArray(output?.assessments) ? output.assessments : [];
  return { seededFindings, assessments };
}

async function reviewGeneratedBriefClarityPassOne({
  targetRoot,
  settings,
  markdown,
  semanticClarityGateEnabled = true,
  onProgress,
}) {
  const base = reviewGeneratedBriefClarity(markdown);
  const deterministicFindings = base.issues.map((issue, idx) => ({
    id: semanticFindingId(idx),
    rule: issue.rule,
    section: issue.section,
    line: issue.line,
    detail: issue.detail,
  }));
  if (!semanticClarityGateEnabled || base.issues.length === 0) {
    const passOneDiagnostics = deterministicFindings.map((finding) => ({
      ...finding,
      disposition: 'kept_no_semantic',
      adjudicationDetail: finding.detail,
      boundaryType: 'none',
      evidenceSpan: '',
    }));
    return {
      ...base,
      passOneDiagnostics,
      stats: {
        ...(base.stats || {}),
        deterministicIssueCount: base.issues.length,
        semanticAdjudicationChecked: false,
        semanticAdjudicationFallback: !semanticClarityGateEnabled,
        semanticAdjudicationDismissed: 0,
      },
    };
  }

  const progress = typeof onProgress === 'function' ? onProgress : null;
  try {
    if (progress) progress('running semantic adjudication for pass-1 clarity findings...');
    const semantic = await adjudicatePassOneFindingsWithSemantic({
      targetRoot,
      settings,
      markdown,
      findings: base.issues,
      onProgress: progress,
    });
    const byId = new Map();
    for (const assessment of semantic.assessments || []) {
      byId.set(String(assessment.id), assessment);
    }

    const issues = [];
    const passOneDiagnostics = [];
    let dismissed = 0;
    let unknown = 0;
    for (let i = 0; i < base.issues.length; i += 1) {
      const issue = base.issues[i];
      if (issue.rule === 'draft_integrity_issue') {
        passOneDiagnostics.push({
          id: semanticFindingId(i),
          rule: issue.rule,
          section: issue.section,
          line: issue.line,
          detail: issue.detail,
          disposition: 'kept_hard_block',
          adjudicationDetail: 'Draft integrity issues are hard-block findings and cannot be semantically dismissed.',
          boundaryType: 'none',
          evidenceSpan: '',
        });
        issues.push(issue);
        continue;
      }
      const assessment = byId.get(semanticFindingId(i));
      if (!assessment) {
        unknown += 1;
        passOneDiagnostics.push({
          id: semanticFindingId(i),
          rule: issue.rule,
          section: issue.section,
          line: issue.line,
          detail: issue.detail,
          disposition: 'kept_no_assessment',
          adjudicationDetail: issue.detail,
          boundaryType: 'none',
          evidenceSpan: '',
        });
        issues.push(issue);
        continue;
      }
      if (assessment.is_violation === false) {
        dismissed += 1;
        passOneDiagnostics.push({
          id: semanticFindingId(i),
          rule: issue.rule,
          section: issue.section,
          line: issue.line,
          detail: issue.detail,
          disposition: 'dismissed_semantic',
          adjudicationDetail: String(assessment.detail || issue.detail || '').trim() || issue.detail,
          boundaryType: SCOPE_BOUNDARY_TYPES.includes(String(assessment.boundary_type || ''))
            ? String(assessment.boundary_type)
            : 'none',
          evidenceSpan: trimForIssue(String(assessment.evidence_span || '')),
        });
        continue;
      }
      const nextIssue = {
        ...issue,
        detail: String(assessment.detail || issue.detail || '').trim() || issue.detail,
      };
      if (issue.rule === 'scope_not_bounded') {
        nextIssue.boundaryType = SCOPE_BOUNDARY_TYPES.includes(String(assessment.boundary_type || ''))
          ? String(assessment.boundary_type)
          : 'none';
        nextIssue.evidenceSpan = trimForIssue(String(assessment.evidence_span || ''));
      }
      passOneDiagnostics.push({
        id: semanticFindingId(i),
        rule: issue.rule,
        section: issue.section,
        line: issue.line,
        detail: issue.detail,
        disposition: 'kept_semantic',
        adjudicationDetail: nextIssue.detail,
        boundaryType: nextIssue.boundaryType || 'none',
        evidenceSpan: nextIssue.evidenceSpan || '',
      });
      issues.push(nextIssue);
    }

    return {
      ok: issues.length === 0,
      issues,
      passOneDiagnostics,
      stats: {
        ...(base.stats || {}),
        deterministicIssueCount: base.issues.length,
        semanticAdjudicationChecked: true,
        semanticAdjudicationFallback: false,
        semanticAdjudicationDismissed: dismissed,
        semanticAdjudicationUnknown: unknown,
      },
    };
  } catch (error) {
    if (progress) progress(`semantic adjudication unavailable; using deterministic findings (${String(error?.message || error)})`);
    const passOneDiagnostics = deterministicFindings.map((finding) => ({
      ...finding,
      disposition: 'kept_fallback',
      adjudicationDetail: finding.detail,
      boundaryType: 'none',
      evidenceSpan: '',
    }));
    return {
      ...base,
      passOneDiagnostics,
      stats: {
        ...(base.stats || {}),
        deterministicIssueCount: base.issues.length,
        semanticAdjudicationChecked: false,
        semanticAdjudicationFallback: true,
        semanticAdjudicationDismissed: 0,
      },
    };
  }
}

async function reviewGeneratedBriefClarityAllSemantic({
  targetRoot,
  settings,
  markdown,
  evidencePack = '',
  synthesis = null,
  framing = null,
  synthesisContext = '',
  framingContext = '',
  pmRoleContractSource = '',
  pmRoleContractBriefFocus = '',
  semanticClarityGateEnabled = true,
  strictSemanticOnly = false,
  onProgress,
}) {
  const fallback = strictSemanticOnly ? { ok: true, issues: [], stats: {} } : reviewGeneratedBriefClarity(markdown);
  if (!semanticClarityGateEnabled) {
    return {
      ...fallback,
      stats: {
        ...(fallback.stats || {}),
        semanticValidationChecked: false,
        semanticValidationFallback: true,
      },
    };
  }

  const progress = typeof onProgress === 'function' ? onProgress : null;
  try {
    if (progress) progress('running full semantic clarity validation pass...');
    const systemPrompt = [
      'You are a strict clarity gate reviewer for product briefs.',
      'Respect Product Manager role guidance, but prioritize clarity rules and schema requirements.',
      'Return JSON only according to the schema.',
      'Judge semantics, not keyword presence.',
      'Report only real violations of the clarity rules.',
      'Rules:',
      '- unresolved_alternative: unresolved decision options remain without a default.',
      '- ambiguous_term: soft wording is not concretely bounded in context.',
      '- missing_observable_signal: success criterion lacks observable signal (time/count/threshold/binary completion condition).',
      '- scope_not_action_oriented: scope bullet does not specify a concrete action.',
      '- scope_not_bounded: scope bullet lacks enforceable boundary.',
      '- draft_integrity_issue: malformed or broken drafting artifacts (for example damaged punctuation/quotes, concatenated fragments, unresolved placeholders, or malformed list items).',
      '- source_overreach: line asserts a locked decision that is not sufficiently supported by evidence pack + synthesis + framing context.',
      'For unresolved_alternative, threshold expressions like "or less"/"or more" are not violations unless they create unresolved choices.',
      'For scope_not_bounded, set boundary_type and evidence_span; use boundary_type=none and evidence_span="" when unbounded.',
      'For all non-scope_not_bounded issues, set boundary_type=none and evidence_span="".',
      'For source_overreach, focus on hard-lock wording like canonical/fixed/formula/channel mandates that are unsupported by context.',
      'Do not flag a line as source_overreach if the same locked decision is explicitly supported by the provided synthesis/framing.',
    ].join('\n');
    const userPrompt = [
      'Project brief markdown:',
      '```markdown',
      String(markdown || '').trim(),
      '```',
      '',
      'Clarity rules contract:',
      '```text',
      CLARITY_RULES_CONTRACT,
      '```',
      '',
      'Evidence pack:',
      '```markdown',
      String(evidencePack || '').trim(),
      '```',
      '',
      'Source synthesis JSON:',
      '```json',
      JSON.stringify(synthesis || {}, null, 2),
      '```',
      '',
      'Source synthesis markdown context (optional):',
      '```markdown',
      String(synthesisContext || '').trim(),
      '```',
      '',
      'Product system framing JSON:',
      '```json',
      JSON.stringify(framing || {}, null, 2),
      '```',
      '',
      'Product system framing markdown context:',
      '```markdown',
      String(framingContext || '').trim(),
      '```',
      '',
      `Product Manager role guidance source: ${String(pmRoleContractSource || 'not_provided')}`,
      'PM role brief-focused guidance:',
      '```markdown',
      String(pmRoleContractBriefFocus || '').trim(),
      '```',
    ].join('\n');

    const output = await invokeStructured({
      settings,
      taskName: 'brief_clarity_semantic_validation',
      caller: 'brief-clarity-gate.reviewGeneratedBriefClarityAllSemantic',
      targetRoot,
      systemPrompt,
      userPrompt,
      schema: CLARITY_SEMANTIC_REVIEW_SCHEMA,
      promptSourceFiles: [
        String(pmRoleContractSource || ''),
        'docs/product/project-brief.md',
        'docs/product/source-evidence-pack.md',
        'docs/product/source-synthesis.md',
        'docs/product/product-system-framing.md',
      ],
      onProgress: progress,
    });
    const issues = normalizeSemanticIssues(output?.issues);
    return {
      ok: issues.length === 0,
      issues,
      stats: {
        ...(fallback.stats || {}),
        semanticValidationChecked: true,
        semanticValidationFallback: false,
      },
    };
  } catch (error) {
    if (strictSemanticOnly) {
      throw error;
    }
    if (progress) progress(`semantic validation unavailable; using deterministic fallback (${String(error?.message || error)})`);
    return {
      ...fallback,
      stats: {
        ...(fallback.stats || {}),
        semanticValidationChecked: false,
        semanticValidationFallback: true,
      },
    };
  }
}

export {
  CLARITY_RULES_CONTRACT,
  CLARITY_RULE_IDS,
  SCOPE_BOUNDARY_TYPES,
  reviewGeneratedBriefClarityPassOne,
  reviewGeneratedBriefClarityAllSemantic,
  mergePassOneAndSemanticReviews,
  writeBriefClarityReview,
  writeBriefClarityLedger,
  recommendedFixForIssue,
};
