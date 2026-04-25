import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFirstValidLlmSettings } from './config.mjs';
import { invokeStructured } from './brief-context.mjs';

const FABRIC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const ARCHITECT_BASELINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'context',
    'decisions',
    'guardrails',
    'verification',
    'constraints',
    'open_questions',
  ],
  properties: {
    context: { type: 'string', minLength: 20, maxLength: 1200 },
    decisions: {
      type: 'array',
      minItems: 2,
      maxItems: 7,
      items: { type: 'string', minLength: 10, maxLength: 320 },
    },
    guardrails: {
      type: 'array',
      minItems: 2,
      maxItems: 7,
      items: { type: 'string', minLength: 10, maxLength: 320 },
    },
    verification: {
      type: 'array',
      minItems: 1,
      maxItems: 7,
      items: { type: 'string', minLength: 10, maxLength: 320 },
    },
    constraints: {
      type: 'array',
      minItems: 1,
      maxItems: 7,
      items: { type: 'string', minLength: 10, maxLength: 320 },
    },
    open_questions: {
      type: 'array',
      minItems: 1,
      maxItems: 7,
      items: { type: 'string', minLength: 5, maxLength: 320 },
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

function loadArchitectRoleContract() {
  const fallbackRelPath = 'team/architect.md';
  const relPath = resolveRoleSpecPathFromRolesYaml({ roleId: 'architect' }) || fallbackRelPath;
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

function normalizePlaybook(raw, slice = {}) {
  const title = String(slice?.title || 'current slice').trim();
  return {
    context: normalizeSentence(
      raw?.context,
      `This baseline enables ${title} and defines the minimum architecture decisions to implement it safely with bounded MVP scope.`,
    ),
    decisions: normalizeList(raw?.decisions, [
      `Define only entities and interfaces required for ${title}.`,
      'Keep decisions concrete, implementable, and traceable to approved brief scope.',
    ]),
    guardrails: normalizeList(raw?.guardrails, [
      'Do not introduce speculative abstractions beyond current-slice needs.',
      'Keep state transitions explicit and verifiable.',
    ]),
    verification: normalizeList(raw?.verification, [
      'Verify the slice works end-to-end against current acceptance criteria.',
    ]),
    constraints: normalizeList(raw?.constraints, [
      'Keep implementation minimal, bounded, and MVP-safe.',
    ]),
    openQuestions: normalizeList(raw?.open_questions, ['None at this time.']),
  };
}

export async function generateArchitectureBaselinePlaybook({
  targetRoot,
  values = {},
  slice = {},
  briefMarkdown = '',
  framingMarkdown = '',
  onProgress,
}) {
  const architectRole = loadArchitectRoleContract();
  const { settings, purpose } = resolveFirstValidLlmSettings(
    values,
    undefined,
    ['architect', 'planning', 'intake'],
  );

  const systemPrompt = [
    'You are the Architect role in a virtual software company.',
    'Generate a current-slice architecture baseline playbook.',
    'Respect the Architect role contract, approved brief, and product-system framing.',
    'Return JSON only according to the schema.',
    'Keep scope strictly bounded to the active slice.',
    'Prefer concrete MVP-safe decisions over speculative design.',
    'Do not include placeholders, TODO/TBD text, or unresolved alternatives.',
  ].join('\n');

  const sliceContext = {
    id: String(slice?.id || '').trim(),
    title: String(slice?.title || '').trim(),
    objective: String(slice?.objective || '').trim(),
    in_scope: Array.isArray(slice?.in_scope) ? slice.in_scope : [],
    out_of_scope: Array.isArray(slice?.out_of_scope) ? slice.out_of_scope : [],
    acceptance_criteria: Array.isArray(slice?.acceptance_criteria) ? slice.acceptance_criteria : [],
    dependencies: Array.isArray(slice?.dependencies) ? slice.dependencies : [],
    done_definition: Array.isArray(slice?.done_definition) ? slice.done_definition : [],
  };

  const userPrompt = [
    'Active slice (structured):',
    '```json',
    JSON.stringify(sliceContext, null, 2),
    '```',
    '',
    `Architect role contract (source: ${architectRole.relPath}):`,
    '```markdown',
    String(architectRole.roleContract || '').trim(),
    '```',
    '',
    'Product system framing markdown (optional):',
    '```markdown',
    String(framingMarkdown || '').trim(),
    '```',
    '',
    'Approved project brief markdown (optional):',
    '```markdown',
    String(briefMarkdown || '').trim(),
    '```',
    '',
    'Authoring rules:',
    '- All decisions must be implementable within the active slice only.',
    '- Avoid introducing cross-slice architecture obligations.',
    '- Verification items must map to observable behavior or tests.',
    '- Constraints must preserve MVP bounded scope.',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'architect_baseline_playbook',
    caller: 'architect-baseline.generateArchitectureBaselinePlaybook',
    targetRoot,
    systemPrompt,
    userPrompt,
    schema: ARCHITECT_BASELINE_SCHEMA,
    promptSourceFiles: [
      String(architectRole.relPath || ''),
      'docs/product/current-slice.yaml',
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
