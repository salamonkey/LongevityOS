import { resolveFirstValidLlmSettings } from './config.mjs';
import { invokeOpenAIStructured } from './provider-openai.mjs';
import { invokeStdioJsonStructured } from './provider-stdio-json.mjs';
import { loadRoleContractForModule } from './role-contracts.mjs';

const UIUX_FLOW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'context',
    'primary_flow',
    'failure_paths',
    'rules',
    'constraints',
    'acceptance',
  ],
  properties: {
    context: { type: 'string', minLength: 20, maxLength: 1200 },
    primary_flow: {
      type: 'object',
      additionalProperties: false,
      required: ['entry', 'behaviors'],
      properties: {
        entry: { type: 'string', minLength: 10, maxLength: 320 },
        behaviors: {
          type: 'array',
          minItems: 2,
          maxItems: 8,
          items: { type: 'string', minLength: 10, maxLength: 320 },
        },
      },
    },
    failure_paths: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: { type: 'string', minLength: 10, maxLength: 320 },
    },
    rules: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: { type: 'string', minLength: 10, maxLength: 320 },
    },
    constraints: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: { type: 'string', minLength: 10, maxLength: 320 },
    },
    acceptance: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: { type: 'string', minLength: 10, maxLength: 320 },
    },
  },
};

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
  const title = String(slice?.title || 'the active slice').trim();
  return {
    context: normalizeSentence(
      raw?.context,
      `This slice defines the minimum user-visible flow required for ${title}.`,
    ),
    primaryFlow: {
      entry: normalizeSentence(
        raw?.primary_flow?.entry,
        'User enters the current slice from the primary application flow.',
      ),
      behaviors: normalizeList(raw?.primary_flow?.behaviors, [
        `Complete the ${title} objective in the smallest coherent flow.`,
        'Show a clear successful completion state.',
      ]),
    },
    failurePaths: normalizeList(raw?.failure_paths, [
      'Handle one clear recovery path for invalid or incomplete user action.',
    ]),
    rules: normalizeList(raw?.rules, [
      'Keep interactions simple, direct, and aligned to current-slice scope.',
      'Use clear labels and deterministic validation messaging.',
    ]),
    constraints: normalizeList(raw?.constraints, [
      'Avoid adding user-facing complexity outside the active slice.',
    ]),
    acceptance: normalizeList(raw?.acceptance, [
      'Acceptance criteria map directly to visible user behavior.',
    ]),
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
      progress(`\tllm request in progress: ${taskName} (${String(elapsedSec)}s elapsed)`);
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

export async function generateCurrentSliceUxPlaybook({
  values = {},
  slice = {},
  briefMarkdown = '',
  framingMarkdown = '',
  onProgress,
}) {
  const uiuxRole = loadRoleContractForModule({
    importMetaUrl: import.meta.url,
    roleId: 'uiux',
    fallbackRelPath: 'team/uiux.md',
  });
  const { settings, purpose } = resolveFirstValidLlmSettings(
    values,
    undefined,
    ['uiux', 'architect', 'planning', 'intake'],
  );

  const systemPrompt = [
    'You are the UI/UX role in a virtual software company.',
    'Generate a current-slice UX flow playbook for implementation.',
    'Respect the UI/UX role contract, approved brief, and product-system framing.',
    'Return JSON only according to the schema.',
    'Keep scope strictly bounded to the active slice.',
    'Prefer concrete, testable MVP flows over speculative future UX.',
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
  };

  const userPrompt = [
    'Active slice (structured):',
    '```json',
    JSON.stringify(sliceContext, null, 2),
    '```',
    '',
    `UI/UX role contract (source: ${uiuxRole.relPath}):`,
    '```markdown',
    String(uiuxRole.roleContract || '').trim(),
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
    '- Keep the flow focused on user-visible behavior for the active slice only.',
    '- Include one clear primary path and one explicit failure/recovery path.',
    '- Keep interaction/validation rules concrete and testable.',
    '- Acceptance items must map to observable outcomes.',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'uiux_current_slice_flow',
    systemPrompt,
    userPrompt,
    schema: UIUX_FLOW_SCHEMA,
    onProgress,
  });

  return {
    purpose,
    settings,
    playbook: normalizePlaybook(output, slice),
  };
}
