#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs, parseSliceBlockWithLists, readText } from './lib/core.mjs';
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
    cmd('pm:status'),
    cmd('db:check', { includeValues: false }),
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
        cmd('pm:status'),
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
    cmd('orchestrator:advance-slice'),
    cmd('pm:status'),
  ],
  'orchestrator:advance-slice': ({ cmd }) => [
    cmd('pm:status'),
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
    cmd('pm:status'),
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
    console.log(`  ${String(i + 1)}) ${steps[i]}`);
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
  const runWithGuidance = async (handler) => {
    await handler();
    if (shouldPrintNextSteps) {
      printNextSteps({ command, targetRoot, valuesPath });
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
  const message = error?.message ? String(error.message) : String(error);
  console.error(`fabric: ${message}`);
  process.exit(1);
}
