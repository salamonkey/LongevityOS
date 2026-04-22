
import path from 'node:path';
import { FABRIC_ROOT } from '../constants.mjs';
import { readText, writeTextAtomic } from '../core.mjs';
import { resolveLlmSettings, validateLlmSettings } from './config.mjs';
import { invokeOpenAIStructured } from './provider-openai.mjs';
import { invokeStdioJsonStructured } from './provider-stdio-json.mjs';

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

const PROJECT_BRIEF_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['product_description','vision_and_positioning','core_problem','target_users','mvp_objective','core_mvp_scope','ux_principles_and_tone','primary_user_journey','technical_direction','data_and_privacy_constraints','explicit_out_of_scope','delivery_expectations','primary_success_criteria','future_roadmap'],
  properties: {
    product_description: { type: 'array', items: { type: 'string' } },
    vision_and_positioning: { type: 'array', items: { type: 'string' } },
    core_problem: { type: 'array', items: { type: 'string' } },
    target_users: { type: 'array', items: { type: 'string' } },
    mvp_objective: { type: 'array', items: { type: 'string' } },
    core_mvp_scope: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title','bullets'], properties: { title: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } } } } },
    ux_principles_and_tone: { type: 'array', items: { type: 'string' } },
    primary_user_journey: { type: 'array', items: { type: 'string' } },
    technical_direction: { type: 'array', items: { type: 'string' } },
    data_and_privacy_constraints: { type: 'array', items: { type: 'string' } },
    explicit_out_of_scope: { type: 'array', items: { type: 'string' } },
    delivery_expectations: { type: 'array', items: { type: 'string' } },
    primary_success_criteria: { type: 'array', items: { type: 'string' } },
    future_roadmap: { type: 'array', items: { type: 'string' } },
  },
};

function renderTemplate(templateName, variables) {
  const template = readText(path.join(FABRIC_ROOT, 'templates/llm', templateName));
  return template.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_, key) => String(variables[key] ?? ''));
}

function renderEvidencePack(analysis) {
  const lines = ['# Source Evidence Pack', '', 'Treat this as the raw evidence bundle for model-driven intake.', ''];
  for (const doc of analysis.documents || []) {
    lines.push(`## Source: ${doc.path}`, '', '```text', String(doc.text || '').trim(), '```', '');
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

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

function renderProductSystemFramingMarkdown(data) {
  const lines = ['# Product System Framing', '', '## Product Essence', '', data.product_essence, '', '## Target Users', '', ...data.target_users.map((x) => `- ${x}`), '', '## Jobs To Be Done', '', ...data.jobs_to_be_done.map((x) => `- ${x}`), '', '## Core Concepts', ''];
  for (const concept of data.core_concepts || []) lines.push(`- **${concept.name}** — ${concept.definition}`);
  lines.push('', '## Product Rules', '', ...data.product_rules.map((x) => `- ${x}`), '', '## Primary Workflows', '');
  for (const flow of data.primary_workflows || []) lines.push(`### ${flow.name}`, '', ...flow.steps.map((step, i) => `${i + 1}. ${step}`), '');
  lines.push('## MVP Boundaries', '', '### In Scope', '', ...data.mvp_boundaries.in_scope.map((x) => `- ${x}`), '', '### Out of Scope', '', ...data.mvp_boundaries.out_of_scope.map((x) => `- ${x}`), '', '## Open Decisions', '', ...(data.open_decisions.length ? data.open_decisions.map((x) => `- ${x}`) : ['- None captured.']), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function renderProjectBriefMarkdown(projectName, data, analysis) {
  const lines = ['# Project Brief', '', `Date: ` + '`' + `${new Date().toISOString().slice(0,10)}` + '`', 'Prepared by: `Product Manager`', `Project: ` + '`' + `${projectName}` + '`', 'Brief Approval Status: `draft`', ''];
  const addParagraphSection = (title, items) => {
    lines.push(`## ${title}`, '');
    for (const item of items || []) lines.push(item, '');
  };
  addParagraphSection('1. Product Description', data.product_description);
  addParagraphSection('2. Vision and Positioning', data.vision_and_positioning);
  addParagraphSection('3. Core Problem', data.core_problem);
  lines.push('## 4. Target Users', '', ...(data.target_users || []).map((x) => `- ${x}`), '');
  lines.push('## 5. MVP Objective', '', ...(data.mvp_objective || []).map((x) => `- ${x}`), '');
  lines.push('## 6. Core MVP Scope', '');
  for (const item of data.core_mvp_scope || []) lines.push(`### ${item.title}`, '', ...(item.bullets || []).map((x) => `- ${x}`), '');
  lines.push('## 7. UX Principles and Tone', '', ...(data.ux_principles_and_tone || []).map((x) => `- ${x}`), '', '## 8. Primary User Journey', '', ...(data.primary_user_journey || []).map((x, i) => `${i + 1}. ${x}`), '', '## 9. Technical Direction', '', ...(data.technical_direction || []).map((x) => `- ${x}`), '', '## 10. Data and Privacy Constraints', '', ...(data.data_and_privacy_constraints || []).map((x) => `- ${x}`), '', '## 11. Explicit Out of Scope (MVP)', '', ...(data.explicit_out_of_scope || []).map((x) => `- ${x}`), '', '## 12. Delivery Expectations', '', ...(data.delivery_expectations || []).map((x) => `- ${x}`), '', '## 13. Primary Success Criteria', '', ...(data.primary_success_criteria || []).map((x) => `- ${x}`), '', '## 14. Future Roadmap (Not MVP)', '', ...(data.future_roadmap || []).map((x) => `- ${x}`), '', '## 15. Source Basis', '');
  for (const doc of analysis.documents || []) lines.push(`- ` + '`' + `${doc.path.replace(/^docs\/customer-input\//, '')}` + '`');
  lines.push('');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

async function invokeStructured({ settings, taskName, systemPrompt, userPrompt, schema }) {
  if (settings.provider === 'openai') return invokeOpenAIStructured({ settings, taskName, systemPrompt, userPrompt, schema });
  if (settings.provider === 'stdio_json') return invokeStdioJsonStructured({ settings, taskName, systemPrompt, userPrompt, schema });
  throw new Error(`Unsupported llm provider: ${settings.provider}`);
}

export function getLlmCheckReport(values = {}) {
  const settings = resolveLlmSettings(values, undefined, 'intake');
  const validation = validateLlmSettings(settings);
  return { settings, validation };
}

export async function generateIntakeArtifactsWithModel({ targetRoot, values = {}, analysis }) {
  const settings = resolveLlmSettings(values, undefined, 'intake');
  const validation = validateLlmSettings(settings);
  if (!validation.ok) throw new Error(validation.errors.join(' '));

  const evidencePack = renderEvidencePack(analysis);
  const evidencePath = path.join(targetRoot, 'docs/product/source-evidence-pack.md');
  const synthesisPath = path.join(targetRoot, 'docs/product/source-synthesis.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  writeTextAtomic(evidencePath, evidencePack);

  const synthesis = await invokeStructured({
    settings,
    taskName: 'source_synthesis',
    systemPrompt: renderTemplate('source-synthesis.system.md', {}),
    userPrompt: renderTemplate('source-synthesis.user.md', { evidence_pack: evidencePack }),
    schema: SOURCE_SYNTHESIS_SCHEMA,
  });
  writeTextAtomic(synthesisPath, renderSourceSynthesisMarkdown(synthesis));

  const framing = await invokeStructured({
    settings,
    taskName: 'product_system_framing',
    systemPrompt: renderTemplate('product-system-framing.system.md', {}),
    userPrompt: renderTemplate('product-system-framing.user.md', { evidence_pack: evidencePack, source_synthesis_json: JSON.stringify(synthesis, null, 2) }),
    schema: PRODUCT_SYSTEM_FRAMING_SCHEMA,
  });
  writeTextAtomic(framingPath, renderProductSystemFramingMarkdown(framing));

  const brief = await invokeStructured({
    settings,
    taskName: 'project_brief',
    systemPrompt: renderTemplate('project-brief.system.md', {}),
    userPrompt: renderTemplate('project-brief.user.md', { evidence_pack: evidencePack, source_synthesis_json: JSON.stringify(synthesis, null, 2), framing_json: JSON.stringify(framing, null, 2), project_name: synthesis.product_name || values.project_name || 'Untitled Project' }),
    schema: PROJECT_BRIEF_SCHEMA,
  });
  writeTextAtomic(briefPath, renderProjectBriefMarkdown(synthesis.product_name || values.project_name || 'Untitled Project', brief, analysis));

  return { evidencePath, synthesisPath, framingPath, briefPath, settings };
}
