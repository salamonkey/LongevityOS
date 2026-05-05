import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import {
  SLICE_LIST_FIELDS,
  readText,
  writeTextAtomic,
  loadManifest,
  loadValues,
  initValuesFile,
  verifyRequiredTokens,
  verifyTemplateTokens,
  verifyTemplateTokensForEntries,
  expectedContent,
  upsertPackageScripts,
  ensurePackageJson,
  isGeneratedFile,
  writeEntries,
  assertApprovedBrief,
  assertMinimumCustomerInput,
  parseEnvKeys,
  parseBlockScalars,
  parseStatusBlock,
  parseBacklogSlices,
  parseSliceBlock,
  parseSliceBlockWithLists,
  parseBacklogSliceStatus,
  parseSectionListValues,
  listAllPlaceholderMatches,
  normalizeWhitespace,
  quoteYamlString,
  metadataHeader,
  setSectionScalar,
  setTopLevelScalar,
  stripGeneratedAt,
  firstDiffLine,
  ensureDir,
  isBootstrapInitialization,
  getBootstrapReviewRelPaths,
  loadValuesIfPresent,
} from '../lib/core.mjs';
import { generateCurrentSliceImplementationPlaybook } from '../lib/llm/coder-implementation.mjs';
import { generateCurrentSliceImplementationSourceFiles } from '../lib/llm/coder-source-files.mjs';
import {
  semanticUxContractRelPathForSlice,
  semanticUxReviewJsonRelPathForSlice,
  semanticUxReviewMdRelPathForSlice,
  readSemanticUxReviewStatus,
} from '../product/semantic-ux-validation.mjs';
import {
  assertDesignSystemReadyForSlice,
  loadDesignSystemContext,
  requiredDesignSystemRelPaths,
  requiredSliceUxContractRelPaths,
} from '../product/design-system.mjs';
import {
  storybookMapRelPath,
  storybookReviewJsonRelPathForSlice,
  readStorybookReviewStatus,
} from '../product/storybook.mjs';

const FORMAT_FROM_BRIEF_STAMP_REL_PATH = 'docs/pm/brief/format-from-brief.stamp.json';
const SCAFFOLD_STAMP_REL_PATH = 'docs/pm/brief/scaffold.stamp.json';

function writeBootstrapStamp({ targetRoot, relPath, command, status = 'passed' }) {
  const stampPath = path.join(targetRoot, relPath);
  ensureDir(path.dirname(stampPath));
  const checkedAtUtc = new Date().toISOString();
  writeTextAtomic(
    stampPath,
    `${JSON.stringify({
      command,
      status,
      checked_at_utc: checkedAtUtc,
    }, null, 2)}\n`,
  );
}

function initFactory({ targetRoot, valuesPath, force, initValues, forceValues }) {
  if (initValues) {
    initValuesFile(valuesPath, forceValues);
    console.log(
      'fabric init-factory: NOTE --init-values requested; values file was intentionally initialized early from fabric.values.example.json.',
    );
    console.log(
      'fabric init-factory: To defer values creation until brief approval, omit --init-values and run pm:derive-values later.',
    );
  } else if (!fs.existsSync(valuesPath)) {
    console.log(
      'fabric init-factory: values file not found; continuing in brief-first mode (values will be created by pm:derive-values).',
    );
  }
  const manifest = loadManifest();
  const entries = manifest.factory_init_source_of_truth || [];
  const outputs = writeEntries({
    targetRoot,
    valuesPath,
    force,
    entries,
    checkBriefApproval: false,
    allowMissingValues: true,
  });

  console.log(`fabric init-factory: generated ${outputs.length} files`);
  outputs.forEach((item) => console.log(`- ${item}`));
}

function formatFromBrief({ targetRoot }) {
  assertApprovedBrief(targetRoot);
  assertMinimumCustomerInput(targetRoot);
  writeBootstrapStamp({
    targetRoot,
    relPath: FORMAT_FROM_BRIEF_STAMP_REL_PATH,
    command: 'format-from-brief',
  });
  console.log('fabric format-from-brief: brief is approved, execution can proceed');
  console.log(`- updated: ${FORMAT_FROM_BRIEF_STAMP_REL_PATH}`);
}

function instantiate({ targetRoot, valuesPath, force }) {
  const manifest = loadManifest();
  const values = loadValues(valuesPath);
  verifyRequiredTokens(manifest, values);
  verifyTemplateTokens(manifest, values);

  const outputs = writeEntries({
    targetRoot,
    valuesPath,
    force,
    entries: manifest.source_of_truth || [],
    checkBriefApproval: isBootstrapInitialization(targetRoot),
  });

  console.log(`fabric instantiate: generated ${outputs.length} files`);
  outputs.forEach((item) => console.log(`- ${item}`));
}

const SCAFFOLD_EXCLUDED_TARGETS = new Set([
  // Constitutional customer-derived product artifacts.
  'docs/product/product-system-framing.md',
  // Planning-owned artifacts.
  'docs/product/backlog.yaml',
  'docs/product/current-slice.yaml',
]);

function scaffoldEntries(manifest) {
  const sourceEntries = Array.isArray(manifest?.source_of_truth) ? manifest.source_of_truth : [];
  return sourceEntries.filter((entry) => !SCAFFOLD_EXCLUDED_TARGETS.has(String(entry?.target || '')));
}

function scaffold({ targetRoot, valuesPath, force }) {
  const manifest = loadManifest();
  const values = loadValues(valuesPath);
  const entries = scaffoldEntries(manifest);
  verifyRequiredTokens(manifest, values);
  verifyTemplateTokensForEntries(manifest, values, entries);

  const outputs = writeEntries({
    targetRoot,
    valuesPath,
    force,
    entries,
    checkBriefApproval: isBootstrapInitialization(targetRoot),
  });

  const frontendOutputs = ensureReactViteStorybookScaffold(targetRoot, valuesPath, { force });
  writeBootstrapStamp({
    targetRoot,
    relPath: SCAFFOLD_STAMP_REL_PATH,
    command: 'scaffold',
  });

  console.log(`fabric scaffold: generated ${outputs.length} files`);
  outputs.forEach((item) => console.log(`- ${item}`));
  if (frontendOutputs.length > 0) {
    console.log('fabric scaffold: ensured React/Vite + Storybook baseline');
    frontendOutputs.forEach((item) => console.log(`- ${item}`));
  }
}

function hasSupabaseCli() {
  const res = spawnSync('supabase', ['--version'], { encoding: 'utf8' });
  return res.status === 0;
}

function dbCheck({ targetRoot }) {
  const manifest = loadManifest();
  const issues = [];
  const dbConfig = manifest.db || {};

  for (const rel of dbConfig.required_files || []) {
    if (!fs.existsSync(path.join(targetRoot, rel))) {
      issues.push(`missing required DB file: ${rel}`);
    }
  }

  const envKeys = parseEnvKeys(path.join(targetRoot, '.env.example'));
  for (const key of dbConfig.required_env_keys || []) {
    if (!envKeys.has(key)) {
      issues.push(`missing required env key in .env.example: ${key}`);
    }
  }

  const pkgPath = path.join(targetRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(readText(pkgPath));
    for (const [name, command] of Object.entries(dbConfig.required_package_scripts || {})) {
      if (!pkg?.scripts || pkg.scripts[name] !== command) {
        issues.push(`missing/incorrect package script ${name}`);
      }
    }
  }

  if (!hasSupabaseCli()) {
    issues.push('supabase CLI not available in PATH');
  }

  if (issues.length > 0) {
    console.error('fabric db:check: FAILED');
    issues.forEach((i) => console.error(`- ${i}`));
    process.exit(1);
  }

  console.log('fabric db:check: OK');
}

function runShellCommand(command, cwd) {
  const res = spawnSync(command, {
    cwd,
    shell: true,
    stdio: 'inherit',
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

function dbReset({ targetRoot, yes }) {
  const manifest = loadManifest();
  if (!yes) {
    throw new Error('db:reset requires --yes (destructive operation)');
  }
  const command = manifest?.db?.reset_command || 'supabase db reset';
  console.log(`fabric db:reset: executing '${command}'`);
  runShellCommand(command, targetRoot);
}

function dbInit({ targetRoot, valuesPath, force }) {
  const manifest = loadManifest();
  const values = loadValues(valuesPath);
  verifyRequiredTokens(manifest, values);
  verifyTemplateTokens(manifest, values);

  const generatedAt = new Date().toISOString();
  const targets = [
    { source: 'db/supabase-config.template.toml', target: 'supabase/config.toml' },
    { source: 'db/supabase-seed.template.sql', target: 'supabase/seed.sql' },
    { source: 'templates/env-example.template', target: '.env.example' },
  ];

  for (const item of targets) {
    const outPath = path.join(targetRoot, item.target);
    if (fs.existsSync(outPath) && !force) {
      const existing = readText(outPath);
      if (!isGeneratedFile(existing)) {
        throw new Error(`Refusing to overwrite non-generated file without --force: ${item.target}`);
      }
    }
    const entry = { source: item.source, target: item.target };
    const output = expectedContent(entry, manifest, values, generatedAt);
    ensureDir(outPath);
    fs.writeFileSync(outPath, output, 'utf8');
  }

  const packageJsonPath = path.join(targetRoot, 'package.json');
  const createdPackageJson = ensurePackageJson(packageJsonPath, values);
  upsertPackageScripts(packageJsonPath, manifest?.db?.required_package_scripts || {});

  if (createdPackageJson) {
    console.log('fabric db:init: created minimal package.json');
  }
  console.log('fabric db:init: OK');
}

function sliceReadinessListsPresent(slice) {
  return [...SLICE_LIST_FIELDS].every((field) => Array.isArray(slice[field]) && slice[field].length > 0);
}

function sliceHasPlaceholderValues(slice) {
  const values = [];
  for (const key of ['id', 'title', 'objective', 'milestone', 'status']) {
    if (slice[key] != null) {
      values.push(String(slice[key]));
    }
  }
  for (const field of SLICE_LIST_FIELDS) {
    for (const item of slice[field] || []) {
      values.push(String(item));
    }
  }
  return listAllPlaceholderMatches(values.join('\n')).length > 0;
}

function collectBootstrapSemanticIssues({
  targetRoot,
  valuesPath,
  manifestText,
  currentSliceText,
  backlogText,
}) {
  const issues = [];
  const operatingModel = parseBlockScalars(manifestText, 'operating_model');
  const currentMode = String(operatingModel.current_mode || '').toLowerCase();
  const approvedReviews = parseSectionListValues(manifestText, 'status', 'approved_reviews');

  if (currentMode === 'delivery' && approvedReviews.length === 0) {
    issues.push('delivery mode set but status.approved_reviews is empty; run pm:bootstrap-signoff');
  }

  const values = loadValuesIfPresent(valuesPath);
  const reviewRelPaths = Object.values(getBootstrapReviewRelPaths(values));
  const semanticFiles = [
    { relPath: 'docs/product/backlog.yaml', content: backlogText },
    { relPath: 'docs/product/current-slice.yaml', content: currentSliceText },
  ];
  for (const relPath of reviewRelPaths) {
    const absPath = path.join(targetRoot, relPath);
    if (!fs.existsSync(absPath)) {
      if (currentMode === 'delivery') {
        issues.push(`delivery mode set but missing bootstrap review file: ${relPath}`);
      }
      continue;
    }
    semanticFiles.push({ relPath, content: readText(absPath) });
  }

  for (const file of semanticFiles) {
    const placeholders = listAllPlaceholderMatches(file.content);
    if (placeholders.length > 0) {
      issues.push(`${file.relPath}: unresolved placeholders detected (${[...new Set(placeholders)].join(', ')})`);
    }
  }

  const backlogSlices = parseBacklogSlices(backlogText);
  const currentSlice = parseSliceBlockWithLists(currentSliceText);
  const backlogReady = backlogSlices.some(
    (slice) => sliceReadinessListsPresent(slice) && !sliceHasPlaceholderValues(slice),
  );
  const currentReady = sliceReadinessListsPresent(currentSlice) && !sliceHasPlaceholderValues(currentSlice);
  const singleScaffoldPattern = backlogSlices.length <= 1
    && normalizeWhitespace(backlogSlices[0]?.title || '') === normalizeWhitespace(currentSlice.title || '')
    && normalizeWhitespace(backlogSlices[0]?.objective || '') === normalizeWhitespace(currentSlice.objective || '');

  if (!backlogReady || !currentReady || singleScaffoldPattern) {
    issues.push(
      'backlog/current-slice appear scaffold-only; run pm:plan-slices to generate delivery-ready slices.',
    );
  }

  return issues;
}

function validate({ targetRoot, valuesPath }) {
  const manifest = loadManifest();
  const values = loadValues(valuesPath);
  verifyRequiredTokens(manifest, values);
  verifyTemplateTokens(manifest, values);

  const exemptions = new Set(manifest.drift_exemptions || []);
  const errors = [];

  for (const entry of manifest.source_of_truth || []) {
    if (exemptions.has(entry.target)) {
      continue;
    }

    const outPath = path.join(targetRoot, entry.target);
    if (!fs.existsSync(outPath)) {
      errors.push(`${entry.target}: missing generated file`);
      continue;
    }

    const actual = readText(outPath);
    const expected = expectedContent(entry, manifest, values, '1970-01-01T00:00:00.000Z');

    const normalizedActual = stripGeneratedAt(actual);
    const normalizedExpected = stripGeneratedAt(expected);

    if (!normalizedActual.includes('generated_from:')) {
      errors.push(`${entry.target}: missing generated header marker`);
      continue;
    }

    if (normalizedActual !== normalizedExpected) {
      const diffLine = firstDiffLine(normalizedActual, normalizedExpected);
      errors.push(`${entry.target}: drift detected (first difference at line ${diffLine})`);
    }
  }

  if (errors.length > 0) {
    console.error('fabric validate: FAILED');
    errors.forEach((e) => console.error(`- ${e}`));
    const error = new Error(`fabric validate failed (${String(errors.length)} issue(s))`);
    error.alreadyLogged = true;
    error.code = 'FABRIC_VALIDATE_FAILED';
    error.issues = errors;
    throw error;
  }

  console.log('fabric validate: OK');
}

function doctor({ targetRoot, valuesPath }) {
  const manifest = loadManifest();
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');

  const issues = [];

  if (!fs.existsSync(manifestPath)) {
    issues.push('missing .system/project-manifest.yaml');
  }
  if (!fs.existsSync(currentSlicePath)) {
    issues.push('missing docs/product/current-slice.yaml');
  }
  if (!fs.existsSync(backlogPath)) {
    issues.push('missing docs/product/backlog.yaml');
  }

  if (issues.length === 0) {
    const manifestText = readText(manifestPath);
    const currentSliceText = readText(currentSlicePath);
    const backlogText = readText(backlogPath);

    const statusBlock = parseStatusBlock(manifestText);
    const sliceBlock = parseSliceBlock(currentSliceText);

    const manifestSliceId = statusBlock.active_slice ?? null;
    const currentSliceId = sliceBlock.id ?? null;
    const currentSliceStatus = sliceBlock.status ?? null;

    if (manifestSliceId !== currentSliceId) {
      issues.push(
        `active_slice mismatch: manifest=${String(manifestSliceId)} current-slice=${String(currentSliceId)}`,
      );
    }

    if (currentSliceStatus === 'completed' && statusBlock.active_slice_state !== 'completed') {
      issues.push(
        `active_slice_state mismatch: expected completed when current slice is completed, got ${String(
          statusBlock.active_slice_state,
        )}`,
      );
    }

    const backlogStatus = parseBacklogSliceStatus(backlogText, currentSliceId);
    if (backlogStatus == null) {
      issues.push(`current slice ${String(currentSliceId)} not found in backlog`);
    } else if (backlogStatus !== currentSliceStatus) {
      issues.push(
        `slice status mismatch for ${currentSliceId}: backlog=${String(backlogStatus)} current-slice=${String(
          currentSliceStatus,
        )}`,
      );
    }

    issues.push(
      ...collectBootstrapSemanticIssues({
        targetRoot,
        valuesPath,
        manifestText,
        currentSliceText,
        backlogText,
      }),
    );
  }

  const dbConfig = manifest.db || {};
  for (const rel of dbConfig.required_files || []) {
    if (!fs.existsSync(path.join(targetRoot, rel))) {
      issues.push(`db readiness: missing ${rel}`);
    }
  }

  const envKeys = parseEnvKeys(path.join(targetRoot, '.env.example'));
  for (const key of dbConfig.required_env_keys || []) {
    if (!envKeys.has(key)) {
      issues.push(`db readiness: missing env key ${key} in .env.example`);
    }
  }

  if (issues.length > 0) {
    console.error('fabric doctor: FAILED');
    issues.forEach((i) => console.error(`- ${i}`));
    const error = new Error(`fabric doctor failed (${String(issues.length)} issue(s))`);
    error.alreadyLogged = true;
    error.code = 'FABRIC_DOCTOR_FAILED';
    error.issues = issues;
    throw error;
  }

  console.log('fabric doctor: OK');
}

function safeGateMessage(error) {
  const text = String(error?.message || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Unknown gate failure';
  return text.slice(0, 240);
}

function updateGateStatus({ targetRoot, result, stage, message = '' }) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  if (!fs.existsSync(manifestPath)) {
    return;
  }
  const now = new Date().toISOString();
  let manifestText = readText(manifestPath);
  manifestText = setSectionScalar(manifestText, 'status', 'last_gate_result', quoteYamlString(result));
  manifestText = setSectionScalar(manifestText, 'status', 'last_gate_stage', quoteYamlString(stage));
  manifestText = setSectionScalar(manifestText, 'status', 'last_gate_checked_at_utc', quoteYamlString(now));
  manifestText = setSectionScalar(manifestText, 'status', 'last_gate_message', quoteYamlString(message));
  manifestText = setTopLevelScalar(manifestText, 'last_updated_utc', quoteYamlString(now));
  writeTextAtomic(manifestPath, manifestText);
}

function gate({ targetRoot, valuesPath }) {
  try {
    validate({ targetRoot, valuesPath });
  } catch (error) {
    updateGateStatus({
      targetRoot,
      result: 'failed',
      stage: 'validate',
      message: safeGateMessage(error),
    });
    throw error;
  }

  try {
    doctor({ targetRoot, valuesPath });
  } catch (error) {
    updateGateStatus({
      targetRoot,
      result: 'failed',
      stage: 'doctor',
      message: safeGateMessage(error),
    });
    throw error;
  }

  updateGateStatus({
    targetRoot,
    result: 'passed',
    stage: 'gate',
    message: 'validate and doctor passed',
  });
  console.log('fabric gate: OK');
}



function slugifySliceTitle(title) {
  return String(title || 'slice')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'slice';
}

function assertNoPlaceholdersInArtifact(relPath, text) {
  const placeholders = [...new Set(listAllPlaceholderMatches(text))];
  if (placeholders.length > 0) {
    throw new Error(`${relPath} still contains unresolved placeholders (${placeholders.join(', ')})`);
  }
}

function renderYamlList(indent, values) {
  if (!values || values.length === 0) {
    return [`${' '.repeat(indent)}[]`];
  }
  return values.map((value) => `${' '.repeat(indent)}- ${quoteYamlString(String(value))}`);
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

function renderCurrentSliceUserChecklist({ slice, uxFlowText, implementationNotesText, carryForwardInvariants = [] }) {
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
    '## Carry-forward capabilities to preserve (auto-inherited)',
    ...(carryForwardInvariants.length > 0
      ? carryForwardInvariants.flatMap((entry) => [
        `- [${entry.sliceId}] ${entry.title}`,
        ...entry.assertions.map((assertion) => `  - ${assertion}`),
      ])
      : ['- None yet (no prior passed slices detected).']),
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
  const carryForwardInvariants = collectCarryForwardInvariants({
    targetRoot,
    activeSliceId: slice?.id,
  });
  writeTextAtomic(outPath, `${renderCurrentSliceUserChecklist({
    slice,
    uxFlowText,
    implementationNotesText,
    carryForwardInvariants,
  }).trimEnd()}\n`);
  return outPath;
}

function uxFlowRelPathForSlice(sliceId) {
  const normalizedSliceId = String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  return `docs/ux/${normalizedSliceId}-current-slice-flow.md`;
}

function uxFlowPathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, uxFlowRelPathForSlice(sliceId));
}

function uxFlowMatchesSliceId(uxFlowText, sliceId) {
  return new RegExp(`^Scope:\\s*\`?${String(sliceId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'm').test(String(uxFlowText || ''));
}

function ensureSliceUxFlowPath(targetRoot, sliceId) {
  const relPath = uxFlowRelPathForSlice(sliceId);
  const absPath = uxFlowPathForSlice(targetRoot, sliceId);
  if (fs.existsSync(absPath)) {
    return { relPath, absPath };
  }
  const legacyRelPath = 'docs/ux/current-slice-flow.md';
  const legacyAbsPath = path.join(targetRoot, legacyRelPath);
  if (fs.existsSync(legacyAbsPath)) {
    const legacyText = readText(legacyAbsPath);
    if (uxFlowMatchesSliceId(legacyText, sliceId)) {
      writeTextAtomic(absPath, legacyText.endsWith('\n') ? legacyText : `${legacyText}\n`);
      return { relPath, absPath };
    }
  }
  return { relPath, absPath };
}

function implementationNotesRelPathForSlice(sliceId) {
  const normalizedSliceId = String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  return `docs/implementation/${normalizedSliceId}-implementation-notes.md`;
}

function implementationNotesPathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, implementationNotesRelPathForSlice(sliceId));
}

function notesMatchSliceId(notesText, sliceId) {
  return new RegExp(`^Slice:\\s*\`?${String(sliceId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'm').test(String(notesText || ''));
}

function ensureSliceImplementationNotesPath(targetRoot, sliceId) {
  const relPath = implementationNotesRelPathForSlice(sliceId);
  const absPath = implementationNotesPathForSlice(targetRoot, sliceId);
  if (fs.existsSync(absPath)) {
    return { relPath, absPath };
  }
  const legacyRelPath = 'docs/implementation/current-slice-notes.md';
  const legacyAbsPath = path.join(targetRoot, legacyRelPath);
  if (fs.existsSync(legacyAbsPath)) {
    const legacyText = readText(legacyAbsPath);
    if (notesMatchSliceId(legacyText, sliceId)) {
      writeTextAtomic(absPath, legacyText.endsWith('\n') ? legacyText : `${legacyText}\n`);
      return { relPath, absPath };
    }
  }
  return { relPath, absPath };
}

function architectureBaselineRelPathForSlice(sliceId) {
  const normalizedSliceId = String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  return `docs/architecture/${normalizedSliceId}-baseline.md`;
}

function architectureBaselinePathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, architectureBaselineRelPathForSlice(sliceId));
}

function architectureBaselineMatchesSliceId(baselineText, sliceId) {
  return new RegExp(`^Scope:\\s.*\\b${String(sliceId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'm').test(String(baselineText || ''));
}

function ensureSliceArchitectureBaselinePath(targetRoot, sliceId) {
  const relPath = architectureBaselineRelPathForSlice(sliceId);
  const absPath = architectureBaselinePathForSlice(targetRoot, sliceId);
  if (fs.existsSync(absPath)) {
    return { relPath, absPath };
  }
  const legacyRelPath = 'docs/architecture/baseline.md';
  const legacyAbsPath = path.join(targetRoot, legacyRelPath);
  if (fs.existsSync(legacyAbsPath)) {
    const legacyText = readText(legacyAbsPath);
    if (architectureBaselineMatchesSliceId(legacyText, sliceId)) {
      writeTextAtomic(absPath, legacyText.endsWith('\n') ? legacyText : `${legacyText}\n`);
      return { relPath, absPath };
    }
  }
  return { relPath, absPath };
}

function deriveImplementationTargets(slice) {
  const slug = slugifySliceTitle(slice.title);
  const scopeHints = String([slice.title, slice.objective, ...(slice.in_scope || [])].join(' ')).toLowerCase();
  const targets = [];
  targets.push(`src/features/${slug}/`);
  targets.push(`src/routes/${slug}*`);
  targets.push(`tests/${slug}/`);
  if (scopeHints.includes('persist') || scopeHints.includes('profile') || scopeHints.includes('data')) {
    targets.push('supabase/migrations/ (if schema change is required)');
  }
  return [...new Set(targets)];
}

function renderImplementationNotes({ slice, statusLabel, fileTargets, verificationSummary, nextSteps, generatedAt, changedFiles = [], executionNotes = [] }) {
  const completedScope = statusLabel === 'Completed'
    ? (slice.in_scope || []).map((item) => `- ${item}`)
    : ['- Not closed yet. Use this section to track completed items during implementation.'];
  const contextLines = [
    ...((slice.dependencies || []).map((d) => `- ${d}`)),
    ...((slice.in_scope || []).map((d) => `- In scope: ${d}`)),
  ];
  const lines = [
    '# Current Slice Implementation Notes',
    '',
    `Date: \`${String(generatedAt).slice(0,10)}\``,
    `Slice: \`${slice.id} - ${slice.title}\``,
    `Status: \`${statusLabel}\``,
    '',
    '## 1. Handoff Context',
    ...(contextLines.length > 0 ? contextLines : ['- No additional handoff context recorded.']),
    '',
    '## 2. Slice Objective',
    '',
    `${slice.objective}`,
    '',
    '## 3. File and Module Targets',
    ...fileTargets.map((t) => `- ${t}`),
    '',
    '## 4. Completed Scope',
    ...completedScope,
    '',
    '## 5. Changed Files',
    ...(changedFiles.length > 0 ? changedFiles.map((f) => `- ${f}`) : ['- No code files recorded yet.']),
    '',
    '## 6. Verification Evidence Summary',
    ...verificationSummary.map((v) => `- ${v}`),
    '',
    '## 7. Execution Notes',
    ...(executionNotes.length > 0 ? executionNotes.map((n) => `- ${n}`) : ['- No execution notes recorded.']),
    '',
    '## 8. Next Execution Steps',
    ...nextSteps.map((s, i) => `${i + 1}. ${s}`),
    '',
  ];
  return lines.join('\n');
}

function updateBacklogAndCurrentSliceForActive({ targetRoot, activeSlice, slices, generatedAt }) {
  const fabricManifest = loadManifest();
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
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
}

function updateManifestActiveSliceState({ targetRoot, activeSlice, generatedAt, currentMode = 'delivery' }) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  let manifestText = readText(manifestPath);
  manifestText = setSectionScalar(manifestText, 'status', 'active_slice', quoteYamlString(activeSlice.id));
  manifestText = setSectionScalar(manifestText, 'status', 'active_slice_state', quoteYamlString(activeSlice.status));
  manifestText = setSectionScalar(manifestText, 'status', 'active_milestone', quoteYamlString(activeSlice.milestone));
  manifestText = setSectionScalar(manifestText, 'operating_model', 'current_mode', quoteYamlString(currentMode));
  manifestText = setTopLevelScalar(manifestText, 'last_updated_utc', quoteYamlString(generatedAt));
  if (!manifestText.endsWith('\n')) {
    manifestText = `${manifestText}\n`;
  }
  writeTextAtomic(manifestPath, manifestText);
}

function coderPrepareCurrentSlice({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run coder:prepare-current-slice: missing docs/product/current-slice.yaml');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  const { relPath: baselineRelPath, absPath: baselinePath } = ensureSliceArchitectureBaselinePath(targetRoot, currentSlice.id);
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Cannot run coder:prepare-current-slice: missing ${baselineRelPath}; run architect:generate-current-slice-baseline first`);
  }
  const { relPath: uxRelPath, absPath: uxPath } = ensureSliceUxFlowPath(targetRoot, currentSlice.id);
  if (!fs.existsSync(uxPath)) {
    throw new Error(`Cannot run coder:prepare-current-slice: missing ${uxRelPath}; run uiux:generate-current-slice-flow first`);
  }
  const semanticContractRelPath = semanticUxContractRelPathForSlice(currentSlice.id);
  if (!fs.existsSync(path.join(targetRoot, semanticContractRelPath))) {
    throw new Error(`Cannot run coder:prepare-current-slice: missing ${semanticContractRelPath}; run uiux:generate-current-slice-flow first`);
  }
  assertDesignSystemReadyForSlice(targetRoot, currentSlice.id, 'coder:prepare-current-slice');
  const { relPath: implementationNotesRelPath, absPath: implementationNotesPath } = ensureSliceImplementationNotesPath(targetRoot, currentSlice.id);
  assertNoPlaceholdersInArtifact(baselineRelPath, readText(baselinePath));
  const uxFlowText = readText(uxPath);
  assertNoPlaceholdersInArtifact(uxRelPath, uxFlowText);
  const fileTargets = deriveImplementationTargets(currentSlice);
  const generatedAt = new Date().toISOString();
  const fabricManifest = loadManifest();
  const implHeader = metadataHeader(
    implementationNotesRelPath,
    'templates/implementation-notes-template.md',
    fabricManifest.fabric_version,
    generatedAt,
  );
  const notesBody = renderImplementationNotes({
    slice: currentSlice,
    statusLabel: 'In progress',
    fileTargets,
    verificationSummary: [
      'Implementation preparation completed; coding can begin against the active slice contract.',
      'Architecture baseline, UX flow, semantic UX contract, and design-system contracts are finalized and placeholder-free.',
    ],
    nextSteps: [
      'Implement the slice against the file/module targets above.',
      'Record any scope deviations before closeout.',
      'Generate and review Storybook stories before semantic UX review and closeout.',
      'Run validate/doctor/gate before closing the slice.',
    ],
    generatedAt,
  });
  writeTextAtomic(implementationNotesPath, `${implHeader}${notesBody}`);
  const checklistPath = writeCurrentSliceUserChecklist({
    targetRoot,
    slice: currentSlice,
    uxFlowText,
    implementationNotesText: `${implHeader}${notesBody}`,
  });

  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  const slices = parseBacklogSlices(readText(backlogPath));
  const updatedSlices = slices.map((slice) => slice.id === currentSlice.id ? { ...slice, status: 'in_progress' } : slice);
  const activeSlice = { ...currentSlice, status: 'in_progress', milestone: `${currentSlice.id}_implementation` };
  updateBacklogAndCurrentSliceForActive({ targetRoot, activeSlice, slices: updatedSlices, generatedAt });
  updateManifestActiveSliceState({ targetRoot, activeSlice, generatedAt });

  console.log('fabric coder:prepare-current-slice: OK');
  console.log(`- scope: ${activeSlice.id} ${activeSlice.title}`);
  console.log(`- wrote: ${implementationNotesRelPath}`);
  console.log(`- wrote: ${path.relative(targetRoot, checklistPath)}`);
  console.log(`- file/module targets: ${String(fileTargets.length)}`);
  console.log('- current slice status: in_progress');
}


function isGeneratedOrMissing(outPath) {
  if (!fs.existsSync(outPath)) {
    return true;
  }
  return isGeneratedFile(readText(outPath));
}

function writeManagedFile(outPath, content, { force = false } = {}) {
  if (fs.existsSync(outPath) && !force && !isGeneratedOrMissing(outPath)) {
    throw new Error(`Refusing to overwrite non-generated file without --force: ${path.relative(process.cwd(), outPath)}`);
  }
  ensureDir(outPath);
  fs.writeFileSync(outPath, content, 'utf8');
}

function ensurePackageJsonWithAppScripts(targetRoot, valuesPath) {
  return ensureReactViteStorybookPackageJson(targetRoot, valuesPath);
}

function implementationNotesContainsChangedFiles(notesText) {
  return /## 5\. Changed Files[\s\S]*?^-\s+/m.test(notesText);
}

function requiredImplementationTargets(fileTargets) {
  return (fileTargets || [])
    .map((target) => String(target || '').trim())
    .filter((target) => target.length > 0 && !target.includes('(if schema change is required)'));
}

function listFilesRecursively(absDir, relDir, { maxFiles = 200 } = {}) {
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    return [];
  }
  const out = [];
  const stack = [{ abs: absDir, rel: relDir.replace(/\\/g, '/').replace(/\/+$/, '') }];
  while (stack.length > 0 && out.length < maxFiles) {
    const current = stack.pop();
    const entries = fs.readdirSync(current.abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries.reverse()) {
      const childAbs = path.join(current.abs, entry.name);
      const childRel = path.posix.join(current.rel, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'build', 'coverage', '.git'].includes(entry.name)) continue;
        stack.push({ abs: childAbs, rel: childRel });
      } else if (entry.isFile()) {
        out.push(childRel);
        if (out.length >= maxFiles) break;
      }
    }
  }
  return [...new Set(out)].sort();
}

function implementationArtifactEvidence(targetRoot, requiredTargets) {
  return requiredTargets.map((target) => ({
    target,
    artifacts: artifactsForTarget(targetRoot, target),
  }));
}

function missingImplementationArtifactTargets(targetRoot, requiredTargets) {
  return implementationArtifactEvidence(targetRoot, requiredTargets)
    .filter((entry) => entry.artifacts.length === 0)
    .map((entry) => entry.target);
}

function artifactsForTarget(targetRoot, targetPattern) {
  const normalized = String(targetPattern).trim();
  if (!normalized) {
    return [];
  }
  if (normalized.endsWith('/')) {
    const dirPath = path.join(targetRoot, normalized);
    return listFilesRecursively(dirPath, normalized, { maxFiles: 200 });
  }
  if (normalized.includes('*')) {
    const prefix = normalized.split('*')[0];
    const baseDir = path.dirname(prefix);
    const baseNamePrefix = path.basename(prefix);
    const absoluteBaseDir = path.join(targetRoot, baseDir === '.' ? '' : baseDir);
    if (fs.existsSync(absoluteBaseDir) && fs.statSync(absoluteBaseDir).isDirectory()) {
      const matches = fs.readdirSync(absoluteBaseDir).filter((name) => name.startsWith(baseNamePrefix));
      if (matches.length > 0) {
        return matches.map((name) => path.posix.join(baseDir === '.' ? '' : baseDir.replace(/\\/g, '/'), name));
      }
    }
    return [];
  }
  const abs = path.join(targetRoot, normalized);
  if (fs.existsSync(abs)) {
    return [normalized];
  }
  return [];
}

function targetPatternMatchesPath(targetPattern, relPath) {
  const normalizedTarget = String(targetPattern).trim();
  const normalizedRelPath = String(relPath).replace(/\\/g, '/').trim();
  if (!normalizedTarget || !normalizedRelPath) {
    return false;
  }
  if (normalizedTarget.endsWith('/')) {
    return normalizedRelPath.startsWith(normalizedTarget);
  }
  if (normalizedTarget.includes('*')) {
    const prefix = normalizedTarget.split('*')[0];
    const baseDir = path.posix.dirname(prefix);
    const baseNamePrefix = path.posix.basename(prefix);
    const relDir = path.posix.dirname(normalizedRelPath);
    const relBase = path.posix.basename(normalizedRelPath);
    return relDir === baseDir && relBase.startsWith(baseNamePrefix);
  }
  return normalizedRelPath === normalizedTarget;
}

function extractChangedFilesFromImplementationNotes(notesText) {
  const lines = String(notesText || '').split('\n');
  const out = [];
  let inChangedFilesSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inChangedFilesSection && /^##\s*5\.\s*Changed Files\s*$/i.test(trimmed)) {
      inChangedFilesSection = true;
      continue;
    }
    if (!inChangedFilesSection) {
      continue;
    }
    if (/^##\s+\d+\.\s+/i.test(trimmed)) {
      break;
    }
    const match = line.match(/^\s*-\s+(.*)$/);
    if (match && String(match[1]).trim().length > 0) {
      out.push(String(match[1]).trim());
    }
  }
  return [...new Set(out)];
}

function checklistPathForSlice(sliceId) {
  const normalizedSliceId = String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
  return `docs/testing/${normalizedSliceId}-user-checklist.md`;
}

function sectionBodyByHeading(markdownText, headingPattern) {
  const lines = String(markdownText || '').replace(/\r\n?/g, '\n').split('\n');
  const startIndex = lines.findIndex((line) => headingPattern.test(line));
  if (startIndex < 0) return '';
  const out = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (/^\s*##\s+/.test(line)) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

function parseChecklistResultState(checklistText) {
  const hasResultSection = /^\s*##\s+Result\s*$/im.test(String(checklistText || ''));
  const resultBody = sectionBodyByHeading(checklistText, /^\s*##\s+Result\s*$/i);
  if (!hasResultSection) return 'missing_result_section';
  if (!resultBody) return 'unresolved';

  const explicitStatus = resultBody.match(/^\s*Status\s*:\s*(Pass|Fail|Pending)\s*$/im);
  if (explicitStatus) {
    const value = explicitStatus[1].toLowerCase();
    return value === 'pending' ? 'unresolved' : value;
  }
  if (/^\s*-\s*Pass\s*\/\s*Fail\b/im.test(resultBody)) return 'unresolved';
  if (/^\s*-\s*Fail\b/im.test(resultBody)) return 'fail';
  if (/^\s*-\s*Pass\b/im.test(resultBody)) return 'pass';
  return 'unresolved';
}

function parseChecklistSliceMetadata(checklistText) {
  const body = sectionBodyByHeading(checklistText, /^\s*##\s+Slice\s*$/i);
  const idMatch = body.match(/^\s*-\s*ID\s*:\s*([^\n]+)\s*$/im);
  const titleMatch = body.match(/^\s*-\s*Title\s*:\s*([^\n]+)\s*$/im);
  return {
    id: idMatch ? String(idMatch[1] || '').trim() : '',
    title: titleMatch ? String(titleMatch[1] || '').trim() : '',
  };
}

function parseExpectedResultLines(checklistText) {
  const body = sectionBodyByHeading(checklistText, /^\s*##\s+Expected results\s*$/i);
  if (!body) return [];
  const lines = String(body || '').replace(/\r\n?/g, '\n').split('\n');
  return lines
    .map((line) => line.match(/^\s*-\s+(.*)\s*$/)?.[1] || '')
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function parseWhatToTestLines(checklistText) {
  const body = sectionBodyByHeading(checklistText, /^\s*##\s+What to test\s*$/i);
  if (!body) return [];
  const lines = String(body || '').replace(/\r\n?/g, '\n').split('\n');
  return lines
    .map((line) => line.match(/^\s*\d+[.)]\s+(.*)\s*$/)?.[1] || '')
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function isGenericExpectedResultLine(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  const genericPatterns = [
    /^app loads without blank screen or runtime error\b/,
    /^the onboarding entry screen is visible and clear\b/,
  ];
  return genericPatterns.some((pattern) => pattern.test(normalized));
}

function isGenericInvariantLine(value) {
  return isGenericExpectedResultLine(value);
}

function collectCarryForwardInvariants({ targetRoot, activeSliceId }) {
  const testingDir = path.join(targetRoot, 'docs/testing');
  if (!fs.existsSync(testingDir)) return [];
  const files = fs.readdirSync(testingDir)
    .filter((name) => /^SL-[A-Za-z0-9_-]+-user-checklist\.md$/i.test(name))
    .sort();

  const invariants = [];
  for (const file of files) {
    const absPath = path.join(testingDir, file);
    const text = readText(absPath);
    const resultState = parseChecklistResultState(text);
    if (resultState !== 'pass') continue;
    const meta = parseChecklistSliceMetadata(text);
    const sliceId = String(meta.id || '').trim();
    if (!sliceId || sliceId === String(activeSliceId || '').trim()) continue;
    const expected = parseExpectedResultLines(text)
      .filter((line) => !isGenericInvariantLine(line));
    const whatToTest = parseWhatToTestLines(text)
      .filter((line) => !isGenericInvariantLine(line));
    const assertions = [...new Set([...expected, ...whatToTest])].slice(0, 8);
    if (assertions.length === 0) continue;
    invariants.push({
      sliceId,
      title: meta.title || sliceId,
      assertions,
    });
  }
  return invariants;
}

function validateCarryForwardRegressionEvidence({ targetRoot, currentSlice, invariants }) {
  if (!Array.isArray(invariants) || invariants.length === 0) {
    return { issues: [], testRelPath: '' };
  }
  const testRelPath = `tests/${slugifySliceTitle(currentSlice?.title || '')}/carry-forward-invariants.test.mjs`;
  const testAbsPath = path.join(targetRoot, testRelPath);
  if (!fs.existsSync(testAbsPath)) {
    return {
      testRelPath,
      issues: [`missing carry-forward regression evidence file: ${testRelPath}`],
    };
  }
  const text = readText(testAbsPath);
  const missingSlices = invariants
    .map((entry) => String(entry.sliceId || '').trim())
    .filter(Boolean)
    .filter((sliceId) => !text.includes(sliceId));
  if (missingSlices.length > 0) {
    return {
      testRelPath,
      issues: [
        `carry-forward regression file ${testRelPath} does not reference prior passed slices: ${missingSlices.join(', ')}`,
      ],
    };
  }
  return { issues: [], testRelPath };
}

function collectPassedSliceOnboardingInvariantSources({ targetRoot, activeSliceId }) {
  const testingDir = path.join(targetRoot, 'docs/testing');
  if (!fs.existsSync(testingDir)) return [];
  const files = fs.readdirSync(testingDir)
    .filter((name) => /^SL-[A-Za-z0-9_-]+-user-checklist\.md$/i.test(name))
    .sort();
  const matches = [];
  const onboardingInvariantPattern = /^the onboarding entry screen is visible and clear\b/i;
  for (const file of files) {
    const absPath = path.join(testingDir, file);
    const text = readText(absPath);
    const resultState = parseChecklistResultState(text);
    if (resultState !== 'pass') continue;
    const meta = parseChecklistSliceMetadata(text);
    const sliceId = String(meta.id || '').trim();
    if (!sliceId || sliceId === String(activeSliceId || '').trim()) continue;
    const expected = parseExpectedResultLines(text);
    if (expected.some((line) => onboardingInvariantPattern.test(String(line || '').trim().toLowerCase()))) {
      matches.push({ sliceId, checklistRelPath: `docs/testing/${file}` });
    }
  }
  return matches;
}

function currentChecklistHasOnboardingEntryOverride(checklistText) {
  const text = String(checklistText || '');
  const overridePatterns = [
    /carry-forward override:\s*onboarding default entry/i,
    /onboarding default entry override:\s*true/i,
    /fabric_onboarding_entry_override\s*:\s*true/i,
  ];
  return overridePatterns.some((pattern) => pattern.test(text));
}

function resolveRelativeImportCandidates(fromRelPath, importSpec) {
  const fromDir = path.posix.dirname(fromRelPath.replace(/\\/g, '/'));
  const resolvedNoExt = path.posix.normalize(path.posix.join(fromDir, importSpec));
  return [
    `${resolvedNoExt}.jsx`,
    `${resolvedNoExt}.tsx`,
    `${resolvedNoExt}.js`,
    `${resolvedNoExt}.ts`,
    `${resolvedNoExt}/index.jsx`,
    `${resolvedNoExt}/index.tsx`,
    `${resolvedNoExt}/index.js`,
    `${resolvedNoExt}/index.ts`,
  ].map((candidate) => candidate.replace(/^\.\/+/, ''));
}

function parseRelativeImportsByAlias(moduleText) {
  const map = new Map();
  const importPattern = /^\s*import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"];?/gm;
  let match = importPattern.exec(String(moduleText || ''));
  while (match) {
    const alias = String(match[1] || '').trim();
    const spec = String(match[2] || '').trim();
    if (alias && spec.startsWith('.')) {
      map.set(alias, spec);
    }
    match = importPattern.exec(String(moduleText || ''));
  }
  return map;
}

function parseRenderedComponentAliases(moduleText) {
  const aliases = new Set();
  const jsxTagPattern = /<([A-Z][A-Za-z0-9_]*)\b/g;
  let tagMatch = jsxTagPattern.exec(String(moduleText || ''));
  while (tagMatch) {
    aliases.add(String(tagMatch[1] || '').trim());
    tagMatch = jsxTagPattern.exec(String(moduleText || ''));
  }
  return [...aliases];
}

function resolveMountedModulesForRelPath({ targetRoot, moduleRelPath }) {
  const moduleAbsPath = path.join(targetRoot, moduleRelPath);
  if (!fs.existsSync(moduleAbsPath)) return [];
  let text = '';
  try {
    text = readText(moduleAbsPath);
  } catch (_) {
    return [];
  }
  const importsByAlias = parseRelativeImportsByAlias(text);
  const renderedAliases = parseRenderedComponentAliases(text);
  const out = [];
  for (const alias of renderedAliases) {
    const spec = importsByAlias.get(alias);
    if (!spec) continue;
    const candidates = resolveRelativeImportCandidates(moduleRelPath, spec);
    const existing = candidates.find((relPath) => fs.existsSync(path.join(targetRoot, relPath)));
    if (existing) out.push(existing);
  }
  return [...new Set(out)];
}

function resolveDefaultEntryRuntimeModules(targetRoot) {
  const entries = ['src/main.jsx', 'src/main.tsx', 'src/main.js', 'src/main.ts'];
  const mainEntryRelPath = entries.find((relPath) => fs.existsSync(path.join(targetRoot, relPath))) || '';
  if (!mainEntryRelPath) return { mainEntryRelPath: '', modules: [] };
  const visited = new Set();
  const queue = [mainEntryRelPath];
  const modules = [];
  const maxDepthModules = 12;
  while (queue.length > 0 && modules.length < maxDepthModules) {
    const next = queue.shift();
    if (!next || visited.has(next)) continue;
    visited.add(next);
    modules.push(next);
    const children = resolveMountedModulesForRelPath({ targetRoot, moduleRelPath: next });
    for (const child of children) {
      if (!visited.has(child)) queue.push(child);
    }
  }
  return { mainEntryRelPath, modules };
}

function moduleHasOnboardingEntrySignal({ targetRoot, moduleRelPath }) {
  const normalizedPath = String(moduleRelPath || '').replace(/\\/g, '/');
  if (
    normalizedPath.endsWith('src/routes/self-onboarding-to-first-dashboard.jsx')
    || normalizedPath.endsWith('src/routes/self-onboarding-to-first-dashboard.tsx')
    || normalizedPath.endsWith('src/features/self-onboarding-to-first-dashboard/SelfOnboardingToFirstDashboard.jsx')
    || normalizedPath.endsWith('src/features/self-onboarding-to-first-dashboard/SelfOnboardingToFirstDashboard.tsx')
  ) {
    return true;
  }
  const absPath = path.join(targetRoot, moduleRelPath);
  if (!fs.existsSync(absPath)) return false;
  const text = readText(absPath);
  const importsByAlias = parseRelativeImportsByAlias(text);
  const renderedAliases = parseRenderedComponentAliases(text);
  for (const alias of renderedAliases) {
    if (/selfonboardingtofirstdashboard/i.test(alias)) return true;
    const spec = importsByAlias.get(alias);
    if (spec && /self-onboarding-to-first-dashboard\/(?:SelfOnboardingToFirstDashboard|index|self-onboarding-to-first-dashboard)/i.test(spec)) return true;
  }
  return false;
}

function validateDefaultEntryOnboardingCarryForward({ targetRoot, currentSliceId, checklistText }) {
  const inheritedSources = collectPassedSliceOnboardingInvariantSources({ targetRoot, activeSliceId: currentSliceId });
  if (inheritedSources.length === 0) {
    return { issues: [], inheritedSources: [], analyzedModules: [] };
  }
  if (currentChecklistHasOnboardingEntryOverride(checklistText)) {
    return { issues: [], inheritedSources, analyzedModules: [] };
  }
  const { mainEntryRelPath, modules } = resolveDefaultEntryRuntimeModules(targetRoot);
  if (!mainEntryRelPath) {
    return {
      issues: [
        'cannot verify onboarding default entry invariant: missing src/main.* entry file',
      ],
      inheritedSources,
      analyzedModules: [],
    };
  }
  const hasSignal = modules.some((relPath) => moduleHasOnboardingEntrySignal({ targetRoot, moduleRelPath: relPath }));
  if (hasSignal) {
    return { issues: [], inheritedSources, analyzedModules: modules };
  }
  return {
    issues: [
      `default runtime entry no longer shows an onboarding-capable surface (analyzed: ${modules.join(', ') || mainEntryRelPath}). Add onboarding as default entry or declare an explicit checklist override line: "Carry-forward override: onboarding default entry".`,
    ],
    inheritedSources,
    analyzedModules: modules,
  };
}

function parseManualQaFindings(checklistText) {
  const findingsBody = sectionBodyByHeading(checklistText, /^\s*##\s+Manual QA Findings\s*$/i);
  if (!findingsBody) return [];
  const normalized = findingsBody.replace(/\r\n?/g, '\n');
  const headingRegex = /^###\s+Finding\s+\d+.*$/gim;
  const matches = [...normalized.matchAll(headingRegex)];

  function cleanFieldText(value) {
    return String(value || '')
      .split('\n')
      .map((line) => line.replace(/^\s*-\s?/, '').trimEnd())
      .join('\n')
      .replace(/^\s*None\.\s*$/gim, '')
      .trim();
  }

  function field(chunk, label) {
    const lines = String(chunk || '').replace(/\r\n?/g, '\n').split('\n');
    const startIndex = lines.findIndex((line) => new RegExp(`^\\s*${label}:\\s*$`, 'i').test(line));
    if (startIndex < 0) return '';
    const out = [];
    for (const line of lines.slice(startIndex + 1)) {
      if (/^\s*(?:Classification|Finding|Expected|Observed|Required repair):\s*$/i.test(line)) break;
      out.push(line);
    }
    return cleanFieldText(out.join('\n'));
  }


  if (matches.length === 0) {
    const trimmed = cleanFieldText(normalized);
    return trimmed ? [{ index: 1, classification: 'unspecified', finding: trimmed, expected: '', observed: '', required_repair: '' }] : [];
  }

  const findings = [];
  for (let i = 0; i < matches.length; i += 1) {
    const startOffset = matches[i].index + matches[i][0].length;
    const endOffset = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    const chunk = normalized.slice(startOffset, endOffset).trim();
    const checked = chunk.match(/^- \[x\]\s*([ABC])\./im);
    const finding = field(chunk, 'Finding');
    const expected = field(chunk, 'Expected');
    const observed = field(chunk, 'Observed');
    const requiredRepair = field(chunk, 'Required repair');
    const hasContent = [finding, expected, observed, requiredRepair]
      .some((value) => String(value || '').trim() && String(value || '').trim() !== '-');
    if (!hasContent) continue;
    findings.push({
      index: findings.length + 1,
      classification: checked ? checked[1] : 'unspecified',
      finding,
      expected,
      observed,
      required_repair: requiredRepair,
    });
  }
  return findings;
}

function collectImplementedArtifacts(targetRoot, fileTargets) {
  const found = [];
  for (const target of requiredImplementationTargets(fileTargets)) {
    const matches = artifactsForTarget(targetRoot, target);
    found.push(...matches);
  }
  return [...new Set(found)].sort();
}

function renderManagedSourceHeader(relPath) {
  const manifest = loadManifest();
  const generatedAt = new Date().toISOString();
  return `/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs\n * target: ${relPath}\n * fabric_version: ${manifest.fabric_version}\n * generated_at_utc: ${generatedAt}\n */\n`;
}

function renderManagedHtmlHeader(relPath) {
  const manifest = loadManifest();
  const generatedAt = new Date().toISOString();
  return `<!-- generated_from: fabric/company/v1/runtime/commands/runtime.mjs | target: ${relPath} | fabric_version: ${manifest.fabric_version} | generated_at_utc: ${generatedAt} -->\n`;
}


function addIfMissing(object, key, value) {
  if (!object[key]) {
    object[key] = value;
    return true;
  }
  return false;
}

function ensureReactViteStorybookPackageJson(targetRoot, valuesPath) {
  const values = loadValuesIfPresent(valuesPath) || {};
  const packageJsonPath = path.join(targetRoot, 'package.json');
  const createdPackageJson = ensurePackageJson(packageJsonPath, values);
  const pkg = JSON.parse(readText(packageJsonPath));
  pkg.private = true;
  pkg.type = 'module';
  pkg.scripts = pkg.scripts || {};
  const desiredScripts = {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
    test: pkg.scripts.test || 'node --test',
    storybook: 'storybook dev -p 6006',
    'build-storybook': 'storybook build',
    'test:storybook': 'vitest --config vitest.config.ts',
  };
  for (const [name, command] of Object.entries(desiredScripts)) {
    if (!pkg.scripts[name]) pkg.scripts[name] = command;
  }
  pkg.dependencies = pkg.dependencies || {};
  addIfMissing(pkg.dependencies, 'react', '^18.3.1');
  addIfMissing(pkg.dependencies, 'react-dom', '^18.3.1');
  pkg.devDependencies = pkg.devDependencies || {};
  addIfMissing(pkg.devDependencies, '@vitejs/plugin-react', '^4.3.4');
  addIfMissing(pkg.devDependencies, 'vite', '^5.4.10');
  addIfMissing(pkg.devDependencies, 'typescript', '^5.6.3');
  addIfMissing(pkg.devDependencies, 'vitest', '^2.1.8');
  addIfMissing(pkg.devDependencies, 'storybook', '^10.3.6');
  addIfMissing(pkg.devDependencies, '@storybook/react-vite', '^10.3.6');
  addIfMissing(pkg.devDependencies, '@storybook/addon-docs', '^10.3.6');
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return { createdPackageJson, packageJsonPath };
}

function ensureReactViteStorybookScaffold(targetRoot, valuesPath, { force = false } = {}) {
  ensureReactViteStorybookPackageJson(targetRoot, valuesPath);
  const files = new Map();
  files.set('index.html', `${renderManagedHtmlHeader('index.html')}<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fabric App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`);
  files.set('src/main.jsx', `${renderManagedSourceHeader('src/main.jsx')}import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`);
  files.set('src/App.jsx', `${renderManagedSourceHeader('src/App.jsx')}export default function App() {
  return (
    <main className="app-shell">
      <section className="app-panel hero">
        <p className="eyebrow">Fabric app factory</p>
        <h1>App shell ready</h1>
        <p className="lede">Run the current slice workflow to generate product-specific screens and Storybook stories.</p>
      </section>
    </main>
  );
}
`);
  files.set('src/styles.css', `${renderManagedSourceHeader('src/styles.css')}:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
  background: #f8fafc;
}

* { box-sizing: border-box; }
body { margin: 0; }
button, input, select { font: inherit; }

.app-shell {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.hero { background: linear-gradient(135deg, #ecfeff, #eff6ff); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: #0f766e; margin: 0 0 8px; }
.lede { color: #334155; margin-top: 8px; }
`);
  files.set('vite.config.js', `${renderManagedSourceHeader('vite.config.js')}import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`);
  files.set('vitest.config.ts', `${renderManagedSourceHeader('vitest.config.ts')}import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
`);
  files.set('tsconfig.json', `${renderManagedSourceHeader('tsconfig.json')}{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", ".storybook", "vite.config.js", "vitest.config.ts"]
}
`);
  files.set('.storybook/main.ts', `${renderManagedSourceHeader('.storybook/main.ts')}import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
`);
  files.set('.storybook/preview.ts', `${renderManagedSourceHeader('.storybook/preview.ts')}import type { Preview } from '@storybook/react-vite';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
`);

  const changed = ['package.json'];
  for (const [relPath, content] of files.entries()) {
    const outPath = path.join(targetRoot, relPath);
    if (!force && fs.existsSync(outPath) && !isGeneratedOrMissing(outPath)) {
      // Preserve existing user-owned app files during scaffold sync.
      continue;
    }
    if (relPath === 'src/styles.css' && fs.existsSync(outPath) && readText(outPath) !== content) {
      continue;
    }
    if (fs.existsSync(outPath) && readText(outPath) === content) continue;
    writeManagedFile(outPath, content, { force });
    changed.push(relPath);
  }
  return changed;
}

const DEMO_HEALTH_PLAN_DEFAULTS = Object.freeze({
  today: [
    'Take a 15-minute walk after your next meal.',
    'Schedule a blood pressure check this week.',
    'Set a hydration reminder for today.',
  ],
  soon: [
    'Book a dental cleaning within the next 2 months.',
    'Plan a preventive blood panel with your clinician.',
    'Review sleep routine and target 7-8 hours nightly.',
  ],
  later: [
    'Discuss age-appropriate screening timelines at your next annual visit.',
    'Review vaccination status before flu season.',
    'Set quarterly reminders to revisit your health plan.',
  ],
});

const IMPLEMENTATION_LEAK_PATTERN = /\b(react|vite|api|endpoint|scaffold|slice|acceptance|criteria|backend|frontend|persistence|persist|schema|rule[\s_-]?engine|rule[\s_-]?version|httponly|cookie|integration\s+tests?|smoke\s+tests?|dashboard\s+payload|generated_action|profile\s+summary\s+placeholder|next-action\s+card|bucket\s+assignment|viewports?|idempotent|read\s+model|status\s+fields?|cadenceLabel|rationaleShort)\b/i;
const INTERNAL_PROCESS_LEAK_PATTERN = /\b(first[-\s]?run|routing|onboarding|dashboard|single-screen|domain\s+validation|deterministic|generator|submit\s+flow|mobile\s+smoke|walkthrough|coverage|automated|verification|document\s+the|customer\s+review\s+path|stable\s+ids?|non-empty)\b/i;
const CUSTOMER_ACTION_VERB_PATTERN = /\b(take|schedule|book|set|review|plan|discuss|track|check|walk|exercise|drink|sleep|visit|prepare|refill|monitor)\b/i;
const HEALTH_CONTEXT_PATTERN = /\b(health|blood|pressure|hydration|water|sleep|dental|clinician|doctor|screening|vaccine|vaccination|flu|walk|exercise|activity|checkup|preventive|wellness|medication|meal)\b/i;

function isCustomerSafeDemoItem(text) {
  if (!text || text.length < 8 || text.length > 160) return false;
  if (IMPLEMENTATION_LEAK_PATTERN.test(text)) return false;
  if (INTERNAL_PROCESS_LEAK_PATTERN.test(text)) return false;
  if (!CUSTOMER_ACTION_VERB_PATTERN.test(text)) return false;
  if (!HEALTH_CONTEXT_PATTERN.test(text)) return false;
  return true;
}

function sanitizeDemoItems(candidateItems, fallbackItems) {
  const safe = [];
  const seen = new Set();
  const source = Array.isArray(candidateItems) ? candidateItems : [];
  for (const item of source) {
    const normalized = String(item || '').replace(/\s+/g, ' ').trim();
    if (!isCustomerSafeDemoItem(normalized)) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    safe.push(normalized);
    if (safe.length >= 6) break;
  }
  if (safe.length >= 2) return safe;
  return Array.isArray(fallbackItems) ? [...fallbackItems] : [];
}

function buildGeneratedAppFiles(currentSlice, playbookOverride = null) {
  const playbook = playbookOverride || {};
  const titleJson = JSON.stringify(playbook.appTitle || currentSlice.title || 'Current Slice');
  const objectiveJson = JSON.stringify(playbook.appObjective || currentSlice.objective || 'Deliver the current slice.');
  const acceptanceJson = JSON.stringify(
    Array.isArray(playbook.acceptanceChecks) && playbook.acceptanceChecks.length > 0
      ? playbook.acceptanceChecks
      : (currentSlice.acceptance_criteria || []),
    null,
    2,
  );
  const sliceSlug = slugifySliceTitle(currentSlice.title);
  const todayItems = JSON.stringify(
    sanitizeDemoItems(playbook.todayItems, DEMO_HEALTH_PLAN_DEFAULTS.today),
    null,
    2,
  );
  const soonItems = JSON.stringify(
    sanitizeDemoItems(playbook.soonItems, DEMO_HEALTH_PLAN_DEFAULTS.soon),
    null,
    2,
  );
  const laterItems = JSON.stringify(
    sanitizeDemoItems(playbook.laterItems, DEMO_HEALTH_PLAN_DEFAULTS.later),
    null,
    2,
  );

  const files = new Map();
  files.set('index.html', `${renderManagedHtmlHeader('index.html')}<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Health OS MVP</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`);
  files.set('src/main.jsx', `${renderManagedSourceHeader('src/main.jsx')}import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.jsx';\nimport './styles.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n);\n`);
  files.set('src/App.jsx', `${renderManagedSourceHeader('src/App.jsx')}import React, { useMemo, useState } from 'react';\nimport { OnboardingPage } from './features/onboarding/OnboardingPage.jsx';\nimport { HealthPlanPage } from './routes/onboarding.jsx';\n\nconst seedPlan = {\n  today: ${todayItems},\n  soon: ${soonItems},\n  later: ${laterItems},\n};\n\nexport default function App() {\n  const [profile, setProfile] = useState(null);\n  const [screen, setScreen] = useState('onboarding');\n\n  const generatedPlan = useMemo(() => {\n    if (!profile) return null;\n    return {\n      today: [...seedPlan.today],\n      soon: [...seedPlan.soon],\n      later: [...seedPlan.later],\n    };\n  }, [profile]);\n\n  return screen === 'onboarding' ? (\n    <OnboardingPage\n      title={${titleJson}}\n      objective={${objectiveJson}}\n      acceptanceCriteria={${acceptanceJson}}\n      onComplete={(nextProfile) => {\n        setProfile(nextProfile);\n        setScreen('dashboard');\n      }}\n    />\n  ) : (\n    <HealthPlanPage\n      profile={profile}\n      plan={generatedPlan}\n      onReset={() => {\n        setProfile(null);\n        setScreen('onboarding');\n      }}\n    />\n  );\n}\n`);
  files.set('src/features/onboarding/OnboardingPage.jsx', `${renderManagedSourceHeader('src/features/onboarding/OnboardingPage.jsx')}import React, { useState } from 'react';\nimport { ProfileForm } from '../profile/ProfileForm.jsx';\n\nexport function OnboardingPage({ title, objective, acceptanceCriteria, onComplete }) {\n  const [familyMode, setFamilyMode] = useState(false);\n\n  return (\n    <main className="app-shell">\n      <section className="panel hero">\n        <p className="eyebrow">Longevity Health OS MVP</p>\n        <h1>{title}</h1>\n        <p className="lede">{objective}</p>\n        <div className="callout">\n          <strong>Slice promise</strong>\n          <ul>\n            {acceptanceCriteria.map((item) => (\n              <li key={item}>{item}</li>\n            ))}\n          </ul>\n        </div>\n      </section>\n\n      <section className="panel">\n        <header className="section-header">\n          <h2>Tell us a little about you</h2>\n          <p>We use this to generate an immediate health plan and dashboard priorities.</p>\n        </header>\n\n        <div className="toggle-row">\n          <button type="button" className={familyMode ? '' : 'active'} onClick={() => setFamilyMode(false)}>Only for me</button>\n          <button type="button" className={familyMode ? 'active' : ''} onClick={() => setFamilyMode(true)}>Family mode</button>\n        </div>\n\n        <ProfileForm familyMode={familyMode} onSubmit={onComplete} />\n      </section>\n    </main>\n  );\n}\n`);
  files.set('src/features/profile/ProfileForm.jsx', `${renderManagedSourceHeader('src/features/profile/ProfileForm.jsx')}import React, { useState } from 'react';\n\nexport function ProfileForm({ familyMode, onSubmit }) {\n  const [name, setName] = useState('Alex');\n  const [age, setAge] = useState('42');\n  const [gender, setGender] = useState('female');\n\n  return (\n    <form\n      className="stack"\n      onSubmit={(event) => {\n        event.preventDefault();\n        onSubmit({ name, age, gender, familyMode });\n      }}\n    >\n      <label>\n        Name\n        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />\n      </label>\n      <label>\n        Age\n        <input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="42" />\n      </label>\n      <label>\n        Gender\n        <select value={gender} onChange={(event) => setGender(event.target.value)}>\n          <option value="female">Female</option>\n          <option value="male">Male</option>\n          <option value="diverse">Diverse</option>\n        </select>\n      </label>\n      <button type="submit" className="primary">Generate my health plan</button>\n      <p className="helper">{familyMode ? 'Family mode enabled: the next slice can extend to multiple profiles.' : 'Single-profile onboarding for the MVP flow.'}</p>\n    </form>\n  );\n}\n`);
  files.set('src/routes/onboarding.jsx', `${renderManagedSourceHeader('src/routes/onboarding.jsx')}import React from 'react';\n\nexport function HealthPlanPage({ profile, plan, onReset }) {\n  return (\n    <main className="app-shell">\n      <section className="panel hero">\n        <p className="eyebrow">Customer test mode</p>\n        <h1>Hello {profile?.name || 'there'} — here is your health overview</h1>\n        <p className="lede">Age {profile?.age} · {profile?.gender} · {profile?.familyMode ? 'family mode' : 'single profile'}</p>\n        <button type="button" className="secondary" onClick={onReset}>Restart onboarding</button>\n      </section>\n\n      <section className="dashboard-grid">\n        <PriorityColumn title="Today" items={plan?.today || []} />\n        <PriorityColumn title="Soon" items={plan?.soon || []} />\n        <PriorityColumn title="Later" items={plan?.later || []} />\n      </section>\n    </main>\n  );\n}\n\nfunction PriorityColumn({ title, items }) {\n  return (\n    <section className="panel">\n      <h2>{title}</h2>\n      <ul className="priority-list">\n        {items.map((item) => (\n          <li key={item}>{item}</li>\n        ))}\n      </ul>\n    </section>\n  );\n}\n`);
  files.set('src/styles.css', `${renderManagedSourceHeader('src/styles.css')}:root {\n  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n  line-height: 1.5;\n  color: #0f172a;\n  background: #f8fafc;\n}\n\n* { box-sizing: border-box; }\nbody { margin: 0; }\nbutton, input, select { font: inherit; }\n\n.app-shell {\n  max-width: 1120px;\n  margin: 0 auto;\n  padding: 32px 20px 64px;\n  display: grid;\n  gap: 20px;\n}\n\n.panel {\n  background: white;\n  border: 1px solid #e2e8f0;\n  border-radius: 20px;\n  padding: 24px;\n  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);\n}\n\n.hero {\n  background: linear-gradient(135deg, #ecfeff, #eff6ff);\n}\n\n.eyebrow {\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  font-size: 0.75rem;\n  color: #0f766e;\n  margin: 0 0 8px;\n}\n\n.lede {\n  color: #334155;\n  margin-top: 8px;\n}\n\n.callout {\n  margin-top: 16px;\n  background: rgba(255, 255, 255, 0.72);\n  border-radius: 16px;\n  padding: 16px;\n}\n\n.callout ul, .priority-list {\n  margin: 12px 0 0;\n  padding-left: 20px;\n}\n\n.section-header h2 { margin-bottom: 4px; }\n.section-header p { margin-top: 0; color: #475569; }\n\n.toggle-row { display: flex; gap: 12px; margin: 20px 0; }\n.toggle-row button, .primary, .secondary {\n  border-radius: 12px;\n  border: 1px solid #cbd5e1;\n  padding: 12px 16px;\n  background: white;\n  cursor: pointer;\n}\n.toggle-row button.active, .primary {\n  background: #0f766e;\n  color: white;\n  border-color: #0f766e;\n}\n.secondary { margin-top: 12px; }\n.stack { display: grid; gap: 16px; }\nlabel { display: grid; gap: 8px; font-weight: 600; }\ninput, select { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }\n.helper { color: #64748b; margin: 0; }\n.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }\n\n@media (max-width: 640px) {\n  .app-shell { padding: 20px 16px 40px; }\n  .toggle-row { flex-direction: column; }\n}\n`);
  files.set('tests/onboarding/onboarding.smoke.test.mjs', `${renderManagedSourceHeader('tests/onboarding/onboarding.smoke.test.mjs')}import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst APP_SOURCE = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');\nconst LEAK_PATTERN = /\\b(first[-\\s]?run|routing|acceptance criteria|coverage|smoke walkthrough|idempotent|read model|status fields|cadenceLabel|rationaleShort|bucket rules|deterministic plan generator)\\b/i;\n\ntest('generated onboarding app shell exists', () => {\n  assert.equal(fs.existsSync(new URL('../../src/App.jsx', import.meta.url)), true);\n  assert.equal(fs.existsSync(new URL('../../src/features/onboarding/OnboardingPage.jsx', import.meta.url)), true);\n  assert.equal(fs.existsSync(new URL('../../src/routes/onboarding.jsx', import.meta.url)), true);\n});\n\ntest('dashboard seed items do not leak internal implementation text', () => {\n  assert.equal(LEAK_PATTERN.test(APP_SOURCE), false);\n});\n`);

  if (sliceSlug !== 'onboarding') {
    const featureBridgePath = `src/features/${sliceSlug}/SliceEntryBridge.jsx`;
    const routeBridgePath = `src/routes/${sliceSlug}.jsx`;
    const testBridgePath = `tests/${sliceSlug}/${sliceSlug}.smoke.test.mjs`;
    files.set(featureBridgePath, `${renderManagedSourceHeader(featureBridgePath)}import React from 'react';\nimport { OnboardingPage } from '../onboarding/OnboardingPage.jsx';\n\nexport function SliceEntryBridge(props) {\n  return <OnboardingPage {...props} />;\n}\n`);
    files.set(routeBridgePath, `${renderManagedSourceHeader(routeBridgePath)}import { HealthPlanPage } from './onboarding.jsx';\n\nexport const SliceRouteBridge = HealthPlanPage;\n`);
    files.set(testBridgePath, `${renderManagedSourceHeader(testBridgePath)}import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\ntest('generated ${sliceSlug} bridge artifacts exist', () => {\n  assert.equal(fs.existsSync(new URL('../../src/features/${sliceSlug}/SliceEntryBridge.jsx', import.meta.url)), true);\n  assert.equal(fs.existsSync(new URL('../../src/routes/${sliceSlug}.jsx', import.meta.url)), true);\n});\n`);
  }

  return files;
}

function resolveCoderLlmOutputMode(values = {}) {
  const explicitRaw = String(
    values.coder_llm_output_mode
      || values.llm_coder_output_mode
      || values.coder_llm_generation_mode
      || values.llm_coder_generation_mode
      || '',
  ).trim().toLowerCase();
  if (explicitRaw) {
    if (['source_files', 'source-files', 'source', 'code', 'codex', 'direct_code'].includes(explicitRaw)) {
      return 'source_files';
    }
    if (['playbook', 'guidance'].includes(explicitRaw)) {
      return 'playbook';
    }
  }
  return 'source_files';
}

function resolveCoderExecutionMode(values = {}) {
  const explicitRaw = String(
    values.coder_execution_mode
      || values.coder_implementation_backend
      || values.coder_backend
      || '',
  ).trim().toLowerCase();
  if (['codex', 'codex_exec', 'codex-exec', 'cli'].includes(explicitRaw)) {
    return 'codex_exec';
  }
  if (['model', 'llm', 'fabric', 'legacy', 'direct'].includes(explicitRaw)) {
    return 'model_direct';
  }
  return 'codex_exec';
}

function normalizeSliceIdForWorkOrder(sliceId) {
  return String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
}

function workOrderRelPathForSlice(sliceId) {
  return `.system/factory/work-orders/${normalizeSliceIdForWorkOrder(sliceId)}-coder-codex.md`;
}

function semanticUxRepairWorkOrderRelPathForSlice(sliceId) {
  return `docs/implementation/${normalizeSliceIdForWorkOrder(sliceId)}-semantic-ux-repair-work-order.md`;
}

function implementationRepairWorkOrderRelPathForSlice(sliceId) {
  return `docs/implementation/${normalizeSliceIdForWorkOrder(sliceId)}-implementation-repair-work-order.md`;
}

function parseJsonFile(absPath, label) {
  try {
    return JSON.parse(readText(absPath));
  } catch (error) {
    throw new Error(`Cannot parse ${label}: ${error?.message ? String(error.message) : String(error)}`);
  }
}

function normalizeFindingSeverity(finding = {}) {
  return String(finding.severity || '').trim().toLowerCase();
}

function semanticUxFindingsForRepair(review = {}, { includeWarnings = false } = {}) {
  const findings = Array.isArray(review.findings) ? review.findings : [];
  return findings.filter((finding) => {
    const severity = normalizeFindingSeverity(finding);
    if (severity === 'blocker') return true;
    return includeWarnings && severity === 'warning';
  });
}

function summarizeSemanticUxFindings(findings = []) {
  return findings.map((finding, index) => ({
    index: index + 1,
    issue_type: String(finding.issue_type || finding.type || 'semantic_issue'),
    severity: String(finding.severity || ''),
    source: String(finding.source || ''),
    confidence: String(finding.confidence || ''),
    visibility: String(finding.visibility || ''),
    file: String(finding.file || ''),
    slot: String(finding.slot || ''),
    observed: String(finding.observed || ''),
    required: String(finding.required || ''),
  }));
}

function semanticRepairAllowedPatterns({ slice, findings = [], values = {} }) {
  const allowAppShellMutation = resolveAllowAppShellMutation(values);
  const allowed = deriveCodexAllowedPaths(slice, { allowAppShellMutation });
  const referencedFiles = summarizeSemanticUxFindings(findings)
    .map((finding) => finding.file)
    .filter((relPath) => /^(src|tests)\//.test(String(relPath || '')));
  return {
    create: [...allowed.create],
    modify: [
      ...allowed.modify,
      ...referencedFiles,
      `docs/implementation/${normalizeSliceIdForWorkOrder(slice.id)}-implementation-notes.md`,
    ],
    protected: [...allowed.protected],
  };
}

function validateSemanticRepairChangedFiles({ changedFiles, slice, findings, values = {} }) {
  const allowed = semanticRepairAllowedPatterns({ slice, findings, values });
  const allowedPatterns = [...allowed.create, ...allowed.modify];
  const ignoredGeneratedArtifacts = [];
  const violations = [];

  for (const relPath of changedFiles) {
    if (String(relPath).startsWith('.system/factory/work-orders/')) continue;
    if (String(relPath) === executionLedgerRelPath()) continue;
    if (String(relPath) === semanticUxRepairWorkOrderRelPathForSlice(slice.id)) continue;

    if (isCodexGeneratedArtifact(relPath)) {
      ignoredGeneratedArtifacts.push(relPath);
      continue;
    }

    if (!pathMatchesAllowed(relPath, allowedPatterns)) {
      violations.push(relPath);
    }
  }

  return { allowed, violations, ignoredGeneratedArtifacts };
}

function implementationRepairAllowedPatterns({ slice, values = {} }) {
  const allowAppShellMutation = resolveAllowAppShellMutation(values);
  const allowed = deriveCodexAllowedPaths(slice, { allowAppShellMutation });
  const normalizedSliceId = normalizeSliceIdForWorkOrder(slice.id);
  return {
    create: [...allowed.create],
    modify: [
      ...allowed.modify,
      'tests/**',
      `docs/testing/${normalizedSliceId}-user-checklist.md`,
      `docs/implementation/${normalizedSliceId}-implementation-notes.md`,
      `docs/implementation/${normalizedSliceId}-implementation-repair-work-order.md`,
      `docs/product/current-slice.yaml`,
      `docs/ux/${normalizedSliceId}-current-slice-flow.md`,
      `docs/ux/${normalizedSliceId}-semantic-ux-contract.json`,
    ],
    protected: [...allowed.protected],
  };
}

function validateImplementationRepairChangedFiles({ changedFiles, slice, values = {} }) {
  const allowed = implementationRepairAllowedPatterns({ slice, values });
  const allowedPatterns = [...allowed.create, ...allowed.modify];
  const ignoredGeneratedArtifacts = [];
  const violations = [];

  for (const relPath of changedFiles) {
    if (String(relPath).startsWith('.system/factory/work-orders/')) continue;
    if (String(relPath) === executionLedgerRelPath()) continue;
    if (String(relPath) === implementationRepairWorkOrderRelPathForSlice(slice.id)) continue;

    if (isCodexGeneratedArtifact(relPath)) {
      ignoredGeneratedArtifacts.push(relPath);
      continue;
    }

    if (!pathMatchesAllowed(relPath, allowedPatterns)) {
      violations.push(relPath);
    }
  }

  return { allowed, violations, ignoredGeneratedArtifacts };
}

function summarizeManualQaFindings(findings = []) {
  return findings.map((finding, index) => ({
    index: Number(finding.index || index + 1),
    classification: String(finding.classification || 'unspecified'),
    finding: String(finding.finding || ''),
    expected: String(finding.expected || ''),
    observed: String(finding.observed || ''),
    required_repair: String(finding.required_repair || ''),
  }));
}

function classificationGuidance(classification) {
  const value = String(classification || '').trim().toUpperCase();
  if (value === 'A') return 'Bug / implementation defect — existing requirement is clear, implementation is wrong. Prefer code/test repair.';
  if (value === 'B') return 'UX/content quality issue — behavior works, but copy/interaction is not good enough. Prefer UX/content/interaction repair plus test updates where useful.';
  if (value === 'C') return 'Requirement gap — expectation is valid, but current slice artifacts do not state it clearly. Update the relevant product/UX/checklist artifact first or clearly document the requirement clarification.';
  return 'Unspecified classification — inspect the finding and choose the smallest safe repair.';
}

function renderImplementationRepairWorkOrder({ slice, checklistRelPath, uxFlowRelPath, semanticContractRelPath, implementationNotesRelPath, findings }) {
  const findingSummaries = summarizeManualQaFindings(findings);
  const lines = [
    `# Implementation repair work order: ${slice.id} ${slice.title}`,
    '',
    'You are acting as the Coder role for a targeted Fabric repair run.',
    'Repair the current implementation based on manual QA findings from the user checklist.',
    '',
    '## Repair scope',
    '- Do not restart the slice.',
    '- Do not redesign unrelated areas.',
    '- Do not change the Fabric runtime.',
    '- Do not waive findings.',
    '- Do not mark the checklist Pass yourself.',
    '- Keep changes limited to the active slice and directly affected integration points.',
    '',
    '## Required source documents to read first',
    '- `docs/product/current-slice.yaml`',
    `- \`${checklistRelPath}\``,
    `- \`${implementationNotesRelPath}\``,
    `- \`${uxFlowRelPath}\``,
    `- \`${semanticContractRelPath}\``,
    '- Existing implementation files needed to understand and repair the finding.',
    '',
    '## Manual QA findings to repair',
    '```json',
    JSON.stringify(findingSummaries, null, 2),
    '```',
    '',
    '## Classification guidance',
    ...findingSummaries.map((finding) => `- Finding ${finding.index}: ${classificationGuidance(finding.classification)}`),
    '',
    '## Repair rules',
    '- Fix the implementation, not the checklist result.',
    '- Do not mark the checklist Pass; the human reviewer owns checklist acceptance.',
    '- Preserve all previously passing acceptance criteria.',
    '- Preserve previously working user actions from earlier slices unless the active slice explicitly redefines them.',
    '- Do not remove existing user-visible functionality as a side effect of repair.',
    '- If tests encode rejected behavior, update them narrowly to match the repaired behavior.',
    '- If the finding is a requirement gap, update the relevant product/UX/checklist artifact first or clearly document the requirement clarification.',
    '- Keep user-facing copy meaningful, clear, and free of internal process/factory language.',
    '',
    '## Post-repair validation to run',
    '```bash',
    'npm test',
    'npm run build',
    './fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ./fabric.values.json',
    './fabric/company/v1/fabric doctor --target . --values ./fabric.values.json',
    '```',
    '',
    '## Required final response',
    '- Manual QA findings repaired',
    '- Files changed',
    '- Test/build/doctor status',
    '- Semantic review status after repair',
    '- Any remaining risks',
    '',
  ];
  return lines.join('\n');
}

function renderSemanticUxRepairWorkOrder({ slice, reviewJsonRelPath, reviewMdRelPath, semanticContractRelPath, implementationNotesRelPath, findings, includeWarnings }) {
  const findingSummaries = summarizeSemanticUxFindings(findings);
  const blockerCount = findingSummaries.filter((finding) => finding.severity === 'blocker').length;
  const warningCount = findingSummaries.filter((finding) => finding.severity === 'warning').length;
  const lines = [
    `# Semantic UX repair work order: ${slice.id} ${slice.title}`,
    '',
    'You are acting as the Coder role for a targeted Fabric repair run.',
    'Repair the current implementation so the active slice passes semantic UX review.',
    '',
    '## Repair scope',
    '- Do not restart the slice.',
    '- Do not redesign unrelated areas.',
    '- Do not change the Fabric runtime, semantic reviewer, or review artifacts.',
    '- Do not waive findings.',
    '- Do not edit semantic UX review results manually.',
    '- Do not merely edit tests to pass.',
    '- Keep changes limited to files named in findings plus slice-local implementation targets, unless a minimal shared integration edit is explicitly necessary.',
    '',
    '## Required source documents to read first',
    '- `docs/product/current-slice.yaml`',
    `- \`${semanticContractRelPath}\``,
    `- \`${reviewJsonRelPath}\``,
    `- \`${reviewMdRelPath}\``,
    `- \`${implementationNotesRelPath}\``,
    '- Existing implementation files referenced by the findings.',
    '',
    '## Finding selection',
    `- Included blockers: ${String(blockerCount)}`,
    `- Included warnings: ${String(warningCount)}`,
    `- Warning repair mode: ${includeWarnings ? 'included by operator flag' : 'not included unless needed to fix blockers'}`,
    '',
    '## Findings to fix',
    '```json',
    JSON.stringify(findingSummaries, null, 2),
    '```',
    '',
    '## Repair rules',
    '- Fix the implementation, not the review file.',
    '- Preserve previously working user actions from earlier slices unless the active slice explicitly redefines them.',
    '- Do not remove existing user-visible functionality as a side effect of semantic repair.',
    '- User-facing copy must be meaningful to the end user.',
    '- Do not expose internal process, slice, schema, test, route, payload, ranking, bucket, implementation, acceptance-criteria, or factory language in visible UI.',
    '- Do not mention excluded features as internal limitations.',
    '- Do not replace real UX issues with generic filler.',
    '- Do not render malformed dates, raw enum values, undefined, null, NaN, Invalid Date, [object Object], or raw object/stringified data in visible UI.',
    '- Use safe fallbacks for missing state.',
    '- Preserve existing intended behavior and tests unless a test clearly encodes the rejected semantic behavior.',
    '',
    '## Post-repair validation to run',
    '```bash',
    'npm test',
    'npm run build',
    './fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ./fabric.values.json',
    './fabric/company/v1/fabric doctor --target . --values ./fabric.values.json',
    '```',
    '',
    '## Required final response',
    '- Findings fixed',
    '- Files changed',
    '- Semantic review status after repair',
    '- Test/build/doctor status',
    '- Any remaining risks',
    '',
  ];
  return lines.join('\n');
}

function executionLedgerRelPath() {
  return '.system/factory/execution-ledger.jsonl';
}

function appendExecutionLedgerEntry(targetRoot, entry) {
  const ledgerPath = path.join(targetRoot, executionLedgerRelPath());
  ensureDir(ledgerPath);
  fs.appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

function parseGitPorcelain(output) {
  const files = new Map();
  for (const rawLine of String(output || '').split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const status = rawLine.slice(0, 2);
    let relPath = rawLine.slice(3).trim();
    const renameArrow = ' -> ';
    if (relPath.includes(renameArrow)) {
      relPath = relPath.slice(relPath.indexOf(renameArrow) + renameArrow.length).trim();
    }
    if (relPath) files.set(relPath, status.trim() || 'modified');
  }
  return files;
}

function gitStatusMap(targetRoot) {
  const result = spawnSync('git', ['status', '--porcelain'], { cwd: targetRoot, encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return parseGitPorcelain(result.stdout || '');
}

function gitDiffNameOnly(targetRoot) {
  const result = spawnSync('git', ['diff', '--name-only'], { cwd: targetRoot, encoding: 'utf8' });
  if (result.error || result.status !== 0) return [];
  return String(result.stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function changedFilesAfterRun({ beforeStatus, afterStatus, targetRoot }) {
  if (!afterStatus) return gitDiffNameOnly(targetRoot);
  if (!beforeStatus) return [...afterStatus.keys()].sort();
  const changed = [];
  for (const [relPath, status] of afterStatus.entries()) {
    if (!beforeStatus.has(relPath) || beforeStatus.get(relPath) !== status) changed.push(relPath);
  }
  return changed.sort();
}

function pathMatchesAllowed(relPath, patterns = []) {
  const normalized = String(relPath || '').replace(/\\/g, '/');
  return patterns.some((pattern) => {
    const raw = String(pattern || '').replace(/\\/g, '/').trim();
    if (!raw) return false;
    if (raw.endsWith('/**')) return normalized.startsWith(raw.slice(0, -3));
    if (raw.endsWith('/')) return normalized.startsWith(raw);
    return normalized === raw;
  });
}

function codexGeneratedArtifactPatterns() {
  return [
    'dist/**',
    'build/**',
    'coverage/**',
    '.vite/**',
    '.turbo/**',
    '.next/**',
    '.llm-logs/**',
    'node_modules/**',
  ];
}

function isCodexGeneratedArtifact(relPath) {
  return pathMatchesAllowed(relPath, codexGeneratedArtifactPatterns());
}

function isTruthyFlag(value, fallback = false) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function resolveAllowAppShellMutation(values = {}, env = process.env) {
  return isTruthyFlag(
    values.coder_allow_app_shell_mutation
      ?? env.CODER_ALLOW_APP_SHELL_MUTATION
      ?? false,
    false,
  );
}

function deriveCodexAllowedPaths(slice, { allowAppShellMutation = false } = {}) {
  const slug = slugifySliceTitle(slice.title);
  const modify = ['package.json', 'package-lock.json'];
  if (allowAppShellMutation) {
    modify.unshift('src/App.jsx');
  }
  const protectedPaths = ['index.html', 'src/main.jsx', 'src/styles.css'];
  if (!allowAppShellMutation) {
    protectedPaths.push('src/App.jsx');
  }
  return {
    create: [
      `src/features/${slug}/**`,
      `src/routes/${slug}.jsx`,
      `src/routes/${slug}.js`,
      `tests/${slug}/**`,
    ],
    modify,
    protected: protectedPaths,
  };
}

function buildCodexWorkOrder({
  slice,
  fileTargets,
  baselineRelPath,
  uxRelPath,
  semanticContractRelPath,
  implementationNotesRelPath,
  valuesPath,
  values = {},
  carryForwardInvariants = [],
  carryForwardTestRelPath = '',
}) {
  const allowAppShellMutation = resolveAllowAppShellMutation(values);
  const allowed = deriveCodexAllowedPaths(slice, { allowAppShellMutation });
  const sliceContext = {
    id: String(slice?.id || '').trim(),
    title: String(slice?.title || '').trim(),
    objective: String(slice?.objective || '').trim(),
    in_scope: Array.isArray(slice?.in_scope) ? slice.in_scope : [],
    out_of_scope: Array.isArray(slice?.out_of_scope) ? slice.out_of_scope : [],
    acceptance_criteria: Array.isArray(slice?.acceptance_criteria) ? slice.acceptance_criteria : [],
    dependencies: Array.isArray(slice?.dependencies) ? slice.dependencies : [],
  };
  return [
    `# Codex work order: implement ${sliceContext.id} ${sliceContext.title}`,
    '',
    'You are acting as the Coder role for this Fabric app factory run.',
    'Implement the active slice incrementally in the current repository.',
    '',
    '## Required source documents to read first',
    '- `docs/product/current-slice.yaml`',
    `- \`${baselineRelPath}\``,
    `- \`${uxRelPath}\``,
    `- \`${semanticContractRelPath}\``,
    ...requiredDesignSystemRelPaths().map((relPath) => `- \`${relPath}\``),
    ...requiredSliceUxContractRelPaths(sliceContext.id).map((relPath) => `- \`${relPath}\``),
    `- \`${implementationNotesRelPath}\``,
    '- `docs/product/project-brief.md` if present',
    '- `docs/product/product-system-framing.md` if present',
    '- Existing `src/` and `tests/` files needed to understand the current app and integration points.',
    '',
    '## Active slice',
    '```json',
    JSON.stringify(sliceContext, null, 2),
    '```',
    '',
    '## Implementation contract',
    '- Behave like an incremental developer, not a full-app generator.',
    '- Do not rewrite the application from scratch.',
    '- Preserve existing behavior unless the current slice explicitly requires a change.',
    '- Maintain previously working user-visible actions and flows from earlier slices unless the active slice explicitly redefines them.',
    '- Never remove existing functionality as an unintended side effect of implementation.',
    '- Prefer small, focused edits and new slice-local files.',
    '- Read relevant existing files before editing them.',
    '- Do not modify unrelated onboarding/profile code unless strictly necessary for integration.',
    '- Do not restyle the global app shell, shared visual language, or design-system tokens during slice implementation.',
    '- Reuse existing shared UI shell conventions (`app-shell`, `app-panel`, existing card/action classes) instead of introducing alternate global wrapper conventions.',
    '- Treat global styling (`src/styles.css`) as protected; any cross-slice design refresh belongs in the design-system workflow, not in slice implementation.',
    allowAppShellMutation
      ? '- App-shell mutation is enabled for this run. Keep any src/App.jsx edits minimal and integration-only (wiring/imports), never visual rewrites.'
      : '- src/App.jsx is protected by default. Integrate new slice behavior through slice-local routes/features and minimal shared integration points instead.',
    '- Do not use `--force` or destructive git commands.',
    '',
    '## Carry-forward invariants',
    carryForwardInvariants.length > 0
      ? 'These are already approved behaviors from prior passed slices. Preserve them unless the active slice explicitly redefines them.'
      : 'No prior passed-slice invariants were detected.',
    ...(carryForwardInvariants.length > 0
      ? carryForwardInvariants.flatMap((entry) => [
        `- [${entry.sliceId}] ${entry.title}`,
        ...entry.assertions.map((assertion) => `  - ${assertion}`),
      ])
      : []),
    ...(carryForwardInvariants.length > 0 && carryForwardTestRelPath
      ? [
        '',
        `Required regression evidence file: \`${carryForwardTestRelPath}\``,
        '- Add or update tests in that file so prior-slice invariant behavior is explicitly covered.',
      ]
      : []),
    '',
    '## Preferred implementation targets from Fabric',
    ...fileTargets.map((target) => `- ${target}`),
    '',
    '## Allowed path policy',
    'You should create files only under:',
    ...allowed.create.map((target) => `- ${target}`),
    '',
    'You may minimally modify only:',
    ...allowed.modify.map((target) => `- ${target}`),
    '',
    'Do not modify unless explicitly unavoidable:',
    ...allowed.protected.map((target) => `- ${target}`),
    '',
    'If the requested slice cannot be implemented within these paths, stop and explain the smallest required exception instead of broadening the edit scope yourself.',
    '',
    '## Validation expectations',
    '- Add or update tests for the slice behavior.',
    '- Run the available test command, usually `npm test`, if dependencies are installed.',
    '- Run `npm run build` if available and reasonably possible.',
    '- End with a concise summary of changed files and validation results.',
    '',
    '## User-facing semantic UX and design-system contract',
    '- You must satisfy the semantic UX contract and design-system contracts before the slice can close.',
    '- Do not invent generic filler copy for required user-facing content.',
    '- Do not expose internal implementation, workflow, schema, routing, slice, testing, ranking, bucket, acceptance, or process language in visible UI.',
    '- Every visible status, explanation, label, empty state, and fallback must be meaningful to the end user.',
    '- Use approved UI components and semantic tokens before introducing one-off visual structure.',
    '- Do not introduce raw visual values, duplicate component implementations, or new status labels without updating the design-system contract.',
    '- Dates and statuses must be human-readable and safe.',
    '- Never render undefined, null, NaN, Invalid Date, [object Object], malformed years, raw enum values, or raw object/stringified data.',
    '',
    '## Important product/UX reminder',
    'The visible implementation should reflect the product, UX, architecture, and semantic UX contract documents. A section existing with bad copy is not acceptable.',
    '',
    `Values file for reference: \`${path.relative(process.cwd(), valuesPath)}\``,
    '',
  ].join('\n');
}

function resolveCodexCommand(values = {}) {
  return String(values.codex_command || values.coder_codex_command || process.env.FABRIC_CODEX_COMMAND || 'codex').trim() || 'codex';
}

async function runCodexExec({ targetRoot, values, workOrderText, onProgress }) {
  const command = resolveCodexCommand(values);
  const extraArgs = Array.isArray(values.coder_codex_exec_args) ? values.coder_codex_exec_args.map(String) : [];
  const args = ['exec', ...extraArgs, workOrderText];
  if (onProgress) onProgress(`running Codex CLI: ${command} exec ...`);

  const heartbeatSecondsRaw = Number(values?.coder_codex_heartbeat_seconds ?? 10);
  const heartbeatSeconds = Number.isFinite(heartbeatSecondsRaw) ? Math.max(5, Math.floor(heartbeatSecondsRaw)) : 10;
  const startedAtMs = Date.now();

  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: targetRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    let spawnError = '';
    let heartbeatTimer = null;

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8'));
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8'));
      });
    }

    child.on('error', (error) => {
      spawnError = String(error?.message || error || '');
    });

    if (onProgress) {
      heartbeatTimer = setInterval(() => {
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
        onProgress(`codex exec heartbeat: still running (${elapsedSeconds}s elapsed)`);
      }, heartbeatSeconds * 1000);
    }

    child.on('close', (status, signal) => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      resolve({
        command,
        argsPreview: ['exec', ...extraArgs, '<work-order>'],
        status,
        signal,
        error: spawnError,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
  });
}

function validateCodexChangedFiles({ changedFiles, slice, values = {} }) {
  const allowAppShellMutation = resolveAllowAppShellMutation(values);
  const allowed = deriveCodexAllowedPaths(slice, { allowAppShellMutation });
  const allowedPatterns = [...allowed.create, ...allowed.modify];
  const ignoredGeneratedArtifacts = [];
  const violations = [];

  for (const relPath of changedFiles) {
    if (String(relPath).startsWith('.system/factory/work-orders/')) continue;
    if (String(relPath) === executionLedgerRelPath()) continue;

    if (isCodexGeneratedArtifact(relPath)) {
      ignoredGeneratedArtifacts.push(relPath);
      continue;
    }

    if (!pathMatchesAllowed(relPath, allowedPatterns)) {
      violations.push(relPath);
    }
  }

  return { allowed, violations, ignoredGeneratedArtifacts };
}

async function runCodexImplementationForCurrentSlice({
  targetRoot,
  valuesPath,
  values,
  currentSlice,
  fileTargets,
  baselineRelPath,
  uxRelPath,
  semanticContractRelPath,
  implementationNotesRelPath,
  implementationNotesPath,
  force = false,
}) {
  console.log('fabric coder:implement-current-slice: starting Codex-backed implementation...');
  const workOrderRelPath = workOrderRelPathForSlice(currentSlice.id);
  const workOrderPath = path.join(targetRoot, workOrderRelPath);
  const carryForwardInvariants = collectCarryForwardInvariants({
    targetRoot,
    activeSliceId: currentSlice.id,
  });
  const carryForwardTestRelPath = `tests/${slugifySliceTitle(currentSlice.title)}/carry-forward-invariants.test.mjs`;
  const workOrderText = buildCodexWorkOrder({
    slice: currentSlice,
    fileTargets,
    baselineRelPath,
    uxRelPath,
    semanticContractRelPath,
    implementationNotesRelPath,
    valuesPath,
    values,
    carryForwardInvariants,
    carryForwardTestRelPath,
  });
  writeTextAtomic(workOrderPath, workOrderText);

  const frontendOutputs = ensureReactViteStorybookScaffold(targetRoot, valuesPath, { force });
  if (frontendOutputs.length > 0) {
    console.log(`  - ensured React/Vite + Storybook baseline: ${String(frontendOutputs.length)} file(s)`);
  }

  const allowed = deriveCodexAllowedPaths(currentSlice, {
    allowAppShellMutation: resolveAllowAppShellMutation(values),
  });
  console.log(`  - work order: ${workOrderRelPath}`);
  console.log('  - implementation backend: codex_exec');
  console.log(`  - allowed create paths: ${allowed.create.join(', ')}`);
  console.log(`  - allowed modify paths: ${allowed.modify.join(', ')}`);
  console.log(`  - protected paths: ${allowed.protected.join(', ')}`);

  const beforeStatus = gitStatusMap(targetRoot);
  if (beforeStatus && beforeStatus.size > 0) {
    console.warn(`  - warning: git worktree already has ${beforeStatus.size} changed file(s); diff attribution may be conservative.`);
  }

  const startedAt = new Date().toISOString();
  const codexResult = await runCodexExec({ targetRoot, values, workOrderText, onProgress: (message) => console.log(`  - ${String(message)}`) });
  if (codexResult.stdout.trim()) console.log(codexResult.stdout.trim());
  if (codexResult.stderr.trim()) console.warn(codexResult.stderr.trim());

  const afterStatus = gitStatusMap(targetRoot);
  const changedFiles = changedFilesAfterRun({ beforeStatus, afterStatus, targetRoot });
  const validation = validateCodexChangedFiles({ changedFiles, slice: currentSlice, values });

  if (validation.ignoredGeneratedArtifacts.length > 0) {
    console.log(
      `  - ignored generated artifacts: ${String(validation.ignoredGeneratedArtifacts.length)} file(s)`,
    );
  }

  const generatedAt = new Date().toISOString();

  appendExecutionLedgerEntry(targetRoot, {
    type: 'coder_implementation',
    command: 'coder:implement-current-slice',
    backend: 'codex_exec',
    slice_id: currentSlice.id,
    started_at: startedAt,
    completed_at: generatedAt,
    work_order: workOrderRelPath,
    codex_command: codexResult.command,
    codex_args: codexResult.argsPreview,
    exit_status: codexResult.status,
    exit_signal: codexResult.signal,
    changed_files: changedFiles,
    ignored_generated_artifacts: validation.ignoredGeneratedArtifacts,
    path_policy_violations: validation.violations,
  });

  if (codexResult.error) throw new Error(`Codex execution failed: ${codexResult.error}`);
  if (codexResult.status !== 0) throw new Error(`Codex execution failed with exit status ${codexResult.status}. See output above and ${workOrderRelPath}.`);
  if (validation.violations.length > 0) {
    throw new Error('Codex changed files outside the allowed slice policy:\n' + validation.violations.map((relPath) => `- ${relPath}`).join('\n') + `\nReview the diff manually. Work order: ${workOrderRelPath}`);
  }

  const fabricManifest = loadManifest();
  const implHeader = metadataHeader(implementationNotesRelPath, 'templates/implementation-notes-template.md', fabricManifest.fabric_version, generatedAt);
  const notesBody = renderImplementationNotes({
    slice: currentSlice,
    statusLabel: 'Implemented',
    fileTargets,
    changedFiles: [
      ...new Set([
        ...changedFiles.filter((relPath) => !isCodexGeneratedArtifact(relPath)),
        workOrderRelPath,
        executionLedgerRelPath(),
      ]),
    ].sort(),
    verificationSummary: [
      'Delegated implementation to Codex CLI using a Fabric-generated work order.',
      'Captured Codex result and changed files in the execution ledger.',
      validation.violations.length === 0 ? 'Changed files passed the Fabric allowed-path policy.' : 'Changed files require manual review because they exceeded the allowed-path policy.',
    ],
    executionNotes: [
      'This command used Codex as the implementation worker and Fabric as the orchestrator/validator.',
      `Work order: ${workOrderRelPath}`,
      `Codex exit status: ${String(codexResult.status)}`,
    ],
    nextSteps: [
      'Inspect the git diff created by Codex.',
      'Run npm test and npm run build if Codex did not already run them successfully.',
      'Run uiux:review-current-slice-semantics after verifying the slice locally.',
      'Run coder:close-current-slice only after semantic UX review passes.',
    ],
    generatedAt,
  });
  writeTextAtomic(implementationNotesPath, `${implHeader}${notesBody}`);

  console.log('fabric coder:implement-current-slice: OK');
  console.log(`- implemented: ${currentSlice.id} ${currentSlice.title}`);
  console.log('- backend: codex_exec');
  console.log(`- work order: ${workOrderRelPath}`);
  console.log(`- changed files: ${String([...new Set(changedFiles)].length)}`);
  console.log(`- execution ledger: ${executionLedgerRelPath()}`);
}


const CODER_IMPLEMENT_LOCK_REL_PATH = '.fabric-locks/coder-implement-current-slice.lock';

function isLiveProcessPid(pidValue) {
  const pid = Number(pidValue);
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'EPERM') {
      return true;
    }
    return false;
  }
}

function readLockPayload(lockPath) {
  if (!fs.existsSync(lockPath)) {
    return null;
  }
  try {
    return JSON.parse(readText(lockPath));
  } catch (_) {
    return null;
  }
}

function acquireCoderImplementLock(targetRoot) {
  const lockPath = path.join(targetRoot, CODER_IMPLEMENT_LOCK_REL_PATH);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const lockPayload = {
    pid: process.pid,
    command: 'coder:implement-current-slice',
    target_root: String(targetRoot),
    started_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        fs.writeFileSync(fd, `${JSON.stringify(lockPayload, null, 2)}\n`, 'utf8');
      } finally {
        fs.closeSync(fd);
      }
      return { lockPath, lockRelPath: CODER_IMPLEMENT_LOCK_REL_PATH };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      const existing = readLockPayload(lockPath);
      if (existing && isLiveProcessPid(existing.pid)) {
        const owner = Number.isInteger(Number(existing.pid))
          ? `pid ${String(existing.pid)}`
          : 'another process';
        const startedAt = existing.started_at ? ` (started ${String(existing.started_at)})` : '';
        throw new Error(
          `Cannot run coder:implement-current-slice: another coder run is already active (${owner}${startedAt}). `
          + `Wait for it to finish or stop it first. lock: ${CODER_IMPLEMENT_LOCK_REL_PATH}`,
        );
      }
      try {
        fs.rmSync(lockPath, { force: true });
      } catch (_) {
        // Best-effort stale lock cleanup only.
      }
    }
  }
  throw new Error(`Cannot run coder:implement-current-slice: failed to acquire lock: ${CODER_IMPLEMENT_LOCK_REL_PATH}`);
}

function releaseCoderImplementLock(lockHandle) {
  if (!lockHandle?.lockPath) {
    return;
  }
  const existing = readLockPayload(lockHandle.lockPath);
  if (existing && Number.isInteger(Number(existing.pid)) && Number(existing.pid) !== process.pid) {
    return;
  }
  try {
    fs.rmSync(lockHandle.lockPath, { force: true });
  } catch (_) {
    // Best-effort cleanup only.
  }
}

async function coderImplementCurrentSliceUnlocked({ targetRoot, valuesPath, force = false }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run coder:implement-current-slice: missing docs/product/current-slice.yaml');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  const { relPath: baselineRelPath, absPath: baselinePath } = ensureSliceArchitectureBaselinePath(targetRoot, currentSlice.id);
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Cannot run coder:implement-current-slice: missing ${baselineRelPath}; run architect:generate-current-slice-baseline first`);
  }
  const { relPath: uxRelPath, absPath: uxPath } = ensureSliceUxFlowPath(targetRoot, currentSlice.id);
  if (!fs.existsSync(uxPath)) {
    throw new Error(`Cannot run coder:implement-current-slice: missing ${uxRelPath}; run uiux:generate-current-slice-flow first`);
  }
  const semanticContractRelPath = semanticUxContractRelPathForSlice(currentSlice.id);
  if (!fs.existsSync(path.join(targetRoot, semanticContractRelPath))) {
    throw new Error(`Cannot run coder:implement-current-slice: missing ${semanticContractRelPath}; run uiux:generate-current-slice-flow first`);
  }
  assertDesignSystemReadyForSlice(targetRoot, currentSlice.id, 'coder:implement-current-slice');
  const { relPath: implementationNotesRelPath, absPath: implementationNotesPath } = ensureSliceImplementationNotesPath(targetRoot, currentSlice.id);
  if (!fs.existsSync(implementationNotesPath)) {
    throw new Error(`Cannot run coder:implement-current-slice: missing ${implementationNotesRelPath}; run coder:prepare-current-slice first`);
  }
  const fileTargets = deriveImplementationTargets(currentSlice);
  const baselineText = readText(baselinePath);
  const uxFlowText = readText(uxPath);
  const semanticUxContractJson = readText(path.join(targetRoot, semanticContractRelPath));
  const designSystemContext = loadDesignSystemContext(targetRoot, currentSlice.id);
  const uxFlowTextWithDesignSystem = `${uxFlowText.trim()}

# Design System and UI/UX Contracts
${designSystemContext}`;
  const semanticUxContractJsonWithDesignSystem = `${semanticUxContractJson.trim()}

/* Design system context is provided separately in the UX flow markdown input. */`;
  const briefText = fs.existsSync(briefPath) ? readText(briefPath) : '';
  const framingText = fs.existsSync(framingPath) ? readText(framingPath) : '';
  const values = loadValuesIfPresent(valuesPath);
  const coderExecutionMode = resolveCoderExecutionMode(values);
  const llmOutputMode = resolveCoderLlmOutputMode(values);

  if (coderExecutionMode === 'codex_exec') {
    await runCodexImplementationForCurrentSlice({
      targetRoot,
      valuesPath,
      values,
      currentSlice,
      fileTargets,
      baselineRelPath,
      uxRelPath,
      semanticContractRelPath,
      implementationNotesRelPath,
      implementationNotesPath,
      force,
    });
    return;
  }

  let implementationMode = 'heuristic';
  let playbookOverride = null;
  let sourceFilesOverride = null;
  try {
    console.log('fabric coder:implement-current-slice: starting model-driven implementation generation...');
    if (llmOutputMode === 'source_files') {
      const { settings, purpose, files } = await generateCurrentSliceImplementationSourceFiles({
        targetRoot,
        values,
        slice: currentSlice,
        fileTargets,
        baselineMarkdown: baselineText,
        uxFlowMarkdown: uxFlowTextWithDesignSystem,
        semanticUxContractJson: semanticUxContractJsonWithDesignSystem,
        briefMarkdown: briefText,
        framingMarkdown: framingText,
        onProgress: (message) => {
          console.log(`  - ${String(message)}`);
        },
      });
      sourceFilesOverride = files;
      implementationMode = 'model_source_files';
      if (purpose) {
        console.log(`fabric coder:implement-current-slice: llm profile ${purpose}`);
      }
      console.log(`fabric coder:implement-current-slice: model coder ${settings.provider}/${settings.model}`);
    } else {
      const { settings, purpose, playbook } = await generateCurrentSliceImplementationPlaybook({
        targetRoot,
        values,
        slice: currentSlice,
        baselineMarkdown: baselineText,
        uxFlowMarkdown: uxFlowTextWithDesignSystem,
        semanticUxContractJson: semanticUxContractJsonWithDesignSystem,
        briefMarkdown: briefText,
        framingMarkdown: framingText,
        onProgress: (message) => {
          console.log(`  - ${String(message)}`);
        },
      });
      playbookOverride = playbook;
      implementationMode = 'model_playbook';
      if (purpose) {
        console.log(`fabric coder:implement-current-slice: llm profile ${purpose}`);
      }
      console.log(`fabric coder:implement-current-slice: model coder ${settings.provider}/${settings.model}`);
    }
  } catch (error) {
    const reason = error?.message ? String(error.message) : String(error);
    console.warn(`fabric coder:implement-current-slice: model-driven generation unavailable (${reason})`);
    console.warn('fabric coder:implement-current-slice: falling back to deterministic implementation generation.');
    implementationMode = 'heuristic_fallback';
  }

  const files = sourceFilesOverride && sourceFilesOverride.size > 0
    ? sourceFilesOverride
    : buildGeneratedAppFiles(currentSlice, playbookOverride);
  const changedFiles = [];
  let preservedGlobalStyles = false;
  for (const [relPath, content] of files.entries()) {
    const outPath = path.join(targetRoot, relPath);
    if (relPath === 'src/styles.css' && fs.existsSync(outPath) && readText(outPath) !== content) {
      preservedGlobalStyles = true;
      continue;
    }
    if (fs.existsSync(outPath) && readText(outPath) === content) {
      changedFiles.push(relPath);
      continue;
    }
    writeManagedFile(outPath, content, { force });
    changedFiles.push(relPath);
  }

  const { createdPackageJson } = ensurePackageJsonWithAppScripts(targetRoot, valuesPath);
  changedFiles.push('package.json');

  const generatedAt = new Date().toISOString();
  const fabricManifest = loadManifest();
  const implHeader = metadataHeader(
    implementationNotesRelPath,
    'templates/implementation-notes-template.md',
    fabricManifest.fabric_version,
    generatedAt,
  );
  const notesBody = renderImplementationNotes({
    slice: currentSlice,
    statusLabel: 'Implemented',
    fileTargets,
    changedFiles: [...new Set(changedFiles)].sort(),
    verificationSummary: [
      'Generated a runnable React + Vite app shell for the active slice.',
      'Ensured package.json contains local dev/build/preview/test scripts.',
      createdPackageJson ? 'Created package.json because the repository did not yet contain one.' : 'Updated the existing package.json in place.',
    ],
    executionNotes: [
      implementationMode === 'model_source_files'
        ? 'This command wrote model-authored source files directly into src/ and tests/ using the current slice architecture and UX contracts.'
        : (implementationMode === 'model_playbook'
          ? 'This command wrote deterministic source templates populated from a model-generated implementation playbook.'
          : 'This command wrote deterministic starter code into src/ and tests/ so the slice becomes customer-testable locally.'),
      'Run npm install after generation to fetch React/Vite and Storybook dependencies.',
      'Use --force only when you want fabric to replace non-generated implementation files.',
    ],
    nextSteps: [
      'Run npm install to sync dependencies if package.json changed.',
      'Run npm run dev to open the customer-testable surface and npm run storybook to review component states.',
      'Run uiux:review-current-slice-semantics after verifying the slice locally.',
      'Run coder:close-current-slice only after semantic UX review passes.',
    ],
    generatedAt,
  });
  writeTextAtomic(implementationNotesPath, `${implHeader}${notesBody}`);

  console.log('fabric coder:implement-current-slice: OK');
  console.log(`- implemented: ${currentSlice.id} ${currentSlice.title}`);
  console.log(`- changed files: ${String([...new Set(changedFiles)].length)}`);
  console.log('- app scaffold: React + Vite');
  console.log(`- implementation mode: ${implementationMode}`);
  console.log(`- llm output mode: ${llmOutputMode}`);
  if (preservedGlobalStyles) {
    console.log('- preserved existing global styles: src/styles.css');
  }
  console.log('- package scripts: dev, build, preview, test, storybook, build-storybook, test:storybook');
}

async function coderRepairImplementationFindings({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run coder:repair-implementation-findings: missing docs/product/current-slice.yaml');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  if (!String(currentSlice.id || '').trim()) {
    throw new Error('Cannot run coder:repair-implementation-findings: active slice has no id');
  }

  const checklistRelPath = checklistPathForSlice(currentSlice.id);
  const checklistPath = path.join(targetRoot, checklistRelPath);
  const { relPath: uxFlowRelPath, absPath: uxFlowPath } = ensureSliceUxFlowPath(targetRoot, currentSlice.id);
  const semanticContractRelPath = semanticUxContractRelPathForSlice(currentSlice.id);
  const semanticContractPath = path.join(targetRoot, semanticContractRelPath);
  const implementationNotesRelPath = implementationNotesRelPathForSlice(currentSlice.id);
  const implementationNotesPath = path.join(targetRoot, implementationNotesRelPath);

  if (!fs.existsSync(checklistPath)) {
    throw new Error(`Cannot run coder:repair-implementation-findings: missing ${checklistRelPath}; run uiux:generate-current-slice-flow first`);
  }
  if (!fs.existsSync(uxFlowPath)) {
    throw new Error(`Cannot run coder:repair-implementation-findings: missing ${uxFlowRelPath}; run uiux:generate-current-slice-flow first`);
  }
  if (!fs.existsSync(semanticContractPath)) {
    throw new Error(`Cannot run coder:repair-implementation-findings: missing ${semanticContractRelPath}; run uiux:generate-current-slice-flow first`);
  }
  if (!fs.existsSync(implementationNotesPath)) {
    throw new Error(`Cannot run coder:repair-implementation-findings: missing ${implementationNotesRelPath}; run coder:prepare-current-slice first`);
  }

  const checklistText = readText(checklistPath);
  const checklistState = parseChecklistResultState(checklistText);
  if (checklistState === 'pass') {
    throw new Error(`Cannot run coder:repair-implementation-findings: ${checklistRelPath} is Pass; no manual implementation repair is required`);
  }
  if (checklistState === 'unresolved' || checklistState === 'missing_result_section') {
    throw new Error(`Cannot run coder:repair-implementation-findings: ${checklistRelPath} result is unresolved; mark Status: Fail and document Manual QA Findings first`);
  }
  if (checklistState !== 'fail') {
    throw new Error(`Cannot run coder:repair-implementation-findings: unsupported checklist result state ${checklistState}`);
  }

  const findings = parseManualQaFindings(checklistText);
  if (findings.length === 0) {
    throw new Error(`Cannot run coder:repair-implementation-findings: ${checklistRelPath} is Fail but has no Manual QA Findings to repair`);
  }

  const values = loadValuesIfPresent(valuesPath);
  const workOrderRelPath = implementationRepairWorkOrderRelPathForSlice(currentSlice.id);
  const workOrderPath = path.join(targetRoot, workOrderRelPath);
  const workOrderText = renderImplementationRepairWorkOrder({
    slice: currentSlice,
    checklistRelPath,
    uxFlowRelPath,
    semanticContractRelPath,
    implementationNotesRelPath,
    findings,
  });
  writeTextAtomic(workOrderPath, workOrderText);

  const allowed = implementationRepairAllowedPatterns({ slice: currentSlice, values });
  console.log('fabric coder:repair-implementation-findings: starting Codex-backed implementation repair...');
  console.log(`- slice: ${currentSlice.id} ${currentSlice.title}`);
  console.log(`- checklist: ${checklistRelPath}`);
  console.log(`- work order: ${workOrderRelPath}`);
  console.log(`- selected manual QA findings: ${String(findings.length)}`);
  console.log(`- allowed create paths: ${allowed.create.join(', ')}`);
  console.log(`- allowed modify paths: ${allowed.modify.join(', ')}`);

  const beforeStatus = gitStatusMap(targetRoot);
  if (beforeStatus && beforeStatus.size > 0) {
    console.warn(`- warning: git worktree already has ${beforeStatus.size} changed file(s); diff attribution may be conservative.`);
  }

  const startedAt = new Date().toISOString();
  appendExecutionLedgerEntry(targetRoot, {
    type: 'implementation_repair',
    command: 'coder:repair-implementation-findings',
    backend: 'codex_exec',
    slice_id: currentSlice.id,
    started_at: startedAt,
    status: 'started',
    checklist: checklistRelPath,
    work_order: workOrderRelPath,
    selected_findings: summarizeManualQaFindings(findings),
  });

  const codexResult = await runCodexExec({
    targetRoot,
    values,
    workOrderText,
    onProgress: (message) => console.log(`- ${String(message)}`),
  });
  if (codexResult.stdout.trim()) console.log(codexResult.stdout.trim());
  if (codexResult.stderr.trim()) console.warn(codexResult.stderr.trim());

  const afterStatus = gitStatusMap(targetRoot);
  const changedFiles = changedFilesAfterRun({ beforeStatus, afterStatus, targetRoot });
  const validation = validateImplementationRepairChangedFiles({ changedFiles, slice: currentSlice, values });
  const completedAt = new Date().toISOString();

  appendExecutionLedgerEntry(targetRoot, {
    type: 'implementation_repair',
    command: 'coder:repair-implementation-findings',
    backend: 'codex_exec',
    slice_id: currentSlice.id,
    started_at: startedAt,
    completed_at: completedAt,
    status: codexResult.status === 0 && validation.violations.length === 0 ? 'completed' : 'failed',
    checklist: checklistRelPath,
    work_order: workOrderRelPath,
    codex_command: codexResult.command,
    codex_args: codexResult.argsPreview,
    exit_status: codexResult.status,
    exit_signal: codexResult.signal,
    changed_files: changedFiles,
    ignored_generated_artifacts: validation.ignoredGeneratedArtifacts,
    path_policy_violations: validation.violations,
  });

  if (codexResult.error) throw new Error(`Codex implementation repair failed: ${codexResult.error}`);
  if (codexResult.status !== 0) throw new Error(`Codex implementation repair failed with exit status ${codexResult.status}. See output above and ${workOrderRelPath}.`);
  if (validation.violations.length > 0) {
    throw new Error('Codex implementation repair changed files outside the allowed repair policy:\n' + validation.violations.map((relPath) => `- ${relPath}`).join('\n') + `\nReview the diff manually. Work order: ${workOrderRelPath}`);
  }

  const fileTargets = deriveImplementationTargets(currentSlice);
  const fabricManifest = loadManifest();
  const implHeader = metadataHeader(implementationNotesRelPath, 'templates/implementation-notes-template.md', fabricManifest.fabric_version, completedAt);
  const notesBody = renderImplementationNotes({
    slice: currentSlice,
    statusLabel: 'Manual QA Implementation Repair Applied',
    fileTargets,
    changedFiles: [
      ...new Set([
        ...changedFiles.filter((relPath) => !isCodexGeneratedArtifact(relPath)),
        workOrderRelPath,
        executionLedgerRelPath(),
      ]),
    ].sort(),
    verificationSummary: [
      `Generated an implementation repair work order from ${checklistRelPath}.`,
      `Selected ${String(findings.length)} manual QA finding(s) for repair.`,
      validation.violations.length === 0 ? 'Changed files passed the implementation repair allowed-path policy.' : 'Changed files require manual review because they exceeded the implementation repair allowed-path policy.',
    ],
    executionNotes: [
      'This command used Codex as the repair worker and Fabric as the orchestrator/validator.',
      `Work order: ${workOrderRelPath}`,
      `Checklist source: ${checklistRelPath}`,
      `Codex exit status: ${String(codexResult.status)}`,
      'The human reviewer remains responsible for re-running the manual checklist and marking it Pass only after acceptance.',
    ],
    nextSteps: [
      'Inspect the git diff created by Codex.',
      'Run npm test and npm run build if Codex did not already run them successfully.',
      'Re-run uiux:review-current-slice-semantics and confirm status is pass.',
      'Re-run the manual checklist; mark it Pass only when satisfied.',
      'Run coder:close-current-slice only after semantic UX review passes and the checklist is Pass.',
    ],
    generatedAt: completedAt,
  });
  writeTextAtomic(implementationNotesPath, `${implHeader}${notesBody}`);

  console.log('fabric coder:repair-implementation-findings: OK');
  console.log(`- repaired slice: ${currentSlice.id} ${currentSlice.title}`);
  console.log(`- changed files: ${String([...new Set(changedFiles)].length)}`);
  console.log(`- updated: ${implementationNotesRelPath}`);
  console.log('- next: rerun validation, semantic review, and manual checklist');
}

async function coderRepairSemanticUxFindings({ targetRoot, valuesPath, includeWarnings = false }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run coder:repair-semantic-ux-findings: missing docs/product/current-slice.yaml');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  if (!String(currentSlice.id || '').trim()) {
    throw new Error('Cannot run coder:repair-semantic-ux-findings: active slice has no id');
  }

  const reviewJsonRelPath = semanticUxReviewJsonRelPathForSlice(currentSlice.id);
  const reviewMdRelPath = semanticUxReviewMdRelPathForSlice(currentSlice.id);
  const semanticContractRelPath = semanticUxContractRelPathForSlice(currentSlice.id);
  const implementationNotesRelPath = implementationNotesRelPathForSlice(currentSlice.id);
  const reviewJsonPath = path.join(targetRoot, reviewJsonRelPath);
  const reviewMdPath = path.join(targetRoot, reviewMdRelPath);
  const semanticContractPath = path.join(targetRoot, semanticContractRelPath);
  const implementationNotesPath = path.join(targetRoot, implementationNotesRelPath);

  if (!fs.existsSync(reviewJsonPath)) {
    throw new Error(`Cannot run coder:repair-semantic-ux-findings: missing ${reviewJsonRelPath}; run uiux:review-current-slice-semantics first`);
  }
  if (!fs.existsSync(reviewMdPath)) {
    throw new Error(`Cannot run coder:repair-semantic-ux-findings: missing ${reviewMdRelPath}; run uiux:review-current-slice-semantics first`);
  }
  if (!fs.existsSync(semanticContractPath)) {
    throw new Error(`Cannot run coder:repair-semantic-ux-findings: missing ${semanticContractRelPath}; run uiux:generate-current-slice-flow first`);
  }
  if (!fs.existsSync(implementationNotesPath)) {
    throw new Error(`Cannot run coder:repair-semantic-ux-findings: missing ${implementationNotesRelPath}; run coder:prepare-current-slice first`);
  }

  const review = parseJsonFile(reviewJsonPath, reviewJsonRelPath);
  if (String(review.status || '').toLowerCase() === 'pass') {
    throw new Error(`Cannot run coder:repair-semantic-ux-findings: ${reviewJsonRelPath} already passes; no semantic repair is required`);
  }

  const allFindings = Array.isArray(review.findings) ? review.findings : [];
  const blockerFindings = allFindings.filter((finding) => normalizeFindingSeverity(finding) === 'blocker');
  const warningFindings = allFindings.filter((finding) => normalizeFindingSeverity(finding) === 'warning');
  const findings = semanticUxFindingsForRepair(review, { includeWarnings });
  if (findings.length === 0) {
    if (!includeWarnings && warningFindings.length > 0) {
      throw new Error('Cannot run coder:repair-semantic-ux-findings: review has no blockers; rerun with --include-warnings to repair warnings');
    }
    throw new Error('Cannot run coder:repair-semantic-ux-findings: review has no blocker or selected warning findings to repair');
  }

  const values = loadValuesIfPresent(valuesPath);
  const workOrderRelPath = semanticUxRepairWorkOrderRelPathForSlice(currentSlice.id);
  const workOrderPath = path.join(targetRoot, workOrderRelPath);
  const workOrderText = renderSemanticUxRepairWorkOrder({
    slice: currentSlice,
    reviewJsonRelPath,
    reviewMdRelPath,
    semanticContractRelPath,
    implementationNotesRelPath,
    findings,
    includeWarnings,
  });
  writeTextAtomic(workOrderPath, workOrderText);

  const allowed = semanticRepairAllowedPatterns({ slice: currentSlice, findings, values });
  console.log('fabric coder:repair-semantic-ux-findings: starting Codex-backed semantic UX repair...');
  console.log(`- slice: ${currentSlice.id} ${currentSlice.title}`);
  console.log(`- work order: ${workOrderRelPath}`);
  console.log(`- selected findings: ${String(findings.length)} (${String(blockerFindings.length)} blocker(s), ${includeWarnings ? String(warningFindings.length) : '0'} warning(s) included)`);
  console.log(`- allowed create paths: ${allowed.create.join(', ')}`);
  console.log(`- allowed modify paths: ${allowed.modify.join(', ')}`);

  const beforeStatus = gitStatusMap(targetRoot);
  if (beforeStatus && beforeStatus.size > 0) {
    console.warn(`- warning: git worktree already has ${beforeStatus.size} changed file(s); diff attribution may be conservative.`);
  }

  const startedAt = new Date().toISOString();
  appendExecutionLedgerEntry(targetRoot, {
    type: 'semantic_ux_repair',
    command: 'coder:repair-semantic-ux-findings',
    backend: 'codex_exec',
    slice_id: currentSlice.id,
    started_at: startedAt,
    status: 'started',
    work_order: workOrderRelPath,
    review_json: reviewJsonRelPath,
    review_md: reviewMdRelPath,
    selected_findings: summarizeSemanticUxFindings(findings),
    include_warnings: Boolean(includeWarnings),
  });

  const codexResult = await runCodexExec({
    targetRoot,
    values,
    workOrderText,
    onProgress: (message) => console.log(`- ${String(message)}`),
  });
  if (codexResult.stdout.trim()) console.log(codexResult.stdout.trim());
  if (codexResult.stderr.trim()) console.warn(codexResult.stderr.trim());

  const afterStatus = gitStatusMap(targetRoot);
  const changedFiles = changedFilesAfterRun({ beforeStatus, afterStatus, targetRoot });
  const validation = validateSemanticRepairChangedFiles({ changedFiles, slice: currentSlice, findings, values });
  const completedAt = new Date().toISOString();

  appendExecutionLedgerEntry(targetRoot, {
    type: 'semantic_ux_repair',
    command: 'coder:repair-semantic-ux-findings',
    backend: 'codex_exec',
    slice_id: currentSlice.id,
    started_at: startedAt,
    completed_at: completedAt,
    status: codexResult.status === 0 && validation.violations.length === 0 ? 'completed' : 'failed',
    work_order: workOrderRelPath,
    review_json: reviewJsonRelPath,
    review_md: reviewMdRelPath,
    codex_command: codexResult.command,
    codex_args: codexResult.argsPreview,
    exit_status: codexResult.status,
    exit_signal: codexResult.signal,
    changed_files: changedFiles,
    ignored_generated_artifacts: validation.ignoredGeneratedArtifacts,
    path_policy_violations: validation.violations,
    include_warnings: Boolean(includeWarnings),
  });

  if (codexResult.error) throw new Error(`Codex semantic UX repair failed: ${codexResult.error}`);
  if (codexResult.status !== 0) throw new Error(`Codex semantic UX repair failed with exit status ${codexResult.status}. See output above and ${workOrderRelPath}.`);
  if (validation.violations.length > 0) {
    throw new Error('Codex semantic UX repair changed files outside the allowed repair policy:\n' + validation.violations.map((relPath) => `- ${relPath}`).join('\n') + `\nReview the diff manually. Work order: ${workOrderRelPath}`);
  }

  const fileTargets = deriveImplementationTargets(currentSlice);
  const fabricManifest = loadManifest();
  const implHeader = metadataHeader(implementationNotesRelPath, 'templates/implementation-notes-template.md', fabricManifest.fabric_version, completedAt);
  const notesBody = renderImplementationNotes({
    slice: currentSlice,
    statusLabel: 'Semantic UX Repair Applied',
    fileTargets,
    changedFiles: [
      ...new Set([
        ...changedFiles.filter((relPath) => !isCodexGeneratedArtifact(relPath)),
        workOrderRelPath,
        executionLedgerRelPath(),
      ]),
    ].sort(),
    verificationSummary: [
      `Generated a semantic UX repair work order from ${reviewJsonRelPath}.`,
      `Selected ${String(findings.length)} semantic finding(s) for repair.`,
      validation.violations.length === 0 ? 'Changed files passed the semantic repair allowed-path policy.' : 'Changed files require manual review because they exceeded the semantic repair allowed-path policy.',
    ],
    executionNotes: [
      'This command used Codex as the repair worker and Fabric as the orchestrator/validator.',
      `Work order: ${workOrderRelPath}`,
      `Review source: ${reviewMdRelPath}`,
      `Codex exit status: ${String(codexResult.status)}`,
      includeWarnings ? 'Warnings were included in the repair selection.' : 'Only blocker findings were selected for repair.',
    ],
    nextSteps: [
      'Inspect the git diff created by Codex.',
      'Run npm test and npm run build if Codex did not already run them successfully.',
      'Re-run uiux:review-current-slice-semantics and confirm status is pass.',
      'Complete the user checklist and run coder:close-current-slice only after semantic UX review passes.',
    ],
    generatedAt: completedAt,
  });
  writeTextAtomic(implementationNotesPath, `${implHeader}${notesBody}`);

  console.log('fabric coder:repair-semantic-ux-findings: OK');
  console.log(`- repaired slice: ${currentSlice.id} ${currentSlice.title}`);
  console.log(`- changed files: ${String([...new Set(changedFiles)].length)}`);
  console.log(`- updated: ${implementationNotesRelPath}`);
  console.log('- next: run uiux:review-current-slice-semantics again');
}

async function coderImplementCurrentSlice({ targetRoot, valuesPath, force = false }) {
  const lockHandle = acquireCoderImplementLock(targetRoot);
  try {
    await coderImplementCurrentSliceUnlocked({ targetRoot, valuesPath, force });
  } finally {
    releaseCoderImplementLock(lockHandle);
  }
}

function coderCloseCurrentSlice({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  if (!fs.existsSync(currentSlicePath) || !fs.existsSync(backlogPath)) {
    throw new Error('Cannot run coder:close-current-slice: missing current-slice or backlog artifact');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  const { relPath: baselineRelPath, absPath: baselinePath } = ensureSliceArchitectureBaselinePath(targetRoot, currentSlice.id);
  const { relPath: uxRelPath, absPath: uxPath } = ensureSliceUxFlowPath(targetRoot, currentSlice.id);
  const { relPath: implementationNotesRelPath, absPath: implementationNotesPath } = ensureSliceImplementationNotesPath(targetRoot, currentSlice.id);
  const issues = [];
  const checklistRelPath = checklistPathForSlice(currentSlice.id);
  const checklistAbsPath = path.join(targetRoot, checklistRelPath);
  if (!Array.isArray(currentSlice.acceptance_criteria) || currentSlice.acceptance_criteria.length === 0) {
    issues.push('current slice has no acceptance criteria');
  }
  if (!fs.existsSync(implementationNotesPath)) {
    issues.push(`missing ${implementationNotesRelPath}; run coder:prepare-current-slice first`);
  }
  let implementationNotesText = '';
  let implementationNotesNeedArtifactReconciliation = false;
  if (fs.existsSync(implementationNotesPath)) {
    implementationNotesText = readText(implementationNotesPath);
    if (!implementationNotesContainsChangedFiles(implementationNotesText)) {
      implementationNotesNeedArtifactReconciliation = true;
    }
  }
  if (!fs.existsSync(checklistAbsPath)) {
    issues.push(`missing ${checklistRelPath}; run UI/UX finalize and manual checklist verification first`);
  } else {
    const checklistText = readText(checklistAbsPath);
    if (!new RegExp(`^-\\s*ID:\\s*${String(currentSlice.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(checklistText)) {
      issues.push(`${checklistRelPath} does not match active slice id ${currentSlice.id}`);
    }
    const checklistState = parseChecklistResultState(checklistText);
    if (checklistState === 'unresolved') {
      issues.push(`${checklistRelPath} has unresolved Result state; mark Pass or Fail before closeout`);
    }
    if (checklistState === 'fail') {
      issues.push(`${checklistRelPath} is marked Fail; resolve checklist failures before closeout`);
    }
  }
  const semanticContractRelPath = semanticUxContractRelPathForSlice(currentSlice.id);
  const semanticContractAbsPath = path.join(targetRoot, semanticContractRelPath);
  if (!fs.existsSync(semanticContractAbsPath)) {
    issues.push(`missing ${semanticContractRelPath}; run uiux:generate-current-slice-flow first`);
  }
  const storybookMapPath = path.join(targetRoot, storybookMapRelPath());
  if (!fs.existsSync(storybookMapPath)) {
    issues.push(`missing ${storybookMapRelPath()}; run uiux:generate-storybook-map before closeout`);
  }
  const storybookReviewRelPath = storybookReviewJsonRelPathForSlice(currentSlice.id);
  const storybookReview = readStorybookReviewStatus({ targetRoot, sliceId: currentSlice.id });
  if (!storybookReview.exists) {
    issues.push(`missing ${storybookReviewRelPath}; run uiux:review-current-slice-storybook before closeout`);
  } else if (storybookReview.status !== 'pass') {
    issues.push(`${storybookReviewRelPath} status is ${storybookReview.status}; resolve Storybook coverage findings before closeout`);
  }

  const semanticReviewRelPath = semanticUxReviewJsonRelPathForSlice(currentSlice.id);
  const semanticReview = readSemanticUxReviewStatus({ targetRoot, sliceId: currentSlice.id });
  if (!semanticReview.exists) {
    issues.push(`missing ${semanticReviewRelPath}; run uiux:review-current-slice-semantics before closeout`);
  } else if (semanticReview.status !== 'pass') {
    issues.push(`${semanticReviewRelPath} status is ${semanticReview.status}; resolve semantic UX findings before closeout`);
  } else if (semanticReview.blockerCount > 0) {
    issues.push(`${semanticReviewRelPath} still has blocker findings; resolve semantic UX findings before closeout`);
  }

  for (const [rel, p] of [
    [baselineRelPath, baselinePath],
    [uxRelPath, uxPath],
    [semanticContractRelPath, semanticContractAbsPath],
    [implementationNotesRelPath, implementationNotesPath],
  ]) {
    if (!fs.existsSync(p)) {
      issues.push(`missing ${rel}`);
      continue;
    }
    const placeholders = [...new Set(listAllPlaceholderMatches(readText(p)))];
    if (placeholders.length > 0) {
      issues.push(`${rel} still contains unresolved placeholders (${placeholders.join(', ')})`);
    }
  }
  const fileTargets = deriveImplementationTargets(currentSlice);
  const requiredTargets = requiredImplementationTargets(fileTargets);
  const carryForwardInvariants = collectCarryForwardInvariants({
    targetRoot,
    activeSliceId: currentSlice.id,
  });
  const carryForwardEvidence = validateCarryForwardRegressionEvidence({
    targetRoot,
    currentSlice,
    invariants: carryForwardInvariants,
  });
  for (const issue of carryForwardEvidence.issues) {
    issues.push(issue);
  }
  const onboardingCarryForward = validateDefaultEntryOnboardingCarryForward({
    targetRoot,
    currentSliceId: currentSlice.id,
    checklistText: fs.existsSync(checklistAbsPath) ? readText(checklistAbsPath) : '',
  });
  for (const issue of onboardingCarryForward.issues) {
    issues.push(issue);
  }
  const artifactEvidence = implementationArtifactEvidence(targetRoot, requiredTargets);
  const missingTargets = artifactEvidence
    .filter((entry) => entry.artifacts.length === 0)
    .map((entry) => entry.target);
  if (missingTargets.length > 0) {
    issues.push(`missing implementation artifacts for required targets: ${missingTargets.join(', ')}`);
  }
  const implementedArtifacts = [...new Set(artifactEvidence.flatMap((entry) => entry.artifacts))].sort();
  if (implementedArtifacts.length === 0) {
    issues.push('no implementation artifacts found in src/tests for current slice; run coder:implement-current-slice first');
  }
  const changedFiles = extractChangedFilesFromImplementationNotes(implementationNotesText);
  if (requiredTargets.length > 0 && changedFiles.length > 0) {
    const hasTargetAlignedChange = changedFiles.some((relPath) =>
      requiredTargets.some((target) => targetPatternMatchesPath(target, relPath))
    );
    if (!hasTargetAlignedChange) {
      implementationNotesNeedArtifactReconciliation = true;
    }
  }
  const packageJsonPath = path.join(targetRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    issues.push('missing package.json; run coder:implement-current-slice first');
  } else {
    const pkg = JSON.parse(readText(packageJsonPath));
    if (!pkg?.scripts?.dev) {
      issues.push('package.json is missing a dev script; run coder:implement-current-slice first');
    }
    for (const scriptName of ['storybook', 'build-storybook', 'test:storybook']) {
      if (!pkg?.scripts?.[scriptName]) {
        issues.push(`package.json is missing Storybook script: ${scriptName}; run coder:generate-current-slice-stories first`);
      }
    }
  }
  if (issues.length > 0) {
    console.error('fabric coder:close-current-slice: FAILED');
    issues.forEach((i) => console.error(`- ${i}`));
    process.exit(1);
  }
  const generatedAt = new Date().toISOString();
  const fabricManifest = loadManifest();
  const implHeader = metadataHeader(
    implementationNotesRelPath,
    'templates/implementation-notes-template.md',
    fabricManifest.fabric_version,
    generatedAt,
  );
  const notesBody = renderImplementationNotes({
    slice: currentSlice,
    statusLabel: 'Completed',
    fileTargets,
    changedFiles: implementedArtifacts,
    verificationSummary: [
      `Implementation artifacts recorded for closeout: ${implementedArtifacts.length}.`,
      missingTargets.length === 0 ? 'Required implementation artifacts exist on disk for every required target path.' : 'Required implementation artifacts are missing; closeout should not have proceeded.',
      carryForwardInvariants.length > 0
        ? `Carry-forward regression evidence verified: ${carryForwardEvidence.testRelPath || 'present'}.`
        : 'No prior passed-slice carry-forward invariants required additional regression evidence.',
      implementationNotesNeedArtifactReconciliation ? 'Implementation notes artifact evidence was reconciled from the filesystem during closeout.' : 'Implementation notes artifact evidence already aligned with required target paths or was refreshed during closeout.',
      'Architecture baseline, UX flow, semantic UX contract, and implementation notes are all placeholder-free.',
      `Storybook review passed: ${storybookReviewRelPath}.`,
      `Semantic UX review passed: ${semanticReviewRelPath}.`,
      'package.json includes a local dev command so the slice can be customer-tested.',
    ],
    executionNotes: [
      'Closeout validates concrete implementation artifacts and Storybook coverage before relying on implementation-note evidence.',
      implementationNotesNeedArtifactReconciliation ? 'Closeout auto-reconciled stale implementation-note changed-file evidence from the filesystem.' : 'Closeout refreshed implementation notes with the verified implementation artifact list.',
      'Run fabric gate after closeout to verify overall coherence.',
    ],
    nextSteps: [
      'Run gate before advancing the slice pointer.',
      'Run orchestrator:advance-slice to activate the next slice.',
      'Keep implementation notes as the record for this completed slice.',
      'Issue a customer checkpoint when a customer-facing milestone exists.',
    ],
    generatedAt,
  });
  writeTextAtomic(implementationNotesPath, `${implHeader}${notesBody}`);

  const slices = parseBacklogSlices(readText(backlogPath));
  const updatedSlices = slices.map((slice) => slice.id === currentSlice.id ? { ...slice, status: 'completed' } : slice);
  const completedSlice = { ...currentSlice, status: 'completed', milestone: `${currentSlice.id}_closeout` };
  updateBacklogAndCurrentSliceForActive({ targetRoot, activeSlice: completedSlice, slices: updatedSlices, generatedAt });
  updateManifestActiveSliceState({ targetRoot, activeSlice: completedSlice, generatedAt });

  console.log('fabric coder:close-current-slice: OK');
  console.log(`- closed slice: ${completedSlice.id} ${completedSlice.title}`);
  console.log(`- updated: ${implementationNotesRelPath}`);
  if (implementationNotesNeedArtifactReconciliation) {
    console.log('- reconciled implementation artifact evidence from filesystem');
  }
  console.log('- current slice status: completed');
}

function resolveValuesArgForStatus({ targetRoot, valuesPath }) {
  const rel = path.relative(targetRoot, valuesPath);
  const normalized = rel && rel.length > 0 ? rel : path.basename(valuesPath);
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

function inferNextCommandFromPmStatus({ targetRoot, valuesPath }) {
  const fabricBin = path.join(targetRoot, 'fabric/company/v1/fabric');
  const valuesArg = resolveValuesArgForStatus({ targetRoot, valuesPath });
  const result = spawnSync(
    fabricBin,
    ['pm:status', '--target', '.', '--values', valuesArg, '--format', 'markdown'],
    {
      cwd: targetRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim();
    const stdout = String(result.stdout || '').trim();
    throw new Error(`Cannot run orchestrator:run-until-blocked: pm:status failed.\n${stderr || stdout || '(no output)'}`);
  }
  const output = String(result.stdout || '');
  const commandMatch = output.match(/^- next command:\s*`?([^`\n]+)`?\s*$/im)
    || output.match(/^Next Command:\s*(.+)\s*$/im);
  const stepMatch = output.match(/^- next step:\s*`?([^\n`]+)`?\s*$/im)
    || output.match(/^- next canonical step:\s*`?([^\n`]+)`?\s*$/im)
    || output.match(/^Next Step:\s*([^\n]+)$/im)
    || output.match(/^Next Canonical Step:\s*([^\n]+)$/im);
  const activeSliceMatch = output.match(/^- active slice:\s*`?([^\n`]+)`?\s*$/im)
    || output.match(/^Active Slice:\s*([^\n]+)\s*$/im);
  const activeSliceStateMatch = output.match(/^- active slice state:\s*`?([^\n`]+)`?\s*$/im)
    || output.match(/^Active Slice State:\s*([^\n]+)\s*$/im);
  return {
    commandText: commandMatch ? String(commandMatch[1] || '').trim() : '',
    canonicalStep: stepMatch ? String(stepMatch[1] || '').trim() : '',
    activeSliceId: activeSliceMatch ? String(activeSliceMatch[1] || '').trim() : '',
    activeSliceState: activeSliceStateMatch ? String(activeSliceStateMatch[1] || '').trim() : '',
    rawStatusOutput: output,
  };
}

function printOrchestratorStateSnapshot(progress) {
  console.log('Orchestrator State:');
  console.log(`  Active Slice: ${progress?.activeSliceId || '(not set)'}`);
  console.log(`  Active Slice State: ${progress?.activeSliceState || '(not set)'}`);
  console.log(`  Next Step: ${progress?.canonicalStep || '(none)'}`);
  console.log(`  Next Command: ${progress?.commandText || '(none)'}`);
}

function parseFabricCommandNameFromText(commandText) {
  const match = String(commandText || '').match(/^\s*\.\/fabric\/company\/v1\/fabric\s+([^\s]+)/);
  return match ? String(match[1] || '').trim() : '';
}

function fallbackCanonicalStepForCommand(commandName) {
  const byCommand = {
    'pm:intake': '3',
    'pm:brief-readiness': '4',
    'pm:brief-draft': '5',
    'pm:brief-approve': '6',
    'pm:derive-values': '7',
    'format-from-brief': '8',
    scaffold: '9',
    'pm:plan-slices': '10',
    'pm:finalize-bootstrap-reviews': '11',
    'pm:bootstrap-signoff': '12',
    'uiux:generate-design-system': '13',
    'db:init': '14',
    'db:check': '15',
    'architect:generate-current-slice-baseline': '16',
    'uiux:generate-current-slice-flow': '17',
    'uiux:generate-storybook-map': '17b',
    gate: '18',
    'coder:prepare-current-slice': '19',
    'coder:implement-current-slice': '20',
    'coder:generate-current-slice-stories': '20a',
    'uiux:review-current-slice-storybook': '21',
    'uiux:review-current-slice-semantics': '21b',
    'coder:repair-semantic-ux-findings': '21c',
    'tester:validate-current-slice': '21d',
    'coder:repair-implementation-findings': '21e',
    'coder:close-current-slice': '22',
    'orchestrator:advance-slice': '24',
  };
  return byCommand[String(commandName || '')] || '';
}

function manualBlockReason({ targetRoot, commandName }) {
  if (commandName !== 'coder:close-current-slice') {
    return '';
  }
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) {
    return 'current slice artifact is missing; human recovery is required';
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  const checklistRelPath = checklistPathForSlice(currentSlice.id);
  const checklistAbsPath = path.join(targetRoot, checklistRelPath);
  if (!fs.existsSync(checklistAbsPath)) {
    return `tester gate Step 21d is unresolved: missing ${checklistRelPath}`;
  }
  const checklistState = parseChecklistResultState(readText(checklistAbsPath));
  if (checklistState === 'pass') return '';
  if (checklistState === 'fail') {
    return `tester gate Step 21d is Fail in ${checklistRelPath}; run Step 21e repair before closeout`;
  }
  if (checklistState === 'missing_result_section' || checklistState === 'unresolved') {
    return `tester gate Step 21d is unresolved in ${checklistRelPath}; run tester:validate-current-slice first`;
  }
  return `tester gate Step 21d requires attention in ${checklistRelPath}`;
}

function semanticUxLlmGateFailureInfo(targetRoot) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) return null;
  try {
    const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
    const sliceId = String(currentSlice?.id || '').trim();
    if (!sliceId) return null;
    const reviewRelPath = `docs/reviews/ux/${normalizeSliceIdForWorkOrder(sliceId)}-semantic-ux-review.json`;
    const reviewPath = path.join(targetRoot, reviewRelPath);
    if (!fs.existsSync(reviewPath)) return null;
    const review = parseJsonFile(reviewPath, reviewRelPath);
    if (String(review?.status || '').trim().toLowerCase() !== 'fail') return null;
    const findings = Array.isArray(review?.findings) ? review.findings : [];
    const gateFinding = findings.find((finding) => {
      const issueType = String(finding?.issue_type || '').trim().toLowerCase();
      return issueType === 'llm_review_unavailable' || issueType === 'llm_review_disabled';
    });
    if (!gateFinding) return null;
    const observed = String(gateFinding?.observed || '').trim() || 'LLM semantic reviewer unavailable';
    return {
      issueType: String(gateFinding?.issue_type || '').trim().toLowerCase(),
      reason: `semantic UX review gate is blocked (${observed}); fix LLM connectivity/config or set SEMANTIC_UX_LLM_REQUIRED=false intentionally before rerunning Step 21b`,
    };
  } catch (_) {
    return null;
  }
}

async function runFabricSubcommand({
  targetRoot,
  valuesPath,
  commandName,
  force = false,
  includeWarnings = false,
  envOverrides = null,
}) {
  const fabricBin = path.join(targetRoot, 'fabric/company/v1/fabric');
  const valuesArg = resolveValuesArgForStatus({ targetRoot, valuesPath });
  const args = [commandName, '--target', '.', '--values', valuesArg, '--no-next-steps'];
  if (includeWarnings && commandName === 'coder:repair-semantic-ux-findings') {
    args.push('--include-warnings');
  }
  if (force) {
    args.push('--force');
  }
  return await new Promise((resolve) => {
    const child = spawn(fabricBin, args, {
      cwd: targetRoot,
      env: envOverrides ? { ...process.env, ...envOverrides } : process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let spawnError = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
        stdoutChunks.push(data);
        process.stdout.write(data);
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
        stderrChunks.push(data);
        process.stderr.write(data);
      });
    }
    child.on('error', (error) => {
      spawnError = String(error?.message || error || '');
    });
    child.on('close', (status, signal) => {
      resolve({
        status,
        signal,
        error: spawnError,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
  });
}

function runPostImplementationVerification({ targetRoot }) {
  const packageJsonPath = path.join(targetRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return {
      ok: false,
      failedCheck: 'package.json presence check',
      status: 1,
    };
  }
  const checks = [
    { label: 'npm install', cmd: 'npm', args: ['install'] },
    { label: 'npm test', cmd: 'npm', args: ['test'] },
    { label: 'npm run build', cmd: 'npm', args: ['run', 'build'] },
  ];
  for (const check of checks) {
    console.log(`  - post-implementation verification: ${check.label}`);
    const result = spawnSync(check.cmd, check.args, {
      cwd: targetRoot,
      encoding: 'utf8',
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      return {
        ok: false,
        failedCheck: check.label,
        status: result.status,
      };
    }
  }
  return { ok: true, failedCheck: '', status: 0 };
}

async function orchestratorRunUntilBlocked({ targetRoot, valuesPath, maxSteps = 40 }) {
  const safeMaxSteps = Number.isFinite(Number(maxSteps)) ? Math.max(1, Number(maxSteps)) : 40;
  const seen = new Set();
  let executed = 0;

  console.log('fabric orchestrator:run-until-blocked: starting');
  console.log(`- max steps: ${safeMaxSteps}`);

  while (executed < safeMaxSteps) {
    const next = inferNextCommandFromPmStatus({ targetRoot, valuesPath });
    if (!next.commandText) {
      console.log('fabric orchestrator:run-until-blocked: OK');
      console.log('- no next command inferred by pm:status');
      console.log(`- executed commands: ${executed}`);
      return;
    }

    const commandName = parseFabricCommandNameFromText(next.commandText);
    if (!commandName) {
      console.log('fabric orchestrator:run-until-blocked: BLOCKED');
      console.log(`- reason: next step is not a fabric command (${next.commandText})`);
      console.log(`- executed commands: ${executed}`);
      return;
    }
    if (commandName === 'orchestrator:run-until-blocked') {
      console.log('fabric orchestrator:run-until-blocked: BLOCKED');
      console.log('- reason: recursive next-step resolution');
      console.log(`- executed commands: ${executed}`);
      return;
    }

    const signature = `${next.activeSliceId || '(unknown-slice)'}|${next.activeSliceState || '(unknown-state)'}|${next.canonicalStep}|${commandName}|${next.commandText}`;
    if (seen.has(signature)) {
      const semanticGateInfo = commandName === 'uiux:review-current-slice-semantics'
        ? semanticUxLlmGateFailureInfo(targetRoot)
        : null;
      console.log('fabric orchestrator:run-until-blocked: BLOCKED');
      if (semanticGateInfo?.reason) {
        console.log(`- reason: ${semanticGateInfo.reason}`);
      } else {
        console.log(`- reason: no forward progress (repeated next step ${next.canonicalStep || '(unknown)'})`);
      }
      console.log(`- next command: ${next.commandText}`);
      console.log(`- executed commands: ${executed}`);
      return;
    }
    seen.add(signature);

    const manualReason = manualBlockReason({ targetRoot, commandName });
    if (manualReason) {
      console.log('fabric orchestrator:run-until-blocked: BLOCKED');
      console.log(`- reason: ${manualReason}`);
      console.log(`- next command: ${next.commandText}`);
      console.log(`- executed commands: ${executed}`);
      return;
    }

    const stepLabel = next.canonicalStep || fallbackCanonicalStepForCommand(commandName) || '?';
    console.log('');
    console.log(`-> running step ${stepLabel}: ${commandName}`);
    if (commandName === 'coder:repair-semantic-ux-findings') {
      const semanticGateInfo = semanticUxLlmGateFailureInfo(targetRoot);
      if (semanticGateInfo?.issueType === 'llm_review_unavailable' || semanticGateInfo?.issueType === 'llm_review_disabled') {
        console.log('  - semantic repair is gated by semantic-review LLM availability; rerunning Step 21b in deterministic fallback mode instead of Step 21c');
        const fallbackResult = await runFabricSubcommand({
          targetRoot,
          valuesPath,
          commandName: 'uiux:review-current-slice-semantics',
          envOverrides: {
            SEMANTIC_UX_LLM_ENABLED: 'false',
            SEMANTIC_UX_LLM_REQUIRED: 'false',
          },
        });
        if (fallbackResult.status !== 0) {
          console.log('');
          printOrchestratorStateSnapshot(inferNextCommandFromPmStatus({ targetRoot, valuesPath }));
          console.log('');
          console.log('fabric orchestrator:run-until-blocked: BLOCKED');
          console.log('- reason: semantic UX fallback review failed while bypassing Step 21c LLM-gate repair');
          console.log(`- failed command: ${next.commandText}`);
          console.log(`- executed commands: ${executed}`);
          return;
        }
        executed += 1;
        console.log('  - fallback semantic review passed; continuing without semantic-repair step');
        console.log('');
        printOrchestratorStateSnapshot(inferNextCommandFromPmStatus({ targetRoot, valuesPath }));
        continue;
      }
    }
    let result = await runFabricSubcommand({
      targetRoot,
      valuesPath,
      commandName,
      force: false,
      includeWarnings: commandName === 'coder:repair-semantic-ux-findings',
    });
    if (result.status !== 0) {
      if (commandName === 'uiux:review-current-slice-semantics') {
        const semanticGateInfo = semanticUxLlmGateFailureInfo(targetRoot);
        if (semanticGateInfo?.issueType === 'llm_review_unavailable') {
          console.log('  - semantic UX LLM reviewer unavailable; retrying Step 21b with deterministic fallback mode');
          result = await runFabricSubcommand({
            targetRoot,
            valuesPath,
            commandName,
            envOverrides: {
              SEMANTIC_UX_LLM_ENABLED: 'false',
              SEMANTIC_UX_LLM_REQUIRED: 'false',
            },
          });
          if (result.status === 0) {
            console.log('  - fallback semantic review passed with LLM gate disabled for this run');
          } else {
            const followUpAfterFallback = inferNextCommandFromPmStatus({ targetRoot, valuesPath });
            console.log('');
            printOrchestratorStateSnapshot(followUpAfterFallback);
            console.log('');
            console.log('fabric orchestrator:run-until-blocked: BLOCKED');
            console.log('- reason: semantic UX fallback review failed after LLM unavailability');
            console.log(`- failed command: ${next.commandText}`);
            console.log(`- executed commands: ${executed}`);
            return;
          }
        }
        const followUp = inferNextCommandFromPmStatus({ targetRoot, valuesPath });
        const followUpName = parseFabricCommandNameFromText(followUp.commandText);
        if (followUpName === 'coder:repair-semantic-ux-findings') {
          const followUpSemanticGateInfo = semanticUxLlmGateFailureInfo(targetRoot);
          if (followUpSemanticGateInfo?.issueType === 'llm_review_unavailable' || followUpSemanticGateInfo?.issueType === 'llm_review_disabled') {
            console.log('  - skipping Step 21c because the current semantic finding is an LLM gate issue; rerunning Step 21b in fallback mode');
            result = await runFabricSubcommand({
              targetRoot,
              valuesPath,
              commandName,
              envOverrides: {
                SEMANTIC_UX_LLM_ENABLED: 'false',
                SEMANTIC_UX_LLM_REQUIRED: 'false',
              },
            });
            if (result.status === 0) {
              console.log('  - fallback semantic review passed with LLM gate disabled for this run');
            } else {
              console.log('');
              printOrchestratorStateSnapshot(followUp);
              console.log('');
              console.log('fabric orchestrator:run-until-blocked: BLOCKED');
              console.log('- reason: semantic UX fallback review failed while bypassing Step 21c LLM-gate repair');
              console.log(`- failed command: ${next.commandText}`);
              console.log(`- executed commands: ${executed}`);
              return;
            }
          } else {
            executed += 1;
            console.log('  - semantic UX review reported findings; continuing to repair step with warnings included');
            console.log('');
            printOrchestratorStateSnapshot(followUp);
            continue;
          }
        }
        if (semanticGateInfo?.reason) {
          console.log('');
          printOrchestratorStateSnapshot(followUp);
          console.log('');
          console.log('fabric orchestrator:run-until-blocked: BLOCKED');
          console.log(`- reason: ${semanticGateInfo.reason}`);
          console.log(`- failed command: ${next.commandText}`);
          console.log(`- executed commands: ${executed}`);
          return;
        }
      }
      if (result.status !== 0) {
        console.log('');
        printOrchestratorStateSnapshot(inferNextCommandFromPmStatus({ targetRoot, valuesPath }));
        console.log('');
        console.log('fabric orchestrator:run-until-blocked: BLOCKED');
        console.log(`- reason: command failed (exit ${result.status ?? 'unknown'})`);
        console.log(`- failed command: ${next.commandText}`);
        console.log(`- executed commands: ${executed}`);
        return;
      }
    }

    executed += 1;
    if (commandName === 'coder:implement-current-slice') {
      const verification = runPostImplementationVerification({ targetRoot });
      if (!verification.ok) {
        console.log('');
        printOrchestratorStateSnapshot(inferNextCommandFromPmStatus({ targetRoot, valuesPath }));
        console.log('');
        console.log('fabric orchestrator:run-until-blocked: BLOCKED');
        console.log(`- reason: post-implementation verification failed (${verification.failedCheck}, exit ${verification.status ?? 'unknown'})`);
        console.log(`- failed command: ${verification.failedCheck}`);
        console.log(`- executed commands: ${executed}`);
        return;
      }
    }
    console.log('');
    printOrchestratorStateSnapshot(inferNextCommandFromPmStatus({ targetRoot, valuesPath }));
  }

  console.log('fabric orchestrator:run-until-blocked: BLOCKED');
  console.log(`- reason: reached max-steps (${safeMaxSteps}) before a manual/failure block`);
  console.log(`- executed commands: ${executed}`);
}

function orchestratorAdvanceSlice({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  if (!fs.existsSync(currentSlicePath) || !fs.existsSync(backlogPath)) {
    throw new Error('Cannot run orchestrator:advance-slice: missing current-slice or backlog artifact');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  if (String(currentSlice.status || '').toLowerCase() !== 'completed') {
    throw new Error('Cannot run orchestrator:advance-slice: current slice is not completed. Run coder:close-current-slice first.');
  }
  const slices = parseBacklogSlices(readText(backlogPath));
  const currentIndex = slices.findIndex((slice) => slice.id === currentSlice.id);
  if (currentIndex === -1) {
    throw new Error('Cannot run orchestrator:advance-slice: active slice not found in backlog');
  }
  const nextSlice = slices.slice(currentIndex + 1).find((slice) => String(slice.status || '').toLowerCase() !== 'completed');
  if (!nextSlice) {
    console.log('fabric orchestrator:advance-slice: OK');
    console.log('- no remaining slices to activate');
    console.log('- backlog is complete or has no next actionable slice');
    return;
  }
  const generatedAt = new Date().toISOString();
  const activatedSlice = { ...nextSlice, status: 'planned', milestone: nextSlice.milestone || `${nextSlice.id}_delivery` };
  const updatedSlices = slices.map((slice) => {
    if (slice.id === activatedSlice.id) {
      return { ...slice, status: 'planned', milestone: activatedSlice.milestone };
    }
    return slice;
  });
  updateBacklogAndCurrentSliceForActive({ targetRoot, activeSlice: activatedSlice, slices: updatedSlices, generatedAt });
  updateManifestActiveSliceState({ targetRoot, activeSlice: activatedSlice, generatedAt });
  console.log('fabric orchestrator:advance-slice: OK');
  console.log(`- previous slice: ${currentSlice.id} ${currentSlice.title} (completed)`);
  console.log(`- activated next slice: ${activatedSlice.id} ${activatedSlice.title} (${activatedSlice.status})`);
  console.log('- current-slice and manifest updated cleanly');
}

export {
  initFactory,
  formatFromBrief,
  instantiate,
  scaffold,
  validate,
  doctor,
  gate,
  dbInit,
  dbCheck,
  dbReset,
  coderPrepareCurrentSlice,
  coderImplementCurrentSlice,
  coderRepairSemanticUxFindings,
  coderRepairImplementationFindings,
  coderCloseCurrentSlice,
  orchestratorRunUntilBlocked,
  orchestratorAdvanceSlice,
};
