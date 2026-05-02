#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  parseArgs,
  parseSliceBlockWithLists,
  readText,
  writeTextAtomic,
  quoteYamlString,
  setSectionScalar,
  setTopLevelScalar,
} from './lib/core.mjs';
import {
  llmCheck,
  pmIntake,
  pmBriefDraft,
  pmBriefReadiness,
  pmBriefApprove,
  pmDeriveValues,
  pmBriefSemanticCheck,
  pmApproveBrief,
  pmStatus,
  pmBootstrapSignoff,
  pmPlanSlices,
  pmFinalizeBootstrapReviews,
  architectGenerateCurrentSliceBaseline,
  uiuxGenerateCurrentSliceFlow,
} from './commands/product.mjs';
import {
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
  coderCloseCurrentSlice,
  orchestratorAdvanceSlice,
} from './commands/runtime.mjs';
import { createRunContext } from './lib/ledger/run-context.mjs';
import { writeLedgerEvent } from './lib/ledger/event.mjs';

const FABRIC_FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FABRIC_FACTORY_ENV_PATH = path.join(FABRIC_FACTORY_ROOT, '.factory.env');
const FLOW_CHECK_STEP_BY_COMMAND = Object.freeze({
  'pm:brief-readiness': '4',
  'format-from-brief': '8',
  'pm:bootstrap-signoff': '12',
  gate: '16|21|23',
});
const TRACKED_FLOW_CHECK_COMMANDS = new Set(Object.keys(FLOW_CHECK_STEP_BY_COMMAND));

function parseFactoryEnvLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  const key = String(match[1]).trim();
  let value = String(match[2] ?? '');
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith('\'') && value.endsWith('\''))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function applyFactoryEnvDefaults(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return { loaded: false, appliedCount: 0 };
  }
  const text = fs.readFileSync(envFilePath, 'utf8');
  const lines = text.split(/\r?\n/);
  let appliedCount = 0;
  for (const line of lines) {
    const parsed = parseFactoryEnvLine(line);
    if (!parsed) continue;
    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
      appliedCount += 1;
    }
  }
  return { loaded: true, appliedCount };
}

applyFactoryEnvDefaults(FABRIC_FACTORY_ENV_PATH);

function shellQuote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) {
    return text;
  }
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

function displayTargetPath(targetRoot) {
  return path.resolve(targetRoot) === process.cwd() ? '.' : targetRoot;
}

function displayValuesPath(targetRoot, valuesPath) {
  const rel = path.relative(targetRoot, valuesPath);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
    return rel.startsWith('.') ? rel : `./${rel}`;
  }
  return valuesPath;
}

function buildFabricCommand(commandName, {
  targetRoot,
  valuesPath,
  includeTarget = true,
  includeValues = true,
  extraArgs = [],
}) {
  const parts = ['./fabric/company/v1/fabric', commandName];
  if (includeTarget) {
    parts.push('--target', displayTargetPath(targetRoot));
  }
  if (includeValues) {
    parts.push('--values', displayValuesPath(targetRoot, valuesPath));
  }
  parts.push(...extraArgs);
  return parts.map(shellQuote).join(' ');
}

function normalizedSliceIdForPath(sliceId) {
  return String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
}

function baselineRelPathForSlice(sliceId) {
  return `docs/architecture/${normalizedSliceIdForPath(sliceId)}-baseline.md`;
}

function uxFlowRelPathForSlice(sliceId) {
  return `docs/ux/${normalizedSliceIdForPath(sliceId)}-current-slice-flow.md`;
}

function resolveGateNextSteps({ cmd, targetRoot }) {
  const fallback = [
    cmd('db:check', { includeValues: false }),
    cmd('pm:intake', { includeValues: false }),
  ];
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) {
    return fallback;
  }
  try {
    const slice = parseSliceBlockWithLists(readText(currentSlicePath));
    const sliceId = String(slice?.id || '').trim();
    const sliceStatus = String(slice?.status || '').trim().toLowerCase();
    if (!sliceId) {
      return fallback;
    }
    if (sliceStatus === 'planned') {
      const baselineExists = fs.existsSync(path.join(targetRoot, baselineRelPathForSlice(sliceId)));
      const uxExists = fs.existsSync(path.join(targetRoot, uxFlowRelPathForSlice(sliceId)));
      if (!baselineExists) {
        return [
          cmd('architect:generate-current-slice-baseline'),
          cmd('uiux:generate-current-slice-flow'),
        ];
      }
      if (!uxExists) {
        return [
          cmd('uiux:generate-current-slice-flow'),
          cmd('coder:prepare-current-slice'),
        ];
      }
      return [
        cmd('coder:prepare-current-slice'),
        cmd('coder:implement-current-slice'),
      ];
    }
    if (sliceStatus === 'in_progress') {
      return [
        cmd('coder:implement-current-slice'),
        cmd('coder:close-current-slice'),
      ];
    }
    if (sliceStatus === 'completed') {
      return [
        cmd('orchestrator:advance-slice'),
        cmd('gate'),
      ];
    }
    return fallback;
  } catch (_) {
    return fallback;
  }
}

const NEXT_STEP_BUILDERS = {
  'init-factory': ({ cmd }) => [
    cmd('pm:intake', { includeValues: false }),
    cmd('pm:brief-readiness', { includeValues: false }),
  ],
  'llm:check': ({ cmd }) => [
    cmd('pm:intake', { includeValues: false }),
    cmd('pm:brief-readiness', { includeValues: false }),
    cmd('pm:plan-slices'),
  ],
  'pm:intake': ({ cmd }) => [
    cmd('pm:brief-readiness', { includeValues: false }),
  ],
  'pm:brief-readiness': ({ cmd }) => [
    cmd('pm:brief-draft', { includeValues: false }),
  ],
  'pm:brief-draft': ({ cmd }) => [
    cmd('pm:brief-approve', { includeValues: false }),
  ],
  'pm:brief-approve': ({ cmd }) => [
    cmd('pm:derive-values', { includeValues: false }),
  ],
  'pm:derive-values': ({ cmd }) => [
    cmd('format-from-brief', { includeValues: false }),
  ],
  'pm:brief-semantic-check': ({ cmd }) => [
    'ensure the validated brief is saved at docs/product/project-brief.md',
    cmd('pm:brief-approve', { includeValues: false }),
  ],
  'pm:approve-brief': ({ cmd }) => [
    cmd('pm:derive-values', { includeValues: false }),
    cmd('format-from-brief', { includeValues: false }),
  ],
  'pm:finalize-bootstrap-reviews': ({ cmd }) => [
    cmd('pm:bootstrap-signoff'),
    cmd('db:init'),
  ],
  'pm:bootstrap-signoff': ({ cmd }) => [
    cmd('db:init'),
    cmd('gate'),
  ],
  'pm:plan-slices': ({ cmd }) => [
    cmd('architect:generate-current-slice-baseline'),
    cmd('uiux:generate-current-slice-flow'),
    cmd('coder:prepare-current-slice'),
  ],
  'architect:generate-current-slice-baseline': ({ cmd }) => [
    cmd('uiux:generate-current-slice-flow'),
    cmd('coder:prepare-current-slice'),
  ],
  'uiux:generate-current-slice-flow': ({ cmd }) => [
    cmd('coder:prepare-current-slice'),
    cmd('coder:implement-current-slice'),
  ],
  'coder:prepare-current-slice': ({ cmd }) => [
    cmd('coder:implement-current-slice'),
    cmd('coder:close-current-slice'),
  ],
  'coder:implement-current-slice': ({ cmd }) => [
    cmd('coder:close-current-slice'),
    cmd('orchestrator:advance-slice'),
  ],
  'coder:close-current-slice': ({ cmd }) => [
    cmd('gate'),
    cmd('orchestrator:advance-slice'),
  ],
  'orchestrator:advance-slice': ({ cmd }) => [
    cmd('gate'),
    cmd('architect:generate-current-slice-baseline'),
  ],
  'format-from-brief': ({ cmd }) => [
    cmd('scaffold'),
    cmd('pm:plan-slices'),
  ],
  scaffold: ({ cmd }) => [
    cmd('pm:plan-slices'),
    cmd('pm:finalize-bootstrap-reviews'),
  ],
  instantiate: ({ cmd }) => [
    cmd('validate'),
    cmd('doctor', { includeValues: false }),
  ],
  validate: ({ cmd }) => [
    cmd('doctor', { includeValues: false }),
    cmd('gate'),
  ],
  doctor: ({ cmd }) => [
    cmd('gate'),
    cmd('db:check', { includeValues: false }),
  ],
  gate: ({ cmd, targetRoot }) => resolveGateNextSteps({ cmd, targetRoot }),
  'db:init': ({ cmd }) => [
    cmd('db:check', { includeValues: false }),
    cmd('architect:generate-current-slice-baseline'),
  ],
  'db:check': ({ cmd }) => [
    cmd('architect:generate-current-slice-baseline'),
    cmd('uiux:generate-current-slice-flow'),
    cmd('gate'),
  ],
  'db:reset': ({ cmd }) => [
    cmd('db:check', { includeValues: false }),
    cmd('gate'),
  ],
};

const CANONICAL_STEP_BY_COMMAND = Object.freeze({
  'init-factory': '2',
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
  'db:init': '13',
  'db:check': '13b',
  'architect:generate-current-slice-baseline': '14',
  'uiux:generate-current-slice-flow': '15',
  'coder:prepare-current-slice': '17',
  'coder:implement-current-slice': '18',
  'coder:close-current-slice': '20',
  'orchestrator:advance-slice': '22',
});

const CANONICAL_STEP_OVERRIDE_BY_FROM_COMMAND = Object.freeze({
  'db:check': Object.freeze({
    gate: '16',
  }),
  'db:reset': Object.freeze({
    gate: '16',
  }),
  'coder:close-current-slice': Object.freeze({
    gate: '21',
    'orchestrator:advance-slice': '22',
  }),
  'orchestrator:advance-slice': Object.freeze({
    gate: '23',
    'architect:generate-current-slice-baseline': '14',
  }),
  gate: Object.freeze({
    gate: '23',
    'orchestrator:advance-slice': '22',
    'architect:generate-current-slice-baseline': '14',
    'uiux:generate-current-slice-flow': '15',
    'coder:prepare-current-slice': '17',
    'coder:implement-current-slice': '18',
    'coder:close-current-slice': '20',
  }),
});

function extractFabricCommandName(stepText) {
  const match = String(stepText || '').match(/^\s*\.\/fabric\/company\/v1\/fabric\s+([^\s]+)/);
  return match ? String(match[1] || '').trim() : '';
}

function resolveCanonicalStepLabel({ fromCommand, stepText }) {
  const toCommand = extractFabricCommandName(stepText);
  if (!toCommand) return '';
  const fromOverrides = CANONICAL_STEP_OVERRIDE_BY_FROM_COMMAND[String(fromCommand || '')];
  if (fromOverrides && fromOverrides[toCommand]) {
    return String(fromOverrides[toCommand]);
  }
  if (Object.prototype.hasOwnProperty.call(CANONICAL_STEP_BY_COMMAND, toCommand)) {
    return String(CANONICAL_STEP_BY_COMMAND[toCommand]);
  }
  return '';
}

function printNextSteps({ command, targetRoot, valuesPath }) {
  const builder = NEXT_STEP_BUILDERS[command];
  if (!builder) {
    return;
  }
  const cmd = (commandName, options = {}) => buildFabricCommand(commandName, {
    targetRoot,
    valuesPath,
    ...options,
  });
  const steps = builder({ cmd, targetRoot, valuesPath, command }).filter(Boolean);
  if (steps.length === 0) {
    return;
  }
  console.log('');
  console.log('Next steps:');
  for (let i = 0; i < steps.length; i += 1) {
    const canonicalStep = resolveCanonicalStepLabel({ fromCommand: command, stepText: steps[i] });
    const label = canonicalStep || String(i + 1);
    console.log(`  ${label}) ${steps[i]}`);
  }
}

function usage() {
  console.log(
    'Usage: fabric <init-factory|llm:check|pm:intake|pm:brief-readiness|pm:brief-draft|pm:brief-approve|pm:derive-values|pm:brief-semantic-check|pm:approve-brief|pm:status|pm:finalize-bootstrap-reviews|pm:bootstrap-signoff|pm:plan-slices|architect:generate-current-slice-baseline|uiux:generate-current-slice-flow|coder:prepare-current-slice|coder:implement-current-slice|coder:close-current-slice|orchestrator:advance-slice|format-from-brief|scaffold|instantiate|validate|doctor|gate|db:init|db:check|db:reset> [options]',
  );
  console.log(
    '  init-factory --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--force] [--init-values] [--force-values]',
  );
  console.log('  llm:check --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:intake --target <project-root>');
  console.log('  pm:brief-readiness --target <project-root>');
  console.log('  pm:brief-draft --target <project-root>');
  console.log('  pm:brief-approve --target <project-root>');
  console.log('  pm:derive-values --target <project-root>');
  console.log('  pm:brief-semantic-check --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--brief <path>]');
  console.log('  pm:approve-brief --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:status --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--format <terminal|markdown>]');
  console.log('  pm:finalize-bootstrap-reviews --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  architect:generate-current-slice-baseline --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  uiux:generate-current-slice-flow --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  coder:prepare-current-slice --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  coder:implement-current-slice --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--force]');
  console.log('  coder:close-current-slice --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  orchestrator:advance-slice --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:bootstrap-signoff --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:plan-slices --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--model-driven] [--heuristic]');
  console.log('  format-from-brief --target <project-root>');
  console.log('  scaffold --values <fabric.values.json|fabric.values.yaml> --target <project-root> [--force]');
  console.log('  instantiate --values <fabric.values.json|fabric.values.yaml> --target <project-root> [--force]');
  console.log('  validate --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  doctor --target <project-root>');
  console.log('  gate --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  db:init --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--force]');
  console.log('  db:check --target <project-root>');
  console.log('  db:reset --target <project-root> --yes');
  console.log('  --no-next-steps (global): suppress post-command next-step guidance');
}

function safeFlowCheckMessage(error) {
  const text = String(error?.message || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Unknown flow check result';
  return text.slice(0, 240);
}

function recordFlowCheckStatus({ targetRoot, command, result, message = '' }) {
  if (!TRACKED_FLOW_CHECK_COMMANDS.has(String(command || ''))) {
    return;
  }
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  if (!fs.existsSync(manifestPath)) {
    return;
  }

  const now = new Date().toISOString();
  let manifestText = readText(manifestPath);
  manifestText = setSectionScalar(
    manifestText,
    'status',
    'last_flow_check_command',
    quoteYamlString(String(command || '')),
  );
  manifestText = setSectionScalar(
    manifestText,
    'status',
    'last_flow_check_step',
    quoteYamlString(String(FLOW_CHECK_STEP_BY_COMMAND[String(command || '')] || '')),
  );
  manifestText = setSectionScalar(manifestText, 'status', 'last_flow_check_result', quoteYamlString(String(result || '')));
  manifestText = setSectionScalar(manifestText, 'status', 'last_flow_check_checked_at_utc', quoteYamlString(now));
  manifestText = setSectionScalar(manifestText, 'status', 'last_flow_check_message', quoteYamlString(String(message || '')));
  manifestText = setTopLevelScalar(manifestText, 'last_updated_utc', quoteYamlString(now));
  writeTextAtomic(manifestPath, manifestText);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || ['-h', '--help', 'help'].includes(command)) {
    usage();
    return;
  }

  const targetRoot = path.resolve(String(args.target || '.'));
  const jsonValuesPath = path.join(targetRoot, 'fabric.values.json');
  const yamlValuesPath = path.join(targetRoot, 'fabric.values.yaml');
  const defaultValuesPath = fs.existsSync(jsonValuesPath)
    ? jsonValuesPath
    : (fs.existsSync(yamlValuesPath) ? yamlValuesPath : jsonValuesPath);
  const valuesPath = path.resolve(String(args.values || defaultValuesPath));
  const shouldPrintNextSteps = !Boolean(args['no-next-steps']);
  const runContext = createRunContext({
    command,
    targetRoot,
    valuesPath,
    argv: process.argv.slice(2),
  });
  const runWithGuidance = async (handler) => {
    const startedAt = Date.now();
    writeLedgerEvent({
      targetRoot,
      runContext,
      event: {
        event_type: 'command_started',
        status: 'running',
      },
    });
    try {
      await handler();
      const durationMs = Date.now() - startedAt;
      recordFlowCheckStatus({
        targetRoot,
        command,
        result: 'passed',
        message: 'command completed successfully',
      });
      writeLedgerEvent({
        targetRoot,
        runContext,
        event: {
          event_type: 'command_succeeded',
          status: 'success',
          duration_ms: durationMs,
        },
      });
      if (shouldPrintNextSteps) {
        printNextSteps({ command, targetRoot, valuesPath });
      }
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      recordFlowCheckStatus({
        targetRoot,
        command,
        result: 'failed',
        message: safeFlowCheckMessage(error),
      });
      writeLedgerEvent({
        targetRoot,
        runContext,
        event: {
          event_type: 'command_failed',
          status: 'failed',
          duration_ms: durationMs,
          error,
        },
      });
      throw error;
    }
  };

  if (command === 'init-factory') {
    await runWithGuidance(() => initFactory({
      targetRoot,
      valuesPath,
      force: Boolean(args.force),
      initValues: Boolean(args['init-values']),
      forceValues: Boolean(args['force-values']),
    }));
    return;
  }
  if (command === 'llm:check') {
    await runWithGuidance(() => llmCheck({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'pm:intake') {
    await runWithGuidance(() => pmIntake({ targetRoot }));
    return;
  }
  if (command === 'pm:brief-readiness') {
    await runWithGuidance(() => pmBriefReadiness({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'pm:brief-draft') {
    await runWithGuidance(() => pmBriefDraft({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'pm:brief-approve') {
    await runWithGuidance(() => pmBriefApprove({ targetRoot }));
    return;
  }
  if (command === 'pm:derive-values') {
    await runWithGuidance(() => pmDeriveValues({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'pm:brief-semantic-check') {
    await runWithGuidance(() => pmBriefSemanticCheck({ targetRoot, valuesPath, briefPath: args.brief }));
    return;
  }
  if (command === 'pm:approve-brief') {
    await runWithGuidance(() => pmApproveBrief({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'pm:status') {
    await runWithGuidance(() => pmStatus({ targetRoot, valuesPath, format: args.format }));
    return;
  }
  if (command === 'pm:finalize-bootstrap-reviews') {
    await runWithGuidance(() => pmFinalizeBootstrapReviews({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'pm:bootstrap-signoff') {
    await runWithGuidance(() => pmBootstrapSignoff({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'pm:plan-slices') {
    await runWithGuidance(() => pmPlanSlices({
      targetRoot,
      valuesPath,
      modelDriven: Boolean(args['model-driven']),
      heuristic: Boolean(args.heuristic),
    }));
    return;
  }
  if (command === 'scaffold') {
    await runWithGuidance(() => scaffold({ targetRoot, valuesPath, force: Boolean(args.force) }));
    return;
  }
  if (command === 'architect:generate-current-slice-baseline') {
    await runWithGuidance(() => architectGenerateCurrentSliceBaseline({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'uiux:generate-current-slice-flow') {
    await runWithGuidance(() => uiuxGenerateCurrentSliceFlow({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'coder:prepare-current-slice') {
    await runWithGuidance(() => coderPrepareCurrentSlice({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'coder:implement-current-slice') {
    await runWithGuidance(() => coderImplementCurrentSlice({ targetRoot, valuesPath, force: Boolean(args.force) }));
    return;
  }
  if (command === 'coder:close-current-slice') {
    await runWithGuidance(() => coderCloseCurrentSlice({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'orchestrator:advance-slice') {
    await runWithGuidance(() => orchestratorAdvanceSlice({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'format-from-brief') {
    await runWithGuidance(() => formatFromBrief({ targetRoot }));
    return;
  }
  if (command === 'instantiate') {
    await runWithGuidance(() => instantiate({ targetRoot, valuesPath, force: Boolean(args.force) }));
    return;
  }
  if (command === 'validate') {
    await runWithGuidance(() => validate({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'doctor') {
    await runWithGuidance(() => doctor({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'gate') {
    await runWithGuidance(() => gate({ targetRoot, valuesPath }));
    return;
  }
  if (command === 'db:init') {
    await runWithGuidance(() => dbInit({ targetRoot, valuesPath, force: Boolean(args.force) }));
    return;
  }
  if (command === 'db:check') {
    await runWithGuidance(() => dbCheck({ targetRoot }));
    return;
  }
  if (command === 'db:reset') {
    await runWithGuidance(() => dbReset({ targetRoot, yes: Boolean(args.yes) }));
    return;
  }

  console.error(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}

try {
  await main();
} catch (error) {
  if (error?.alreadyLogged) {
    process.exit(1);
  }
  const message = error?.message ? String(error.message) : String(error);
  console.error(`fabric: ${message}`);
  process.exit(1);
}
