import fs from 'node:fs';
import path from 'node:path';
import {
  readText,
  writeTextAtomic,
  loadValues,
  loadManifest,
  metadataHeader,
  quoteYamlString,
  setSectionScalar,
  setTopLevelScalar,
  assertApprovedBrief,
} from '../lib/core.mjs';
import { generateExecutionSlicePlan } from '../lib/llm/planning.mjs';
import { parseBriefSections, parseBullets, parseNumberedTitles } from './values-derivation.mjs';
import { cleanLeadingLabel, titleCaseText } from './brief-synthesis.mjs';

const MIN_SLICE_COUNT = 5;
const MAX_SLICE_COUNT = 8;

function normalizeSliceTitle(value) {
  const cleaned = titleCaseText(cleanLeadingLabel(String(value || '').replace(/\.$/, '').trim()));
  return cleaned || '';
}


function slugifyPlannedSliceTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'slice';
}


function derivePlannedImplementationTargets(title) {
  const normalizedTitle = String(title || '').toLowerCase();
  if (normalizedTitle.includes('onboarding')) {
    return [
      'src/features/onboarding/',
      'src/features/profile/',
      'src/routes/onboarding*',
      'tests/onboarding/',
    ];
  }
  const slug = slugifyPlannedSliceTitle(title);
  return [
    `src/features/${slug}/`,
    `src/routes/${slug}*`,
    `tests/${slug}/`,
  ];
}


function deriveInitialSliceTitlesFromBrief(briefText) {
  const sections = parseBriefSections(briefText);
  const scopeSection = sections['core mvp scope'] || '';
  const out = [];
  const seen = new Set();
  const candidates = [
    ...parseNumberedTitles(scopeSection),
    ...parseBullets(scopeSection),
  ];
  for (const raw of candidates) {
    const title = normalizeSliceTitle(raw);
    if (!title) {
      continue;
    }
    const key = title.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(title);
  }

  const fallback = [
    'Onboarding',
    'Dashboard',
    'Personal Health Plan',
    'Reminder System',
    'Family Mode',
    'Vaccination Tracker',
    'Provider Directory',
    'Notification Preferences',
  ];
  for (const title of fallback) {
    if (out.length >= MIN_SLICE_COUNT) {
      break;
    }
    const key = title.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(title);
  }

  return out.slice(0, MAX_SLICE_COUNT);
}


function buildInitialSlicePlan(briefText) {
  const titles = deriveInitialSliceTitlesFromBrief(briefText);
  if (titles.length === 0) {
    throw new Error('Cannot plan slices: unable to derive slice titles from approved brief.');
  }
  const slices = titles.map((title, index) => {
    const n = String(index + 1).padStart(3, '0');
    const id = `SL-${n}`;
    const milestone = `SL${n}_delivery`;
    const dependency = index === 0 ? 'Approved project brief and bootstrap reviews are complete.' : `Dependencies from SL-${String(index).padStart(3, '0')} are resolved.`;
    const checklistRelPath = `docs/testing/${id}-user-checklist.md`;
    const implementationNotesRelPath = `docs/implementation/${id}-implementation-notes.md`;
    const targetList = derivePlannedImplementationTargets(title);
    return {
      id,
      title,
      milestone,
      status: 'planned',
      owner_role: 'Product Manager',
      objective: `Deliver ${title} as an MVP-ready vertical slice with clear user value and bounded scope.`,
      in_scope: [
        `Implement the core ${title.toLowerCase()} user flow end-to-end.`,
        `Include required persistence, validation, and visible completion status for ${title.toLowerCase()}.`,
      ],
      out_of_scope: [
        `Advanced automation and non-MVP integrations for ${title.toLowerCase()}.`,
      ],
      acceptance_criteria: [
        `${title} flow works end-to-end in the local review environment.`,
        'Happy path and one failure/recovery path are verified.',
      ],
      dependencies: [dependency],
      done_definition: [
        `${checklistRelPath} is completed and marked Pass for ${id}.`,
        `Implementation artifacts exist for ${id} targets: ${targetList.join(', ')}.`,
        `${implementationNotesRelPath} is updated with verification evidence and changed files for ${id}.`,
        'fabric doctor passes without bootstrap semantic issues.',
      ],
    };
  });
  return slices.slice(0, Math.max(MIN_SLICE_COUNT, Math.min(MAX_SLICE_COUNT, slices.length)));
}


function normalizePlanList(rawValues, fallback = []) {
  const source = Array.isArray(rawValues) && rawValues.length > 0 ? rawValues : fallback;
  const out = [];
  const seen = new Set();
  for (const value of source) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(normalized);
  }
  return out;
}


function appendUniqueCaseInsensitive(values, candidate) {
  const text = String(candidate || '').trim();
  if (!text) {
    return;
  }
  const key = text.toLowerCase();
  if (values.some((item) => String(item || '').trim().toLowerCase() === key)) {
    return;
  }
  values.push(text);
}


function buildSlicePlanFromStructuredSpecs(rawSpecs) {
  const specs = Array.isArray(rawSpecs) ? rawSpecs : [];
  if (specs.length < MIN_SLICE_COUNT || specs.length > MAX_SLICE_COUNT) {
    throw new Error(
      `Cannot plan slices: expected ${String(MIN_SLICE_COUNT)}-${String(MAX_SLICE_COUNT)} slices, received ${String(specs.length)}.`,
    );
  }

  const titleCounts = new Map();
  return specs.map((spec, index) => {
    const n = String(index + 1).padStart(3, '0');
    const id = `SL-${n}`;
    const milestone = `SL${n}_delivery`;
    const baseTitle = normalizeSliceTitle(spec?.title || `Slice ${String(index + 1)}`) || `Slice ${String(index + 1)}`;
    const baseKey = baseTitle.toLowerCase();
    const seenCount = titleCounts.get(baseKey) || 0;
    titleCounts.set(baseKey, seenCount + 1);
    const title = seenCount === 0 ? baseTitle : `${baseTitle} (${String(seenCount + 1)})`;
    const lowerTitle = title.toLowerCase();
    const checklistRelPath = `docs/testing/${id}-user-checklist.md`;
    const implementationNotesRelPath = `docs/implementation/${id}-implementation-notes.md`;
    const targetList = derivePlannedImplementationTargets(title);
    const dependencyFallback = index === 0
      ? ['Approved project brief and bootstrap reviews are complete.']
      : [`Dependencies from SL-${String(index).padStart(3, '0')} are resolved.`];

    const doneDefinition = normalizePlanList(spec?.done_definition, [
      `${checklistRelPath} is completed and marked Pass for ${id}.`,
      `Implementation artifacts exist for ${id} targets: ${targetList.join(', ')}.`,
      `${implementationNotesRelPath} is updated with verification evidence and changed files for ${id}.`,
      'fabric doctor passes without bootstrap semantic issues.',
    ]);
    appendUniqueCaseInsensitive(doneDefinition, `${checklistRelPath} is completed and marked Pass for ${id}.`);
    appendUniqueCaseInsensitive(doneDefinition, `Implementation artifacts exist for ${id} targets: ${targetList.join(', ')}.`);
    appendUniqueCaseInsensitive(doneDefinition, `${implementationNotesRelPath} is updated with verification evidence and changed files for ${id}.`);
    appendUniqueCaseInsensitive(doneDefinition, 'fabric doctor passes without bootstrap semantic issues.');

    return {
      id,
      title,
      milestone,
      status: 'planned',
      owner_role: 'Product Manager',
      objective: normalizePlanList(
        spec?.objective ? [spec.objective] : [],
        [`Deliver ${title} as an MVP-ready vertical slice with clear user value and bounded scope.`],
      )[0],
      in_scope: normalizePlanList(spec?.in_scope, [
        `Implement the core ${lowerTitle} user flow end-to-end.`,
        `Include required persistence, validation, and visible completion status for ${lowerTitle}.`,
      ]),
      out_of_scope: normalizePlanList(spec?.out_of_scope, [
        `Advanced automation and non-MVP integrations for ${lowerTitle}.`,
      ]),
      acceptance_criteria: normalizePlanList(spec?.acceptance_criteria, [
        `${title} flow works end-to-end in the local review environment.`,
        'Happy path and one failure/recovery path are verified.',
      ]),
      dependencies: normalizePlanList(spec?.dependencies, dependencyFallback),
      done_definition: doneDefinition,
    };
  });
}


function renderYamlList(indent, values) {
  if (!values || values.length === 0) {
    return [`${' '.repeat(indent)}[]`];
  }
  return values.map((value) => `${' '.repeat(indent)}- ${quoteYamlString(value)}`);
}


function renderBacklogBody(slices, generatedAt) {
  const lines = [
    'schema_version: 1',
    `generated_at_utc: ${quoteYamlString(generatedAt)}`,
    'backlog:',
    '  slices:',
  ];
  for (const slice of slices) {
    lines.push(`    - id: ${quoteYamlString(slice.id)}`);
    lines.push(`      title: ${quoteYamlString(slice.title)}`);
    lines.push(`      objective: ${quoteYamlString(slice.objective)}`);
    lines.push(`      status: ${quoteYamlString(slice.status)}`);
    lines.push(`      owner_role: ${quoteYamlString(slice.owner_role)}`);
    lines.push('      in_scope:');
    lines.push(...renderYamlList(8, slice.in_scope));
    lines.push('      out_of_scope:');
    lines.push(...renderYamlList(8, slice.out_of_scope));
    lines.push('      acceptance_criteria:');
    lines.push(...renderYamlList(8, slice.acceptance_criteria));
    lines.push('      dependencies:');
    lines.push(...renderYamlList(8, slice.dependencies));
    lines.push('      done_definition:');
    lines.push(...renderYamlList(8, slice.done_definition));
  }
  return `${lines.join('\n')}\n`;
}


function renderCurrentSliceBody(slice, generatedAt) {
  const lines = [
    'schema_version: 1',
    `generated_at_utc: ${quoteYamlString(generatedAt)}`,
    'slice:',
    `  id: ${quoteYamlString(slice.id)}`,
    `  title: ${quoteYamlString(slice.title)}`,
    `  milestone: ${quoteYamlString(slice.milestone)}`,
    `  owner_role: ${quoteYamlString(slice.owner_role)}`,
    `  status: ${quoteYamlString(slice.status)}`,
    `  objective: ${quoteYamlString(slice.objective)}`,
    '  in_scope:',
    ...renderYamlList(4, slice.in_scope),
    '  out_of_scope:',
    ...renderYamlList(4, slice.out_of_scope),
    '  acceptance_criteria:',
    ...renderYamlList(4, slice.acceptance_criteria),
    '  dependencies:',
    ...renderYamlList(4, slice.dependencies),
    '  done_definition:',
    ...renderYamlList(4, slice.done_definition),
  ];
  return `${lines.join('\n')}\n`;
}


async function pmPlanSlices({ targetRoot, valuesPath, modelDriven = false, heuristic = false }) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  if (modelDriven && heuristic) {
    throw new Error('Cannot run pm:plan-slices with both --model-driven and --heuristic.');
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Cannot run pm:plan-slices: missing .system/project-manifest.yaml');
  }
  if (!fs.existsSync(briefPath)) {
    throw new Error('Cannot run pm:plan-slices: missing docs/product/project-brief.md');
  }
  assertApprovedBrief(targetRoot);

  const briefText = readText(briefPath);
  let slices = [];
  let planningMode = 'heuristic';
  if (!heuristic) {
    try {
      const values = loadValues(valuesPath);
      const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
      const framingMarkdown = fs.existsSync(framingPath) ? readText(framingPath) : '';
      console.log('fabric pm:plan-slices: starting model-driven planning...');
      const { settings, purpose, slices: structuredSlices } = await generateExecutionSlicePlan({
        targetRoot,
        values,
        briefMarkdown: briefText,
        framingMarkdown,
        onProgress: (message) => {
          console.log(`  - ${String(message)}`);
        },
      });
      slices = buildSlicePlanFromStructuredSpecs(structuredSlices);
      planningMode = 'model_driven';
      if (purpose) {
        console.log(`fabric pm:plan-slices: llm profile ${purpose}`);
      }
      console.log(`fabric pm:plan-slices: model planner ${settings.provider}/${settings.model}`);
    } catch (error) {
      const reason = error?.message ? String(error.message) : String(error);
      console.warn(`fabric pm:plan-slices: model-driven planning unavailable (${reason})`);
      console.warn('fabric pm:plan-slices: falling back to heuristic planning. Use --heuristic to skip model calls.');
      slices = buildInitialSlicePlan(briefText);
      planningMode = 'heuristic_fallback';
    }
  } else {
    slices = buildInitialSlicePlan(briefText);
  }

  const activeSlice = slices[0];
  const generatedAt = new Date().toISOString();
  const fabricManifest = loadManifest();

  const backlogHeader = metadataHeader(
    'docs/product/backlog.yaml',
    'templates/backlog.template.yaml',
    fabricManifest.fabric_version,
    generatedAt,
  );
  const currentSliceHeader = metadataHeader(
    'docs/product/current-slice.yaml',
    'templates/current-slice.template.yaml',
    fabricManifest.fabric_version,
    generatedAt,
  );
  writeTextAtomic(backlogPath, `${backlogHeader}${renderBacklogBody(slices, generatedAt)}`);
  writeTextAtomic(currentSlicePath, `${currentSliceHeader}${renderCurrentSliceBody(activeSlice, generatedAt)}`);

  let updatedManifest = readText(manifestPath);
  updatedManifest = setSectionScalar(
    updatedManifest,
    'status',
    'active_slice',
    quoteYamlString(activeSlice.id),
  );
  updatedManifest = setSectionScalar(
    updatedManifest,
    'status',
    'active_slice_state',
    quoteYamlString(activeSlice.status),
  );
  updatedManifest = setSectionScalar(
    updatedManifest,
    'status',
    'active_milestone',
    quoteYamlString(activeSlice.milestone),
  );
  updatedManifest = setTopLevelScalar(updatedManifest, 'last_updated_utc', quoteYamlString(generatedAt));
  if (!updatedManifest.endsWith('\n')) {
    updatedManifest = `${updatedManifest}\n`;
  }
  writeTextAtomic(manifestPath, updatedManifest);

  console.log('fabric pm:plan-slices: OK');
  console.log(`- planned slices: ${String(slices.length)}`);
  console.log(`- active slice: ${activeSlice.id} (${activeSlice.status})`);
  console.log(`- planning mode: ${planningMode}`);
  console.log('- backlog/current-slice regenerated from approved brief');
}

export {
  pmPlanSlices,
};
