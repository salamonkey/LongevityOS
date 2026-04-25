import fs from 'node:fs';
import path from 'node:path';
import {
  readText,
  writeTextAtomic,
  loadManifest,
  loadValuesIfPresent,
  parseSliceBlockWithLists,
} from '../lib/core.mjs';
import { generateArchitectureBaselinePlaybook } from '../lib/llm/architect-baseline.mjs';
import { writeCurrentSliceUserChecklist, normalizeSliceScopeLabel } from './ux-review.mjs';

function pickOnboardingMode(details) {
  const text = String(details || '').toLowerCase();
  return /family/.test(text) ? 'family-aware onboarding' : 'single-profile onboarding';
}


function architecturePlaybookForSlice(sliceTitle, productFramingText, briefText) {
  const lower = String(sliceTitle || '').toLowerCase();
  const framing = `${String(productFramingText || '')}
${String(briefText || '')}`.toLowerCase();
  if (/onboard/.test(lower)) {
    return {
      context: 'This baseline enables the onboarding slice. The slice must capture the minimum profile information required to personalize the next product state and must leave the system in a valid onboarding-complete state for downstream health-plan and dashboard flows.',
      decisions: [
        'Introduce a UserProfile as the onboarding-owned core entity.',
        'Persist only the minimum required onboarding fields for MVP: age, gender, onboarding completion status, and family-mode choice.',
        `Treat the onboarding mode as ${pickOnboardingMode(framing)} for MVP; full family-profile management remains outside this slice unless explicitly required.`,
        'Onboarding completion becomes the prerequisite state for downstream plan-generation and dashboard flows.',
      ],
      guardrails: [
        'A profile cannot be marked onboarding-complete unless required fields are present and valid.',
        'The system must not expose downstream personalized guidance from incomplete onboarding state.',
        'This slice owns profile capture and completion state, not reminder, dashboard, or analytics behavior.',
      ],
      verification: [
        'Verify that valid age and gender input allows completion of onboarding.',
        'Verify that missing or invalid required inputs prevent completion with deterministic errors.',
        'Verify that onboarding completion persists profile state and next-step eligibility.',
      ],
      constraints: [
        'Keep the data model minimal and MVP-safe.',
        'Do not introduce provider integrations, external APIs, or real AI logic in this slice.',
        'Keep structure simple enough to support immediate follow-on slices for health plan generation and dashboard prioritization.',
      ],
      openQuestions: [
        'Should onboarding completion directly trigger health-plan generation in the same slice, or only unlock it for the next slice?',
      ],
    };
  }
  if (/dashboard/.test(lower)) {
    return {
      context: 'This baseline enables the dashboard slice. The slice must render a prioritized overview of user health actions and expose the next meaningful action clearly and consistently.',
      decisions: [
        'Introduce a DashboardProjection derived from user profile state and health-plan items.',
        'Support urgency buckets such as Now / Soon / Later as a derived presentation rule, not a standalone persisted entity.',
        'Dashboard rendering depends on completed onboarding and available plan-item state.',
      ],
      guardrails: [
        'Dashboard content must only reflect valid profile and plan-item state.',
        'Priority grouping must remain deterministic and explainable.',
      ],
      verification: [
        'Verify that dashboard sections populate from valid health-plan state.',
        'Verify that empty and partially populated states are handled explicitly.',
      ],
      constraints: [
        'Do not introduce advanced analytics or provider integrations in this slice.',
      ],
      openQuestions: ['What minimum scoring/summary logic belongs in dashboard MVP versus a later slice?'],
    };
  }
  return {
    context: `This baseline enables the active slice ${String(sliceTitle || 'Current Slice')} and defines the minimum structural decisions required to implement it safely without over-designing future behavior.`,
    decisions: [
      'Define only the entities and relationships required for the active slice.',
      'Keep responsibilities modular and directly traceable to the product-system framing.',
    ],
    guardrails: [
      'Do not introduce speculative abstractions beyond current-slice needs.',
      'All state transitions must be explicit and verifiable.',
    ],
    verification: [
      'Verify the slice works end-to-end against current acceptance criteria.',
    ],
    constraints: [
      'Keep structure simple, bounded, and implementable by the current code slice.',
    ],
    openQuestions: ['None at this time.'],
  };
}


function renderArchitectureBaseline({
  slice,
  productFramingText,
  briefText,
  generatedAt,
  fabricVersion,
  playbookOverride = null,
}) {
  const playbook = playbookOverride || architecturePlaybookForSlice(slice.title, productFramingText, briefText);
  const lines = [
    '<!-- generated_from: templates/architecture-baseline-template.md -->',
    `<!-- fabric_version: ${fabricVersion} -->`,
    `<!-- generated_at: ${generatedAt} -->`,
    '# Architecture Baseline',
    '',
    `Date: \`${generatedAt.slice(0,10)}\``,
    'Status: `Ready for implementation`',
    `Scope: Current slice \`${normalizeSliceScopeLabel(slice)}\``,
    '',
    '## 1. Context',
    '',
    playbook.context,
    '',
    '## 2. Decisions',
    '',
    ...playbook.decisions.map((item) => `- ${item}`),
    '',
    '## 3. Invariant and Guardrail Decisions',
    '',
    ...playbook.guardrails.map((item) => `- ${item}`),
    '',
    '## 4. Verification Decisions',
    '',
    ...playbook.verification.map((item) => `- ${item}`),
    '',
    '## 5. Constraints',
    '',
    ...playbook.constraints.map((item) => `- ${item}`),
    '',
    '## 6. Open Questions',
    '',
    ...playbook.openQuestions.map((item) => `- ${item}`),
    '',
  ];
  return `${lines.join('\n')}`;
}

function baselineRelPathForSlice(sliceId) {
  const normalizedSliceId = String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  return `docs/architecture/${normalizedSliceId}-baseline.md`;
}


async function architectGenerateCurrentSliceBaseline({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot generate architecture baseline: missing docs/product/current-slice.yaml');
  }
  const slice = parseSliceBlockWithLists(readText(currentSlicePath));
  const outRelPath = baselineRelPathForSlice(slice.id);
  const outPath = path.join(targetRoot, outRelPath);
  const briefText = fs.existsSync(briefPath) ? readText(briefPath) : '';
  const productFramingText = fs.existsSync(framingPath) ? readText(framingPath) : '';
  const generatedAt = new Date().toISOString();
  const manifest = loadManifest();
  let baselineMode = 'heuristic';
  let playbookOverride = null;
  try {
    const values = loadValuesIfPresent(valuesPath);
    console.log('fabric architect:generate-current-slice-baseline: starting model-driven baseline generation...');
    const { settings, purpose, playbook } = await generateArchitectureBaselinePlaybook({
      targetRoot,
      values,
      slice,
      briefMarkdown: briefText,
      framingMarkdown: productFramingText,
      onProgress: (message) => {
        console.log(`  - ${String(message)}`);
      },
    });
    playbookOverride = playbook;
    baselineMode = 'model_driven';
    if (purpose) {
      console.log(`fabric architect:generate-current-slice-baseline: llm profile ${purpose}`);
    }
    console.log(`fabric architect:generate-current-slice-baseline: model planner ${settings.provider}/${settings.model}`);
  } catch (error) {
    const reason = error?.message ? String(error.message) : String(error);
    console.warn(`fabric architect:generate-current-slice-baseline: model-driven baseline unavailable (${reason})`);
    console.warn('fabric architect:generate-current-slice-baseline: falling back to heuristic baseline generation.');
    baselineMode = 'heuristic_fallback';
  }

  const content = renderArchitectureBaseline({
    slice,
    productFramingText,
    briefText,
    generatedAt,
    fabricVersion: manifest.fabric_version,
    playbookOverride,
  });
  writeTextAtomic(outPath, `${content.trimEnd()}
`);
  const checklistPath = writeCurrentSliceUserChecklist({
    targetRoot,
    slice,
    uxFlowText: '',
    implementationNotesText: '',
  });
  console.log('fabric architect:generate-current-slice-baseline: OK');
  console.log(`- scope: ${normalizeSliceScopeLabel(slice)}`);
  console.log(`- wrote: ${outRelPath}`);
  console.log(`- wrote: ${path.relative(targetRoot, checklistPath)}`);
  console.log(`- baseline mode: ${baselineMode}`);
  console.log('- status: Ready for implementation');
}

export {
  architectGenerateCurrentSliceBaseline,
};
