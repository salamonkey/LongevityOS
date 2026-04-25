import { resolveFirstValidLlmSettings } from './config.mjs';
import { invokeStructured } from './brief-context.mjs';

export const ARCHITECT_CONSULTABLE_TOKENS = Object.freeze([
  'product_type',
  'workflow_step_1',
  'workflow_step_2',
  'workflow_step_3',
  'concept_1',
  'concept_2',
  'concept_3',
  'v1_priority_1',
  'v1_priority_2',
  'backend_stack',
  'frontend_stack',
  'database_stack',
  'orm_choice',
  'architecture_preference',
  'working_style',
  'editor_choice',
  'non_functional_1',
  'non_functional_2',
]);

const ARCHITECT_VALUE_RECOMMENDATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendations'],
  properties: {
    recommendations: {
      type: 'array',
      maxItems: ARCHITECT_CONSULTABLE_TOKENS.length,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['token', 'value', 'rationale', 'confidence'],
        properties: {
          token: { type: 'string', enum: ARCHITECT_CONSULTABLE_TOKENS },
          value: { type: 'string', minLength: 2, maxLength: 200 },
          rationale: { type: 'string', minLength: 8, maxLength: 320 },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
};

function uniqueTokenList(tokens = []) {
  const out = [];
  const seen = new Set();
  for (const token of tokens) {
    const normalized = String(token || '').trim();
    if (!normalized) continue;
    if (!ARCHITECT_CONSULTABLE_TOKENS.includes(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export async function generateArchitectValueRecommendations({
  targetRoot,
  values = {},
  unresolvedTokens = [],
  briefMarkdown = '',
  framingMarkdown = '',
  architectRoleMarkdown = '',
  architectRoleSourcePath = '',
  currentValues = {},
  onProgress,
}) {
  const tokens = uniqueTokenList(unresolvedTokens);
  if (tokens.length === 0) {
    return {
      purpose: null,
      settings: null,
      recommendations: [],
      byToken: {},
    };
  }

  const { settings, purpose } = resolveFirstValidLlmSettings(
    values,
    undefined,
    ['architect', 'intake', 'planning'],
  );
  const systemPrompt = [
    'You are the Architect role in a virtual software company.',
    'Fill unresolved PM value tokens with concrete MVP-safe defaults.',
    'Respect the architect role contract, project brief, and product-system framing.',
    'Prefer simple, implementable, non-speculative choices.',
    'Do not return placeholders, TODO/TBD markers, or generic filler.',
    'Return JSON only according to the schema.',
  ].join('\n');

  const valueContext = {};
  for (const token of ARCHITECT_CONSULTABLE_TOKENS) {
    if (Object.prototype.hasOwnProperty.call(currentValues, token)) {
      valueContext[token] = currentValues[token];
    }
  }
  const userPrompt = [
    'Unresolved tokens to fill:',
    JSON.stringify(tokens, null, 2),
    '',
    'Current values context:',
    '```json',
    JSON.stringify(valueContext, null, 2),
    '```',
    '',
    'Architect role contract:',
    '```markdown',
    String(architectRoleMarkdown || '').trim(),
    '```',
    '',
    'Product system framing markdown:',
    '```markdown',
    String(framingMarkdown || '').trim(),
    '```',
    '',
    'Approved project brief markdown:',
    '```markdown',
    String(briefMarkdown || '').trim(),
    '```',
    '',
    'Rules:',
    '- Recommend values only for unresolved tokens.',
    '- Keep backend/frontend/database/orm/product_type/architecture_preference in compact token style (e.g., snake_case).',
    '- Keep workflow/concept/priority/non-functional entries short and concrete.',
    '- Keep all recommendations aligned to MVP scope and current framing.',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'architect_values_enrichment',
    caller: 'architect-values.generateArchitectValueRecommendations',
    targetRoot,
    systemPrompt,
    userPrompt,
    schema: ARCHITECT_VALUE_RECOMMENDATION_SCHEMA,
    promptSourceFiles: [
      String(architectRoleSourcePath || ''),
      'docs/product/product-system-framing.md',
      'docs/product/project-brief.md',
      'fabric.values.json',
    ],
    onProgress,
  });

  const recommendations = Array.isArray(output?.recommendations) ? output.recommendations : [];
  const byToken = {};
  for (const item of recommendations) {
    const token = String(item?.token || '').trim();
    if (!tokens.includes(token)) continue;
    if (byToken[token]) continue;
    byToken[token] = {
      token,
      value: String(item?.value || '').trim(),
      rationale: String(item?.rationale || '').trim(),
      confidence: String(item?.confidence || '').trim().toLowerCase(),
    };
  }

  return {
    purpose,
    settings,
    recommendations: Object.values(byToken),
    byToken,
  };
}
