import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { FABRIC_ROOT } from '../lib/constants.mjs';
import {
  readText,
  writeTextAtomic,
  ensureDir,
  loadValues,
  loadManifest,
  loadValuesIfPresent,
  parseBriefApprovalStatus,
  parseSectionListValues,
  parseSliceBlockWithLists,
  parseBacklogSlices,
  listAllPlaceholderMatches,
  parseReviewAssessment,
  quoteYamlString,
  setSectionScalar,
  setSectionList,
  setTopLevelScalar,
  getBootstrapReviewRelPaths,
} from '../lib/core.mjs';
import { generateArchitectValueRecommendations } from '../lib/llm/architect-values.mjs';
import { setBriefApproved } from './brief-synthesis.mjs';
import {
  buildNeutralValuesSeed,
  deriveValuesFromBrief,
  architectConsultCandidateTokens,
  normalizeArchitectConsultValue,
  unresolvedRequiredTokens,
  isUnsetLike,
} from './values-derivation.mjs';

async function deriveValuesFromApprovedBrief({
  targetRoot,
  valuesPath,
  approvedBrief,
  commandName,
  valuesSeedSource,
}) {
  const manifest = loadManifest();
  let values = {};
  let seededDefaults = null;
  if (!fs.existsSync(valuesPath)) {
    seededDefaults = buildNeutralValuesSeed(manifest);
    ensureDir(valuesPath);
    fs.writeFileSync(valuesPath, `${JSON.stringify(seededDefaults, null, 2)}\n`, 'utf8');
    values = seededDefaults;
  } else {
    values = loadValues(valuesPath);
  }
  const derived = deriveValuesFromBrief(approvedBrief, values);
  const merged = { ...values, ...derived };

  const architectCandidates = architectConsultCandidateTokens(merged);
  let architectConsultAttempted = false;
  let architectConsultPurpose = null;
  let architectConsultProviderModel = null;
  let architectAppliedTokens = [];

  if (architectCandidates.length > 0) {
    const architectRolePath = path.join(FABRIC_ROOT, 'team/architect.md');
    const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
    if (!fs.existsSync(architectRolePath)) {
      console.warn(
        `fabric ${commandName}: architect consult skipped (missing role contract: ${path.relative(targetRoot, architectRolePath)})`,
      );
    } else if (!fs.existsSync(framingPath)) {
      console.warn(
        `fabric ${commandName}: architect consult skipped (missing docs/product/product-system-framing.md)`,
      );
    } else {
      architectConsultAttempted = true;
      const architectRoleMarkdown = readText(architectRolePath);
      const framingMarkdown = readText(framingPath);
      try {
        console.log(
          `fabric ${commandName}: consulting architect for unresolved defaults (${String(architectCandidates.length)} token(s))...`,
        );
        const consult = await generateArchitectValueRecommendations({
          targetRoot,
          values: merged,
          unresolvedTokens: architectCandidates,
          briefMarkdown: approvedBrief,
          framingMarkdown,
          architectRoleMarkdown,
          architectRoleSourcePath: path.relative(targetRoot, architectRolePath),
          currentValues: merged,
          onProgress: (message) => {
            console.log(`  - ${String(message)}`);
          },
        });
        architectConsultPurpose = consult.purpose;
        if (consult?.settings?.provider && consult?.settings?.model) {
          architectConsultProviderModel = `${consult.settings.provider}/${consult.settings.model}`;
        }
        for (const token of architectCandidates) {
          if (!isUnsetLike(merged[token])) {
            continue;
          }
          const recommendation = consult.byToken?.[token];
          if (!recommendation) {
            continue;
          }
          const normalized = normalizeArchitectConsultValue(token, recommendation.value);
          if (!normalized || isUnsetLike(normalized)) {
            continue;
          }
          merged[token] = normalized;
          architectAppliedTokens.push(token);
        }
      } catch (error) {
        console.warn(
          `fabric ${commandName}: architect consult unavailable (${String(error?.message || error)})`,
        );
      }
    }
  }

  const unresolvedTokens = unresolvedRequiredTokens(manifest, merged);
  merged.defaulted_fields = unresolvedTokens.sort();
  if (seededDefaults) {
    merged.values_seed_mode = 'brief_first_defaults_v1';
    merged.values_seed_source = valuesSeedSource;
  }

  fs.writeFileSync(valuesPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  return {
    merged,
    derived,
    seededDefaults,
    architectConsultAttempted,
    architectConsultPurpose,
    architectConsultProviderModel,
    architectAppliedTokens,
  };
}

async function pmApproveBrief({ targetRoot, valuesPath }) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  if (!fs.existsSync(briefPath)) {
    throw new Error('Cannot approve brief: missing docs/product/project-brief.md');
  }

  const briefText = readText(briefPath);
  const approvedBrief = setBriefApproved(briefText);
  fs.writeFileSync(briefPath, approvedBrief, 'utf8');
  const outcome = await deriveValuesFromApprovedBrief({
    targetRoot,
    valuesPath,
    approvedBrief,
    commandName: 'pm:approve-brief',
    valuesSeedSource: 'pm:approve-brief',
  });
  const updatedKeys = Object.keys(outcome.derived).sort();
  console.log('fabric pm:approve-brief: OK');
  console.log(`- brief updated: ${path.relative(targetRoot, briefPath)}`);
  console.log(`- values updated: ${path.relative(targetRoot, valuesPath)}`);
  if (outcome.seededDefaults) {
    console.log(`- values created from neutral defaults: ${path.relative(targetRoot, valuesPath)}`);
  }
  if (outcome.architectConsultAttempted) {
    if (outcome.architectConsultPurpose) {
      console.log(`- architect consult profile: ${outcome.architectConsultPurpose}`);
    }
    if (outcome.architectConsultProviderModel) {
      console.log(`- architect consult model: ${outcome.architectConsultProviderModel}`);
    }
    console.log(`- architect-applied fields: ${String(outcome.architectAppliedTokens.length)}`);
    outcome.architectAppliedTokens.sort().forEach((token) => console.log(`  - ${token}`));
  }
  console.log(`- defaulted fields remaining: ${String(outcome.merged.defaulted_fields.length)}`);
  console.log(`- derived keys: ${updatedKeys.length}`);
  updatedKeys.forEach((k) => console.log(`  - ${k}`));
}

function pmBriefApprove({ targetRoot }) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  if (!fs.existsSync(briefPath)) {
    throw new Error('Cannot approve brief: missing docs/product/project-brief.md');
  }
  const briefText = readText(briefPath);
  const approvedBrief = setBriefApproved(briefText);
  fs.writeFileSync(briefPath, approvedBrief, 'utf8');
  console.log('fabric pm:brief-approve: OK');
  console.log(`- brief updated: ${path.relative(targetRoot, briefPath)}`);
}

async function pmDeriveValues({ targetRoot, valuesPath }) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  if (!fs.existsSync(briefPath)) {
    throw new Error('Cannot derive values: missing docs/product/project-brief.md');
  }

  const briefText = readText(briefPath);
  const approvalStatus = parseBriefApprovalStatus(briefText);
  if (approvalStatus !== 'approved') {
    throw new Error(
      `Cannot derive values: docs/product/project-brief.md must be approved first (current: ${String(approvalStatus || 'missing')}). Run pm:brief-approve.`,
    );
  }

  const outcome = await deriveValuesFromApprovedBrief({
    targetRoot,
    valuesPath,
    approvedBrief: briefText,
    commandName: 'pm:derive-values',
    valuesSeedSource: 'pm:derive-values',
  });
  const updatedKeys = Object.keys(outcome.derived).sort();
  console.log('fabric pm:derive-values: OK');
  console.log(`- values updated: ${path.relative(targetRoot, valuesPath)}`);
  if (outcome.seededDefaults) {
    console.log(`- values created from neutral defaults: ${path.relative(targetRoot, valuesPath)}`);
  }
  if (outcome.architectConsultAttempted) {
    if (outcome.architectConsultPurpose) {
      console.log(`- architect consult profile: ${outcome.architectConsultPurpose}`);
    }
    if (outcome.architectConsultProviderModel) {
      console.log(`- architect consult model: ${outcome.architectConsultProviderModel}`);
    }
    console.log(`- architect-applied fields: ${String(outcome.architectAppliedTokens.length)}`);
    outcome.architectAppliedTokens.sort().forEach((token) => console.log(`  - ${token}`));
  }
  console.log(`- defaulted fields remaining: ${String(outcome.merged.defaulted_fields.length)}`);
  console.log(`- derived keys: ${updatedKeys.length}`);
  updatedKeys.forEach((k) => console.log(`  - ${k}`));
}


function evaluateBootstrapReviewApprovals({ targetRoot, valuesPath }) {
  const values = loadValuesIfPresent(valuesPath);
  const relPaths = getBootstrapReviewRelPaths(values);
  const checks = [];

  for (const [key, relPath] of Object.entries(relPaths)) {
    const absPath = path.join(targetRoot, relPath);
    if (!fs.existsSync(absPath)) {
      checks.push({
        key,
        relPath,
        exists: false,
        assessment: null,
        placeholders: [],
      });
      continue;
    }
    const text = readText(absPath);
    checks.push({
      key,
      relPath,
      exists: true,
      assessment: parseReviewAssessment(text),
      placeholders: listAllPlaceholderMatches(text),
    });
  }

  const issues = [];
  for (const check of checks) {
    if (!check.exists) {
      issues.push(`missing bootstrap review file: ${check.relPath}`);
      continue;
    }
    if (check.placeholders.length > 0) {
      issues.push(
        `${check.relPath}: contains unresolved placeholders (${check.placeholders.join(', ')})`,
      );
    }
    if (check.assessment !== 'approved') {
      issues.push(
        `${check.relPath}: assessment must be 'approved' (current: ${String(check.assessment || 'missing')})`,
      );
    }
  }

  return { checks, issues };
}


function extractFirstSliceFromCurrentSlice(currentSliceText) {
  const slice = parseSliceBlockWithLists(currentSliceText);
  return {
    id: slice.id || null,
    milestone: slice.milestone || null,
    status: slice.status || null,
  };
}


function renderBootstrapReviewDoc({
  title,
  reviewTarget,
  assessment,
  findings,
  requiredActions,
  generatedAt,
}) {
  const lines = [
    `# ${title}`,
    '',
    `Date: \`${String(generatedAt).slice(0, 10)}\``,
    `Review Target: \`${reviewTarget}\``,
    `Assessment: \`${assessment}\``,
    '',
    '## Findings',
    '',
    ...(findings.length > 0 ? findings.map((item) => `- ${item}`) : ['- No material issues detected.']),
    '',
    '## Required Actions',
    '',
    ...(requiredActions.length > 0 ? requiredActions.map((item) => `- ${item}`) : ['- Continue.']),
    '',
  ];
  return `${lines.join('\n')}`;
}


function finalizeBootstrapFoundationReview({ targetRoot }) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  const artifactRegistryPath = path.join(targetRoot, '.system/artifact-registry.yaml');
  const workflowRulesPath = path.join(targetRoot, '.system/workflow-rules.yaml');
  const required = [
    ['Project manifest', manifestPath],
    ['Artifact registry', artifactRegistryPath],
    ['Workflow rules', workflowRulesPath],
  ];
  const findings = [];
  const issues = [];
  for (const [label, absPath] of required) {
    if (!fs.existsSync(absPath)) {
      issues.push(`${label} is missing.`);
    } else {
      findings.push(`${label} exists and is readable.`);
    }
  }
  const assessment = issues.length === 0 ? 'approved' : 'needs_revision';
  const requiredActions = assessment === 'approved'
    ? ['Proceed to slice-planning and bootstrap signoff.']
    : ['Regenerate missing bootstrap foundation artifacts, then re-run pm:finalize-bootstrap-reviews.'];
  return {
    assessment,
    content: renderBootstrapReviewDoc({
      title: 'Bootstrap Foundation Review',
      reviewTarget: 'Bootstrap Foundation Artifacts',
      assessment,
      findings: assessment === 'approved' ? findings : issues,
      requiredActions,
      generatedAt: new Date().toISOString(),
    }),
  };
}


function finalizeBootstrapBacklogSliceReview({ targetRoot }) {
  const backlogPath = path.join(targetRoot, 'docs/product/backlog.yaml');
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  const findings = [];
  const issues = [];
  if (!fs.existsSync(backlogPath)) {
    issues.push('Backlog artifact is missing.');
  }
  if (!fs.existsSync(currentSlicePath)) {
    issues.push('Current slice artifact is missing.');
  }

  let backlogSlices = [];
  let currentSlice = {};
  if (issues.length === 0) {
    backlogSlices = parseBacklogSlices(readText(backlogPath));
    currentSlice = parseSliceBlockWithLists(readText(currentSlicePath));

    if (backlogSlices.length === 0) {
      issues.push('Backlog does not contain any slices.');
    } else {
      findings.push(`Backlog contains ${String(backlogSlices.length)} planned slices.`);
    }

    if (!currentSlice.id || !currentSlice.title || !currentSlice.objective) {
      issues.push('Current slice is missing one or more core fields (id, title, objective).');
    } else {
      findings.push(`Current slice ${String(currentSlice.id)} (${String(currentSlice.title)}) is defined.`);
    }

    const placeholders = listAllPlaceholderMatches(JSON.stringify({ backlogSlices, currentSlice }));
    if (placeholders.length > 0) {
      issues.push(`Backlog/current-slice still contain unresolved placeholders (${[...new Set(placeholders)].join(', ')}).`);
    }

    if (backlogSlices.length > 0 && currentSlice.id) {
      const match = backlogSlices.find((slice) => String(slice.id || '') === String(currentSlice.id));
      if (!match) {
        issues.push(`Current slice ${String(currentSlice.id)} is not present in backlog.`);
      } else {
        findings.push(`Current slice ${String(currentSlice.id)} is represented in backlog.`);
      }
    }
  }

  const assessment = issues.length === 0 ? 'approved' : 'needs_revision';
  const requiredActions = assessment === 'approved'
    ? ['Proceed to bootstrap signoff.']
    : ['Regenerate or repair backlog/current-slice artifacts, then re-run pm:finalize-bootstrap-reviews.'];
  return {
    assessment,
    content: renderBootstrapReviewDoc({
      title: 'Bootstrap Backlog and Slice Review',
      reviewTarget: 'Initial Backlog and Current Slice',
      assessment,
      findings: assessment === 'approved' ? findings : issues,
      requiredActions,
      generatedAt: new Date().toISOString(),
    }),
  };
}


function pmFinalizeBootstrapReviews({ targetRoot, valuesPath }) {
  const values = loadValuesIfPresent(valuesPath);
  const relPaths = getBootstrapReviewRelPaths(values);
  const foundation = finalizeBootstrapFoundationReview({ targetRoot });
  const backlogSlice = finalizeBootstrapBacklogSliceReview({ targetRoot });
  const outputs = [
    { relPath: relPaths.foundation, content: foundation.content, assessment: foundation.assessment },
    { relPath: relPaths.backlogSlice, content: backlogSlice.content, assessment: backlogSlice.assessment },
  ];
  for (const item of outputs) {
    const absPath = path.join(targetRoot, item.relPath);
    ensureDir(absPath);
    writeTextAtomic(absPath, `${item.content.trimEnd()}
`);
  }
  console.log('fabric pm:finalize-bootstrap-reviews: OK');
  console.log(`- foundation review: ${relPaths.foundation} (${foundation.assessment})`);
  console.log(`- backlog/slice review: ${relPaths.backlogSlice} (${backlogSlice.assessment})`);
}


function pmBootstrapSignoff({ targetRoot, valuesPath }) {
  const manifestPath = path.join(targetRoot, '.system/project-manifest.yaml');
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Cannot run pm:bootstrap-signoff: missing .system/project-manifest.yaml');
  }
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run pm:bootstrap-signoff: missing docs/product/current-slice.yaml');
  }

  const reviewEval = evaluateBootstrapReviewApprovals({ targetRoot, valuesPath });
  if (reviewEval.issues.length > 0) {
    console.error('fabric pm:bootstrap-signoff: FAILED');
    reviewEval.issues.forEach((issue) => console.error(`- ${issue}`));
    console.error('- bootstrap review artifacts are still drafts or not approved');
    console.error(`- recovery: run ./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target ${targetRoot === process.cwd() ? '.' : '<project-root>'} --values ${valuesPath ? path.relative(targetRoot, valuesPath) || 'fabric.values.json' : 'fabric.values.json'}`);
    process.exit(1);
  }

  const currentSlice = extractFirstSliceFromCurrentSlice(readText(currentSlicePath));
  if (!currentSlice.id || !currentSlice.status || !currentSlice.milestone) {
    throw new Error(
      'Cannot run pm:bootstrap-signoff: current slice must include id, status, and milestone.',
    );
  }

  const now = new Date().toISOString();
  let manifestText = readText(manifestPath);
  manifestText = setSectionScalar(manifestText, 'operating_model', 'bootstrap_status', '"completed"');
  manifestText = setSectionScalar(
    manifestText,
    'operating_model',
    'bootstrap_completed_at_utc',
    quoteYamlString(now),
  );
  manifestText = setSectionScalar(manifestText, 'operating_model', 'current_mode', '"delivery"');
  manifestText = setSectionScalar(manifestText, 'status', 'active_slice', quoteYamlString(currentSlice.id));
  manifestText = setSectionScalar(
    manifestText,
    'status',
    'active_slice_state',
    quoteYamlString(currentSlice.status),
  );
  manifestText = setSectionScalar(
    manifestText,
    'status',
    'active_milestone',
    quoteYamlString(currentSlice.milestone),
  );

  const existingApproved = parseSectionListValues(manifestText, 'status', 'approved_reviews');
  const approvedReviewPaths = [
    ...existingApproved,
    ...reviewEval.checks.map((check) => check.relPath),
  ];
  const uniqueApproved = [...new Set(approvedReviewPaths.filter(Boolean))];
  manifestText = setSectionList(manifestText, 'status', 'approved_reviews', uniqueApproved);
  manifestText = setTopLevelScalar(manifestText, 'last_updated_utc', quoteYamlString(now));
  if (!manifestText.endsWith('\n')) {
    manifestText = `${manifestText}\n`;
  }
  writeTextAtomic(manifestPath, manifestText);

  console.log('fabric pm:bootstrap-signoff: OK');
  console.log('- bootstrap reviews verified as approved');
  console.log('- manifest transitioned to delivery mode with approved review references');
}

export {
  pmBriefApprove,
  pmDeriveValues,
  pmApproveBrief,
  pmFinalizeBootstrapReviews,
  pmBootstrapSignoff,
};
