
import path from 'node:path';
import { FABRIC_ROOT } from '../constants.mjs';
import { readText, writeTextAtomic } from '../core.mjs';
import { resolveLlmSettings, validateLlmSettings } from './config.mjs';
import { invokeOpenAIStructured } from './provider-openai.mjs';
import { invokeStdioJsonStructured } from './provider-stdio-json.mjs';

const SOURCE_SYNTHESIS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['product_name','core_promise','source_comparison','recurring_themes','hard_constraints','out_of_scope','ambiguities','structural_corrections','recommended_briefing_points'],
  properties: {
    product_name: { type: 'string' },
    core_promise: { type: 'string' },
    source_comparison: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['source_path','source_kind','key_points'], properties: { source_path: { type: 'string' }, source_kind: { type: 'string' }, key_points: { type: 'array', items: { type: 'string' } } } } },
    recurring_themes: { type: 'array', items: { type: 'string' } },
    hard_constraints: { type: 'array', items: { type: 'string' } },
    out_of_scope: { type: 'array', items: { type: 'string' } },
    ambiguities: { type: 'array', items: { type: 'string' } },
    structural_corrections: { type: 'array', items: { type: 'string' } },
    recommended_briefing_points: { type: 'array', items: { type: 'string' } },
  },
};

const PRODUCT_SYSTEM_FRAMING_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['product_essence','target_users','jobs_to_be_done','core_concepts','product_rules','primary_workflows','mvp_boundaries','open_decisions'],
  properties: {
    product_essence: { type: 'string' },
    target_users: { type: 'array', items: { type: 'string' } },
    jobs_to_be_done: { type: 'array', items: { type: 'string' } },
    core_concepts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','definition'], properties: { name: { type: 'string' }, definition: { type: 'string' } } } },
    product_rules: { type: 'array', items: { type: 'string' } },
    primary_workflows: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','steps'], properties: { name: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } } } } },
    mvp_boundaries: { type: 'object', additionalProperties: false, required: ['in_scope','out_of_scope'], properties: { in_scope: { type: 'array', items: { type: 'string' } }, out_of_scope: { type: 'array', items: { type: 'string' } } } },
    open_decisions: { type: 'array', items: { type: 'string' } },
  },
};

const PROJECT_BRIEF_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['product_description','vision_and_positioning','core_problem','target_users','mvp_objective','core_mvp_scope','ux_principles_and_tone','primary_user_journey','technical_direction','data_and_privacy_constraints','explicit_out_of_scope','delivery_expectations','primary_success_criteria','future_roadmap'],
  properties: {
    product_description: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 20, maxLength: 260 } },
    vision_and_positioning: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 20, maxLength: 220 } },
    core_problem: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 20, maxLength: 220 } },
    target_users: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 12, maxLength: 180 } },
    mvp_objective: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 15, maxLength: 200 } },
    core_mvp_scope: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'bullets'],
        properties: {
          title: { type: 'string', minLength: 4, maxLength: 80 },
          bullets: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: { type: 'string', minLength: 16, maxLength: 200 },
          },
        },
      },
    },
    ux_principles_and_tone: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string', minLength: 12, maxLength: 180 } },
    primary_user_journey: { type: 'array', minItems: 5, maxItems: 8, items: { type: 'string', minLength: 16, maxLength: 220 } },
    technical_direction: { type: 'array', minItems: 4, maxItems: 7, items: { type: 'string', minLength: 12, maxLength: 220 } },
    data_and_privacy_constraints: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string', minLength: 12, maxLength: 220 } },
    explicit_out_of_scope: { type: 'array', minItems: 4, maxItems: 8, items: { type: 'string', minLength: 8, maxLength: 180 } },
    delivery_expectations: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string', minLength: 12, maxLength: 220 } },
    primary_success_criteria: { type: 'array', minItems: 4, maxItems: 8, items: { type: 'string', minLength: 14, maxLength: 220 } },
    future_roadmap: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string', minLength: 8, maxLength: 180 } },
  },
};

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

function normalizeSuggestionText(text, fallback) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value || String(fallback || '').trim();
}

async function suggestBestWayForwardForFindings({
  settings,
  issues,
  framing,
  framingContext = '',
  pmRoleContractSource = '',
  pmRoleContractBriefFocus = '',
  onProgress,
}) {
  const findings = (Array.isArray(issues) ? issues : []).slice(0, 24).map((issue, idx) => ({
    id: `issue-${String(idx + 1).padStart(3, '0')}`,
    rule: String(issue.rule || ''),
    section: String(issue.section || ''),
    line: String(issue.line || ''),
    detail: String(issue.detail || ''),
    recommended_fix: recommendedFixForIssue(issue),
  }));
  if (findings.length === 0) return [];

  const systemPrompt = [
    'You provide best-way-forward repair suggestions for project-brief findings.',
    'Respect Product Manager role guidance while preserving clarity-rule compliance.',
    'Return JSON only according to the schema.',
    'For each input finding id, return one concrete best_way_forward recommendation.',
    'Keep guidance concise, section-intent-safe, and evidence-aligned to product-system framing.',
    'Do not introduce new scope or hard-lock decisions unless clearly supported by framing.',
    'Focus on implementation/documentation wording in the project brief.',
  ].join('\n');
  const userPrompt = [
    'Findings JSON:',
    '```json',
    JSON.stringify(findings, null, 2),
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

  try {
    const output = await invokeStructured({
      settings,
      taskName: 'brief_clarity_suggestions',
      systemPrompt,
      userPrompt,
      schema: CLARITY_SUGGESTIONS_SCHEMA,
      onProgress,
    });
    const byId = new Map();
    for (const suggestion of output?.suggestions || []) {
      byId.set(String(suggestion.id || ''), suggestion);
    }

    return findings.map((finding) => {
      const generated = byId.get(finding.id);
      const fallbackBest = finding.recommended_fix;
      return {
        id: finding.id,
        rule: finding.rule,
        section: finding.section,
        line: finding.line,
        recommendedFix: finding.recommended_fix,
        bestWayForward: normalizeSuggestionText(generated?.best_way_forward, fallbackBest),
        rationale: normalizeSuggestionText(
          generated?.rationale,
          'Align this fix with section intent and product-system framing while avoiding new scope.',
        ),
        confidence: ['high', 'medium', 'low'].includes(String(generated?.confidence || ''))
          ? String(generated.confidence)
          : 'medium',
        implementationNote: normalizeSuggestionText(
          generated?.implementation_note,
          'Apply this wording update in the affected brief line and re-check clarity rules.',
        ),
      };
    });
  } catch (error) {
    if (typeof onProgress === 'function') {
      onProgress(`suggestion generation unavailable; using deterministic fallback (${String(error?.message || error)})`);
    }
    return findings.map((finding) => ({
      id: finding.id,
      rule: finding.rule,
      section: finding.section,
      line: finding.line,
      recommendedFix: finding.recommended_fix,
      bestWayForward: finding.recommended_fix,
      rationale: 'Fallback suggestion based on deterministic rule guidance.',
      confidence: 'low',
      implementationNote: 'Apply the recommended fix directly in the mapped brief line and rerun clarity gate.',
    }));
  }
}

function buildClarityRepairFeedback(review) {
  if (!review || review.ok) return '';
  const topIssues = review.issues.slice(0, 25).map((issue, i) => formatIssue(issue, i));
  const hasIntegrityIssues = review.issues.some((issue) => issue.rule === 'draft_integrity_issue');
  return [
    'The previous project brief draft failed clarity gate checks.',
    'Repair the draft while keeping the same 15-section shape and compact length profile.',
    ...(hasIntegrityIssues ? ['Resolve all draft-integrity issues first before wording refinements.'] : []),
    'Address every issue below and avoid introducing new ambiguity.',
    'Do not introduce any new clarity-rule violations while fixing listed issues.',
    'Before returning, run a full self-check against the full clarity rules contract and revise if needed.',
    '',
    'Flagged issues:',
    ...topIssues.map((line) => `- ${line}`),
  ].join('\n');
}

function writeBriefAttemptSnapshot({ targetRoot, attempt, markdown }) {
  const outPath = path.join(targetRoot, `docs/reviews/product-manager/brief-attempt-${String(attempt)}.md`);
  writeTextAtomic(outPath, String(markdown || '').replace(/\s+$/, '') + '\n');
  return outPath;
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

function normalizeForMatch(text) {
  return String(text || '')
    .replace(/^-\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sectionNumber(sectionTitle) {
  const match = String(sectionTitle || '').match(/^\s*(\d+)\./);
  return match ? Number.parseInt(match[1], 10) : null;
}

function normalizedScopeSubsection(sectionTitle) {
  const normalized = String(sectionTitle || '')
    .replace(/[—–]/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = normalized.split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function buildBriefEntryCatalog(briefData) {
  const data = briefData || {};
  const entries = [];
  const byPath = new Map();
  const add = (entry) => {
    entries.push(entry);
    byPath.set(entry.path, entry);
  };

  const addArray = (field, section) => {
    for (let i = 0; i < (data[field] || []).length; i += 1) {
      const path = `${field}[${String(i)}]`;
      add({
        path,
        section,
        sectionParent: section,
        text: String(data[field][i] || ''),
        get: (target) => String(target?.[field]?.[i] || ''),
        set: (target, value) => {
          if (Array.isArray(target?.[field]) && i < target[field].length) target[field][i] = value;
        },
      });
    }
  };

  addArray('product_description', '1. Product Description');
  addArray('vision_and_positioning', '2. Vision and Positioning');
  addArray('core_problem', '3. Core Problem');
  addArray('target_users', '4. Target Users');
  addArray('mvp_objective', '5. MVP Objective');

  for (let i = 0; i < (data.core_mvp_scope || []).length; i += 1) {
    const item = data.core_mvp_scope[i] || {};
    const title = String(item.title || '').trim() || `Scope Block ${String(i + 1)}`;
    const sectionParent = '6. Core MVP Scope';
    const section = `6. Core MVP Scope / ${title}`;
    const titlePath = `core_mvp_scope[${String(i)}].title`;
    add({
      path: titlePath,
      section,
      sectionParent,
      text: String(item.title || ''),
      get: (target) => String(target?.core_mvp_scope?.[i]?.title || ''),
      set: (target, value) => {
        if (Array.isArray(target?.core_mvp_scope) && target.core_mvp_scope[i]) target.core_mvp_scope[i].title = value;
      },
    });
    for (let j = 0; j < (item.bullets || []).length; j += 1) {
      const path = `core_mvp_scope[${String(i)}].bullets[${String(j)}]`;
      add({
        path,
        section,
        sectionParent,
        text: String(item.bullets[j] || ''),
        get: (target) => String(target?.core_mvp_scope?.[i]?.bullets?.[j] || ''),
        set: (target, value) => {
          if (
            Array.isArray(target?.core_mvp_scope)
            && target.core_mvp_scope[i]
            && Array.isArray(target.core_mvp_scope[i].bullets)
            && j < target.core_mvp_scope[i].bullets.length
          ) target.core_mvp_scope[i].bullets[j] = value;
        },
      });
    }
  }

  addArray('ux_principles_and_tone', '7. UX Principles and Tone');
  addArray('primary_user_journey', '8. Primary User Journey');
  addArray('technical_direction', '9. Technical Direction');
  addArray('data_and_privacy_constraints', '10. Data and Privacy Constraints');
  addArray('explicit_out_of_scope', '11. Explicit Out of Scope (MVP)');
  addArray('delivery_expectations', '12. Delivery Expectations');
  addArray('primary_success_criteria', '13. Primary Success Criteria');
  addArray('future_roadmap', '14. Future Roadmap (Not MVP)');

  return { entries, byPath };
}

function issueLineSimilarity(issueLine, entryLine) {
  const issue = normalizeForMatch(issueLine);
  const entry = normalizeForMatch(entryLine);
  if (!issue || !entry) return 0;
  if (issue === entry) return 100;
  if (issue.endsWith('...')) {
    const prefix = issue.slice(0, -3).trim();
    if (prefix && entry.startsWith(prefix)) return 95;
  }
  if (entry.includes(issue) || issue.includes(entry)) return 85;
  return overlapScore(issue, entry);
}

function mapIssueToEditableEntry({ issue, entries }) {
  const issueSection = String(issue?.section || '');
  const issueSectionNum = sectionNumber(issueSection);
  const issueScopeSubsection = normalizedScopeSubsection(issueSection);
  let candidates = entries;
  if (issueSectionNum != null) {
    candidates = candidates.filter((entry) => sectionNumber(entry.sectionParent || entry.section) === issueSectionNum);
  }
  if (issueSectionNum === 6 && issueScopeSubsection) {
    const narrowed = candidates.filter((entry) =>
      normalizeForMatch(entry.section).includes(issueScopeSubsection));
    if (narrowed.length > 0) candidates = narrowed;
  }
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestScore = issueLineSimilarity(issue.line, best.text);
  for (let i = 1; i < candidates.length; i += 1) {
    const score = issueLineSimilarity(issue.line, candidates[i].text);
    if (score > bestScore) {
      best = candidates[i];
      bestScore = score;
    }
  }
  if (bestScore <= 0 && candidates.length > 1) return null;
  return { entry: best, score: bestScore };
}

function buildTargetedRepairPlan({ issues, previousBriefData }) {
  const catalog = buildBriefEntryCatalog(previousBriefData);
  const editsByPath = new Map();
  const unmappedIssues = [];

  for (const issue of issues || []) {
    const mapped = mapIssueToEditableEntry({ issue, entries: catalog.entries });
    if (!mapped) {
      unmappedIssues.push({
        rule: issue.rule,
        section: issue.section,
        line: issue.line,
        detail: issue.detail,
      });
      continue;
    }
    const path = mapped.entry.path;
    const current = editsByPath.get(path) || {
      path,
      section: mapped.entry.section,
      current_text: mapped.entry.text,
      findings: [],
    };
    current.findings.push({
      rule: issue.rule,
      detail: issue.detail,
      recommended_fix: recommendedFixForIssue(issue),
      line: issue.line,
    });
    editsByPath.set(path, current);
  }

  return {
    edits: [...editsByPath.values()],
    allowedPaths: new Set([...editsByPath.keys()]),
    unmappedIssues,
    catalog,
  };
}

function applyTargetedStructuredPatches({ previousBriefData, candidateBriefData, allowedPaths, catalog }) {
  const base = JSON.parse(JSON.stringify(previousBriefData || {}));
  const nextCatalog = buildBriefEntryCatalog(candidateBriefData).byPath;
  const patchedPaths = [];

  for (const path of allowedPaths || []) {
    const entry = catalog.byPath.get(path);
    const candidateEntry = nextCatalog.get(path);
    if (!entry || !candidateEntry) continue;
    const nextText = String(candidateEntry.text || '').trim();
    if (!nextText) continue;
    const prevText = String(entry.get(base) || '');
    if (nextText === prevText) continue;
    entry.set(base, nextText);
    patchedPaths.push(path);
  }

  return {
    briefData: base,
    patchedPaths,
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
    if (entry.review.issues.length > 0) {
      lines.push('- Findings:');
      for (const issue of entry.review.issues) {
        const boundaryMeta = issue.boundaryType && issue.boundaryType !== '-'
          ? ` (boundary_type=${issue.boundaryType}${issue.evidenceSpan ? `; evidence="${issue.evidenceSpan}"` : ''})`
          : '';
        lines.push(`  - [${issue.rule}] ${issue.section}: "${issue.line}"${boundaryMeta}`);
      }
      lines.push('- Recommended fixes:');
      for (const issue of entry.review.issues) {
        lines.push(
          `  - [${issue.rule}] ${issue.section}: ${recommendedFixForIssue(issue)}`,
        );
      }
      if (Array.isArray(entry.suggestions) && entry.suggestions.length > 0) {
        lines.push('- Suggestions:');
        for (const suggestion of entry.suggestions) {
          lines.push(
            `  - [${suggestion.rule}] ${suggestion.section}: ${suggestion.bestWayForward} (confidence=${suggestion.confidence})`,
          );
          lines.push(`    rationale: ${suggestion.rationale}`);
          lines.push(`    implementation note: ${suggestion.implementationNote}`);
        }
      }
    }
    lines.push('');
  }

  writeTextAtomic(outPath, `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);
  return outPath;
}

function renderTemplate(templateName, variables) {
  const template = readText(path.join(FABRIC_ROOT, 'templates/llm', templateName));
  return template.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_, key) => String(variables[key] ?? ''));
}

function normalizeSpecPath(raw) {
  return String(raw || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^\.?\//, '');
}

function sanitizeRoleContractLine(line) {
  return String(line || '')
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractProductManagerBriefFocus(roleContract) {
  const text = String(roleContract || '');
  const lines = text.split('\n');
  const focusPatterns = [
    /\bspecific\b/i,
    /\bstructured\b/i,
    /\btraceable\b/i,
    /\bdecision-ready\b/i,
    /\bexecution-ready\b/i,
    /\bproduct promise\b/i,
    /\btarget users?\b/i,
    /\bjobs?\s+to\s+be\s+done\b/i,
    /\bmvp objective\b/i,
    /\bconstraints?\b/i,
    /\bsuccess criteria\b/i,
    /\bexpansion paths?\b/i,
    /\bproduct-system framing\b/i,
    /\bscope boundaries?\b/i,
    /\bmust-haves?\b/i,
    /\bnon-goals?\b/i,
    /\bout-of-scope\b/i,
    /\bcoheren(t|ce)\b/i,
    /\btestable\b/i,
    /\bwithout material guesswork\b/i,
    /\bevidence-based\b/i,
    /\bclarity over ambiguity\b/i,
  ];

  const picked = [];
  const seen = new Set();
  for (const rawLine of lines) {
    const line = sanitizeRoleContractLine(rawLine);
    if (!line) continue;
    if (/^#{1,6}\s+/.test(rawLine)) continue;
    if (line.length < 20) continue;
    if (!focusPatterns.some((pattern) => pattern.test(line))) continue;
    const compact = line.length > 220 ? `${line.slice(0, 217).trim()}...` : line;
    const key = compact.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(compact);
    if (picked.length >= 14) break;
  }

  const fallback = [
    'Keep outputs specific, structured, traceable, and decision-ready.',
    'Anchor brief decisions in customer evidence, not generic filler.',
    'Define product-system behavior, MVP boundaries, and explicit non-goals.',
    'Ensure success criteria are explicit, testable, and aligned to customer goals.',
    'Produce execution-ready scope without material guesswork for downstream roles.',
  ];

  const selected = picked.length > 0 ? picked : fallback;
  return selected.map((line) => `- ${line}`).join('\n');
}

function resolveRoleSpecPathFromRolesYaml({ roleId }) {
  const rolesPath = path.join(FABRIC_ROOT, 'team/roles.yaml');
  const text = readText(rolesPath);
  const blockMatch = text.match(new RegExp(`-\\s+id:\\s*${String(roleId)}\\b[\\s\\S]*?(?=\\n-\\s+id:|$)`));
  if (!blockMatch) {
    throw new Error(`Role '${String(roleId)}' not found in team/roles.yaml`);
  }
  const specMatch = blockMatch[0].match(/^\s*spec_path:\s*(.+)\s*$/m);
  if (!specMatch) {
    throw new Error(`Role '${String(roleId)}' missing spec_path in team/roles.yaml`);
  }
  const relPath = normalizeSpecPath(specMatch[1]);
  if (!relPath) {
    throw new Error(`Role '${String(roleId)}' has empty spec_path in team/roles.yaml`);
  }
  return relPath;
}

function loadProductManagerRoleContract() {
  const fallbackRelPath = 'team/product-manager.md';
  let relPath = fallbackRelPath;
  try {
    relPath = resolveRoleSpecPathFromRolesYaml({ roleId: 'product_manager' });
  } catch (_) {
    relPath = fallbackRelPath;
  }
  const absPath = path.join(FABRIC_ROOT, relPath);
  const roleContract = readText(absPath).trim();
  if (!roleContract) {
    throw new Error(`Product Manager role contract is empty at ${relPath}`);
  }
  return {
    relPath,
    roleContract,
    roleContractBriefFocus: extractProductManagerBriefFocus(roleContract),
  };
}

function renderEvidencePack(analysis) {
  const lines = ['# Source Evidence Pack', '', 'Treat this as the raw evidence bundle for model-driven intake.', ''];
  for (const doc of analysis.documents || []) {
    lines.push(`## Source: ${doc.path}`, '', '```text', String(doc.text || '').trim(), '```', '');
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function renderSourceSynthesisMarkdown(data) {
  const lines = ['# Source Synthesis', '', '## Product Identity', '', `- Product name: ${data.product_name}`, `- Core promise: ${data.core_promise}`, '', '## Source Comparison', ''];
  for (const item of data.source_comparison || []) {
    lines.push(`### ${item.source_path}`, '', `- Source kind: ${item.source_kind}`);
    for (const point of item.key_points || []) lines.push(`- ${point}`);
    lines.push('');
  }
  const blocks = [
    ['Recurring Themes', data.recurring_themes],
    ['Hard Constraints', data.hard_constraints],
    ['Out of Scope', data.out_of_scope],
    ['Ambiguities', data.ambiguities],
    ['Structural Corrections', data.structural_corrections],
    ['Recommended Briefing Points', data.recommended_briefing_points],
  ];
  for (const [title, items] of blocks) lines.push(`## ${title}`, '', ...(items?.length ? items.map((x) => `- ${x}`) : ['- None captured.']), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function renderProductSystemFramingMarkdown(data) {
  const lines = ['# Product System Framing', '', '## Product Essence', '', data.product_essence, '', '## Target Users', '', ...data.target_users.map((x) => `- ${x}`), '', '## Jobs To Be Done', '', ...data.jobs_to_be_done.map((x) => `- ${x}`), '', '## Core Concepts', ''];
  for (const concept of data.core_concepts || []) lines.push(`- **${concept.name}** — ${concept.definition}`);
  lines.push('', '## Product Rules', '', ...data.product_rules.map((x) => `- ${x}`), '', '## Primary Workflows', '');
  for (const flow of data.primary_workflows || []) lines.push(`### ${flow.name}`, '', ...flow.steps.map((step, i) => `${i + 1}. ${step}`), '');
  lines.push('## MVP Boundaries', '', '### In Scope', '', ...data.mvp_boundaries.in_scope.map((x) => `- ${x}`), '', '### Out of Scope', '', ...data.mvp_boundaries.out_of_scope.map((x) => `- ${x}`), '', '## Open Decisions', '', ...(data.open_decisions.length ? data.open_decisions.map((x) => `- ${x}`) : ['- None captured.']), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function renderProjectBriefMarkdown(projectName, data, analysis) {
  const lines = ['# Project Brief', '', `Date: ` + '`' + `${new Date().toISOString().slice(0,10)}` + '`', 'Prepared by: `Product Manager`', `Project: ` + '`' + `${projectName}` + '`', 'Brief Approval Status: `draft`', ''];
  const addParagraphSection = (title, items) => {
    lines.push(`## ${title}`, '');
    for (const item of items || []) lines.push(item, '');
  };
  addParagraphSection('1. Product Description', data.product_description);
  addParagraphSection('2. Vision and Positioning', data.vision_and_positioning);
  addParagraphSection('3. Core Problem', data.core_problem);
  lines.push('## 4. Target Users', '', ...(data.target_users || []).map((x) => `- ${x}`), '');
  lines.push('## 5. MVP Objective', '', ...(data.mvp_objective || []).map((x) => `- ${x}`), '');
  lines.push('## 6. Core MVP Scope', '');
  for (const item of data.core_mvp_scope || []) lines.push(`### ${item.title}`, '', ...(item.bullets || []).map((x) => `- ${x}`), '');
  lines.push('## 7. UX Principles and Tone', '', ...(data.ux_principles_and_tone || []).map((x) => `- ${x}`), '', '## 8. Primary User Journey', '', ...(data.primary_user_journey || []).map((x, i) => `${i + 1}. ${x}`), '', '## 9. Technical Direction', '', ...(data.technical_direction || []).map((x) => `- ${x}`), '', '## 10. Data and Privacy Constraints', '', ...(data.data_and_privacy_constraints || []).map((x) => `- ${x}`), '', '## 11. Explicit Out of Scope (MVP)', '', ...(data.explicit_out_of_scope || []).map((x) => `- ${x}`), '', '## 12. Delivery Expectations', '', ...(data.delivery_expectations || []).map((x) => `- ${x}`), '', '## 13. Primary Success Criteria', '', ...(data.primary_success_criteria || []).map((x) => `- ${x}`), '', '## 14. Future Roadmap (Not MVP)', '', ...(data.future_roadmap || []).map((x) => `- ${x}`), '', '## 15. Source Basis', '');
  for (const doc of analysis.documents || []) lines.push(`- ` + '`' + `${doc.path.replace(/^docs\/customer-input\//, '')}` + '`');
  lines.push('');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

async function invokeStructured({ settings, taskName, systemPrompt, userPrompt, schema, onProgress }) {
  const progress = typeof onProgress === 'function' ? onProgress : null;
  const startedAt = Date.now();
  const label = String(taskName || 'llm_task');
  let heartbeat = null;
  if (progress) {
    progress(`llm request started: ${label}`);
    heartbeat = setInterval(() => {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      progress(`llm request in progress: ${label} (${String(elapsedSec)}s elapsed)`);
    }, 10000);
  }
  try {
    let result;
    if (settings.provider === 'openai') {
      result = await invokeOpenAIStructured({ settings, taskName, systemPrompt, userPrompt, schema });
    } else if (settings.provider === 'stdio_json') {
      result = await invokeStdioJsonStructured({ settings, taskName, systemPrompt, userPrompt, schema });
    } else {
      throw new Error(`Unsupported llm provider: ${settings.provider}`);
    }
    if (progress) {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      progress(`llm request completed: ${label} (${String(elapsedSec)}s)`);
    }
    return result;
  } catch (error) {
    if (progress) {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      progress(`llm request failed: ${label} (${String(elapsedSec)}s)`);
    }
    throw error;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
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

async function adjudicatePassOneFindingsWithSemantic({ settings, markdown, findings, onProgress }) {
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
    systemPrompt,
    userPrompt,
    schema: CLARITY_FINDING_ADJUDICATION_SCHEMA,
    onProgress,
  });
  const assessments = Array.isArray(output?.assessments) ? output.assessments : [];
  return { seededFindings, assessments };
}

async function reviewGeneratedBriefClarityPassOne({
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
      systemPrompt,
      userPrompt,
      schema: CLARITY_SEMANTIC_REVIEW_SCHEMA,
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

export function getLlmCheckReport(values = {}) {
  const settings = resolveLlmSettings(values, undefined, 'intake');
  const validation = validateLlmSettings(settings);
  return { settings, validation };
}

export async function runPostEditSemanticValidation({
  values = {},
  briefMarkdown,
  evidenceContext = '',
  framingContext = '',
  synthesisContext = '',
  onProgress,
}) {
  let pmRole = {
    relPath: 'team/product-manager.md',
    roleContractBriefFocus: '',
  };
  try {
    pmRole = loadProductManagerRoleContract();
  } catch (_) {
    pmRole = {
      relPath: 'team/product-manager.md',
      roleContractBriefFocus: '',
    };
  }
  const settings = resolveLlmSettings(values, undefined, 'intake');
  const validation = validateLlmSettings(settings);
  if (!validation.ok) throw new Error(validation.errors.join(' '));

  const review = await reviewGeneratedBriefClarityAllSemantic({
    settings,
    markdown: String(briefMarkdown || ''),
    evidencePack: String(evidenceContext || ''),
    synthesis: {},
    framing: {},
    synthesisContext: String(synthesisContext || ''),
    framingContext: String(framingContext || ''),
    pmRoleContractSource: pmRole.relPath,
    pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
    semanticClarityGateEnabled: true,
    strictSemanticOnly: true,
    onProgress,
  });

  const findings = (review.issues || []).map((issue) => ({
    ...issue,
    recommended_fix: recommendedFixForIssue(issue),
  }));
  const suggestionsRaw = findings.length > 0
    ? await suggestBestWayForwardForFindings({
      settings,
      issues: findings,
      framing: {},
      framingContext: String(framingContext || ''),
      pmRoleContractSource: pmRole.relPath,
      pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
      onProgress,
    })
    : [];
  const suggestions = suggestionsRaw.map((entry) => ({
    id: entry.id,
    rule: entry.rule,
    section: entry.section,
    line: entry.line,
    recommended_fix: entry.recommendedFix || recommendedFixForIssue(entry),
    best_way_forward: entry.bestWayForward || entry.recommendedFix || recommendedFixForIssue(entry),
    rationale: entry.rationale || 'Align this fix with section intent and available framing context.',
    confidence: ['high', 'medium', 'low'].includes(String(entry.confidence || ''))
      ? String(entry.confidence)
      : 'medium',
    implementation_note: entry.implementationNote || 'Apply the wording update to the mapped line and rerun semantic validation.',
  }));

  return {
    settings,
    review,
    findings,
    suggestions,
  };
}

async function generateProjectBriefStructured({
  settings,
  evidencePack,
  synthesis,
  framing,
  projectName,
  pmRoleContractSource,
  pmRoleContractBriefFocus,
  clarityGateFeedback = '',
  previousBriefMarkdown = '',
  onProgress,
}) {
  return invokeStructured({
    settings,
    taskName: 'project_brief',
    systemPrompt: renderTemplate('project-brief.system.md', {
      pm_role_contract_source: pmRoleContractSource,
      pm_role_contract_brief_focus: pmRoleContractBriefFocus,
    }),
    userPrompt: renderTemplate('project-brief.user.md', {
      evidence_pack: evidencePack,
      source_synthesis_json: JSON.stringify(synthesis, null, 2),
      framing_json: JSON.stringify(framing, null, 2),
      project_name: projectName,
      clarity_rules_contract: CLARITY_RULES_CONTRACT,
      clarity_gate_feedback: clarityGateFeedback,
      previous_brief_markdown: previousBriefMarkdown,
    }),
    schema: PROJECT_BRIEF_SCHEMA,
    onProgress,
  });
}

async function generateProjectBriefStructuredTargetedRepair({
  settings,
  evidencePack,
  synthesis,
  framing,
  projectName,
  previousBriefData,
  previousBriefMarkdown,
  review,
  onProgress,
}) {
  const plan = buildTargetedRepairPlan({
    issues: review?.issues || [],
    previousBriefData,
  });
  if (plan.edits.length === 0) {
    return {
      brief: previousBriefData,
      repairPlan: {
        mode: 'targeted_no_mapped_edits',
        editablePaths: 0,
        patchedPaths: 0,
        unmappedIssues: plan.unmappedIssues.length,
      },
    };
  }

  const systemPrompt = [
    'You repair a structured project brief with targeted edits only.',
    'Return JSON only according to the provided project brief schema.',
    'Modify only the listed editable paths.',
    'Keep every non-targeted field exactly unchanged.',
    'Fix each finding while preserving section intent and compact wording.',
    'Do not introduce new ambiguity or malformed text artifacts.',
  ].join('\n');
  const userPrompt = [
    `Project name: ${projectName}`,
    '',
    'Previous brief markdown:',
    '```markdown',
    String(previousBriefMarkdown || '').trim(),
    '```',
    '',
    'Previous structured brief JSON:',
    '```json',
    JSON.stringify(previousBriefData || {}, null, 2),
    '```',
    '',
    'Editable paths with findings (only these paths may change):',
    '```json',
    JSON.stringify(plan.edits, null, 2),
    '```',
    '',
    'Unmapped findings (context only, do not edit non-listed paths):',
    '```json',
    JSON.stringify(plan.unmappedIssues || [], null, 2),
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
    'Product system framing JSON:',
    '```json',
    JSON.stringify(framing || {}, null, 2),
    '```',
  ].join('\n');

  const candidate = await invokeStructured({
    settings,
    taskName: 'project_brief_targeted_repair',
    systemPrompt,
    userPrompt,
    schema: PROJECT_BRIEF_SCHEMA,
    onProgress,
  });

  const applied = applyTargetedStructuredPatches({
    previousBriefData,
    candidateBriefData: candidate,
    allowedPaths: plan.allowedPaths,
    catalog: plan.catalog,
  });

  return {
    brief: applied.briefData,
    repairPlan: {
      mode: 'targeted_patch',
      editablePaths: plan.edits.length,
      patchedPaths: applied.patchedPaths.length,
      unmappedIssues: plan.unmappedIssues.length,
    },
  };
}

export async function generateIntakeArtifactsWithModel({ targetRoot, values = {}, analysis, onProgress }) {
  const progress = typeof onProgress === 'function' ? onProgress : null;
  const settings = resolveLlmSettings(values, undefined, 'intake');
  const validation = validateLlmSettings(settings);
  if (!validation.ok) throw new Error(validation.errors.join(' '));
  const pmRole = loadProductManagerRoleContract();
  if (progress) {
    const guidanceCount = String(pmRole.roleContractBriefFocus || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^-\s+/.test(line)).length;
    progress(`loaded Product Manager role contract: ${pmRole.relPath} (brief-focus clauses: ${String(guidanceCount)})`);
  }

  if (progress) progress('preparing source evidence pack...');
  const evidencePack = renderEvidencePack(analysis);
  const evidencePath = path.join(targetRoot, 'docs/product/source-evidence-pack.md');
  const synthesisPath = path.join(targetRoot, 'docs/product/source-synthesis.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  writeTextAtomic(evidencePath, evidencePack);
  if (progress) progress(`wrote evidence pack: ${path.relative(targetRoot, evidencePath)}`);

  if (progress) progress('invoking model pass 1/3: source synthesis...');
  const synthesis = await invokeStructured({
    settings,
    taskName: 'source_synthesis',
    systemPrompt: renderTemplate('source-synthesis.system.md', {}),
    userPrompt: renderTemplate('source-synthesis.user.md', { evidence_pack: evidencePack }),
    schema: SOURCE_SYNTHESIS_SCHEMA,
    onProgress: progress,
  });
  writeTextAtomic(synthesisPath, renderSourceSynthesisMarkdown(synthesis));
  if (progress) progress(`completed model pass 1/3 and wrote: ${path.relative(targetRoot, synthesisPath)}`);

  if (progress) progress('invoking model pass 2/3: product system framing...');
  const framing = await invokeStructured({
    settings,
    taskName: 'product_system_framing',
    systemPrompt: renderTemplate('product-system-framing.system.md', {}),
    userPrompt: renderTemplate('product-system-framing.user.md', { evidence_pack: evidencePack, source_synthesis_json: JSON.stringify(synthesis, null, 2) }),
    schema: PRODUCT_SYSTEM_FRAMING_SCHEMA,
    onProgress: progress,
  });
  writeTextAtomic(framingPath, renderProductSystemFramingMarkdown(framing));
  if (progress) progress(`completed model pass 2/3 and wrote: ${path.relative(targetRoot, framingPath)}`);

  const projectName = synthesis.product_name || values.project_name || 'Untitled Project';
  const gateEnabled = settings.briefQualityGateEnabled !== false;
  const retryBudget = Number.isFinite(settings.briefRetryCount)
    ? Math.max(0, Math.floor(settings.briefRetryCount))
    : 1;
  const attempts = [];
  let attempt = 0;
  let clarityGateFeedback = '';
  let previousBriefMarkdown = '';
  let previousBriefData = null;
  let previousFailedReview = null;
  let finalBrief = null;
  let finalBriefMarkdown = '';
  let finalReview = { ok: true, issues: [], stats: {} };

  while (attempt <= retryBudget) {
    if (progress) progress(`invoking model pass 3/3: project brief draft (attempt ${String(attempt + 1)}/${String(retryBudget + 1)})...`);
    let brief = null;
    let draftingMode = 'full_regeneration';
    let repairPlan = null;
    if (!gateEnabled || attempt === 0 || !previousBriefData || !previousFailedReview) {
      brief = await generateProjectBriefStructured({
        settings,
        evidencePack,
        synthesis,
        framing,
        projectName,
        pmRoleContractSource: pmRole.relPath,
        pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
        clarityGateFeedback,
        previousBriefMarkdown,
        onProgress: progress,
      });
    } else {
      if (progress) progress('applying targeted retry repair on flagged lines only (non-target lines frozen)...');
      const targeted = await generateProjectBriefStructuredTargetedRepair({
        settings,
        evidencePack,
        synthesis,
        framing,
        projectName,
        previousBriefData,
        previousBriefMarkdown,
        review: previousFailedReview,
        onProgress: progress,
      });
      brief = targeted.brief;
      draftingMode = targeted.repairPlan?.mode || 'targeted_patch';
      repairPlan = targeted.repairPlan || null;
      if (progress && repairPlan) {
        progress(
          `targeted repair summary: editable_paths=${String(repairPlan.editablePaths)}, patched_paths=${String(repairPlan.patchedPaths)}, unmapped_issues=${String(repairPlan.unmappedIssues)}`,
        );
      }
    }
    const briefMarkdown = renderProjectBriefMarkdown(projectName, brief, analysis);
    const semanticGateEnabled =
      settings.semanticClarityGateEnabled !== false
      && settings.semanticScopeGateEnabled !== false;
    const reviewMode = gateEnabled
      ? 'pass1_adjudicated_plus_global_semantic'
      : 'gate_disabled';
    const review = gateEnabled
      ? mergePassOneAndSemanticReviews({
        passOneReview: await reviewGeneratedBriefClarityPassOne({
          settings,
          markdown: briefMarkdown,
          semanticClarityGateEnabled: semanticGateEnabled,
          onProgress: progress,
        }),
        semanticReview: await reviewGeneratedBriefClarityAllSemantic({
          settings,
          markdown: briefMarkdown,
          evidencePack,
          synthesis,
          framing,
          pmRoleContractSource: pmRole.relPath,
          pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
          semanticClarityGateEnabled: semanticGateEnabled,
          onProgress: progress,
        }),
      })
      : { ok: true, issues: [], stats: {} };
    const suggestions = gateEnabled && review.issues.length > 0
      ? await suggestBestWayForwardForFindings({
        settings,
        issues: review.issues,
        framing,
        pmRoleContractSource: pmRole.relPath,
        pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
        onProgress: progress,
      })
      : [];
    const snapshotPath = writeBriefAttemptSnapshot({
      targetRoot,
      attempt: attempt + 1,
      markdown: briefMarkdown,
    });
    const snapshotRelPath = path.relative(targetRoot, snapshotPath);

    attempts.push({
      attempt: attempt + 1,
      review,
      reviewMode,
      draftingMode,
      repairPlan,
      suggestions,
      briefMarkdown,
      snapshotPath,
      snapshotRelPath,
    });
    finalBrief = brief;
    finalBriefMarkdown = briefMarkdown;
    finalReview = review;
    if (progress) {
      const verdict = review.ok ? 'pass' : 'fail';
      progress(`clarity gate attempt ${String(attempt + 1)}: ${verdict} (${String(review.issues.length)} issue(s); mode=${reviewMode})`);
    }

    if (!gateEnabled || review.ok || attempt === retryBudget) {
      break;
    }

    clarityGateFeedback = buildClarityRepairFeedback(review);
    previousBriefMarkdown = briefMarkdown;
    previousBriefData = brief;
    previousFailedReview = review;
    if (progress) progress('retrying project brief generation with clarity feedback...');
    attempt += 1;
  }

  const clarityReviewPath = writeBriefClarityReview({
    targetRoot,
    gateEnabled,
    retryBudget,
    attempts,
    finalReview,
  });
  const clarityLedgerPath = writeBriefClarityLedger({
    targetRoot,
    attempts,
  });
  if (progress) progress(`wrote brief clarity review: ${path.relative(targetRoot, clarityReviewPath)}`);
  if (progress) progress(`wrote brief clarity ledger: ${path.relative(targetRoot, clarityLedgerPath)}`);

  if (gateEnabled && !finalReview.ok) {
    const failedBriefPath = path.join(targetRoot, 'docs/reviews/product-manager/project-brief.failed.md');
    writeTextAtomic(failedBriefPath, finalBriefMarkdown);
    if (progress) progress(`wrote failed brief draft: ${path.relative(targetRoot, failedBriefPath)}`);
    const preview = finalReview.issues
      .slice(0, 4)
      .map((issue) => `[${issue.rule}] ${issue.section}`)
      .join('; ');
    throw new Error(
      `Project brief failed clarity gate after ${String(attempts.length)} attempt(s). ${preview || 'See clarity review.'} Review: ${path.relative(targetRoot, clarityReviewPath)} Failed draft: ${path.relative(targetRoot, failedBriefPath)}`,
    );
  }

  writeTextAtomic(briefPath, finalBriefMarkdown);
  if (progress) progress(`wrote brief draft: ${path.relative(targetRoot, briefPath)}`);
  if (progress) progress('model-driven intake pipeline complete.');

  return {
    evidencePath,
    synthesisPath,
    framingPath,
    briefPath,
    clarityReviewPath,
    clarityLedgerPath,
    briefAttemptSnapshotPaths: attempts.map((entry) => entry.snapshotPath),
    settings,
    clarity: {
      gateEnabled,
      retryBudget,
      attempts: attempts.length,
      retriesUsed: Math.max(0, attempts.length - 1),
      passed: finalReview.ok,
      issueCount: finalReview.issues.length,
    },
    briefData: finalBrief,
  };
}
