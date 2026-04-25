import { invokeStructured } from './brief-context.mjs';
import { recommendedFixForIssue } from './brief-clarity-gate.mjs';

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

function formatIssue(issue, index) {
  return `${index + 1}. [${issue.rule}] ${issue.section}: "${issue.line}" (${issue.detail})`;
}

function normalizeSuggestionText(text, fallback) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value || String(fallback || '').trim();
}

async function suggestBestWayForwardForFindings({
  targetRoot,
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
      caller: 'brief-repair.suggestBestWayForwardForFindings',
      targetRoot,
      systemPrompt,
      userPrompt,
      schema: CLARITY_SUGGESTIONS_SCHEMA,
      promptSourceFiles: [
        String(pmRoleContractSource || ''),
        'docs/product/product-system-framing.md',
      ],
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

async function generateProjectBriefStructuredTargetedRepair({
  targetRoot,
  settings,
  evidencePack,
  synthesis,
  framing,
  projectName,
  previousBriefData,
  previousBriefMarkdown,
  review,
  projectBriefSchema,
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
    caller: 'brief-repair.generateProjectBriefStructuredTargetedRepair',
    targetRoot,
    systemPrompt,
    userPrompt,
    schema: projectBriefSchema,
    promptSourceFiles: [
      'docs/product/project-brief.md',
      'docs/product/source-evidence-pack.md',
      'docs/product/source-synthesis.md',
      'docs/product/product-system-framing.md',
    ],
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

export {
  suggestBestWayForwardForFindings,
  buildClarityRepairFeedback,
  generateProjectBriefStructuredTargetedRepair,
  buildTargetedRepairPlan,
  applyTargetedStructuredPatches,
};
