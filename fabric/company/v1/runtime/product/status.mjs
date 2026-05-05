import fs from 'node:fs';
import path from 'node:path';
import {
  readText,
  parseStatusBlock,
  parseBlockScalars,
  parseBacklogSlices,
  parseBriefApprovalStatus,
} from '../lib/core.mjs';

function escapeMarkdownCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function renderInlineList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }
  return items.map((item, index) => `${String(index + 1)}) ${String(item)}`).join(' ');
}

function resolveStatusValuesArg({ targetRoot, valuesPath }) {
  const relValuesPath = path.relative(targetRoot, valuesPath);
  const normalized = relValuesPath && relValuesPath.length > 0 ? relValuesPath : path.basename(valuesPath);
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

const CANONICAL_STEP_BY_COMMAND = Object.freeze({
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
  'uiux:generate-storybook-map': '17b',
  'db:init': '14',
  'db:check': '15',
  'architect:generate-current-slice-baseline': '16',
  'uiux:generate-current-slice-flow': '17',
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
  gate: '25',
});

function extractFabricCommandName(commandText) {
  const match = String(commandText || '').match(/^\s*\.\/fabric\/company\/v1\/fabric\s+([^\s]+)/);
  return match ? String(match[1] || '').trim() : '';
}

function resolveCanonicalStep(commandText) {
  const commandName = extractFabricCommandName(commandText);
  if (!commandName) return '';
  return CANONICAL_STEP_BY_COMMAND[commandName] || '';
}

function normalizedSliceIdForPath(sliceId) {
  return String(sliceId || '').replace(/[^A-Za-z0-9_-]/g, '-');
}

function baselinePathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, 'docs/architecture', `${normalizedSliceIdForPath(sliceId)}-baseline.md`);
}

function uxFlowPathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, 'docs/ux', `${normalizedSliceIdForPath(sliceId)}-current-slice-flow.md`);
}

function storybookRequirementsPathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, 'docs/storybook', `${normalizedSliceIdForPath(sliceId)}-story-requirements.json`);
}

function storybookReviewPathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, 'docs/reviews/storybook', `${normalizedSliceIdForPath(sliceId)}-storybook-review.json`);
}

function storybookStoriesDirForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, 'src/stories/slices', normalizedSliceIdForPath(sliceId));
}

function storybookReviewPassed(targetRoot, sliceId) {
  const reviewPath = storybookReviewPathForSlice(targetRoot, sliceId);
  if (!fs.existsSync(reviewPath)) return false;
  try {
    const parsed = JSON.parse(readText(reviewPath));
    return String(parsed.status || '').toLowerCase() === 'pass';
  } catch (_) {
    return false;
  }
}

function semanticUxReviewPathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, 'docs/reviews/ux', `${normalizedSliceIdForPath(sliceId)}-semantic-ux-review.json`);
}

function semanticUxReviewStatus(targetRoot, sliceId) {
  const reviewPath = semanticUxReviewPathForSlice(targetRoot, sliceId);
  if (!fs.existsSync(reviewPath)) return 'missing';
  try {
    const parsed = JSON.parse(readText(reviewPath));
    return String(parsed.status || '').toLowerCase() || 'unknown';
  } catch (_) {
    return 'invalid';
  }
}

function checklistPathForSlice(targetRoot, sliceId) {
  return path.join(targetRoot, 'docs/testing', `${normalizedSliceIdForPath(sliceId)}-user-checklist.md`);
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

function checklistResultState(targetRoot, sliceId) {
  const checklistPath = checklistPathForSlice(targetRoot, sliceId);
  if (!fs.existsSync(checklistPath)) return 'missing';
  return parseChecklistResultState(readText(checklistPath));
}

function hasSliceStorybookPrerequisites(targetRoot, sliceId) {
  const mapExists = fs.existsSync(path.join(targetRoot, 'docs/design-system/storybook-map.md'));
  const requirementsExists = fs.existsSync(storybookRequirementsPathForSlice(targetRoot, sliceId));
  return { mapExists, requirementsExists };
}

function hasSliceStoryFiles(targetRoot, sliceId) {
  const dir = storybookStoriesDirForSlice(targetRoot, sliceId);
  const slug = normalizedSliceIdForPath(sliceId);
  return fs.existsSync(path.join(dir, 'fixtures.ts'))
    && fs.existsSync(path.join(dir, `${slug}.stories.tsx`))
    && fs.existsSync(path.join(dir, 'README.md'));
}

function hasSlicePrerequisites(targetRoot, sliceId) {
  const baselineExists = fs.existsSync(baselinePathForSlice(targetRoot, sliceId));
  const uxExists = fs.existsSync(uxFlowPathForSlice(targetRoot, sliceId))
    || fs.existsSync(path.join(targetRoot, 'docs/ux/current-slice-flow.md'));
  return { baselineExists, uxExists };
}

function fileMtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch (_) {
    return 0;
  }
}

function parseUtcMs(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : 0;
}

function latestGatePassMs(orchestratorState) {
  if (String(orchestratorState?.lastFlowCheckCommand || '') !== 'gate') return 0;
  if (String(orchestratorState?.lastFlowCheckResult || '').toLowerCase() !== 'passed') return 0;
  return parseUtcMs(orchestratorState?.lastFlowCheckCheckedAtUtc);
}

function hasCompletedSliceBeforeIndex(rows, activeRowIndex) {
  if (activeRowIndex <= 0) return false;
  for (let index = 0; index < activeRowIndex; index += 1) {
    if (String(rows[index]?.pipelineStatus || '').toLowerCase() === 'completed') {
      return true;
    }
  }
  return false;
}

function parseImplementationStatusFromNotesText(text) {
  const sliceMatch = text.match(/^Slice:\s*`?([A-Za-z0-9_-]+)\b.*`?\s*$/im);
  const statusMatch = text.match(/^Status:\s*`?([A-Za-z0-9_ -]+)`?\s*$/im);
  if (!sliceMatch || !statusMatch) {
    return null;
  }
  return {
    sliceId: String(sliceMatch[1]).trim(),
    status: String(statusMatch[1]).trim(),
  };
}

function parseImplementationStatusBySlice(targetRoot) {
  const out = new Map();
  const implDirPath = path.join(targetRoot, 'docs/implementation');
  if (fs.existsSync(implDirPath) && fs.statSync(implDirPath).isDirectory()) {
    const noteFiles = fs.readdirSync(implDirPath)
      .filter((name) => /-implementation-notes\.md$/i.test(name))
      .sort();
    for (const fileName of noteFiles) {
      const notesPath = path.join(implDirPath, fileName);
      const parsed = parseImplementationStatusFromNotesText(readText(notesPath));
      if (!parsed) {
        continue;
      }
      out.set(parsed.sliceId, parsed.status);
    }
  }

  const legacyPath = path.join(targetRoot, 'docs/implementation/current-slice-notes.md');
  if (fs.existsSync(legacyPath)) {
    const parsed = parseImplementationStatusFromNotesText(readText(legacyPath));
    if (parsed && !out.has(parsed.sliceId)) {
      out.set(parsed.sliceId, parsed.status);
    }
  }
  return out;
}

function readOrchestratorState(targetRoot) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  if (!fs.existsSync(manifestPath)) {
    return {
      mode: 'unknown',
      activeSlice: '(not set)',
      activeSliceState: '(not set)',
      activeMilestone: '(not set)',
    };
  }
  const manifestText = readText(manifestPath);
  const status = parseStatusBlock(manifestText);
  const statusScalars = parseBlockScalars(manifestText, 'status');
  const operatingModel = parseBlockScalars(manifestText, 'operating_model');
  return {
    mode: String(operatingModel.current_mode || 'unknown'),
    activeSlice: String(status.active_slice || '(not set)'),
    activeSliceState: String(status.active_slice_state || '(not set)'),
    activeMilestone: String(status.active_milestone || '(not set)'),
    lastGateResult: String(statusScalars.last_gate_result || '(not recorded)'),
    lastGateStage: String(statusScalars.last_gate_stage || '(not recorded)'),
    lastGateCheckedAtUtc: String(statusScalars.last_gate_checked_at_utc || '(not recorded)'),
    lastGateMessage: String(statusScalars.last_gate_message || '(not recorded)'),
    lastFlowCheckCommand: String(statusScalars.last_flow_check_command || '(not recorded)'),
    lastFlowCheckStep: String(statusScalars.last_flow_check_step || '(not recorded)'),
    lastFlowCheckResult: String(statusScalars.last_flow_check_result || '(not recorded)'),
    lastFlowCheckCheckedAtUtc: String(statusScalars.last_flow_check_checked_at_utc || '(not recorded)'),
    lastFlowCheckMessage: String(statusScalars.last_flow_check_message || '(not recorded)'),
  };
}

function readBootstrapFlowCheckState(targetRoot) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  if (!fs.existsSync(manifestPath)) {
    return {
      command: '',
      result: '',
      checkedAtMs: 0,
    };
  }
  const manifestText = readText(manifestPath);
  const statusScalars = parseBlockScalars(manifestText, 'status');
  return {
    command: String(statusScalars.last_flow_check_command || '').trim().toLowerCase(),
    result: String(statusScalars.last_flow_check_result || '').trim().toLowerCase(),
    checkedAtMs: parseUtcMs(statusScalars.last_flow_check_checked_at_utc),
  };
}

function readBootstrapStampMs(stampPath) {
  if (!fs.existsSync(stampPath)) {
    return 0;
  }
  try {
    const parsed = JSON.parse(readText(stampPath));
    const checkedAtMs = parseUtcMs(parsed?.checked_at_utc);
    if (checkedAtMs > 0) {
      return checkedAtMs;
    }
  } catch (_) {
    // Ignore JSON parsing issues and fall back to mtime.
  }
  return fileMtimeMs(stampPath);
}

function resolveImplementationStatus({ pipelineStatus, explicitStatus }) {
  if (explicitStatus) {
    return explicitStatus;
  }
  const normalized = String(pipelineStatus || '').toLowerCase();
  if (normalized === 'planned') {
    return 'Not Started';
  }
  if (normalized === 'completed') {
    return 'Completed (inferred)';
  }
  if (normalized === 'in_progress') {
    return 'Not Recorded';
  }
  return 'Not Recorded';
}

function isPostImplementationStatus(implementationStatus) {
  const normalized = String(implementationStatus || '').toLowerCase().trim();
  if (!normalized) return false;
  if (normalized === 'implemented' || normalized === 'completed' || normalized === 'completed (inferred)') {
    return true;
  }
  if (normalized.endsWith('repair applied')) {
    return true;
  }
  return false;
}

function resolveNextCommandForInProgress({ pipelineStatus, implementationStatus, valuesArg, targetRoot, sliceId }) {
  const pipeline = String(pipelineStatus || '').toLowerCase();
  if (pipeline !== 'in_progress') {
    return '';
  }
  if (isPostImplementationStatus(implementationStatus)) {
    const { mapExists, requirementsExists } = hasSliceStorybookPrerequisites(targetRoot, sliceId);
    if (!mapExists || !requirementsExists) {
      return `./fabric/company/v1/fabric uiux:generate-storybook-map --target . --values ${valuesArg}`;
    }
    if (!hasSliceStoryFiles(targetRoot, sliceId)) {
      return `./fabric/company/v1/fabric coder:generate-current-slice-stories --target . --values ${valuesArg}`;
    }
    if (!storybookReviewPassed(targetRoot, sliceId)) {
      return `./fabric/company/v1/fabric uiux:review-current-slice-storybook --target . --values ${valuesArg}`;
    }
    const uxReviewStatus = semanticUxReviewStatus(targetRoot, sliceId);
    if (uxReviewStatus === 'fail') {
      return `./fabric/company/v1/fabric coder:repair-semantic-ux-findings --target . --values ${valuesArg}`;
    }
    if (uxReviewStatus !== 'pass') {
      return `./fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ${valuesArg}`;
    }
    const checklistState = checklistResultState(targetRoot, sliceId);
    if (checklistState === 'fail') {
      return `./fabric/company/v1/fabric coder:repair-implementation-findings --target . --values ${valuesArg}`;
    }
    if (checklistState !== 'pass') {
      return `./fabric/company/v1/fabric tester:validate-current-slice --target . --values ${valuesArg}`;
    }
    return `./fabric/company/v1/fabric coder:close-current-slice --target . --values ${valuesArg}`;
  }
  return `./fabric/company/v1/fabric coder:implement-current-slice --target . --values ${valuesArg}`;
}

function buildStatusRows({ slices, valuesArg, implementationStatusBySlice, orchestratorState, targetRoot }) {
  const rows = slices.map((slice) => {
    const pipelineStatus = String(slice.status || '');
    const implementationStatus = resolveImplementationStatus({
      pipelineStatus,
      explicitStatus: implementationStatusBySlice.get(slice.id) || null,
    });
    return {
      slice,
      id: String(slice.id || ''),
      title: String(slice.title || ''),
      objective: String(slice.objective || ''),
      pipelineStatus,
      implementationStatus,
      acceptanceCriteria: slice.acceptance_criteria || [],
      doneDefinition: slice.done_definition || [],
      nextCommand: '',
      nextCanonicalStep: '',
    };
  });

  const inProgressRows = rows.filter((row) => String(row.pipelineStatus).toLowerCase() === 'in_progress');
  if (inProgressRows.length > 0) {
    for (const row of inProgressRows) {
      row.nextCommand = resolveNextCommandForInProgress({
        pipelineStatus: row.pipelineStatus,
        implementationStatus: row.implementationStatus,
        valuesArg,
        targetRoot,
        sliceId: row.id,
      });
      row.nextCanonicalStep = resolveCanonicalStep(row.nextCommand);
    }
    return rows;
  }

  const activeSliceId = String(orchestratorState.activeSlice || '');
  const activeSliceState = String(orchestratorState.activeSliceState || '').toLowerCase();
  const activeRowIndex = rows.findIndex((row) => row.id === activeSliceId);
  const activeSliceHasCompletedBefore = hasCompletedSliceBeforeIndex(rows, activeRowIndex);
  const gatePassedAtMs = latestGatePassMs(orchestratorState);
  const currentSliceMtimeMs = fileMtimeMs(path.join(targetRoot, 'docs/product/current-slice.yaml'));
  if (activeRowIndex >= 0) {
    const activeRow = rows[activeRowIndex];
    const activePipeline = String(activeRow.pipelineStatus || '').toLowerCase();
    const activeImplementation = String(activeRow.implementationStatus || '').toLowerCase();
    if (activePipeline === 'planned' && activeImplementation === 'not started') {
      if (activeSliceHasCompletedBefore && gatePassedAtMs < currentSliceMtimeMs) {
        activeRow.nextCommand = `./fabric/company/v1/fabric gate --target . --values ${valuesArg}`;
        activeRow.nextCanonicalStep = '23';
        return rows;
      }
      const { baselineExists, uxExists } = hasSlicePrerequisites(targetRoot, activeRow.id);
      if (!baselineExists) {
        activeRow.nextCommand = `./fabric/company/v1/fabric architect:generate-current-slice-baseline --target . --values ${valuesArg}`;
        activeRow.nextCanonicalStep = '16';
      } else if (!uxExists) {
        activeRow.nextCommand = `./fabric/company/v1/fabric uiux:generate-current-slice-flow --target . --values ${valuesArg}`;
        activeRow.nextCanonicalStep = '17';
      } else {
        const { mapExists, requirementsExists } = hasSliceStorybookPrerequisites(targetRoot, activeRow.id);
        if (!mapExists || !requirementsExists) {
          activeRow.nextCommand = `./fabric/company/v1/fabric uiux:generate-storybook-map --target . --values ${valuesArg}`;
          activeRow.nextCanonicalStep = '17b';
          return rows;
        }
        const prereqMtimeMs = Math.max(
          currentSliceMtimeMs,
          fileMtimeMs(baselinePathForSlice(targetRoot, activeRow.id)),
          fileMtimeMs(uxFlowPathForSlice(targetRoot, activeRow.id)),
          fileMtimeMs(path.join(targetRoot, 'docs/ux/current-slice-flow.md')),
          fileMtimeMs(path.join(targetRoot, 'docs/design-system/storybook-map.md')),
          fileMtimeMs(storybookRequirementsPathForSlice(targetRoot, activeRow.id)),
        );
        if (gatePassedAtMs < prereqMtimeMs) {
          activeRow.nextCommand = `./fabric/company/v1/fabric gate --target . --values ${valuesArg}`;
          activeRow.nextCanonicalStep = '18';
          return rows;
        }
        activeRow.nextCommand = `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ${valuesArg}`;
        activeRow.nextCanonicalStep = '19';
      }
      return rows;
    }
    if (activePipeline === 'completed') {
      if (gatePassedAtMs < currentSliceMtimeMs) {
        activeRow.nextCommand = `./fabric/company/v1/fabric gate --target . --values ${valuesArg}`;
        activeRow.nextCanonicalStep = '23';
      } else {
        activeRow.nextCommand = `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ${valuesArg}`;
        activeRow.nextCanonicalStep = '24';
      }
      return rows;
    }
  }

  const firstNotStartedIndex = rows.findIndex((row) => String(row.implementationStatus).toLowerCase() === 'not started');
  if (firstNotStartedIndex >= 0) {
    if (activeSliceState === 'completed') {
      if (gatePassedAtMs < currentSliceMtimeMs) {
        rows[firstNotStartedIndex].nextCommand = `./fabric/company/v1/fabric gate --target . --values ${valuesArg}`;
        rows[firstNotStartedIndex].nextCanonicalStep = '23';
      } else {
        rows[firstNotStartedIndex].nextCommand = `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ${valuesArg}`;
        rows[firstNotStartedIndex].nextCanonicalStep = '24';
      }
      return rows;
    } else if (activeSliceState === 'planned') {
      const activeRow = rows[firstNotStartedIndex];
      const { baselineExists, uxExists } = hasSlicePrerequisites(targetRoot, activeRow.id);
      if (!baselineExists) {
        activeRow.nextCommand = `./fabric/company/v1/fabric architect:generate-current-slice-baseline --target . --values ${valuesArg}`;
        activeRow.nextCanonicalStep = '16';
      } else if (!uxExists) {
        activeRow.nextCommand = `./fabric/company/v1/fabric uiux:generate-current-slice-flow --target . --values ${valuesArg}`;
        activeRow.nextCanonicalStep = '17';
      } else {
        const { mapExists, requirementsExists } = hasSliceStorybookPrerequisites(targetRoot, activeRow.id);
        if (!mapExists || !requirementsExists) {
          activeRow.nextCommand = `./fabric/company/v1/fabric uiux:generate-storybook-map --target . --values ${valuesArg}`;
          activeRow.nextCanonicalStep = '17b';
        } else {
          const prereqMtimeMs = Math.max(
            currentSliceMtimeMs,
            fileMtimeMs(baselinePathForSlice(targetRoot, activeRow.id)),
            fileMtimeMs(uxFlowPathForSlice(targetRoot, activeRow.id)),
            fileMtimeMs(path.join(targetRoot, 'docs/ux/current-slice-flow.md')),
            fileMtimeMs(path.join(targetRoot, 'docs/design-system/storybook-map.md')),
            fileMtimeMs(storybookRequirementsPathForSlice(targetRoot, activeRow.id)),
          );
          if (gatePassedAtMs < prereqMtimeMs) {
            activeRow.nextCommand = `./fabric/company/v1/fabric gate --target . --values ${valuesArg}`;
            activeRow.nextCanonicalStep = '18';
            return rows;
          }
          activeRow.nextCommand = `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ${valuesArg}`;
          activeRow.nextCanonicalStep = '19';
        }
      }
    }
  }

  return rows;
}

function printOrchestratorStateTerminal(orchestratorState, activeSliceNextCommand = '', activeSliceNextCanonicalStep = '') {
  console.log('Orchestrator State:');
  console.log(`  Active Slice: ${orchestratorState.activeSlice}`);
  console.log(`  Active Slice State: ${orchestratorState.activeSliceState}`);
  console.log(`  Next Step: ${activeSliceNextCanonicalStep || '(none)'}`);
  console.log(`  Next Command: ${activeSliceNextCommand || '(none)'}`);
}

function printOrchestratorStateMarkdown(orchestratorState, activeSliceNextCommand = '', activeSliceNextCanonicalStep = '') {
  console.log('## Orchestrator State');
  console.log('');
  console.log(`- active slice: ${escapeMarkdownCell(orchestratorState.activeSlice)}`);
  console.log(`- active slice state: ${escapeMarkdownCell(orchestratorState.activeSliceState)}`);
  console.log(`- next step: ${escapeMarkdownCell(activeSliceNextCanonicalStep || '(none)')}`);
  console.log(`- next command: ${escapeMarkdownCell(activeSliceNextCommand || '(none)')}`);
  console.log('');
}

function printStatusMarkdownTable({ rows, orchestratorState }) {
  const activeRow = rows.find((row) => row.id === String(orchestratorState.activeSlice || ''));
  const activeSliceNextCommand = activeRow?.nextCommand || '';
  const activeSliceNextCanonicalStep = activeRow?.nextCanonicalStep || '';
  printOrchestratorStateMarkdown(orchestratorState, activeSliceNextCommand, activeSliceNextCanonicalStep);

  const headers = [
    'slice number',
    'slice title',
    'slice objective',
    'pipeline status',
    'implementation status',
    'acceptance criteria',
    'done definition',
    'next command',
  ];
  const separator = headers.map(() => '---');

  console.log(`| ${headers.join(' | ')} |`);
  console.log(`| ${separator.join(' | ')} |`);

  for (const rowData of rows) {
    const row = [
      escapeMarkdownCell(rowData.id),
      escapeMarkdownCell(rowData.title),
      escapeMarkdownCell(rowData.objective),
      escapeMarkdownCell(rowData.pipelineStatus),
      escapeMarkdownCell(rowData.implementationStatus),
      escapeMarkdownCell(renderInlineList(rowData.acceptanceCriteria)),
      escapeMarkdownCell(renderInlineList(rowData.doneDefinition)),
      escapeMarkdownCell(rowData.nextCommand),
    ];
    console.log(`| ${row.join(' | ')} |`);
  }
}

function printStatusTerminalView({ rows, orchestratorState }) {
  const activeRow = rows.find((row) => row.id === String(orchestratorState.activeSlice || ''));
  const activeSliceNextCommand = activeRow?.nextCommand || '';
  const activeSliceNextCanonicalStep = activeRow?.nextCanonicalStep || '';
  console.log(`fabric pm:status: ${String(rows.length)} slices`);
  console.log('');
  printOrchestratorStateTerminal(orchestratorState, activeSliceNextCommand, activeSliceNextCanonicalStep);
  for (const rowData of rows) {
    console.log('');
    console.log(`[${rowData.id}] ${rowData.title}`);
    console.log(`Pipeline Status: ${rowData.pipelineStatus}`);
    console.log(`Implementation Status: ${rowData.implementationStatus}`);
    console.log(`Objective: ${rowData.objective}`);
    console.log('Acceptance Criteria:');
    for (let index = 0; index < rowData.acceptanceCriteria.length; index += 1) {
      console.log(`  ${String(index + 1)}. ${String(rowData.acceptanceCriteria[index])}`);
    }
    console.log('Done Definition:');
    for (let index = 0; index < rowData.doneDefinition.length; index += 1) {
      console.log(`  ${String(index + 1)}. ${String(rowData.doneDefinition[index])}`);
    }
    if (rowData.nextCommand.length > 0) {
      console.log(`Next Command: ${rowData.nextCommand}`);
      console.log(`Next Canonical Step: ${rowData.nextCanonicalStep || '(none)'}`);
    }
  }
}

function detectBootstrapProgress(targetRoot) {
  const intakeSourcesPath = path.join(targetRoot, 'docs/pm/intake/sources.json');
  const intakeReportPath = path.join(targetRoot, 'docs/pm/intake/intake-report.md');
  const draftMarkerPath = path.join(targetRoot, 'docs/pm/brief/brief-draft.stamp.json');
  const formatFromBriefStampPath = path.join(targetRoot, 'docs/pm/brief/format-from-brief.stamp.json');
  const scaffoldStampPath = path.join(targetRoot, 'docs/pm/brief/scaffold.stamp.json');
  const readinessPath = path.join(targetRoot, 'docs/reviews/product-manager/brief-readiness-review.md');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const valuesJsonPath = path.join(targetRoot, 'fabric.values.json');
  const valuesYamlPath = path.join(targetRoot, 'fabric.values.yaml');

  const intakeDone = fs.existsSync(intakeSourcesPath) && fs.existsSync(intakeReportPath);
  const readinessDone = fs.existsSync(readinessPath);
  const readinessText = readinessDone ? readText(readinessPath) : '';
  const readinessVerdictMatch = readinessText.match(/^Verdict:\s*`?([a-zA-Z_ -]+)`?\s*$/im);
  const readinessVerdict = readinessVerdictMatch
    ? String(readinessVerdictMatch[1]).trim().toLowerCase()
    : (readinessDone ? 'unknown' : 'missing');
  const readinessSufficient = readinessVerdict === 'sufficient';
  const draftDone = fs.existsSync(draftMarkerPath);
  const briefExists = fs.existsSync(briefPath);
  const briefStatus = briefExists ? parseBriefApprovalStatus(readText(briefPath)) : null;
  const briefApproved = briefStatus === 'approved';
  const valuesPath = fs.existsSync(valuesJsonPath)
    ? valuesJsonPath
    : (fs.existsSync(valuesYamlPath) ? valuesYamlPath : null);
  const valuesExist = Boolean(valuesPath);

  const briefMtimeMs = briefExists ? fs.statSync(briefPath).mtimeMs : 0;
  const valuesMtimeMs = valuesPath ? fs.statSync(valuesPath).mtimeMs : 0;
  const valuesNeedRefreshFromApprovedBrief = briefApproved && (!valuesExist || valuesMtimeMs < briefMtimeMs);
  const bootstrapFlowCheckState = readBootstrapFlowCheckState(targetRoot);
  const bootstrapBaselineMs = Math.max(briefMtimeMs, valuesMtimeMs);
  const formatFromBriefStampMs = readBootstrapStampMs(formatFromBriefStampPath);
  const scaffoldStampMs = readBootstrapStampMs(scaffoldStampPath);
  const formatFromBriefPassed = (
    (
      bootstrapFlowCheckState.command === 'format-from-brief'
      && bootstrapFlowCheckState.result === 'passed'
      && bootstrapFlowCheckState.checkedAtMs >= bootstrapBaselineMs
    )
    || formatFromBriefStampMs >= bootstrapBaselineMs
  );
  const scaffoldPassed = (
    (
      bootstrapFlowCheckState.command === 'scaffold'
      && bootstrapFlowCheckState.result === 'passed'
      && bootstrapFlowCheckState.checkedAtMs >= bootstrapBaselineMs
    )
    || scaffoldStampMs >= bootstrapBaselineMs
  );

  let nextCommand = './fabric/company/v1/fabric pm:intake --target .';
  let reason = 'No intake artifacts detected yet.';

  if (intakeDone && !readinessDone) {
    nextCommand = './fabric/company/v1/fabric pm:brief-readiness --target .';
    reason = 'Intake artifacts exist; readiness gate has not been recorded yet.';
  } else if (intakeDone && readinessDone && !readinessSufficient) {
    nextCommand = './fabric/company/v1/fabric pm:brief-readiness --target .';
    reason = 'Readiness is not sufficient yet; update customer input and re-run readiness.';
  } else if (valuesNeedRefreshFromApprovedBrief) {
    nextCommand = './fabric/company/v1/fabric pm:derive-values --target .';
    reason = valuesExist
      ? 'Brief is approved and newer than values; derive-values should be re-run.'
      : 'Brief is approved; values file is missing.';
  } else if (briefApproved && valuesExist) {
    if (scaffoldPassed) {
      nextCommand = './fabric/company/v1/fabric pm:plan-slices --target .';
      reason = 'Scaffold step is already recorded for this approved brief; continue with slice planning.';
    } else if (formatFromBriefPassed) {
      nextCommand = './fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json';
      reason = 'Format-from-brief is already recorded; continue with scaffold.';
    } else {
      nextCommand = './fabric/company/v1/fabric format-from-brief --target .';
      reason = 'PM bootstrap sequence is complete; continue with format/scaffold.';
    }
  } else if (intakeDone && readinessSufficient && !draftDone) {
    nextCommand = './fabric/company/v1/fabric pm:brief-draft --target .';
    reason = briefExists
      ? 'Readiness is complete; run explicit brief-draft step before approval.'
      : 'Readiness review exists; no project brief draft is present yet.';
  } else if (draftDone && !briefExists) {
    nextCommand = './fabric/company/v1/fabric pm:brief-draft --target .';
    reason = 'Draft marker exists but project brief is missing; rerun brief-draft.';
  } else if (briefExists && !briefApproved) {
    nextCommand = './fabric/company/v1/fabric pm:brief-approve --target .';
    reason = 'A brief draft exists but is not approved.';
  }

  return {
    intakeDone,
    readinessDone,
    readinessVerdict,
    readinessSufficient,
    draftDone,
    briefExists,
    briefStatus: briefStatus || '(missing)',
    briefApproved,
    valuesExist,
    nextCommand,
    reason,
  };
}

function printBootstrapStatusTerminal(progress) {
  console.log('fabric pm:status: bootstrap');
  console.log('');
  console.log('PM Bootstrap State:');
  console.log(`  Intake Artifacts: ${progress.intakeDone ? 'present' : 'missing'}`);
  console.log(`  Readiness Review: ${progress.readinessDone ? 'present' : 'missing'}`);
  console.log(`  Readiness Verdict: ${progress.readinessVerdict}`);
  console.log(`  Draft Step: ${progress.draftDone ? 'completed' : 'pending'}`);
  console.log(`  Brief Draft: ${progress.briefExists ? 'present' : 'missing'}`);
  console.log(`  Brief Approval Status: ${progress.briefStatus}`);
  console.log(`  Values File: ${progress.valuesExist ? 'present' : 'missing'}`);
  console.log('');
  console.log(`Guidance: ${progress.reason}`);
  console.log(`Next Command: ${progress.nextCommand}`);
  console.log(`Next Canonical Step: ${resolveCanonicalStep(progress.nextCommand) || '(none)'}`);
  console.log('PM Bootstrap Sequence:');
  console.log('  1) ./fabric/company/v1/fabric pm:intake --target .');
  console.log('  2) ./fabric/company/v1/fabric pm:brief-readiness --target .');
  console.log('  3) ./fabric/company/v1/fabric pm:brief-draft --target .');
  console.log('  4) ./fabric/company/v1/fabric pm:brief-approve --target .');
  console.log('  5) ./fabric/company/v1/fabric pm:derive-values --target .');
}

function printBootstrapStatusMarkdown(progress) {
  console.log('## PM Bootstrap State');
  console.log('');
  console.log(`- intake artifacts: ${progress.intakeDone ? 'present' : 'missing'}`);
  console.log(`- readiness review: ${progress.readinessDone ? 'present' : 'missing'}`);
  console.log(`- readiness verdict: ${progress.readinessVerdict}`);
  console.log(`- draft step: ${progress.draftDone ? 'completed' : 'pending'}`);
  console.log(`- brief draft: ${progress.briefExists ? 'present' : 'missing'}`);
  console.log(`- brief approval status: ${escapeMarkdownCell(progress.briefStatus)}`);
  console.log(`- values file: ${progress.valuesExist ? 'present' : 'missing'}`);
  console.log(`- guidance: ${escapeMarkdownCell(progress.reason)}`);
  console.log(`- next command: \`${progress.nextCommand}\``);
  console.log(`- next canonical step: ${escapeMarkdownCell(resolveCanonicalStep(progress.nextCommand) || '(none)')}`);
  console.log('');
  console.log('### PM Bootstrap Sequence');
  console.log('');
  console.log('1. `./fabric/company/v1/fabric pm:intake --target .`');
  console.log('2. `./fabric/company/v1/fabric pm:brief-readiness --target .`');
  console.log('3. `./fabric/company/v1/fabric pm:brief-draft --target .`');
  console.log('4. `./fabric/company/v1/fabric pm:brief-approve --target .`');
  console.log('5. `./fabric/company/v1/fabric pm:derive-values --target .`');
}

function pmStatus({ targetRoot, valuesPath, format = 'terminal' }) {
  const normalizedFormat = String(format || 'terminal').toLowerCase();
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');

  if (!fs.existsSync(backlogPath)) {
    const progress = detectBootstrapProgress(targetRoot);
    if (normalizedFormat === 'markdown' || normalizedFormat === 'md') {
      printBootstrapStatusMarkdown(progress);
      return;
    }
    if (normalizedFormat === 'terminal' || normalizedFormat === 'tty') {
      printBootstrapStatusTerminal(progress);
      return;
    }
    throw new Error("Cannot run pm:status: unsupported --format value. Use 'terminal' or 'markdown'.");
  }

  const slices = parseBacklogSlices(readText(backlogPath));
  if (slices.length === 0) {
    throw new Error('Cannot run pm:status: no slices found in docs/product/backlog.yaml');
  }

  const implementationStatusBySlice = parseImplementationStatusBySlice(targetRoot);

  const valuesArg = resolveStatusValuesArg({ targetRoot, valuesPath });
  const orchestratorState = readOrchestratorState(targetRoot);
  const rows = buildStatusRows({
    slices,
    valuesArg,
    implementationStatusBySlice,
    orchestratorState,
    targetRoot,
  });

  if (normalizedFormat === 'markdown' || normalizedFormat === 'md') {
    printStatusMarkdownTable({ rows, orchestratorState });
    return;
  }
  if (normalizedFormat === 'terminal' || normalizedFormat === 'tty') {
    printStatusTerminalView({ rows, orchestratorState });
    return;
  }
  throw new Error("Cannot run pm:status: unsupported --format value. Use 'terminal' or 'markdown'.");
}

export {
  pmStatus,
};
