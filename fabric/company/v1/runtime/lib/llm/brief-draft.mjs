import path from 'node:path';
import process from 'node:process';
import { writeTextAtomic } from '../core.mjs';
import { resolveLlmSettings, validateLlmSettings } from './config.mjs';
import {
  buildModelContextBoundedAnalysis,
  estimateTokenCountFromChars,
  invokeStructured,
  loadProductManagerRoleContract,
  renderEvidencePack,
  renderTemplate,
  resolveBriefDraftModelControls,
} from './brief-context.mjs';
import { generateSourceSynthesis } from './brief-synthesis.mjs';
import { generateProductSystemFraming } from './brief-framing.mjs';
import {
  CLARITY_RULES_CONTRACT,
  mergePassOneAndSemanticReviews,
  recommendedFixForIssue,
  reviewGeneratedBriefClarityAllSemantic,
  reviewGeneratedBriefClarityPassOne,
  writeBriefClarityLedger,
  writeBriefClarityReview,
} from './brief-clarity-gate.mjs';
import {
  buildClarityRepairFeedback,
  generateProjectBriefStructuredTargetedRepair,
  suggestBestWayForwardForFindings,
} from './brief-repair.mjs';

const PROJECT_BRIEF_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['product_description','vision_and_positioning','core_problem','target_users','mvp_objective','core_mvp_scope','ux_principles_and_tone','primary_user_journey','technical_direction','data_and_privacy_constraints','explicit_out_of_scope','delivery_expectations','primary_success_criteria','future_roadmap'],
  properties: {
    product_description: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 20, maxLength: 260 } },
    vision_and_positioning: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 20, maxLength: 220 } },
    core_problem: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 20, maxLength: 220 } },
    target_users: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 12, maxLength: 180 } },
    mvp_objective: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 15, maxLength: 200 } },
    core_mvp_scope: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'bullets'],
        properties: {
          title: { type: 'string', minLength: 4, maxLength: 80 },
          bullets: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: { type: 'string', minLength: 16, maxLength: 200 },
          },
        },
      },
    },
    ux_principles_and_tone: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string', minLength: 12, maxLength: 180 } },
    primary_user_journey: { type: 'array', minItems: 5, maxItems: 8, items: { type: 'string', minLength: 16, maxLength: 220 } },
    technical_direction: { type: 'array', minItems: 4, maxItems: 7, items: { type: 'string', minLength: 12, maxLength: 220 } },
    data_and_privacy_constraints: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string', minLength: 12, maxLength: 220 } },
    explicit_out_of_scope: { type: 'array', minItems: 4, maxItems: 8, items: { type: 'string', minLength: 8, maxLength: 180 } },
    delivery_expectations: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string', minLength: 12, maxLength: 220 } },
    primary_success_criteria: { type: 'array', minItems: 4, maxItems: 8, items: { type: 'string', minLength: 14, maxLength: 220 } },
    future_roadmap: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'string', minLength: 8, maxLength: 180 } },
  },
};

function writeBriefAttemptSnapshot({ targetRoot, attempt, markdown }) {
  const outPath = path.join(targetRoot, `docs/reviews/product-manager/brief-attempt-${String(attempt)}.md`);
  writeTextAtomic(outPath, String(markdown || '').replace(/\s+$/, '') + '\n');
  return outPath;
}

function renderProjectBriefMarkdown(projectName, data, analysis) {
  const lines = ['# Project Brief', '', `Date: ` + '`' + `${new Date().toISOString().slice(0,10)}` + '`', 'Prepared by: `Product Manager`', `Project: ` + '`' + `${projectName}` + '`', 'Brief Approval Status: `draft`', ''];
  const addParagraphSection = (title, items) => {
    lines.push(`## ${title}`, '');
    for (const item of items || []) lines.push(item, '');
  };
  addParagraphSection('1. Product Description', data.product_description);
  addParagraphSection('2. Vision and Positioning', data.vision_and_positioning);
  addParagraphSection('3. Core Problem', data.core_problem);
  lines.push('## 4. Target Users', '', ...(data.target_users || []).map((x) => `- ${x}`), '');
  lines.push('## 5. MVP Objective', '', ...(data.mvp_objective || []).map((x) => `- ${x}`), '');
  lines.push('## 6. Core MVP Scope', '');
  for (const item of data.core_mvp_scope || []) lines.push(`### ${item.title}`, '', ...(item.bullets || []).map((x) => `- ${x}`), '');
  lines.push('## 7. UX Principles and Tone', '', ...(data.ux_principles_and_tone || []).map((x) => `- ${x}`), '', '## 8. Primary User Journey', '', ...(data.primary_user_journey || []).map((x, i) => `${i + 1}. ${x}`), '', '## 9. Technical Direction', '', ...(data.technical_direction || []).map((x) => `- ${x}`), '', '## 10. Data and Privacy Constraints', '', ...(data.data_and_privacy_constraints || []).map((x) => `- ${x}`), '', '## 11. Explicit Out of Scope (MVP)', '', ...(data.explicit_out_of_scope || []).map((x) => `- ${x}`), '', '## 12. Delivery Expectations', '', ...(data.delivery_expectations || []).map((x) => `- ${x}`), '', '## 13. Primary Success Criteria', '', ...(data.primary_success_criteria || []).map((x) => `- ${x}`), '', '## 14. Future Roadmap (Not MVP)', '', ...(data.future_roadmap || []).map((x) => `- ${x}`), '', '## 15. Source Basis', '');
  for (const doc of analysis.documents || []) lines.push(`- ` + '`' + `${doc.path.replace(/^docs\/customer-input\//, '')}` + '`');
  lines.push('');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

export function getLlmCheckReport(values = {}) {
  const settings = resolveLlmSettings(values, undefined, 'intake');
  const validation = validateLlmSettings(settings);
  return { settings, validation };
}

export async function runPostEditSemanticValidation({
  targetRoot,
  values = {},
  briefMarkdown,
  evidenceContext = '',
  framingContext = '',
  synthesisContext = '',
  onProgress,
}) {
  let pmRole = {
    relPath: 'team/product-manager.md',
    roleContractBriefFocus: '',
  };
  try {
    pmRole = loadProductManagerRoleContract();
  } catch (_) {
    pmRole = {
      relPath: 'team/product-manager.md',
      roleContractBriefFocus: '',
    };
  }
  const settings = resolveLlmSettings(values, undefined, 'intake');
  const validation = validateLlmSettings(settings);
  if (!validation.ok) throw new Error(validation.errors.join(' '));

  const review = await reviewGeneratedBriefClarityAllSemantic({
    targetRoot,
    settings,
    markdown: String(briefMarkdown || ''),
    evidencePack: String(evidenceContext || ''),
    synthesis: {},
    framing: {},
    synthesisContext: String(synthesisContext || ''),
    framingContext: String(framingContext || ''),
    pmRoleContractSource: pmRole.relPath,
    pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
    semanticClarityGateEnabled: true,
    strictSemanticOnly: true,
    onProgress,
  });

  const findings = (review.issues || []).map((issue) => ({
    ...issue,
    recommended_fix: recommendedFixForIssue(issue),
  }));
  const suggestionsRaw = findings.length > 0
    ? await suggestBestWayForwardForFindings({
      targetRoot,
      settings,
      issues: findings,
      framing: {},
      framingContext: String(framingContext || ''),
      pmRoleContractSource: pmRole.relPath,
      pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
      onProgress,
    })
    : [];
  const suggestions = suggestionsRaw.map((entry) => ({
    id: entry.id,
    rule: entry.rule,
    section: entry.section,
    line: entry.line,
    recommended_fix: entry.recommendedFix || recommendedFixForIssue(entry),
    best_way_forward: entry.bestWayForward || entry.recommendedFix || recommendedFixForIssue(entry),
    rationale: entry.rationale || 'Align this fix with section intent and available framing context.',
    confidence: ['high', 'medium', 'low'].includes(String(entry.confidence || ''))
      ? String(entry.confidence)
      : 'medium',
    implementation_note: entry.implementationNote || 'Apply the wording update to the mapped line and rerun semantic validation.',
  }));

  return {
    settings,
    review,
    findings,
    suggestions,
  };
}

async function generateProjectBriefStructured({
  targetRoot,
  settings,
  evidencePack,
  synthesis,
  framing,
  projectName,
  pmRoleContractSource,
  pmRoleContractBriefFocus,
  clarityGateFeedback = '',
  previousBriefMarkdown = '',
  onProgress,
}) {
  return invokeStructured({
    settings,
    taskName: 'project_brief',
    caller: 'brief-draft.generateProjectBriefStructured',
    targetRoot,
    systemPrompt: renderTemplate('project-brief.system.md', {
      pm_role_contract_source: pmRoleContractSource,
      pm_role_contract_brief_focus: pmRoleContractBriefFocus,
    }),
    userPrompt: renderTemplate('project-brief.user.md', {
      evidence_pack: evidencePack,
      source_synthesis_json: JSON.stringify(synthesis, null, 2),
      framing_json: JSON.stringify(framing, null, 2),
      project_name: projectName,
      clarity_rules_contract: CLARITY_RULES_CONTRACT,
      clarity_gate_feedback: clarityGateFeedback,
      previous_brief_markdown: previousBriefMarkdown,
    }),
    schema: PROJECT_BRIEF_SCHEMA,
    promptSourceFiles: [
      'templates/llm/project-brief.system.md',
      'templates/llm/project-brief.user.md',
      String(pmRoleContractSource || ''),
      'docs/product/source-evidence-pack.md',
      'docs/product/source-synthesis.md',
      'docs/product/product-system-framing.md',
      'docs/product/project-brief.md',
    ],
    onProgress,
  });
}

export async function generateProjectBriefDraftWithModel({
  targetRoot,
  values = {},
  analysis,
  onProgress,
}) {
  const progress = typeof onProgress === 'function' ? onProgress : null;
  const controls = resolveBriefDraftModelControls(values, process.env);
  if (progress) {
    progress('preparing model context');
  }
  const bounded = buildModelContextBoundedAnalysis(analysis || {}, {
    maxContextChars: controls.maxContextChars,
    maxSources: controls.maxSources,
  });
  const sourceStats = bounded.stats;
  if (progress) {
    progress(`total characters: ${String(sourceStats.totalChars)}`);
    progress(`estimated tokens: ${String(estimateTokenCountFromChars(sourceStats.totalChars))}`);
    progress(`sources: ${String(sourceStats.sourceCount)}`);
    progress(`largest source: ${String(sourceStats.largestSourceChars)}`);
    if (sourceStats.truncated) {
      progress(`input exceeds budget (${String(sourceStats.totalChars)} > ${String(sourceStats.budget)} chars), truncating`);
      progress(`context after truncation: ${String(sourceStats.boundedTotalChars)} chars (~${String(sourceStats.estimatedTokens)} tokens)`);
    }
  }
  if (sourceStats.boundedTotalChars < 120 || sourceStats.sourceCount === 0) {
    throw new Error('Cannot generate project brief: no usable input context found');
  }

  const modelAnalysis = bounded.boundedAnalysis;
  const settings = {
    ...resolveLlmSettings(values, undefined, 'brief_draft'),
    modelCallTimeoutMs: controls.timeoutMs,
  };
  const validation = validateLlmSettings(settings);
  if (!validation.ok) throw new Error(validation.errors.join(' '));
  const pmRole = loadProductManagerRoleContract();
  if (progress) {
    const guidanceCount = String(pmRole.roleContractBriefFocus || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^-\s+/.test(line)).length;
    progress(`loaded Product Manager role contract: ${pmRole.relPath} (brief-focus clauses: ${String(guidanceCount)})`);
  }

  const TOTAL_STAGES = 4;
  const runStage = async ({ index, name, task }) => {
    const startedAt = Date.now();
    if (progress) progress(`model call ${String(index)}/${String(TOTAL_STAGES)}: ${name}...`);
    try {
      const output = await task();
      if (progress) progress(`model call ${String(index)}/${String(TOTAL_STAGES)}: OK in ${String(Date.now() - startedAt)} ms`);
      return output;
    } catch (error) {
      if (progress) progress(`model call ${String(index)}/${String(TOTAL_STAGES)}: FAIL after ${String(Date.now() - startedAt)} ms`);
      throw error;
    }
  };

  const evidencePath = path.join(targetRoot, 'docs/product/source-evidence-pack.md');
  const synthesisPath = path.join(targetRoot, 'docs/product/source-synthesis.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');

  const evidencePack = await runStage({
    index: 1,
    name: 'evidence synthesis',
    task: async () => {
      const pack = renderEvidencePack(modelAnalysis);
      writeTextAtomic(evidencePath, pack);
      if (progress) progress(`wrote evidence pack: ${path.relative(targetRoot, evidencePath)}`);
      return pack;
    },
  });

  const sourceSynthesisSettings = { ...settings, modelCallStageName: 'source synthesis' };
  const synthesis = await runStage({
    index: 2,
    name: 'source synthesis',
    task: async () =>
      generateSourceSynthesis({
        settings: sourceSynthesisSettings,
        evidencePack,
        targetRoot,
        synthesisPath,
        onProgress: progress,
      }),
  });

  const framingSettings = { ...settings, modelCallStageName: 'product framing' };
  const framing = await runStage({
    index: 3,
    name: 'product framing',
    task: async () =>
      generateProductSystemFraming({
        settings: framingSettings,
        evidencePack,
        synthesis,
        targetRoot,
        framingPath,
        onProgress: progress,
      }),
  });

  const projectName = synthesis.product_name || values.project_name || 'Untitled Project';
  const gateEnabled = settings.briefQualityGateEnabled !== false;
  const retryBudget = Number.isFinite(settings.briefRetryCount)
    ? Math.max(0, Math.floor(settings.briefRetryCount))
    : 1;
  const attempts = [];
  let attempt = 0;
  let clarityGateFeedback = '';
  let previousBriefMarkdown = '';
  let previousBriefData = null;
  let previousFailedReview = null;
  let finalBrief = null;
  let finalBriefMarkdown = '';
  let finalReview = { ok: true, issues: [], stats: {} };
  const finalDraftSettings = { ...settings, modelCallStageName: 'final brief generation' };
  await runStage({
    index: 4,
    name: 'final brief generation',
    task: async () => {
      while (attempt <= retryBudget) {
        if (progress) progress(`project brief draft attempt ${String(attempt + 1)}/${String(retryBudget + 1)}...`);
        let brief = null;
        let draftingMode = 'full_regeneration';
        let repairPlan = null;
        if (!gateEnabled || attempt === 0 || !previousBriefData || !previousFailedReview) {
          brief = await generateProjectBriefStructured({
            targetRoot,
            settings: finalDraftSettings,
            evidencePack,
            synthesis,
            framing,
            projectName,
            pmRoleContractSource: pmRole.relPath,
            pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
            clarityGateFeedback,
            previousBriefMarkdown,
            onProgress: progress,
          });
        } else {
          if (progress) progress('applying targeted retry repair on flagged lines only (non-target lines frozen)...');
          const targeted = await generateProjectBriefStructuredTargetedRepair({
            targetRoot,
            settings: finalDraftSettings,
            evidencePack,
            synthesis,
            framing,
            projectName,
            previousBriefData,
            previousBriefMarkdown,
            review: previousFailedReview,
            projectBriefSchema: PROJECT_BRIEF_SCHEMA,
            onProgress: progress,
          });
          brief = targeted.brief;
          draftingMode = targeted.repairPlan?.mode || 'targeted_patch';
          repairPlan = targeted.repairPlan || null;
          if (progress && repairPlan) {
            progress(
              `targeted repair summary: editable_paths=${String(repairPlan.editablePaths)}, patched_paths=${String(repairPlan.patchedPaths)}, unmapped_issues=${String(repairPlan.unmappedIssues)}`,
            );
          }
        }
        const briefMarkdown = renderProjectBriefMarkdown(projectName, brief, modelAnalysis);
        const semanticGateEnabled =
          finalDraftSettings.semanticClarityGateEnabled !== false
          && finalDraftSettings.semanticScopeGateEnabled !== false;
        const reviewMode = gateEnabled
          ? 'pass1_adjudicated_plus_global_semantic'
          : 'gate_disabled';
        const review = gateEnabled
          ? mergePassOneAndSemanticReviews({
            passOneReview: await reviewGeneratedBriefClarityPassOne({
              targetRoot,
              settings: finalDraftSettings,
              markdown: briefMarkdown,
              semanticClarityGateEnabled: semanticGateEnabled,
              onProgress: progress,
            }),
            semanticReview: await reviewGeneratedBriefClarityAllSemantic({
              targetRoot,
              settings: finalDraftSettings,
              markdown: briefMarkdown,
              evidencePack,
              synthesis,
              framing,
              pmRoleContractSource: pmRole.relPath,
              pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
              semanticClarityGateEnabled: semanticGateEnabled,
              onProgress: progress,
            }),
          })
          : { ok: true, issues: [], stats: {} };
        const suggestions = gateEnabled && review.issues.length > 0
          ? await suggestBestWayForwardForFindings({
            targetRoot,
            settings: finalDraftSettings,
            issues: review.issues,
            framing,
            pmRoleContractSource: pmRole.relPath,
            pmRoleContractBriefFocus: pmRole.roleContractBriefFocus,
            onProgress: progress,
          })
          : [];
        const snapshotPath = writeBriefAttemptSnapshot({
          targetRoot,
          attempt: attempt + 1,
          markdown: briefMarkdown,
        });
        const snapshotRelPath = path.relative(targetRoot, snapshotPath);

        attempts.push({
          attempt: attempt + 1,
          review,
          reviewMode,
          draftingMode,
          repairPlan,
          suggestions,
          briefMarkdown,
          snapshotPath,
          snapshotRelPath,
        });
        finalBrief = brief;
        finalBriefMarkdown = briefMarkdown;
        finalReview = review;
        if (progress) {
          const verdict = review.ok ? 'pass' : 'fail';
          progress(`clarity gate attempt ${String(attempt + 1)}: ${verdict} (${String(review.issues.length)} issue(s); mode=${reviewMode})`);
        }

        if (!gateEnabled || review.ok || attempt === retryBudget) {
          break;
        }

        clarityGateFeedback = buildClarityRepairFeedback(review);
        previousBriefMarkdown = briefMarkdown;
        previousBriefData = brief;
        previousFailedReview = review;
        if (progress) progress('retrying project brief generation with clarity feedback...');
        attempt += 1;
      }
    },
  });

  const clarityReviewPath = writeBriefClarityReview({
    targetRoot,
    gateEnabled,
    retryBudget,
    attempts,
    finalReview,
  });
  const clarityLedgerPath = writeBriefClarityLedger({
    targetRoot,
    attempts,
  });
  if (progress) progress(`wrote brief clarity review: ${path.relative(targetRoot, clarityReviewPath)}`);
  if (progress) progress(`wrote brief clarity ledger: ${path.relative(targetRoot, clarityLedgerPath)}`);

  if (gateEnabled && !finalReview.ok) {
    const failedBriefPath = path.join(targetRoot, 'docs/reviews/product-manager/project-brief.failed.md');
    writeTextAtomic(failedBriefPath, finalBriefMarkdown);
    if (progress) progress(`wrote failed brief draft: ${path.relative(targetRoot, failedBriefPath)}`);
    const preview = finalReview.issues
      .slice(0, 4)
      .map((issue) => `[${issue.rule}] ${issue.section}`)
      .join('; ');
    throw new Error(
      `Project brief failed clarity gate after ${String(attempts.length)} attempt(s). ${preview || 'See clarity review.'} Review: ${path.relative(targetRoot, clarityReviewPath)} Failed draft: ${path.relative(targetRoot, failedBriefPath)}`,
    );
  }

  writeTextAtomic(briefPath, finalBriefMarkdown);
  if (progress) progress(`wrote brief draft: ${path.relative(targetRoot, briefPath)}`);
  if (progress) progress('model-driven brief draft pipeline complete.');

  return {
    evidencePath,
    synthesisPath,
    framingPath,
    briefPath,
    clarityReviewPath,
    clarityLedgerPath,
    briefAttemptSnapshotPaths: attempts.map((entry) => entry.snapshotPath),
    settings,
    clarity: {
      gateEnabled,
      retryBudget,
      attempts: attempts.length,
      retriesUsed: Math.max(0, attempts.length - 1),
      passed: finalReview.ok,
      issueCount: finalReview.issues.length,
    },
    briefData: finalBrief,
  };
}
