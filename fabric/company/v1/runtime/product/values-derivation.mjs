import { ARCHITECT_CONSULTABLE_TOKENS } from '../lib/llm/architect-values.mjs';
import { cleanLeadingLabel, cleanProjectName } from './brief-synthesis.mjs';

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
  coder_execution_mode: 'codex',
  coder_codex_command: 'codex',
  coder_codex_exec_args: [],
  coder_llm_output_mode: 'source_files',
});

const ARCHITECT_TECH_TOKENS = new Set([
  'product_type',
  'backend_stack',
  'frontend_stack',
  'database_stack',
  'orm_choice',
  'architecture_preference',
]);

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

export {
  parseBriefSections,
  parseBullets,
  parseNumberedTitles,
  isUnsetLike,
  buildNeutralValuesSeed,
  architectConsultCandidateTokens,
  normalizeArchitectConsultValue,
  unresolvedRequiredTokens,
  deriveValuesFromBrief,
};
