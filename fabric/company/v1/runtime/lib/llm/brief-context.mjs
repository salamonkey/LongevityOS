import path from 'node:path';
import process from 'node:process';
import { FABRIC_ROOT } from '../constants.mjs';
import { readText, writeTextAtomic } from '../core.mjs';
import { invokeOpenAIStructured } from './provider-openai.mjs';
import { invokeStdioJsonStructured } from './provider-stdio-json.mjs';

function renderTemplate(templateName, variables) {
  const template = readText(path.join(FABRIC_ROOT, 'templates/llm', templateName));
  return template.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_, key) => String(variables[key] ?? ''));
}

function normalizeSpecPath(raw) {
  return String(raw || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^\.?\//, '');
}

function sanitizeRoleContractLine(line) {
  return String(line || '')
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractProductManagerBriefFocus(roleContract) {
  const text = String(roleContract || '');
  const lines = text.split('\n');
  const focusPatterns = [
    /\bspecific\b/i,
    /\bstructured\b/i,
    /\btraceable\b/i,
    /\bdecision-ready\b/i,
    /\bexecution-ready\b/i,
    /\bproduct promise\b/i,
    /\btarget users?\b/i,
    /\bjobs?\s+to\s+be\s+done\b/i,
    /\bmvp objective\b/i,
    /\bconstraints?\b/i,
    /\bsuccess criteria\b/i,
    /\bexpansion paths?\b/i,
    /\bproduct-system framing\b/i,
    /\bscope boundaries?\b/i,
    /\bmust-haves?\b/i,
    /\bnon-goals?\b/i,
    /\bout-of-scope\b/i,
    /\bcoheren(t|ce)\b/i,
    /\btestable\b/i,
    /\bwithout material guesswork\b/i,
    /\bevidence-based\b/i,
    /\bclarity over ambiguity\b/i,
  ];

  const picked = [];
  const seen = new Set();
  for (const rawLine of lines) {
    const line = sanitizeRoleContractLine(rawLine);
    if (!line) continue;
    if (/^#{1,6}\s+/.test(rawLine)) continue;
    if (line.length < 20) continue;
    if (!focusPatterns.some((pattern) => pattern.test(line))) continue;
    const compact = line.length > 220 ? `${line.slice(0, 217).trim()}...` : line;
    const key = compact.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(compact);
    if (picked.length >= 14) break;
  }

  const fallback = [
    'Keep outputs specific, structured, traceable, and decision-ready.',
    'Anchor brief decisions in customer evidence, not generic filler.',
    'Define product-system behavior, MVP boundaries, and explicit non-goals.',
    'Ensure success criteria are explicit, testable, and aligned to customer goals.',
    'Produce execution-ready scope without material guesswork for downstream roles.',
  ];

  const selected = picked.length > 0 ? picked : fallback;
  return selected.map((line) => `- ${line}`).join('\n');
}

function resolveRoleSpecPathFromRolesYaml({ roleId }) {
  const rolesPath = path.join(FABRIC_ROOT, 'team/roles.yaml');
  const text = readText(rolesPath);
  const blockMatch = text.match(new RegExp(`-\\s+id:\\s*${String(roleId)}\\b[\\s\\S]*?(?=\\n-\\s+id:|$)`));
  if (!blockMatch) {
    throw new Error(`Role '${String(roleId)}' not found in team/roles.yaml`);
  }
  const specMatch = blockMatch[0].match(/^\s*spec_path:\s*(.+)\s*$/m);
  if (!specMatch) {
    throw new Error(`Role '${String(roleId)}' missing spec_path in team/roles.yaml`);
  }
  const relPath = normalizeSpecPath(specMatch[1]);
  if (!relPath) {
    throw new Error(`Role '${String(roleId)}' has empty spec_path in team/roles.yaml`);
  }
  return relPath;
}

function loadProductManagerRoleContract() {
  const fallbackRelPath = 'team/product-manager.md';
  let relPath = fallbackRelPath;
  try {
    relPath = resolveRoleSpecPathFromRolesYaml({ roleId: 'product_manager' });
  } catch (_) {
    relPath = fallbackRelPath;
  }
  const absPath = path.join(FABRIC_ROOT, relPath);
  const roleContract = readText(absPath).trim();
  if (!roleContract) {
    throw new Error(`Product Manager role contract is empty at ${relPath}`);
  }
  return {
    relPath,
    roleContract,
    roleContractBriefFocus: extractProductManagerBriefFocus(roleContract),
  };
}

function renderEvidencePack(analysis) {
  const lines = ['# Source Evidence Pack', '', 'Treat this as the raw evidence bundle for model-driven intake.', ''];
  for (const doc of analysis.documents || []) {
    lines.push(`## Source: ${doc.path}`, '', '```text', String(doc.text || '').trim(), '```', '');
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function resolvePositiveInt(candidates, fallback) {
  for (const value of candidates) {
    if (value === undefined || value === null || String(value).trim() === '') {
      continue;
    }
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isFinite(parsed) && !Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function estimateTokenCountFromChars(charCount) {
  const chars = Number.isFinite(charCount) ? Math.max(0, Math.floor(charCount)) : 0;
  return Math.ceil(chars / 4);
}

function truncateTextForModelContext(text, maxChars) {
  const raw = String(text || '');
  if (raw.length <= maxChars) {
    return raw;
  }
  const hardCap = Math.max(0, Math.floor(maxChars));
  const breakCandidates = [
    raw.lastIndexOf('\n\n', hardCap),
    raw.lastIndexOf('\n', hardCap),
    raw.lastIndexOf('. ', hardCap),
    raw.lastIndexOf(' ', hardCap),
  ];
  let cutIndex = hardCap;
  for (const candidate of breakCandidates) {
    if (candidate >= Math.floor(hardCap * 0.6)) {
      cutIndex = candidate;
      break;
    }
  }
  const head = raw.slice(0, cutIndex).trimEnd();
  return `${head}\n[truncated]`;
}

function buildModelContextBoundedAnalysis(analysis, {
  maxContextChars,
  maxSources,
}) {
  const docs = Array.isArray(analysis?.documents)
    ? analysis.documents.map((doc, index) => ({
      index,
      path: String(doc?.path || `source-${String(index + 1)}`),
      text: String(doc?.text || ''),
    }))
    : [];
  const usable = docs.filter((doc) => doc.text.trim().length > 0);
  const sourceCount = usable.length;
  const totalChars = usable.reduce((sum, doc) => sum + doc.text.length, 0);
  const largestSourceChars = usable.reduce((max, doc) => Math.max(max, doc.text.length), 0);

  const budget = Math.max(1000, Math.floor(maxContextChars));
  const sourceLimit = Math.max(1, Math.floor(maxSources));
  let selected = [...usable];
  if (selected.length > sourceLimit) {
    selected = [...selected]
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, sourceLimit);
  }
  selected.sort((a, b) => a.index - b.index);

  const perSourceBudget = Math.max(800, Math.floor(budget / Math.max(1, selected.length)));
  const boundedDocs = selected.map((doc) => ({
    path: doc.path,
    text: truncateTextForModelContext(doc.text, perSourceBudget),
  }));

  let boundedTotalChars = boundedDocs.reduce((sum, doc) => sum + doc.text.length, 0);
  if (boundedTotalChars > budget) {
    const scale = budget / boundedTotalChars;
    for (let i = 0; i < boundedDocs.length; i += 1) {
      const hardCap = Math.max(400, Math.floor(boundedDocs[i].text.length * scale));
      boundedDocs[i].text = truncateTextForModelContext(boundedDocs[i].text, hardCap);
    }
    boundedTotalChars = boundedDocs.reduce((sum, doc) => sum + doc.text.length, 0);
  }

  const truncated = (
    sourceCount !== boundedDocs.length
    || boundedTotalChars < totalChars
    || boundedDocs.some((doc) => /\n\[truncated\]$/.test(doc.text))
  );

  return {
    boundedAnalysis: {
      ...analysis,
      documents: boundedDocs,
    },
    stats: {
      sourceCount,
      largestSourceChars,
      totalChars,
      boundedTotalChars,
      estimatedTokens: estimateTokenCountFromChars(boundedTotalChars),
      truncated,
      budget,
      selectedSources: boundedDocs.length,
    },
  };
}

function resolveBriefDraftModelControls(values = {}, env = process.env) {
  const maxContextChars = resolvePositiveInt([
    values.brief_draft_llm_max_context_chars,
    values.pm_llm_max_context_chars,
    values.llm_max_context_chars,
    env.BRIEF_DRAFT_LLM_MAX_CONTEXT_CHARS,
    env.PM_LLM_MAX_CONTEXT_CHARS,
    env.LLM_MAX_CONTEXT_CHARS,
  ], 40000);
  const maxSources = resolvePositiveInt([
    values.brief_draft_llm_max_sources,
    values.pm_llm_max_sources,
    values.llm_max_sources,
    env.BRIEF_DRAFT_LLM_MAX_SOURCES,
    env.PM_LLM_MAX_SOURCES,
    env.LLM_MAX_SOURCES,
  ], 8);
  const timeoutMs = resolvePositiveInt([
    values.brief_draft_llm_timeout_ms,
    values.pm_llm_timeout_ms,
    values.llm_timeout_ms,
    env.BRIEF_DRAFT_LLM_TIMEOUT_MS,
    env.PM_LLM_TIMEOUT_MS,
    env.LLM_TIMEOUT_MS,
  ], 90000);
  return {
    maxContextChars,
    maxSources,
    timeoutMs,
  };
}

const LLM_LOG_DIR_REL_PATH = '.llm-logs';

function sanitizeLogToken(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  if (normalized) {
    return normalized.slice(0, 96);
  }
  return String(fallback || 'unknown');
}

function timestampForLogFile(epochMs = Date.now()) {
  return new Date(epochMs)
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-');
}

function normalizePromptSourcePath(rawPath) {
  const normalized = String(rawPath || '')
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/^\.?\//, '')
    .replace(/\\/g, '/');
  return normalized.replace(/[),.;:]+$/, '');
}

function collectPromptSourcePaths({
  promptSourceFiles = [],
}) {
  const candidates = [];
  if (Array.isArray(promptSourceFiles)) {
    candidates.push(...promptSourceFiles);
  }
  const deduped = [];
  const seen = new Set();
  for (const item of candidates) {
    const normalized = normalizePromptSourcePath(item);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function renderPromptLogMarkdown({
  label,
  caller,
  startedAtMs,
  settings,
  promptChars,
  promptEstimatedTokens,
  promptSourcePaths,
  systemPrompt,
  userPrompt,
}) {
  const lines = [
    '# LLM Prompt Log',
    '',
    `- task: ${String(label)}`,
    `- caller: ${String(caller || 'unspecified')}`,
    `- provider: ${String(settings?.provider || 'unknown')}`,
    `- model: ${String(settings?.model || 'unknown')}`,
    `- started_utc: ${new Date(startedAtMs).toISOString()}`,
    `- prompt_chars: ${String(promptChars)}`,
    `- prompt_estimated_tokens: ${String(promptEstimatedTokens)}`,
    '- prompt_sources:',
    ...(promptSourcePaths.length > 0
      ? promptSourcePaths.map((item) => `  - ${item}`)
      : ['  - [inline/generated context only]']),
    '',
    '## System Prompt',
    '```text',
    String(systemPrompt || ''),
    '```',
    '',
    '## User Prompt',
    '```text',
    String(userPrompt || ''),
    '```',
    '',
  ];
  return lines.join('\n');
}

function writeLlmPromptLog({
  targetRoot,
  baseFileStem,
  label,
  caller,
  startedAtMs,
  settings,
  promptChars,
  promptEstimatedTokens,
  promptSourcePaths,
  systemPrompt,
  userPrompt,
}) {
  const promptFileName = `${baseFileStem}-prompt.md`;
  const promptAbsPath = path.join(targetRoot, LLM_LOG_DIR_REL_PATH, promptFileName);
  const promptRelPath = path.relative(targetRoot, promptAbsPath);
  const markdown = renderPromptLogMarkdown({
    label,
    caller,
    startedAtMs,
    settings,
    promptChars,
    promptEstimatedTokens,
    promptSourcePaths,
    systemPrompt,
    userPrompt,
  });
  writeTextAtomic(promptAbsPath, markdown);
  return { promptAbsPath, promptRelPath };
}

function writeLlmResponseLog({
  targetRoot,
  baseFileStem,
  responsePayload,
}) {
  const responseFileName = `${baseFileStem}-response.json`;
  const responseAbsPath = path.join(targetRoot, LLM_LOG_DIR_REL_PATH, responseFileName);
  const responseRelPath = path.relative(targetRoot, responseAbsPath);
  writeTextAtomic(responseAbsPath, `${JSON.stringify(responsePayload, null, 2)}\n`);
  return { responseAbsPath, responseRelPath };
}

function formatLlmLogPathsForConsole(promptLogRelPath, responseLogRelPath) {
  const lines = ['llm logs:'];
  lines.push(promptLogRelPath ? `\t- ${promptLogRelPath}` : '\t- [prompt log unavailable]');
  lines.push(responseLogRelPath ? `\t- ${responseLogRelPath}` : '\t- [response log unavailable]');
  return lines.join('\n');
}

function renderSourceSynthesisMarkdown(data) {
  const lines = ['# Source Synthesis', '', '## Product Identity', '', `- Product name: ${data.product_name}`, `- Core promise: ${data.core_promise}`, '', '## Source Comparison', ''];
  for (const item of data.source_comparison || []) {
    lines.push(`### ${item.source_path}`, '', `- Source kind: ${item.source_kind}`);
    for (const point of item.key_points || []) lines.push(`- ${point}`);
    lines.push('');
  }
  const blocks = [
    ['Recurring Themes', data.recurring_themes],
    ['Hard Constraints', data.hard_constraints],
    ['Out of Scope', data.out_of_scope],
    ['Ambiguities', data.ambiguities],
    ['Structural Corrections', data.structural_corrections],
    ['Recommended Briefing Points', data.recommended_briefing_points],
  ];
  for (const [title, items] of blocks) lines.push(`## ${title}`, '', ...(items?.length ? items.map((x) => `- ${x}`) : ['- None captured.']), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function renderProductSystemFramingMarkdown(data) {
  const lines = ['# Product System Framing', '', '## Product Essence', '', data.product_essence, '', '## Target Users', '', ...data.target_users.map((x) => `- ${x}`), '', '## Jobs To Be Done', '', ...data.jobs_to_be_done.map((x) => `- ${x}`), '', '## Core Concepts', ''];
  for (const concept of data.core_concepts || []) lines.push(`- **${concept.name}** — ${concept.definition}`);
  lines.push('', '## Product Rules', '', ...data.product_rules.map((x) => `- ${x}`), '', '## Primary Workflows', '');
  for (const flow of data.primary_workflows || []) lines.push(`### ${flow.name}`, '', ...flow.steps.map((step, i) => `${i + 1}. ${step}`), '');
  lines.push('## MVP Boundaries', '', '### In Scope', '', ...data.mvp_boundaries.in_scope.map((x) => `- ${x}`), '', '### Out of Scope', '', ...data.mvp_boundaries.out_of_scope.map((x) => `- ${x}`), '', '## Open Decisions', '', ...(data.open_decisions.length ? data.open_decisions.map((x) => `- ${x}`) : ['- None captured.']), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
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

async function invokeStructured({
  settings,
  taskName,
  systemPrompt,
  userPrompt,
  schema,
  onProgress,
  timeoutMs,
  stageName,
  targetRoot,
  caller,
  promptSourceFiles = [],
}) {
  const progress = typeof onProgress === 'function' ? onProgress : null;
  const startedAt = Date.now();
  const label = String(taskName || 'llm_task');
  const resolvedTargetRoot = path.resolve(String(targetRoot || process.cwd()));
  const callerLabel = String(caller || 'invokeStructured');
  const modelCallStageName = String(stageName || settings?.modelCallStageName || label);
  const resolvedTimeoutMs = resolvePositiveInt([
    timeoutMs,
    settings?.modelCallTimeoutMs,
  ], 180000);
  const idleTimeoutSec = Math.max(1, Math.round(resolvedTimeoutMs / 1000));
  const resolvedMaxElapsedMs = Math.max(
    resolvedTimeoutMs,
    resolvePositiveInt([
      settings?.modelCallMaxElapsedMs,
    ], resolvedTimeoutMs * 3),
  );
  const maxElapsedSec = Math.max(1, Math.round(resolvedMaxElapsedMs / 1000));
  const promptChars = String(systemPrompt || '').length + String(userPrompt || '').length;
  const promptEstimatedTokens = estimateTokenCountFromChars(promptChars);
  const promptSourcePaths = collectPromptSourcePaths({
    promptSourceFiles,
  });
  const baseFileStem = [
    timestampForLogFile(startedAt),
    sanitizeLogToken(callerLabel, 'caller'),
    sanitizeLogToken(label, 'task'),
  ].join('-');
  let promptLogRelPath = null;
  let responseLogRelPath = null;
  let heartbeat = null;
  let idleTimeoutHandle = null;
  let hardTimeoutHandle = null;
  let lastActivityAt = Date.now();
  let lastTimeoutResetAt = 0;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  if (progress) {
    progress(
      `llm request started: ${label} (prompt chars=${String(promptChars)}, est tokens=${String(promptEstimatedTokens)})`,
    );
    const promptContentLines = ['prompt content:'];
    if (promptSourcePaths.length > 0) {
      for (const sourcePath of promptSourcePaths) {
        promptContentLines.push(`\t- ${sourcePath}`);
      }
    } else {
      promptContentLines.push('\t- [inline/generated context only]');
    }
    progress(promptContentLines.join('\n'));
    heartbeat = setInterval(() => {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      progress(`\tllm request in progress: ${label} (${String(elapsedSec)}s elapsed)`);
    }, 10000);
  }
  try {
    try {
      const promptLog = writeLlmPromptLog({
        targetRoot: resolvedTargetRoot,
        baseFileStem,
        label,
        caller: callerLabel,
        startedAtMs: startedAt,
        settings,
        promptChars,
        promptEstimatedTokens,
        promptSourcePaths,
        systemPrompt,
        userPrompt,
      });
      promptLogRelPath = promptLog.promptRelPath;
      if (progress) {
        progress(`llm prompt log: ${promptLogRelPath}`);
      }
    } catch (logError) {
      if (progress) {
        progress(`llm prompt log unavailable: ${String(logError?.message || logError)}`);
      }
    }

    let result;
    let rejectTimeout = null;
    const scheduleIdleTimeout = () => {
      if (typeof rejectTimeout !== 'function') {
        return;
      }
      if (idleTimeoutHandle) {
        clearTimeout(idleTimeoutHandle);
      }
      idleTimeoutHandle = setTimeout(() => {
        if (controller) {
          try {
            controller.abort();
          } catch (_) {
            // Ignore abort errors; timeout error below is authoritative.
          }
        }
        const idleMs = Date.now() - lastActivityAt;
        const idleSec = Math.max(1, Math.round(idleMs / 1000));
        rejectTimeout(new Error(
          `Model call idle timeout after ${String(idleTimeoutSec)}s during ${modelCallStageName} `
          + `(last activity ${String(idleSec)}s ago)`,
        ));
      }, resolvedTimeoutMs);
      lastTimeoutResetAt = Date.now();
    };
    const markActivity = () => {
      lastActivityAt = Date.now();
      if ((Date.now() - lastTimeoutResetAt) < 250) {
        return;
      }
      scheduleIdleTimeout();
    };
    const providerCall = async () => {
      if (settings.provider === 'openai') {
        return invokeOpenAIStructured({
          settings,
          taskName,
          systemPrompt,
          userPrompt,
          schema,
          signal: controller?.signal,
          onActivity: markActivity,
        });
      }
      if (settings.provider === 'stdio_json') {
        return invokeStdioJsonStructured({
          settings,
          taskName,
          systemPrompt,
          userPrompt,
          schema,
          signal: controller?.signal,
          onActivity: markActivity,
        });
      }
      throw new Error(`Unsupported llm provider: ${settings.provider}`);
    };

    const timeoutPromise = new Promise((_, reject) => {
      rejectTimeout = reject;
      hardTimeoutHandle = setTimeout(() => {
        if (controller) {
          try {
            controller.abort();
          } catch (_) {
            // Ignore abort errors; timeout error below is authoritative.
          }
        }
        reject(new Error(`Model call max timeout after ${String(maxElapsedSec)}s during ${modelCallStageName}`));
      }, resolvedMaxElapsedMs);
      idleTimeoutHandle = setTimeout(() => {
        const idleMs = Date.now() - lastActivityAt;
        const idleSec = Math.max(1, Math.round(idleMs / 1000));
        reject(new Error(
          `Model call idle timeout after ${String(idleTimeoutSec)}s during ${modelCallStageName} `
          + `(last activity ${String(idleSec)}s ago)`,
        ));
      }, resolvedTimeoutMs);
      lastTimeoutResetAt = Date.now();
    });
    markActivity();
    const providerPromise = providerCall();

    result = await Promise.race([providerPromise, timeoutPromise]);
    try {
      const responseLog = writeLlmResponseLog({
        targetRoot: resolvedTargetRoot,
        baseFileStem,
        responsePayload: {
          task: label,
          caller: callerLabel,
          provider: String(settings?.provider || ''),
          model: String(settings?.model || ''),
          started_utc: new Date(startedAt).toISOString(),
          completed_utc: new Date().toISOString(),
          elapsed_ms: Date.now() - startedAt,
          ok: true,
          response: result,
        },
      });
      responseLogRelPath = responseLog.responseRelPath;
    } catch (logError) {
      if (progress) {
        progress(`llm response log unavailable: ${String(logError?.message || logError)}`);
      }
    }
    if (progress) {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const resultChars = JSON.stringify(result || {}).length;
      const resultEstimatedTokens = estimateTokenCountFromChars(resultChars);
      progress(
        `llm request completed: ${label} (${String(elapsedSec)}s; output chars=${String(resultChars)}, est tokens=${String(resultEstimatedTokens)})`,
      );
      if (promptLogRelPath || responseLogRelPath) {
        progress(formatLlmLogPathsForConsole(promptLogRelPath, responseLogRelPath));
      }
    }
    return result;
  } catch (error) {
    try {
      const responseLog = writeLlmResponseLog({
        targetRoot: resolvedTargetRoot,
        baseFileStem,
        responsePayload: {
          task: label,
          caller: callerLabel,
          provider: String(settings?.provider || ''),
          model: String(settings?.model || ''),
          started_utc: new Date(startedAt).toISOString(),
          failed_utc: new Date().toISOString(),
          elapsed_ms: Date.now() - startedAt,
          ok: false,
          error: String(error?.message || error),
        },
      });
      responseLogRelPath = responseLog.responseRelPath;
    } catch (_) {
      // Keep the original failure authoritative.
    }
    if (progress) {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      progress(`llm request failed: ${label} (${String(elapsedSec)}s)`);
      if (promptLogRelPath || responseLogRelPath) {
        progress(formatLlmLogPathsForConsole(promptLogRelPath, responseLogRelPath));
      }
    }
    throw error;
  } finally {
    if (idleTimeoutHandle) {
      clearTimeout(idleTimeoutHandle);
    }
    if (hardTimeoutHandle) {
      clearTimeout(hardTimeoutHandle);
    }
    if (heartbeat) clearInterval(heartbeat);
  }
}

export {
  renderTemplate,
  normalizeSpecPath,
  sanitizeRoleContractLine,
  extractProductManagerBriefFocus,
  resolveRoleSpecPathFromRolesYaml,
  loadProductManagerRoleContract,
  renderEvidencePack,
  resolvePositiveInt,
  estimateTokenCountFromChars,
  truncateTextForModelContext,
  buildModelContextBoundedAnalysis,
  resolveBriefDraftModelControls,
  invokeStructured,
};
