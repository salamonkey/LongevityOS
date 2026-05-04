import fs from 'node:fs';
import path from 'node:path';
import {
  readText,
  writeTextAtomic,
  loadManifest,
  loadValuesIfPresent,
  parseSliceBlockWithLists,
} from '../lib/core.mjs';
import { generateCurrentSliceUxPlaybook } from '../lib/llm/uiux-flow.mjs';
import { writeSemanticUxContract } from './semantic-ux-validation.mjs';

function normalizeSliceScopeLabel(slice) {
  return `${String(slice.id || 'SL-XXX')} ${String(slice.title || 'Current Slice')}`.trim();
}


function uxPlaybookForSlice(sliceTitle, productFramingText, briefText) {
  const lower = String(sliceTitle || '').toLowerCase();
  const combined = `${String(productFramingText || '')}
${String(briefText || '')}`.toLowerCase();
  if (/onboard/.test(lower)) {
    return {
      context: 'This slice defines the first-run onboarding experience. The flow must feel clear, calm, and trustworthy, and must capture only the minimum information needed to unlock the next meaningful product state.',
      primaryFlow: {
        entry: 'User opens the app for the first time and lands on the welcome screen.',
        behaviors: [
          'Show a simple welcome state with a clear start action.',
          'Collect age and gender with low-friction input controls.',
          'Offer a simple choice between planning for self only or enabling family mode.',
          'Complete onboarding and transition the user to the next intended product state.',
        ],
      },
      failurePaths: [
        'Missing or invalid required inputs block continuation and show direct corrective guidance.',
        'If family mode has not been selected yet, prompt the user clearly before completion.',
      ],
      rules: [
        'Required fields: age and gender.',
        'Primary CTA labels should remain simple and direct.',
        'Tone must remain calm, clear, and lightly motivating.',
      ],
      constraints: [
        'Do not add extra onboarding questions beyond MVP minimum.',
        'Do not overload onboarding with medical detail or advanced personalization choices.',
      ],
      acceptance: [
        'User can complete onboarding end-to-end with valid required inputs.',
        'Invalid or missing required inputs prevent completion with clear feedback.',
        'Successful completion leaves the user in a valid next-step state.',
      ],
    };
  }
  if (/dashboard/.test(lower)) {
    return {
      context: 'This slice defines the first dashboard experience. The flow must immediately show the user what matters now, what matters soon, and what action to take next.',
      primaryFlow: {
        entry: 'User enters the dashboard after onboarding or returning to the app.',
        behaviors: [
          'Show a clear header and health summary.',
          'Group actions into simple priority buckets.',
          'Allow the user to drill into the next most relevant action.',
        ],
      },
      failurePaths: [
        'If no plan data exists yet, show an explicit empty-state path.',
      ],
      rules: [
        'Priority grouping must remain visually obvious and stable.',
        'The next action should be visible without scrolling through unrelated content.',
      ],
      constraints: [
        'Do not overload the dashboard with analytics or secondary navigation.',
      ],
      acceptance: [
        'User immediately understands what is important now and what to do next.',
      ],
    };
  }
  return {
    context: `This slice defines the minimum user-visible flow required for ${String(sliceTitle || 'the active slice')}.`,
    primaryFlow: {
      entry: 'User enters the current slice from the primary application flow.',
      behaviors: [
        'Complete the slice objective in the smallest coherent flow.',
      ],
    },
    failurePaths: ['Handle one clear recovery path for invalid or incomplete user action.'],
    rules: ['Keep interactions simple, direct, and aligned to current-slice scope.'],
    constraints: ['Avoid adding user-facing complexity outside the active slice.'],
    acceptance: ['Acceptance criteria map directly to visible user behavior.'],
  };
}


function renderUxCurrentSliceFlow({
  slice,
  productFramingText,
  briefText,
  generatedAt,
  fabricVersion,
  playbookOverride = null,
}) {
  const playbook = playbookOverride || uxPlaybookForSlice(slice.title, productFramingText, briefText);
  const lines = [
    '<!-- generated_from: templates/ux-current-slice-flow-template.md -->',
    `<!-- fabric_version: ${fabricVersion} -->`,
    `<!-- generated_at: ${generatedAt} -->`,
    '# UX Flow - Current Slice',
    '',
    `Date: \`${generatedAt.slice(0,10)}\``,
    'Status: `Ready for implementation`',
    `Scope: \`${normalizeSliceScopeLabel(slice)}\``,
    '',
    '## 1. Context',
    '',
    playbook.context,
    '',
    '## 2. Flow Definition',
    '',
    '### Flow A - Primary Path',
    '',
    `- Entry: ${playbook.primaryFlow.entry}`,
    '- Expected behavior:',
    ...playbook.primaryFlow.behaviors.map((item) => `  - ${item}`),
    '',
    '### Flow B - Failure and Recovery Paths',
    '',
    ...playbook.failurePaths.map((item) => `- ${item}`),
    '',
    '## 3. Interaction and Validation Rules',
    '',
    ...playbook.rules.map((item) => `- ${item}`),
    '',
    '## 4. Implementation Constraints',
    '',
    ...playbook.constraints.map((item) => `- ${item}`),
    '',
    '## 5. Acceptance Mapping',
    '',
    ...playbook.acceptance.map((item) => `- ${item}`),
    '',
  ];
  return `${lines.join('\n')}`;
}


function listFromMaybe(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/\r?\n/).map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  }
  return [];
}


function deriveChecklistGoal(slice) {
  const candidates = [
    slice.goal,
    slice.objective,
    slice.outcome,
    ...listFromMaybe(slice.acceptance_criteria),
    ...listFromMaybe(slice.acceptance),
  ].map((item) => String(item || '').trim()).filter(Boolean);
  if (candidates.length > 0) {
    return candidates[0].replace(/^[-*]\s*/, '');
  }
  return `Confirm the user can complete the ${slice.title || 'current slice'} flow successfully.`;
}


function deriveChecklistSteps(slice, uxFlowText) {
  const lines = String(uxFlowText || '').split(/\r?\n/).map((line) => line.trim());
  const steps = [];
  for (const line of lines) {
    if (/^(?:\d+[.)]|[-*])\s+/.test(line) && !/^[-*]\s*(Acceptance|Constraints?|Notes?|Status|Out of Scope)\b/i.test(line)) {
      steps.push(line.replace(/^(?:\d+[.)]|[-*])\s+/, '').trim());
    }
  }
  if (steps.length > 0) {
    return [...new Set(steps)].slice(0, 8);
  }
  const title = String(slice.title || '').toLowerCase();
  if (title.includes('onboarding')) {
    return [
      'Open the app.',
      'Confirm the welcome or onboarding screen appears.',
      'Enter the required profile inputs.',
      'Continue to the next step.',
      'Confirm the next view loads without crashing.',
    ];
  }
  return [
    `Open the app and navigate to the ${slice.title || 'current'} flow.`,
    'Complete the primary user action for this slice.',
    'Confirm the expected next view or state appears without errors.',
  ];
}


function deriveExpectedResults(slice, uxFlowText) {
  const results = [
    ...listFromMaybe(slice.acceptance_criteria),
    ...listFromMaybe(slice.acceptance),
  ];
  if (!results.some((item) => /without (?:error|crash)|loads?/i.test(item))) {
    results.unshift('App loads without blank screen or runtime error.');
  }
  const uxHints = String(uxFlowText || '');
  if (/dashboard|health plan/i.test(uxHints) && !results.some((item) => /dashboard|health plan/i.test(item))) {
    results.push('The dashboard or health-plan view appears when the flow is completed.');
  }
  if (/welcome|onboarding/i.test(uxHints) && !results.some((item) => /welcome|onboarding/i.test(item))) {
    results.push('The onboarding entry screen is visible and clear.');
  }
  return [...new Set(results.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 10);
}


function deriveFailConditions(slice) {
  const title = slice.title || 'current slice';
  return [
    'Blank page or broken layout.',
    'Required input cannot be completed.',
    'Primary action does nothing or leads to an error.',
    'App crashes during the flow.',
    `Expected next state for ${title} does not appear.`,
  ];
}


function deriveOutOfScope(slice, implementationNotesText) {
  const explicit = [
    ...listFromMaybe(slice.out_of_scope),
    ...listFromMaybe(slice.outOfScope),
  ];
  if (explicit.length > 0) {
    return [...new Set(explicit)].slice(0, 8);
  }
  const title = String(slice.title || '').toLowerCase();
  if (title.includes('onboarding')) {
    return [
      'Reminder flows.',
      'Vaccination tracking.',
      'Family mode and profile switching.',
      'Advanced personalization beyond the onboarding slice.',
    ];
  }
  const notes = String(implementationNotesText || '');
  if (/schema change/i.test(notes)) {
    return ['Any database or schema changes not explicitly required by this slice.'];
  }
  return ["Items not explicitly covered by this slice's acceptance criteria."];
}


function renderCurrentSliceUserChecklist({ slice, uxFlowText, implementationNotesText }) {
  const steps = deriveChecklistSteps(slice, uxFlowText);
  const expectedResults = deriveExpectedResults(slice, uxFlowText);
  const failConditions = deriveFailConditions(slice);
  const outOfScope = deriveOutOfScope(slice, implementationNotesText);
  return [
    '# Current Slice User Checklist',
    '',
    '## Slice',
    `- ID: ${slice.id || 'UNKNOWN'}`,
    `- Title: ${slice.title || 'Current Slice'}`,
    '',
    '## Goal',
    deriveChecklistGoal(slice),
    '',
    '## Preconditions',
    '- App is running locally.',
    '- User starts from a fresh session unless noted otherwise.',
    '- Required demo or seed data is available if needed.',
    '',
    '## What to test',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Expected results',
    ...expectedResults.map((item) => `- ${item}`),
    '',
    '## Semantic UX checks',
    '- All user-visible text speaks to the user, not about the system.',
    '- No visible copy exposes internal implementation, workflow, schema, routing, slice, test, ranking, bucket, or process language.',
    '- Labels, explanations, empty states, and status messages are meaningful in the product context.',
    '- Dates, times, counts, and statuses are valid and human-readable.',
    '- Unknown or missing data uses a safe fallback.',
    '- A section existing with bad, generic, or internal copy is marked Fail, not Pass.',
    '',
    '## Fail conditions',
    ...failConditions.map((item) => `- ${item}`),
    '',
    '## Out of scope for this slice',
    ...outOfScope.map((item) => `- ${item}`),
    '',
    '## Result',
    'Status: Pending',
    '',
    'Use one of:',
    '- Pending',
    '- Pass',
    '- Fail',
    '',
    '## Manual QA Findings',
    '',
    'Use this section when manual review finds something that should be repaired before closeout.',
    'If the checklist passes, leave this section as `None.`',
    '',
    'None.',
    '',
    '### Finding 1',
    '',
    'Classification:',
    '- [ ] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.',
    '- [ ] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.',
    '- [ ] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.',
    '',
    'Finding:',
    '-',
    '',
    'Expected:',
    '-',
    '',
    'Observed:',
    '-',
    '',
    'Required repair:',
    '-',
    '',
  ].join('\n');
}


function writeCurrentSliceUserChecklist({ targetRoot, slice, uxFlowText, implementationNotesText = '' }) {
  const normalizedSliceId = String(slice?.id || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  const outPath = path.join(targetRoot, `docs/testing/${normalizedSliceId}-user-checklist.md`);
  writeTextAtomic(outPath, `${renderCurrentSliceUserChecklist({ slice, uxFlowText, implementationNotesText }).trimEnd()}\n`);
  return outPath;
}


function uxFlowRelPathForSlice(sliceId) {
  const normalizedSliceId = String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  return `docs/ux/${normalizedSliceId}-current-slice-flow.md`;
}


function architectureBaselineRelPathForSlice(sliceId) {
  const normalizedSliceId = String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  return `docs/architecture/${normalizedSliceId}-baseline.md`;
}


async function uiuxGenerateCurrentSliceFlow({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot generate UX flow: missing docs/product/current-slice.yaml');
  }
  const slice = parseSliceBlockWithLists(readText(currentSlicePath));
  const outRelPath = uxFlowRelPathForSlice(slice.id);
  const outPath = path.join(targetRoot, outRelPath);
  const architectureBaselineRelPath = architectureBaselineRelPathForSlice(slice.id);
  const architectureBaselinePath = path.join(targetRoot, architectureBaselineRelPath);
  if (!fs.existsSync(architectureBaselinePath)) {
    throw new Error(`Cannot generate UX flow: missing ${architectureBaselineRelPath}; run architect:generate-current-slice-baseline first`);
  }
  const architectureBaselineText = readText(architectureBaselinePath);
  const briefText = fs.existsSync(briefPath) ? readText(briefPath) : '';
  const productFramingText = fs.existsSync(framingPath) ? readText(framingPath) : '';
  const generatedAt = new Date().toISOString();
  const manifest = loadManifest();
  let uxMode = 'heuristic';
  let playbookOverride = null;
  try {
    const values = loadValuesIfPresent(valuesPath);
    console.log('fabric uiux:generate-current-slice-flow: starting model-driven UX flow generation...');
    const { settings, purpose, playbook } = await generateCurrentSliceUxPlaybook({
      targetRoot,
      values,
      slice,
      briefMarkdown: briefText,
      framingMarkdown: productFramingText,
      architectureBaselineMarkdown: architectureBaselineText,
      onProgress: (message) => {
        console.log(`  - ${String(message)}`);
      },
    });
    playbookOverride = playbook;
    uxMode = 'model_driven';
    if (purpose) {
      console.log(`fabric uiux:generate-current-slice-flow: llm profile ${purpose}`);
    }
    console.log(`fabric uiux:generate-current-slice-flow: model ux ${settings.provider}/${settings.model}`);
  } catch (error) {
    const reason = error?.message ? String(error.message) : String(error);
    console.warn(`fabric uiux:generate-current-slice-flow: model-driven flow unavailable (${reason})`);
    console.warn('fabric uiux:generate-current-slice-flow: falling back to heuristic UX flow generation.');
    uxMode = 'heuristic_fallback';
  }
  const content = renderUxCurrentSliceFlow({
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
    uxFlowText: content,
    implementationNotesText: '',
  });
  const semanticContract = writeSemanticUxContract({
    targetRoot,
    slice,
    uxFlowText: content,
    generatedAt,
  });
  console.log('fabric uiux:generate-current-slice-flow: OK');
  console.log(`- scope: ${normalizeSliceScopeLabel(slice)}`);
  console.log(`- architecture baseline: ${architectureBaselineRelPath}`);
  console.log(`- wrote: ${outRelPath}`);
  console.log(`- wrote: ${path.relative(targetRoot, checklistPath)}`);
  console.log(`- wrote: ${semanticContract.relPath}`);
  console.log(`- ux mode: ${uxMode}`);
  console.log('- status: Ready for implementation');
}

export {
  normalizeSliceScopeLabel,
  writeCurrentSliceUserChecklist,
  uiuxGenerateCurrentSliceFlow,
};
