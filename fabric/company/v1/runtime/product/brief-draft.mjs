import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  ensureDir,
  loadValues,
} from '../lib/core.mjs';
import {
  generateProjectBriefDraftWithModel,
  writeSynthesizedProjectBriefDraft,
} from './brief-synthesis.mjs';
import {
  BRIEF_READINESS_REVIEW_REL_PATH,
  BRIEF_READINESS_SNAPSHOT_REL_PATH,
  assertBriefReadinessPassed,
  assertBriefReadinessSnapshotFresh,
} from './brief-readiness.mjs';

const BRIEF_DRAFT_MARKER_REL_PATH = 'docs/pm/brief/brief-draft.stamp.json';

function writeBriefDraftMarker(targetRoot, briefPath) {
  const markerPath = path.join(targetRoot, BRIEF_DRAFT_MARKER_REL_PATH);
  ensureDir(markerPath);
  fs.writeFileSync(
    markerPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      source: 'pm:brief-draft',
      readinessReview: BRIEF_READINESS_REVIEW_REL_PATH,
      readinessSnapshot: BRIEF_READINESS_SNAPSHOT_REL_PATH,
      briefPath: path.relative(targetRoot, briefPath).replaceAll(path.sep, '/'),
    }, null, 2)}\n`,
    'utf8',
  );
  return markerPath;
}

async function pmBriefDraft({ targetRoot, valuesPath }) {
  console.log('fabric pm:brief-draft: starting');
  console.log(`- target root: ${targetRoot}`);

  const readinessReview = assertBriefReadinessPassed(targetRoot);
  console.log(`- readiness review: ${path.relative(targetRoot, readinessReview.reviewPath)}`);
  console.log('- readiness gate: previously passed');
  console.log('- verifying current inputs still match readiness assumptions...');
  const freshness = assertBriefReadinessSnapshotFresh(targetRoot);
  const readinessSnapshot = freshness.snapshot;
  const readinessAnalysis = readinessSnapshot.analysis;
  if (!readinessAnalysis || readinessAnalysis.sufficient !== true) {
    throw new Error(
      `Cannot run pm:brief-draft: readiness snapshot at ${BRIEF_READINESS_SNAPSHOT_REL_PATH} is not marked sufficient. Re-run pm:brief-readiness.`,
    );
  }
  console.log(`- readiness fingerprint: ${freshness.currentFingerprint.sha256.slice(0, 12)} (match)`);

  const values = valuesPath && fs.existsSync(valuesPath) ? loadValues(valuesPath) : {};
  const modelDriven = String(
    values.brief_draft_llm_enabled
    ?? values.pm_llm_enabled
    ?? values.llm_enabled
    ?? process.env.BRIEF_DRAFT_LLM_ENABLED
    ?? process.env.PM_LLM_ENABLED
    ?? process.env.LLM_ENABLED
    ?? 'false',
  ).toLowerCase() === 'true';

  let briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  if (modelDriven) {
    console.log('- draft mode: model-driven');
    const outcome = await generateProjectBriefDraftWithModel({
      targetRoot,
      values,
      analysis: readinessAnalysis,
      onProgress: (message) => console.log(`  - ${message}`),
    });
    briefPath = outcome.briefPath;
    console.log(`- evidence pack: ${path.relative(targetRoot, outcome.evidencePath)}`);
    console.log(`- source synthesis: ${path.relative(targetRoot, outcome.synthesisPath)}`);
    console.log(`- product framing: ${path.relative(targetRoot, outcome.framingPath)}`);
  } else {
    console.log('- draft mode: deterministic synthesis');
    const drafted = writeSynthesizedProjectBriefDraft({
      targetRoot,
      analysis: readinessAnalysis,
      values,
    });
    briefPath = drafted.briefPath;
  }

  const markerPath = writeBriefDraftMarker(targetRoot, briefPath);
  console.log('fabric pm:brief-draft: OK');
  console.log(`- brief draft: ${path.relative(targetRoot, briefPath)}`);
  console.log(`- draft marker: ${path.relative(targetRoot, markerPath)}`);
  console.log('- next: ./fabric/company/v1/fabric pm:brief-approve --target .');
}

export {
  BRIEF_DRAFT_MARKER_REL_PATH,
  pmBriefDraft,
};
