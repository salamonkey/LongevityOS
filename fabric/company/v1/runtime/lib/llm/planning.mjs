import { resolveFirstValidLlmSettings } from './config.mjs';
import { invokeOpenAIStructured } from './provider-openai.mjs';
import { invokeStdioJsonStructured } from './provider-stdio-json.mjs';

const MIN_SLICE_COUNT = 5;
const MAX_SLICE_COUNT = 8;

const SLICE_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slices'],
  properties: {
    slices: {
      type: 'array',
      minItems: MIN_SLICE_COUNT,
      maxItems: MAX_SLICE_COUNT,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'objective',
          'in_scope',
          'out_of_scope',
          'acceptance_criteria',
          'dependencies',
          'done_definition',
        ],
        properties: {
          title: { type: 'string', minLength: 4, maxLength: 120 },
          objective: { type: 'string', minLength: 20, maxLength: 260 },
          in_scope: {
            type: 'array',
            minItems: 2,
            maxItems: 5,
            items: { type: 'string', minLength: 8, maxLength: 220 },
          },
          out_of_scope: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: { type: 'string', minLength: 8, maxLength: 220 },
          },
          acceptance_criteria: {
            type: 'array',
            minItems: 2,
            maxItems: 6,
            items: { type: 'string', minLength: 8, maxLength: 220 },
          },
          dependencies: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            items: { type: 'string', minLength: 8, maxLength: 220 },
          },
          done_definition: {
            type: 'array',
            minItems: 2,
            maxItems: 6,
            items: { type: 'string', minLength: 8, maxLength: 220 },
          },
        },
      },
    },
  },
};

function normalizeSentence(value, fallback) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || String(fallback || '').trim();
}

function normalizeList(list, fallback = []) {
  const out = Array.isArray(list)
    ? list.map((item) => normalizeSentence(item, '')).filter(Boolean)
    : [];
  if (out.length > 0) return out;
  return [...fallback].map((item) => normalizeSentence(item, '')).filter(Boolean);
}

function normalizeSliceTitle(value) {
  const text = normalizeSentence(value, '').replace(/\.$/, '');
  if (!text) return '';
  return text
    .split(' ')
    .map((part) => part ? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function extractCoreScopeSection(briefMarkdown) {
  const text = String(briefMarkdown || '');
  const sectionRegex = /^##\s+6\.\s+Core MVP Scope\s*$/im;
  const match = sectionRegex.exec(text);
  if (!match) return '';
  const start = match.index + match[0].length;
  const remainder = text.slice(start);
  const nextHeading = remainder.match(/\n##\s+\d+\.\s+/);
  if (!nextHeading) return remainder.trim();
  return remainder.slice(0, nextHeading.index).trim();
}

function deriveTitlesFromBrief(briefMarkdown) {
  const section = extractCoreScopeSection(briefMarkdown);
  const lines = String(section || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const titles = [];
  const seen = new Set();
  for (const line of lines) {
    const numbered = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    const plainNumbered = line.match(/^\d+\.\s+(.+)$/);
    const bullet = line.match(/^-+\s+(.+)$/);
    const raw = numbered?.[1] || plainNumbered?.[1] || bullet?.[1] || '';
    const normalized = normalizeSliceTitle(String(raw).replace(/^In Scope:\s*/i, ''));
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(normalized);
  }

  const fallback = [
    'Onboarding + Initial Plan Generation',
    'Dashboard + Priority Visibility',
    'Health Item Detail + Completion State',
    'Reminder Setup + Follow-Through',
    'Family Profiles',
    'Vaccination Tracking',
    'Provider Directory + Visit Planning',
    'Notification Preferences + Quiet Hours',
  ];
  for (const title of fallback) {
    if (titles.length >= MAX_SLICE_COUNT) break;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
  }
  return titles.slice(0, MAX_SLICE_COUNT);
}

function deterministicSliceFromTitle(title, index, allTitles) {
  const previous = index > 0 ? allTitles[index - 1] : null;
  return {
    title,
    objective: `Deliver ${title} as an MVP-ready vertical slice with clear user value and bounded scope.`,
    in_scope: [
      `Implement the core ${String(title || '').toLowerCase()} flow end-to-end.`,
      'Include required persistence, validation, and visible completion state for the slice.',
    ],
    out_of_scope: [
      `Advanced automation and non-MVP integrations for ${String(title || '').toLowerCase()}.`,
    ],
    acceptance_criteria: [
      `${title} flow works end-to-end in the local review environment.`,
      'Happy path and one failure/recovery path are verified.',
    ],
    dependencies: [
      previous
        ? `Dependencies from ${previous} are resolved.`
        : 'Approved project brief and bootstrap artifacts are available.',
    ],
    done_definition: [
      'Current slice user checklist is completed and marked Pass.',
      'Implementation notes include changed files and verification evidence.',
      'fabric doctor passes without bootstrap semantic issues.',
    ],
  };
}

export function deriveWorkflowDrivenSlices(briefMarkdown) {
  const titles = deriveTitlesFromBrief(briefMarkdown);
  if (titles.length === 0) {
    throw new Error('Unable to derive deterministic slice titles from brief.');
  }
  const slices = titles.map((title, index) => deterministicSliceFromTitle(title, index, titles));
  return slices.slice(0, Math.max(MIN_SLICE_COUNT, Math.min(MAX_SLICE_COUNT, slices.length)));
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

function normalizeSlicePlan(rawSlices) {
  const slices = Array.isArray(rawSlices) ? rawSlices : [];
  const normalized = slices.map((slice, index) => {
    const title = normalizeSliceTitle(slice?.title);
    const fallbackTitle = `Slice ${String(index + 1)}`;
    return {
      title: title || fallbackTitle,
      objective: normalizeSentence(
        slice?.objective,
        `Deliver ${title || fallbackTitle} as an MVP-ready vertical slice with clear user value and bounded scope.`,
      ),
      in_scope: normalizeList(slice?.in_scope, [
        `Implement the core ${(title || fallbackTitle).toLowerCase()} flow end-to-end.`,
        'Include required persistence and validation for this slice.',
      ]),
      out_of_scope: normalizeList(slice?.out_of_scope, [
        `Non-MVP integrations for ${(title || fallbackTitle).toLowerCase()}.`,
      ]),
      acceptance_criteria: normalizeList(slice?.acceptance_criteria, [
        `${title || fallbackTitle} flow works end-to-end in the local review environment.`,
        'Happy path and one failure/recovery path are verified.',
      ]),
      dependencies: normalizeList(slice?.dependencies, [
        index === 0
          ? 'Approved project brief and bootstrap artifacts are available.'
          : `Dependencies from previous slice are resolved.`,
      ]),
      done_definition: normalizeList(slice?.done_definition, [
        'Current slice user checklist is completed and marked Pass.',
        'Implementation notes include changed files and verification evidence.',
        'fabric doctor passes without bootstrap semantic issues.',
      ]),
    };
  });
  if (normalized.length < MIN_SLICE_COUNT || normalized.length > MAX_SLICE_COUNT) {
    throw new Error(
      `Model planning returned ${String(normalized.length)} slices; expected ${String(MIN_SLICE_COUNT)}-${String(MAX_SLICE_COUNT)}.`,
    );
  }
  return normalized;
}

export async function generateExecutionSlicePlan({
  values = {},
  briefMarkdown,
  framingMarkdown = '',
  onProgress,
}) {
  const { settings, purpose } = resolveFirstValidLlmSettings(
    values,
    undefined,
    ['planning', 'intake', 'architect'],
  );

  const systemPrompt = [
    'You are a Product Manager generating an execution slice plan from an approved project brief.',
    'Return JSON only according to the schema.',
    `Produce ${String(MIN_SLICE_COUNT)} to ${String(MAX_SLICE_COUNT)} slices, ordered by dependency.`,
    'Each slice must be a vertical end-to-end deliverable with bounded scope.',
    'Keep wording concrete and testable.',
    'Avoid speculative future scope in in_scope fields.',
  ].join('\n');
  const userPrompt = [
    'Approved project brief markdown:',
    '```markdown',
    String(briefMarkdown || '').trim(),
    '```',
    '',
    'Product system framing markdown (optional):',
    '```markdown',
    String(framingMarkdown || '').trim(),
    '```',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'execution_slice_plan',
    systemPrompt,
    userPrompt,
    schema: SLICE_PLAN_SCHEMA,
    onProgress,
  });
  const slices = normalizeSlicePlan(output?.slices);
  return { settings, purpose, slices };
}
