import path from 'node:path';
import { writeTextAtomic } from '../core.mjs';
import { invokeStructured, renderTemplate } from './brief-context.mjs';

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

function renderProductSystemFramingMarkdown(data) {
  const lines = ['# Product System Framing', '', '## Product Essence', '', data.product_essence, '', '## Target Users', '', ...data.target_users.map((x) => `- ${x}`), '', '## Jobs To Be Done', '', ...data.jobs_to_be_done.map((x) => `- ${x}`), '', '## Core Concepts', ''];
  for (const concept of data.core_concepts || []) lines.push(`- **${concept.name}** — ${concept.definition}`);
  lines.push('', '## Product Rules', '', ...data.product_rules.map((x) => `- ${x}`), '', '## Primary Workflows', '');
  for (const flow of data.primary_workflows || []) lines.push(`### ${flow.name}`, '', ...flow.steps.map((step, i) => `${i + 1}. ${step}`), '');
  lines.push('## MVP Boundaries', '', '### In Scope', '', ...data.mvp_boundaries.in_scope.map((x) => `- ${x}`), '', '### Out of Scope', '', ...data.mvp_boundaries.out_of_scope.map((x) => `- ${x}`), '', '## Open Decisions', '', ...(data.open_decisions.length ? data.open_decisions.map((x) => `- ${x}`) : ['- None captured.']), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

async function generateProductSystemFraming({
  settings,
  evidencePack,
  synthesis,
  targetRoot,
  framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md'),
  onProgress,
}) {
  const output = await invokeStructured({
    settings,
    taskName: 'product_system_framing',
    caller: 'brief-framing.generateProductSystemFraming',
    targetRoot,
    systemPrompt: renderTemplate('product-system-framing.system.md', {}),
    userPrompt: renderTemplate('product-system-framing.user.md', {
      evidence_pack: evidencePack,
      source_synthesis_json: JSON.stringify(synthesis, null, 2),
    }),
    schema: PRODUCT_SYSTEM_FRAMING_SCHEMA,
    promptSourceFiles: [
      'templates/llm/product-system-framing.system.md',
      'templates/llm/product-system-framing.user.md',
      'docs/product/source-evidence-pack.md',
      'docs/product/source-synthesis.md',
    ],
    onProgress,
  });
  writeTextAtomic(framingPath, renderProductSystemFramingMarkdown(output));
  if (typeof onProgress === 'function') {
    onProgress(`wrote product framing: ${path.relative(targetRoot, framingPath)}`);
  }
  return output;
}

export {
  PRODUCT_SYSTEM_FRAMING_SCHEMA,
  renderProductSystemFramingMarkdown,
  generateProductSystemFraming,
};
