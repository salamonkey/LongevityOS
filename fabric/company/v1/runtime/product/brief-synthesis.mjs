
import fs from 'node:fs';
import path from 'node:path';
import { generateProjectBriefDraftWithModel as generateProjectBriefDraftWithModelLlm } from '../lib/llm/brief-draft.mjs';
import { ensureDir } from '../lib/core.mjs';

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

function writeSynthesizedProjectBriefDraft({ targetRoot, analysis, values = {} }) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const content = synthesizeProjectBriefDraft({ analysis, values });
  ensureDir(briefPath);
  fs.writeFileSync(briefPath, `${content.replace(/\s+$/, '')}\n`, 'utf8');
  return {
    briefPath,
    content,
  };
}

async function generateProjectBriefDraftWithModel({ targetRoot, values = {}, analysis, onProgress }) {
  const modelValues = {
    ...values,
    brief_draft_llm_enabled: true,
  };
  return generateProjectBriefDraftWithModelLlm({
    targetRoot,
    values: modelValues,
    analysis,
    onProgress,
  });
}

export {
  cleanLeadingLabel,
  cleanProjectName,
  titleCaseText,
  synthesizeProjectBriefDraft,
  writeSynthesizedProjectBriefDraft,
  generateProjectBriefDraftWithModel,
  setBriefApproved,
};
