import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFirstValidLlmSettings } from './config.mjs';
import { invokeOpenAIStructured } from './provider-openai.mjs';
import { invokeStdioJsonStructured } from './provider-stdio-json.mjs';

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

function normalizePlaybook(raw = {}, slice = {}) {
  const inScope = Array.isArray(slice?.in_scope) ? slice.in_scope : [];
  const acceptance = Array.isArray(slice?.acceptance_criteria) ? slice.acceptance_criteria : [];
  const fallbackToday = inScope.slice(0, 2).length > 0
    ? inScope.slice(0, 2)
    : ['Book a dental appointment', 'Review overdue blood test'];
  const fallbackSoon = inScope.slice(2, 4).length > 0
    ? inScope.slice(2, 4)
    : ['Schedule a skin check', 'Review vaccinations'];
  const fallbackLater = acceptance.slice(0, 2).length > 0
    ? acceptance.slice(0, 2)
    : ['Add family members', 'Set reminder preferences'];

  return {
    appTitle: normalizeSentence(raw?.app_title, slice?.title || 'Current Slice'),
    appObjective: normalizeSentence(raw?.app_objective, slice?.objective || 'Deliver the current slice.'),
    acceptanceChecks: normalizeList(raw?.acceptance_checks, acceptance),
    todayItems: normalizeList(raw?.today_items, fallbackToday),
    soonItems: normalizeList(raw?.soon_items, fallbackSoon),
    laterItems: normalizeList(raw?.later_items, fallbackLater),
  };
}

async function invokeStructured({ settings, taskName, systemPrompt, userPrompt, schema, onProgress }) {
  const progress = typeof onProgress === 'function' ? onProgress : null;
  const startedAt = Date.now();
  let heartbeat = null;
  if (progress) {
    progress(`llm request started: ${taskName}`);
    heartbeat = setInterval(() => {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      progress(`llm request in progress: ${taskName} (${String(elapsedSec)}s elapsed)`);
    }, 10000);
  }
  try {
    if (settings.provider === 'openai') {
      const result = await invokeOpenAIStructured({ settings, taskName, systemPrompt, userPrompt, schema });
      if (progress) {
        const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        progress(`llm request completed: ${taskName} (${String(elapsedSec)}s)`);
      }
      return result;
    }
    if (settings.provider === 'stdio_json') {
      const result = await invokeStdioJsonStructured({ settings, taskName, systemPrompt, userPrompt, schema });
      if (progress) {
        const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        progress(`llm request completed: ${taskName} (${String(elapsedSec)}s)`);
      }
      return result;
    }
    throw new Error(`Unsupported llm provider: ${settings.provider}`);
  } catch (error) {
    if (progress) {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      progress(`llm request failed: ${taskName} (${String(elapsedSec)}s)`);
    }
    throw error;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
}

export async function generateCurrentSliceImplementationPlaybook({
  values = {},
  slice = {},
  baselineMarkdown = '',
  uxFlowMarkdown = '',
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
    '- acceptance_checks must align with the active slice acceptance criteria.',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'coder_current_slice_implementation',
    systemPrompt,
    userPrompt,
    schema: CODER_IMPLEMENTATION_SCHEMA,
    onProgress,
  });

  return {
    purpose,
    settings,
    playbook: normalizePlaybook(output, slice),
  };
}
