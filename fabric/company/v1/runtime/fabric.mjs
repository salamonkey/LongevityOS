#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from './lib/core.mjs';
import { llmCheck, pmBriefReadiness, pmApproveBrief, pmStatus, pmBootstrapSignoff, pmPlanSlices, pmFinalizeBootstrapReviews, architectFinalizeBaseline, uiuxFinalizeCurrentSliceFlow } from './commands/product.mjs';
import { initFactory, formatFromBrief, instantiate, execute, validate, doctor, gate, dbInit, dbCheck, dbReset, dbSeed, coderPrepareCurrentSlice, coderImplementCurrentSlice, coderCloseCurrentSlice, orchestratorAdvanceSlice } from './commands/runtime.mjs';

function usage() {
  console.log(
    'Usage: fabric <init-factory|llm:check|pm:brief-readiness|pm:approve-brief|pm:status|pm:finalize-bootstrap-reviews|pm:bootstrap-signoff|pm:plan-slices|architect:finalize-baseline|uiux:finalize-current-slice-flow|coder:prepare-current-slice|coder:implement-current-slice|coder:close-current-slice|orchestrator:advance-slice|format-from-brief|execute|instantiate|validate|doctor|gate|db:init|db:check|db:reset|db:seed> [options]',
  );
  console.log(
    '  init-factory --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--force] [--init-values] [--force-values]',
  );
  console.log('  llm:check --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:brief-readiness --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:approve-brief --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:status --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--format <terminal|markdown>]');
  console.log('  pm:finalize-bootstrap-reviews --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  architect:finalize-baseline --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  uiux:finalize-current-slice-flow --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  coder:prepare-current-slice --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  coder:implement-current-slice --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--force]');
  console.log('  coder:close-current-slice --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  orchestrator:advance-slice --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:bootstrap-signoff --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  pm:plan-slices --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  format-from-brief --target <project-root>');
  console.log('  execute --values <fabric.values.json|fabric.values.yaml> --target <project-root> [--force]');
  console.log('  instantiate --values <fabric.values.json|fabric.values.yaml> --target <project-root> [--force]');
  console.log('  validate --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  doctor --target <project-root>');
  console.log('  gate --target <project-root> [--values <fabric.values.json|fabric.values.yaml>]');
  console.log('  db:init --target <project-root> [--values <fabric.values.json|fabric.values.yaml>] [--force]');
  console.log('  db:check --target <project-root>');
  console.log('  db:reset --target <project-root> --yes');
  console.log('  db:seed --target <project-root> [--yes]');
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

  if (command === 'init-factory') {
    initFactory({
      targetRoot,
      valuesPath,
      force: Boolean(args.force),
      initValues: Boolean(args['init-values']),
      forceValues: Boolean(args['force-values']),
    });
    return;
  }
  if (command === 'llm:check') {
    llmCheck({ targetRoot, valuesPath });
    return;
  }
  if (command === 'pm:brief-readiness') {
    await pmBriefReadiness({ targetRoot, valuesPath });
    return;
  }
  if (command === 'pm:approve-brief') {
    pmApproveBrief({ targetRoot, valuesPath });
    return;
  }
  if (command === 'pm:status') {
    pmStatus({ targetRoot, valuesPath, format: args.format });
    return;
  }
  if (command === 'pm:finalize-bootstrap-reviews') {
    pmFinalizeBootstrapReviews({ targetRoot, valuesPath });
    return;
  }
  if (command === 'pm:bootstrap-signoff') {
    pmBootstrapSignoff({ targetRoot, valuesPath });
    return;
  }
  if (command === 'pm:plan-slices') {
    pmPlanSlices({ targetRoot, valuesPath });
    return;
  }
  if (command === 'architect:finalize-baseline') {
    architectFinalizeBaseline({ targetRoot, valuesPath });
    return;
  }
  if (command === 'uiux:finalize-current-slice-flow') {
    uiuxFinalizeCurrentSliceFlow({ targetRoot, valuesPath });
    return;
  }
  if (command === 'coder:prepare-current-slice') {
    coderPrepareCurrentSlice({ targetRoot, valuesPath });
    return;
  }
  if (command === 'coder:implement-current-slice') {
    coderImplementCurrentSlice({ targetRoot, valuesPath, force: Boolean(args.force) });
    return;
  }
  if (command === 'coder:close-current-slice') {
    coderCloseCurrentSlice({ targetRoot, valuesPath });
    return;
  }
  if (command === 'orchestrator:advance-slice') {
    orchestratorAdvanceSlice({ targetRoot, valuesPath });
    return;
  }
  if (command === 'format-from-brief') {
    formatFromBrief({ targetRoot });
    return;
  }
  if (command === 'execute') {
    execute({ targetRoot, valuesPath, force: Boolean(args.force) });
    return;
  }
  if (command === 'instantiate') {
    instantiate({ targetRoot, valuesPath, force: Boolean(args.force) });
    return;
  }
  if (command === 'validate') {
    validate({ targetRoot, valuesPath });
    return;
  }
  if (command === 'doctor') {
    doctor({ targetRoot, valuesPath });
    return;
  }
  if (command === 'gate') {
    gate({ targetRoot, valuesPath });
    return;
  }
  if (command === 'db:init') {
    dbInit({ targetRoot, valuesPath, force: Boolean(args.force) });
    return;
  }
  if (command === 'db:check') {
    dbCheck({ targetRoot });
    return;
  }
  if (command === 'db:reset') {
    dbReset({ targetRoot, yes: Boolean(args.yes) });
    return;
  }
  if (command === 'db:seed') {
    dbSeed({ targetRoot, yes: Boolean(args.yes) });
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
