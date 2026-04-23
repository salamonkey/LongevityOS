import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
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

function initFactory({ targetRoot, valuesPath, force, initValues, forceValues }) {
  if (initValues) {
    initValuesFile(valuesPath, forceValues);
    console.log(
      'fabric init-factory: NOTE --init-values requested; values file was intentionally initialized early from fabric.values.example.json.',
    );
    console.log(
      'fabric init-factory: To defer values creation until brief approval, omit --init-values and run pm:approve-brief later.',
    );
  } else if (!fs.existsSync(valuesPath)) {
    console.log(
      'fabric init-factory: values file not found; continuing in brief-first mode (values will be created by pm:approve-brief).',
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
  console.log('fabric format-from-brief: brief is approved, execution can proceed');
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

  console.log(`fabric scaffold: generated ${outputs.length} files`);
  outputs.forEach((item) => console.log(`- ${item}`));
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

function dbSeed({ targetRoot, yes }) {
  const manifest = loadManifest();
  const seedPath = path.join(targetRoot, 'supabase/seed.sql');
  if (!fs.existsSync(seedPath)) {
    throw new Error('Cannot run db:seed: missing supabase/seed.sql');
  }
  const command = manifest?.db?.seed_command || 'supabase db reset';
  if (/\breset\b/i.test(command) && !yes) {
    throw new Error("db:seed requires --yes when seed_command includes 'reset' (destructive operation)");
  }
  console.log(`fabric db:seed: executing '${command}'`);
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
    process.exit(1);
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
    process.exit(1);
  }

  console.log('fabric doctor: OK');
}

function gate({ targetRoot, valuesPath }) {
  validate({ targetRoot, valuesPath });
  doctor({ targetRoot, valuesPath });
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
    '## Fail conditions',
    ...failConditions.map((item) => `- ${item}`),
    '',
    '## Out of scope for this slice',
    ...outOfScope.map((item) => `- ${item}`),
    '',
    '## Result',
    '- Pass / Fail',
    '- Notes:',
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

function deriveImplementationTargets(slice) {
  const slug = slugifySliceTitle(slice.title);
  const scopeHints = String([slice.title, slice.objective, ...(slice.in_scope || [])].join(' ')).toLowerCase();
  const targets = [];
  if (scopeHints.includes('onboarding')) {
    targets.push('src/features/onboarding/');
    targets.push('src/features/profile/');
    targets.push('src/routes/onboarding*');
    targets.push('tests/onboarding/');
  } else {
    targets.push(`src/features/${slug}/`);
    targets.push(`src/routes/${slug}*`);
    targets.push(`tests/${slug}/`);
  }
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
  const baselinePath = path.join(targetRoot, 'docs/architecture/baseline.md');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run coder:prepare-current-slice: missing docs/product/current-slice.yaml');
  }
  if (!fs.existsSync(baselinePath)) {
    throw new Error('Cannot run coder:prepare-current-slice: missing docs/architecture/baseline.md');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  const { relPath: uxRelPath, absPath: uxPath } = ensureSliceUxFlowPath(targetRoot, currentSlice.id);
  if (!fs.existsSync(uxPath)) {
    throw new Error(`Cannot run coder:prepare-current-slice: missing ${uxRelPath}; run uiux:finalize-current-slice-flow first`);
  }
  const { relPath: implementationNotesRelPath, absPath: implementationNotesPath } = ensureSliceImplementationNotesPath(targetRoot, currentSlice.id);
  assertNoPlaceholdersInArtifact('docs/architecture/baseline.md', readText(baselinePath));
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
      'Architecture baseline and UX flow are both finalized and placeholder-free.',
    ],
    nextSteps: [
      'Implement the slice against the file/module targets above.',
      'Record any scope deviations before closeout.',
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
  const values = loadValuesIfPresent(valuesPath) || {};
  const packageJsonPath = path.join(targetRoot, 'package.json');
  const createdPackageJson = ensurePackageJson(packageJsonPath, values);
  const pkg = JSON.parse(readText(packageJsonPath));
  pkg.private = true;
  pkg.type = 'module';
  pkg.scripts = pkg.scripts || {};
  Object.assign(pkg.scripts, {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
    test: 'node --test tests/**/*.test.mjs',
  });
  pkg.dependencies = pkg.dependencies || {};
  if (!pkg.dependencies.react) {
    pkg.dependencies.react = '^18.3.1';
  }
  if (!pkg.dependencies['react-dom']) {
    pkg.dependencies['react-dom'] = '^18.3.1';
  }
  pkg.devDependencies = pkg.devDependencies || {};
  if (!pkg.devDependencies.vite) {
    pkg.devDependencies.vite = '^5.4.10';
  }
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return { createdPackageJson, packageJsonPath };
}

function implementationNotesContainsChangedFiles(notesText) {
  return /## 5\. Changed Files[\s\S]*?^-\s+/m.test(notesText);
}

function requiredImplementationTargets(fileTargets) {
  return (fileTargets || [])
    .map((target) => String(target || '').trim())
    .filter((target) => target.length > 0 && !target.includes('(if schema change is required)'));
}

function artifactsForTarget(targetRoot, targetPattern) {
  const normalized = String(targetPattern).trim();
  if (!normalized) {
    return [];
  }
  if (normalized.endsWith('/')) {
    const dirPath = path.join(targetRoot, normalized);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const entries = fs.readdirSync(dirPath);
      if (entries.length > 0) {
        return entries.map((name) => path.posix.join(normalized.replace(/\/+$/, ''), name));
      }
    }
    return [];
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

function parseChecklistResultState(checklistText) {
  const resultMatch = String(checklistText || '').match(/## Result\s*([\s\S]*?)$/m);
  if (!resultMatch) {
    return 'missing_result_section';
  }
  const resultBody = resultMatch[1];
  if (/\b-\s*Pass\s*\/\s*Fail\b/i.test(resultBody)) {
    return 'unresolved';
  }
  if (/\b-\s*Fail\b/i.test(resultBody)) {
    return 'fail';
  }
  if (/\b-\s*Pass\b/i.test(resultBody)) {
    return 'pass';
  }
  return 'unresolved';
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

const IMPLEMENTATION_LEAK_PATTERN = /\b(react|vite|api|endpoint|scaffold|slice|acceptance|backend|frontend|persistence|persist|schema|rule[\s_-]?engine|rule[\s_-]?version|httponly|cookie|integration\s+tests?|smoke\s+tests?|dashboard\s+payload|generated_action|profile\s+summary\s+placeholder|next-action\s+card|bucket\s+assignment|viewports?)\b/i;

function sanitizeDemoItems(candidateItems, fallbackItems) {
  const safe = [];
  const seen = new Set();
  const source = Array.isArray(candidateItems) ? candidateItems : [];
  for (const item of source) {
    const normalized = String(item || '').replace(/\s+/g, ' ').trim();
    if (!normalized || normalized.length < 8) continue;
    if (IMPLEMENTATION_LEAK_PATTERN.test(normalized)) continue;
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
  files.set('tests/onboarding/onboarding.smoke.test.mjs', `${renderManagedSourceHeader('tests/onboarding/onboarding.smoke.test.mjs')}import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\ntest('generated onboarding app shell exists', () => {\n  assert.equal(fs.existsSync(new URL('../../src/App.jsx', import.meta.url)), true);\n  assert.equal(fs.existsSync(new URL('../../src/features/onboarding/OnboardingPage.jsx', import.meta.url)), true);\n  assert.equal(fs.existsSync(new URL('../../src/routes/onboarding.jsx', import.meta.url)), true);\n});\n`);

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

async function coderImplementCurrentSlice({ targetRoot, valuesPath, force = false }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const baselinePath = path.join(targetRoot, 'docs/architecture/baseline.md');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run coder:implement-current-slice: missing docs/product/current-slice.yaml');
  }
  if (!fs.existsSync(baselinePath)) {
    throw new Error('Cannot run coder:implement-current-slice: missing docs/architecture/baseline.md');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
  const { relPath: uxRelPath, absPath: uxPath } = ensureSliceUxFlowPath(targetRoot, currentSlice.id);
  if (!fs.existsSync(uxPath)) {
    throw new Error(`Cannot run coder:implement-current-slice: missing ${uxRelPath}; run uiux:finalize-current-slice-flow first`);
  }
  const { relPath: implementationNotesRelPath, absPath: implementationNotesPath } = ensureSliceImplementationNotesPath(targetRoot, currentSlice.id);
  if (!fs.existsSync(implementationNotesPath)) {
    throw new Error(`Cannot run coder:implement-current-slice: missing ${implementationNotesRelPath}; run coder:prepare-current-slice first`);
  }
  const fileTargets = deriveImplementationTargets(currentSlice);
  const baselineText = readText(baselinePath);
  const uxFlowText = readText(uxPath);
  const briefText = fs.existsSync(briefPath) ? readText(briefPath) : '';
  const framingText = fs.existsSync(framingPath) ? readText(framingPath) : '';

  let implementationMode = 'heuristic';
  let playbookOverride = null;
  try {
    const values = loadValuesIfPresent(valuesPath);
    console.log('fabric coder:implement-current-slice: starting model-driven implementation generation...');
    const { settings, purpose, playbook } = await generateCurrentSliceImplementationPlaybook({
      values,
      slice: currentSlice,
      baselineMarkdown: baselineText,
      uxFlowMarkdown: uxFlowText,
      briefMarkdown: briefText,
      framingMarkdown: framingText,
      onProgress: (message) => {
        console.log(`fabric coder:implement-current-slice: ${String(message)}`);
      },
    });
    playbookOverride = playbook;
    implementationMode = 'model_driven';
    if (purpose) {
      console.log(`fabric coder:implement-current-slice: llm profile ${purpose}`);
    }
    console.log(`fabric coder:implement-current-slice: model coder ${settings.provider}/${settings.model}`);
  } catch (error) {
    const reason = error?.message ? String(error.message) : String(error);
    console.warn(`fabric coder:implement-current-slice: model-driven generation unavailable (${reason})`);
    console.warn('fabric coder:implement-current-slice: falling back to deterministic implementation generation.');
    implementationMode = 'heuristic_fallback';
  }

  const files = buildGeneratedAppFiles(currentSlice, playbookOverride);
  const changedFiles = [];
  for (const [relPath, content] of files.entries()) {
    const outPath = path.join(targetRoot, relPath);
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
      implementationMode === 'model_driven'
        ? 'This command wrote model-driven starter code into src/ and tests/ using the current slice architecture and UX contracts.'
        : 'This command wrote deterministic starter code into src/ and tests/ so the slice becomes customer-testable locally.',
      'Run npm install after generation to fetch any newly-added React/Vite dependencies.',
      'Use --force only when you want fabric to replace non-generated implementation files.',
    ],
    nextSteps: [
      'Run npm install to sync dependencies if package.json changed.',
      'Run npm run dev to open the customer-testable surface.',
      'Run coder:close-current-slice after verifying the slice locally.',
    ],
    generatedAt,
  });
  writeTextAtomic(implementationNotesPath, `${implHeader}${notesBody}`);

  console.log('fabric coder:implement-current-slice: OK');
  console.log(`- implemented: ${currentSlice.id} ${currentSlice.title}`);
  console.log(`- changed files: ${String([...new Set(changedFiles)].length)}`);
  console.log('- app scaffold: React + Vite');
  console.log(`- implementation mode: ${implementationMode}`);
  console.log('- package scripts: dev, build, preview, test');
}

function coderCloseCurrentSlice({ targetRoot, valuesPath }) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const baselinePath = path.join(targetRoot, 'docs/architecture/baseline.md');
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  if (!fs.existsSync(currentSlicePath) || !fs.existsSync(backlogPath)) {
    throw new Error('Cannot run coder:close-current-slice: missing current-slice or backlog artifact');
  }
  const currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));
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
  if (fs.existsSync(implementationNotesPath)) {
    implementationNotesText = readText(implementationNotesPath);
    if (!implementationNotesContainsChangedFiles(implementationNotesText)) {
      issues.push('implementation notes do not record changed files; run coder:implement-current-slice first');
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
  for (const [rel, p] of [
    ['docs/architecture/baseline.md', baselinePath],
    [uxRelPath, uxPath],
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
  const missingTargets = requiredTargets.filter((target) => artifactsForTarget(targetRoot, target).length === 0);
  if (missingTargets.length > 0) {
    issues.push(`missing implementation artifacts for required targets: ${missingTargets.join(', ')}`);
  }
  const implementedArtifacts = collectImplementedArtifacts(targetRoot, fileTargets);
  if (implementedArtifacts.length === 0) {
    issues.push('no implementation artifacts found in src/tests for current slice; run coder:implement-current-slice first');
  }
  const changedFiles = extractChangedFilesFromImplementationNotes(implementationNotesText);
  if (requiredTargets.length > 0 && changedFiles.length > 0) {
    const hasTargetAlignedChange = changedFiles.some((relPath) =>
      requiredTargets.some((target) => targetPatternMatchesPath(target, relPath))
    );
    if (!hasTargetAlignedChange) {
      issues.push('implementation notes changed files do not include any required target paths for this slice');
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
      'Architecture baseline, UX flow, and implementation notes are all placeholder-free.',
      'package.json includes a local dev command so the slice can be customer-tested.',
    ],
    executionNotes: [
      'Closeout now requires concrete implementation artifacts rather than documentation alone.',
      'Run fabric gate after closeout to verify overall coherence.',
    ],
    nextSteps: [
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
  console.log('- current slice status: completed');
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
  dbSeed,
  coderPrepareCurrentSlice,
  coderImplementCurrentSlice,
  coderCloseCurrentSlice,
  orchestratorAdvanceSlice,
};
