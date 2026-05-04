import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFirstValidLlmSettings } from './config.mjs';
import { invokeStructured } from './brief-context.mjs';

const FABRIC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const CODER_IMPLEMENTATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'app_title',
    'app_objective',
    'acceptance_checks',
    'today_items',
    'soon_items',
    'later_items',
  ],
  properties: {
    app_title: { type: 'string', minLength: 4, maxLength: 120 },
    app_objective: { type: 'string', minLength: 10, maxLength: 260 },
    acceptance_checks: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: { type: 'string', minLength: 8, maxLength: 220 },
    },
    today_items: {
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: { type: 'string', minLength: 4, maxLength: 160 },
    },
    soon_items: {
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: { type: 'string', minLength: 4, maxLength: 160 },
    },
    later_items: {
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: { type: 'string', minLength: 4, maxLength: 160 },
    },
  },
};

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeSpecPath(rawValue) {
  return String(rawValue || '').trim().replace(/^['"]|['"]$/g, '');
}

function resolveRoleSpecPathFromRolesYaml({ roleId }) {
  const rolesPath = path.join(FABRIC_ROOT, 'team/roles.yaml');
  if (!fs.existsSync(rolesPath)) return null;
  const text = readText(rolesPath);
  const blockMatch = text.match(new RegExp(`-\\s+id:\\s*${String(roleId)}\\b[\\s\\S]*?(?=\\n-\\s+id:|$)`));
  if (!blockMatch) return null;
  const specMatch = blockMatch[0].match(/^\s*spec_path:\s*(.+)\s*$/m);
  if (!specMatch) return null;
  return normalizeSpecPath(specMatch[1]);
}

function loadCoderRoleContract() {
  const fallbackRelPath = 'team/coder.md';
  const relPath = resolveRoleSpecPathFromRolesYaml({ roleId: 'coder' }) || fallbackRelPath;
  const absPath = path.join(FABRIC_ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return { relPath, roleContract: '' };
  }
  return {
    relPath,
    roleContract: readText(absPath).trim(),
  };
}

function normalizeSentence(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || String(fallback || '').trim();
}

function normalizeList(values, fallback = []) {
  const normalized = Array.isArray(values)
    ? values.map((item) => normalizeSentence(item, '')).filter(Boolean)
    : [];
  if (normalized.length > 0) return normalized;
  return fallback.map((item) => normalizeSentence(item, '')).filter(Boolean);
}

function normalizeSliceIdForPath(sliceId) {
  return String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
}

const DEFAULT_CUSTOMER_PLAN_ITEMS = Object.freeze({
  today: [
    'Take a 15-minute walk after your next meal.',
    'Schedule a blood pressure check this week.',
    'Set a hydration reminder for today.',
  ],
  soon: [
    'Book a dental cleaning within the next 2 months.',
    'Plan a preventive blood panel with your clinician.',
    'Review sleep routine and target 7-8 hours nightly.',
  ],
  later: [
    'Discuss age-appropriate screening timelines at your next annual visit.',
    'Review vaccination status before flu season.',
    'Set quarterly reminders to revisit your health plan.',
  ],
});

function normalizePlaybook(raw = {}, slice = {}) {
  const acceptance = Array.isArray(slice?.acceptance_criteria) ? slice.acceptance_criteria : [];

  return {
    appTitle: normalizeSentence(raw?.app_title, slice?.title || 'Current Slice'),
    appObjective: normalizeSentence(raw?.app_objective, slice?.objective || 'Deliver the current slice.'),
    acceptanceChecks: normalizeList(raw?.acceptance_checks, acceptance),
    // Never fallback to internal implementation bullets for customer-facing dashboard items.
    todayItems: normalizeList(raw?.today_items, DEFAULT_CUSTOMER_PLAN_ITEMS.today),
    soonItems: normalizeList(raw?.soon_items, DEFAULT_CUSTOMER_PLAN_ITEMS.soon),
    laterItems: normalizeList(raw?.later_items, DEFAULT_CUSTOMER_PLAN_ITEMS.later),
  };
}

export async function generateCurrentSliceImplementationPlaybook({
  targetRoot,
  values = {},
  slice = {},
  baselineMarkdown = '',
  uxFlowMarkdown = '',
  semanticUxContractJson = '',
  briefMarkdown = '',
  framingMarkdown = '',
  onProgress,
}) {
  const coderRole = loadCoderRoleContract();
  const { settings, purpose } = resolveFirstValidLlmSettings(
    values,
    undefined,
    ['coder', 'architect', 'planning', 'intake'],
  );

  const normalizedSliceId = normalizeSliceIdForPath(slice?.id);
  const systemPrompt = [
    'You are the Coder role in a virtual software company.',
    'Generate an implementation playbook for a deterministic React/Vite scaffold.',
    'Respect the coder role contract, architecture baseline, UX flow, and approved brief.',
    'Return JSON only according to the schema.',
    'Keep outputs bounded to active-slice MVP scope.',
    'Use concise, concrete, customer-testable wording.',
    'Do not include placeholders, TODO/TBD markers, or speculative future-slice scope.',
  ].join('\n');

  const sliceContext = {
    id: String(slice?.id || '').trim(),
    title: String(slice?.title || '').trim(),
    objective: String(slice?.objective || '').trim(),
    in_scope: Array.isArray(slice?.in_scope) ? slice.in_scope : [],
    out_of_scope: Array.isArray(slice?.out_of_scope) ? slice.out_of_scope : [],
    acceptance_criteria: Array.isArray(slice?.acceptance_criteria) ? slice.acceptance_criteria : [],
    dependencies: Array.isArray(slice?.dependencies) ? slice.dependencies : [],
  };

  const userPrompt = [
    'Active slice (structured):',
    '```json',
    JSON.stringify(sliceContext, null, 2),
    '```',
    '',
    `Coder role contract (source: ${coderRole.relPath}):`,
    '```markdown',
    String(coderRole.roleContract || '').trim(),
    '```',
    '',
    'Architecture baseline markdown:',
    '```markdown',
    String(baselineMarkdown || '').trim(),
    '```',
    '',
    'Current slice UX flow markdown:',
    '```markdown',
    String(uxFlowMarkdown || '').trim(),
    '```',
    '',
    'Semantic UX contract JSON:',
    '```json',
    String(semanticUxContractJson || '').trim(),
    '```',
    '',
    'Approved project brief markdown (optional):',
    '```markdown',
    String(briefMarkdown || '').trim(),
    '```',
    '',
    'Product system framing markdown (optional):',
    '```markdown',
    String(framingMarkdown || '').trim(),
    '```',
    '',
    'Authoring rules:',
    '- Keep plan items concrete and user-facing.',
    '- today_items should represent immediate actions.',
    '- soon_items should represent near-term follow-ups.',
    '- later_items should represent lower urgency backlog items.',
    '- Each plan item must read like a direct health action for the end user (not an engineering task).',
    '- Never include internal process terms such as slice, acceptance criteria, tests, coverage, routing, schema, payload, status fields, or bucket rules.',
    '- Satisfy the semantic UX contract; do not merely create structurally present sections with generic or internal copy.',
    '- Dates, statuses, labels, empty states, and explanations must be human-readable and safe.',
    '- acceptance_checks must align with the active slice acceptance criteria.',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'coder_current_slice_implementation',
    caller: 'coder-implementation.generateCurrentSliceImplementationPlaybook',
    targetRoot,
    systemPrompt,
    userPrompt,
    schema: CODER_IMPLEMENTATION_SCHEMA,
    promptSourceFiles: [
      String(coderRole.relPath || ''),
      'docs/product/current-slice.yaml',
      `docs/architecture/${normalizedSliceId}-baseline.md`,
      `docs/ux/${normalizedSliceId}-current-slice-flow.md`,
      `docs/ux/${normalizedSliceId}-semantic-ux-contract.json`,
      'docs/product/product-system-framing.md',
      'docs/product/project-brief.md',
    ],
    onProgress,
  });

  return {
    purpose,
    settings,
    playbook: normalizePlaybook(output, slice),
  };
}
