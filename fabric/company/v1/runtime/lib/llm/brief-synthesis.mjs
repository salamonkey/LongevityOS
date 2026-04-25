import path from 'node:path';
import { writeTextAtomic } from '../core.mjs';
import { invokeStructured, renderTemplate } from './brief-context.mjs';

const SOURCE_SYNTHESIS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['product_name','core_promise','source_comparison','recurring_themes','hard_constraints','out_of_scope','ambiguities','structural_corrections','recommended_briefing_points'],
  properties: {
    product_name: { type: 'string' },
    core_promise: { type: 'string' },
    source_comparison: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['source_path','source_kind','key_points'], properties: { source_path: { type: 'string' }, source_kind: { type: 'string' }, key_points: { type: 'array', items: { type: 'string' } } } } },
    recurring_themes: { type: 'array', items: { type: 'string' } },
    hard_constraints: { type: 'array', items: { type: 'string' } },
    out_of_scope: { type: 'array', items: { type: 'string' } },
    ambiguities: { type: 'array', items: { type: 'string' } },
    structural_corrections: { type: 'array', items: { type: 'string' } },
    recommended_briefing_points: { type: 'array', items: { type: 'string' } },
  },
};

function renderSourceSynthesisMarkdown(data) {
  const lines = ['# Source Synthesis', '', '## Product Identity', '', `- Product name: ${data.product_name}`, `- Core promise: ${data.core_promise}`, '', '## Source Comparison', ''];
  for (const item of data.source_comparison || []) {
    lines.push(`### ${item.source_path}`, '', `- Source kind: ${item.source_kind}`);
    for (const point of item.key_points || []) lines.push(`- ${point}`);
    lines.push('');
  }
  const blocks = [
    ['Recurring Themes', data.recurring_themes],
    ['Hard Constraints', data.hard_constraints],
    ['Out of Scope', data.out_of_scope],
    ['Ambiguities', data.ambiguities],
    ['Structural Corrections', data.structural_corrections],
    ['Recommended Briefing Points', data.recommended_briefing_points],
  ];
  for (const [title, items] of blocks) lines.push(`## ${title}`, '', ...(items?.length ? items.map((x) => `- ${x}`) : ['- None captured.']), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

async function generateSourceSynthesis({
  settings,
  evidencePack,
  targetRoot,
  synthesisPath = path.join(targetRoot, 'docs/product/source-synthesis.md'),
  onProgress,
}) {
  const output = await invokeStructured({
    settings,
    taskName: 'source_synthesis',
    caller: 'brief-synthesis.generateSourceSynthesis',
    targetRoot,
    systemPrompt: renderTemplate('source-synthesis.system.md', {}),
    userPrompt: renderTemplate('source-synthesis.user.md', { evidence_pack: evidencePack }),
    schema: SOURCE_SYNTHESIS_SCHEMA,
    promptSourceFiles: [
      'templates/llm/source-synthesis.system.md',
      'templates/llm/source-synthesis.user.md',
      'docs/product/source-evidence-pack.md',
    ],
    onProgress,
  });
  writeTextAtomic(synthesisPath, renderSourceSynthesisMarkdown(output));
  if (typeof onProgress === 'function') {
    onProgress(`wrote source synthesis: ${path.relative(targetRoot, synthesisPath)}`);
  }
  return output;
}

export {
  SOURCE_SYNTHESIS_SCHEMA,
  renderSourceSynthesisMarkdown,
  generateSourceSynthesis,
};
