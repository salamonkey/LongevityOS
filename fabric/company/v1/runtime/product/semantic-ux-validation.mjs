import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  readText,
  writeTextAtomic,
  parseSliceBlockWithLists,
  loadValuesIfPresent,
} from '../lib/core.mjs';
import { resolveFirstValidLlmSettings } from '../lib/llm/config.mjs';
import { invokeStructured } from '../lib/llm/brief-context.mjs';
import {
  componentContractRelPathForSlice,
  copyContractRelPathForSlice,
  requiredDesignSystemRelPaths,
  requiredSliceUxContractRelPaths,
  screenContractRelPathForSlice,
} from './design-system.mjs';

function normalizeSliceIdForPath(sliceId) {
  return String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
}

function uniqueStrings(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const item = String(value || '').trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
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

function isEnabled(rawValue, fallback = true) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') return fallback;
  return String(rawValue).trim().toLowerCase() !== 'false';
}

function resolveSemanticUxLlmRequired(values = {}, env = process.env) {
  return isEnabled(
    values.semantic_ux_llm_required
      ?? values.uiux_semantic_ux_llm_required
      ?? env.SEMANTIC_UX_LLM_REQUIRED
      ?? env.UIUX_SEMANTIC_UX_LLM_REQUIRED,
    true,
  );
}

function resolveSemanticUxLlmEnabled(values = {}, env = process.env) {
  return isEnabled(
    values.semantic_ux_llm_enabled
      ?? values.uiux_semantic_ux_llm_enabled
      ?? env.SEMANTIC_UX_LLM_ENABLED
      ?? env.UIUX_SEMANTIC_UX_LLM_ENABLED,
    true,
  );
}

function toRelPath(targetRoot, absPath) {
  return path.relative(targetRoot, absPath).replace(/\\/g, '/');
}

function walkFiles(rootDir, predicate, maxFiles = 200) {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const stack = [rootDir];
  while (stack.length > 0 && out.length < maxFiles) {
    const current = stack.pop();
    let stat;
    try {
      stat = fs.statSync(current);
    } catch (_) {
      continue;
    }
    if (stat.isDirectory()) {
      const base = path.basename(current);
      if (['node_modules', 'dist', 'build', 'coverage', '.git'].includes(base)) continue;
      for (const child of fs.readdirSync(current).reverse()) {
        stack.push(path.join(current, child));
      }
      continue;
    }
    if (stat.isFile() && predicate(current)) {
      out.push(current);
    }
  }
  return out;
}

function semanticUxContractRelPathForSlice(sliceId) {
  const normalizedSliceId = normalizeSliceIdForPath(sliceId);
  return `docs/ux/${normalizedSliceId}-semantic-ux-contract.json`;
}

function semanticUxReviewJsonRelPathForSlice(sliceId) {
  const normalizedSliceId = normalizeSliceIdForPath(sliceId);
  return `docs/reviews/ux/${normalizedSliceId}-semantic-ux-review.json`;
}

function semanticUxReviewMdRelPathForSlice(sliceId) {
  const normalizedSliceId = normalizeSliceIdForPath(sliceId);
  return `docs/reviews/ux/${normalizedSliceId}-semantic-ux-review.md`;
}

function extractPotentialContentSlots(slice = {}, uxFlowText = '') {
  const acceptance = [
    ...listFromMaybe(slice.acceptance_criteria),
    ...listFromMaybe(slice.acceptance),
  ];
  const combined = `${String(slice.title || '')}\n${String(slice.objective || '')}\n${acceptance.join('\n')}\n${String(uxFlowText || '')}`;
  const slots = [
    {
      slot: 'primary_heading',
      purpose: 'Tell the user what this screen, flow, or section is for.',
      required: true,
      quality_bar: [
        'Specific to the user task.',
        'Readable without internal project context.',
        'Not a generic system or component label.',
      ],
    },
    {
      slot: 'primary_action',
      purpose: 'Make the next user action clear.',
      required: true,
      quality_bar: [
        'Uses direct, user-facing wording.',
        'Does not expose implementation, routing, schema, or test language.',
      ],
    },
    {
      slot: 'empty_or_error_state',
      purpose: 'Help the user recover from missing, invalid, or unavailable state.',
      required: false,
      quality_bar: [
        'Explains what happened in plain language.',
        'Gives a safe next step where possible.',
        'Does not render raw undefined/null/error payloads.',
      ],
    },
    {
      slot: 'status_context',
      purpose: 'Explain current state, progress, timing, or result in human-readable language when shown.',
      required: /status|state|date|due|progress|score|count|today|soon|later|priority|bucket|summary/i.test(combined),
      quality_bar: [
        'Dates, times, counts, and states are valid and human-readable.',
        'Unknown data uses safe fallback copy.',
        'Raw enum values, malformed dates, and raw calculations are never visible.',
      ],
    },
    {
      slot: 'explanation_or_rationale',
      purpose: 'Explain why the user should care or what value the action creates when a rationale is shown.',
      required: /why|reason|explain|rationale|matters|guidance|insight|recommend/i.test(combined),
      quality_bar: [
        'Explains user value rather than app mechanics.',
        'Uses concise, concrete, trust-building wording.',
        'Does not overclaim, alarm, or invent unsupported facts.',
      ],
    },
  ];
  return slots;
}

function buildSemanticUxContract({ slice = {}, uxFlowText = '', generatedAt = new Date().toISOString() }) {
  const acceptance = [
    ...listFromMaybe(slice.acceptance_criteria),
    ...listFromMaybe(slice.acceptance),
  ];
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    slice_id: String(slice.id || 'UNKNOWN'),
    slice_title: String(slice.title || 'Current Slice'),
    surface_type: 'user_facing',
    global_rules: {
      must: [
        'Use user-facing language that makes sense without internal project context.',
        'Explain user value rather than system mechanics where explanatory copy is required.',
        'Keep wording concise, concrete, and aligned to the active slice.',
        'Use safe fallback copy when data is missing or unknown.',
        'Render dates, times, counts, and statuses in valid human-readable form.',
      ],
      must_not: [
        'Expose internal workflow, slice, acceptance, schema, payload, routing, component, ranking, bucket, test, or implementation language in visible UI.',
        'Use placeholder, TODO, TBD, lorem ipsum, generic filler, or template copy as final visible UI.',
        'Render undefined, null, NaN, Invalid Date, [object Object], raw enum values, raw calculation output, or malformed years.',
        'Satisfy acceptance criteria only structurally while failing the user-facing purpose.',
      ],
    },
    visible_content_slots: extractPotentialContentSlots(slice, uxFlowText),
    acceptance_criteria: acceptance,
    deterministic_scan: {
      forbidden_visible_fragments: [
        'TODO',
        'TBD',
        'lorem ipsum',
        'placeholder',
        'undefined',
        'null',
        'NaN',
        'Invalid Date',
        '[object Object]',
        'acceptance criteria',
        'schema',
        'payload',
        'bucket rules',
        'generated action',
        'slice id',
        'implementation detail',
      ],
      suspicious_patterns: [
        'five_or_more_digit_year_or_numeric_state',
        'raw_error_or_debug_copy',
        'internal_factory_language_in_visible_copy',
      ],
    },
    llm_review: {
      required: true,
      instruction: 'Review semantic fitness of the implemented user-facing UI against this contract. A section existing with bad or generic copy is a failure.',
    },
  };
}

function writeSemanticUxContract({ targetRoot, slice, uxFlowText, generatedAt = new Date().toISOString() }) {
  const relPath = semanticUxContractRelPathForSlice(slice?.id);
  const absPath = path.join(targetRoot, relPath);
  const contract = buildSemanticUxContract({ slice, uxFlowText, generatedAt });
  writeTextAtomic(absPath, `${JSON.stringify(contract, null, 2)}\n`);
  return { relPath, absPath, contract };
}

function readSemanticUxReviewStatus({ targetRoot, sliceId }) {
  const relPath = semanticUxReviewJsonRelPathForSlice(sliceId);
  const absPath = path.join(targetRoot, relPath);
  if (!fs.existsSync(absPath)) {
    return { exists: false, relPath, status: 'missing', blockerCount: 0, findings: [] };
  }
  const parsed = JSON.parse(readText(absPath));
  const findings = Array.isArray(parsed?.findings) ? parsed.findings : [];
  return {
    exists: true,
    relPath,
    status: String(parsed?.status || 'unknown'),
    blockerCount: findings.filter(isBlockingFinding).length,
    findings,
    llm_status: String(parsed?.llm_status || ''),
  };
}

const USER_VISIBLE_FILE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.html']);

function addVisibleCandidate(candidates, rawValue, metadata = {}) {
  const value = String(rawValue || '').replace(/\s+/g, ' ').trim();
  if (!value || !/[A-Za-z0-9]/.test(value)) return;
  candidates.push({
    text: value.slice(0, 260),
    slot: metadata.slot || 'user_visible_copy',
    visibility: metadata.visibility || 'likely_visible',
    confidence: metadata.confidence || 'medium',
    extractor: metadata.extractor || 'unknown',
  });
}

function collectLikelyVisibleStringsFromText(text) {
  const candidates = [];
  const source = String(text || '');
  let match;

  const jsxTextNodePattern = />\s*([^<>{}\n][^<>{}]{2,220}?)\s*</g;
  while ((match = jsxTextNodePattern.exec(source)) !== null) {
    addVisibleCandidate(candidates, match[1], {
      slot: 'jsx_text_node',
      visibility: 'likely_visible',
      confidence: 'high',
      extractor: 'jsx_text_node',
    });
  }

  const jsxLiteralChildPattern = /\{\s*(["'`])([^"'`]{2,220})\1\s*\}/g;
  while ((match = jsxLiteralChildPattern.exec(source)) !== null) {
    addVisibleCandidate(candidates, match[2], {
      slot: 'jsx_literal_child',
      visibility: 'likely_visible',
      confidence: 'high',
      extractor: 'jsx_literal_child',
    });
  }

  const visiblePropPattern = /\b(?:aria-label|title|alt|placeholder|label|helperText)\s*=\s*(["'`])([^"'`]{2,220})\1/g;
  while ((match = visiblePropPattern.exec(source)) !== null) {
    addVisibleCandidate(candidates, match[2], {
      slot: 'visible_prop',
      visibility: 'likely_visible',
      confidence: 'high',
      extractor: 'jsx_visible_prop',
    });
  }

  // Heuristic: commonly visible copy keys in object literals used for rendering.
  const visibleObjectFieldPattern = /\b(?:label|title|text|subtitle|description|helperText|message|cta|buttonLabel|emptyText|statusText)\s*:\s*(["'`])([^"'`]{2,220})\1/g;
  while ((match = visibleObjectFieldPattern.exec(source)) !== null) {
    addVisibleCandidate(candidates, match[2], {
      slot: 'visible_object_field',
      visibility: 'uncertain',
      confidence: 'medium',
      extractor: 'object_visible_field',
    });
  }

  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    const key = `${item.slot}|${item.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 240) break;
  }
  return unique;
}

function collectUserVisibleSourceFiles(targetRoot) {
  const files = [];
  const roots = ['src', 'app', 'pages', 'components'];
  for (const root of roots) {
    files.push(...walkFiles(path.join(targetRoot, root), (filePath) => USER_VISIBLE_FILE_EXTENSIONS.has(path.extname(filePath)), 160));
  }
  const indexHtml = path.join(targetRoot, 'index.html');
  if (fs.existsSync(indexHtml)) files.push(indexHtml);
  return uniqueStrings(files.map((filePath) => path.resolve(filePath))).map((filePath) => ({
    absPath: filePath,
    relPath: toRelPath(targetRoot, filePath),
  }));
}

function buildForbiddenRegexes(contract = {}) {
  const explicit = contract?.deterministic_scan?.forbidden_visible_fragments || [];
  const defaults = [
    'TODO',
    'TBD',
    'lorem ipsum',
    'placeholder',
    'undefined',
    'null',
    'NaN',
    'Invalid Date',
    '[object Object]',
  ];
  return uniqueStrings([...defaults, ...explicit]).map((term) => ({
    term,
    regex: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  }));
}

const INTERNAL_LEAK_TERMS = [
  { term: 'slice', regex: /\bslice\b/i },
  { term: 'acceptance criteria', regex: /\bacceptance criteria\b/i },
  { term: 'schema', regex: /\bschema\b/i },
  { term: 'payload', regex: /\bpayload\b/i },
];

const RAW_VISIBLE_VALUE_REGEX = /\b(?:undefined|null|NaN|Invalid Date|\[object Object\])\b/i;
const MALFORMED_YEAR_REGEX = /\b(?:1\d{4,}|[2-9]\d{4,})\b/;

function deterministicSeverityForCandidate(candidate, issueType) {
  if (candidate.visibility !== 'likely_visible' || candidate.confidence !== 'high') {
    return 'warning';
  }
  return 'blocker';
}

function isDeterministicBlockingFinding(finding) {
  if (String(finding?.source || '') !== 'deterministic') return false;
  return String(finding?.severity || '') === 'blocker'
    && String(finding?.visibility || '') === 'likely_visible'
    && String(finding?.confidence || '') === 'high';
}

function isBlockingFinding(finding) {
  if (String(finding?.source || '') === 'deterministic') {
    return isDeterministicBlockingFinding(finding);
  }
  return String(finding?.severity || '') === 'blocker';
}

function deterministicSemanticScan({ targetRoot, contract }) {
  const findings = [];
  const forbidden = buildForbiddenRegexes(contract);
  const visibleFiles = collectUserVisibleSourceFiles(targetRoot);
  for (const file of visibleFiles) {
    const text = readText(file.absPath);
    const candidates = collectLikelyVisibleStringsFromText(text);
    for (const candidate of candidates) {
      for (const { term, regex } of forbidden) {
        if (!regex.test(candidate.text)) continue;
        findings.push({
          severity: deterministicSeverityForCandidate(candidate, 'forbidden_visible_fragment'),
          source: 'deterministic',
          confidence: candidate.confidence,
          visibility: candidate.visibility,
          file: file.relPath,
          slot: candidate.slot,
          issue_type: 'forbidden_visible_fragment',
          observed: candidate.text,
          required: `Remove or replace forbidden visible fragment: ${term}`,
        });
      }
      for (const leak of INTERNAL_LEAK_TERMS) {
        if (!leak.regex.test(candidate.text)) continue;
        findings.push({
          severity: deterministicSeverityForCandidate(candidate, 'internal_factory_language_in_visible_copy'),
          source: 'deterministic',
          confidence: candidate.confidence,
          visibility: candidate.visibility,
          file: file.relPath,
          slot: candidate.slot,
          issue_type: 'internal_factory_language_in_visible_copy',
          observed: candidate.text,
          required: `Replace visible internal language '${leak.term}' with user-facing wording.`,
        });
      }

      if (RAW_VISIBLE_VALUE_REGEX.test(candidate.text)) {
        findings.push({
          severity: deterministicSeverityForCandidate(candidate, 'raw_error_or_debug_copy'),
          source: 'deterministic',
          confidence: candidate.confidence,
          visibility: candidate.visibility,
          file: file.relPath,
          slot: candidate.slot,
          issue_type: 'raw_error_or_debug_copy',
          observed: candidate.text,
          required: 'Replace raw debug/nullish values with safe user-facing fallback copy.',
        });
      }

      if (MALFORMED_YEAR_REGEX.test(candidate.text)) {
        findings.push({
          severity: deterministicSeverityForCandidate(candidate, 'malformed_numeric_or_date_state'),
          source: 'deterministic',
          confidence: candidate.confidence,
          visibility: candidate.visibility,
          file: file.relPath,
          slot: 'status_context',
          issue_type: 'malformed_numeric_or_date_state',
          observed: candidate.text,
          required: 'Render valid human-readable dates, counts, and statuses; never show malformed years or raw calculation output.',
        });
      }

    }
  }
  return findings;
}


const RAW_VISUAL_VALUE_REGEX = /(?:#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|\b(?:red|green|blue|orange|purple|pink|yellow|gray|grey)\b)/;
const AD_HOC_INLINE_STYLE_REGEX = /style\s*=\s*\{\{[^}]+(?:color|background|borderRadius|padding|margin|gap)[^}]+\}\}/s;

function deterministicDesignSystemScan({ targetRoot, sliceId }) {
  const findings = [];
  const missingArtifacts = [...requiredDesignSystemRelPaths(), ...requiredSliceUxContractRelPaths(sliceId)]
    .filter((relPath) => !fs.existsSync(path.join(targetRoot, relPath)));
  for (const relPath of missingArtifacts) {
    findings.push({
      severity: 'blocker',
      source: 'deterministic',
      confidence: 'high',
      visibility: 'contract',
      file: relPath,
      slot: 'design_system_contract',
      issue_type: 'missing_design_system_contract',
      observed: `Missing required UI/UX design-system artifact: ${relPath}`,
      required: 'Run uiux:generate-design-system and uiux:generate-current-slice-flow before implementation review.',
    });
  }

  const componentRelPath = componentContractRelPathForSlice(sliceId);
  const componentContractPath = path.join(targetRoot, componentRelPath);
  let requiredComponents = [];
  if (fs.existsSync(componentContractPath)) {
    try {
      const componentContract = JSON.parse(readText(componentContractPath));
      requiredComponents = Array.isArray(componentContract.required_components) ? componentContract.required_components : [];
    } catch (_) {
      findings.push({
        severity: 'blocker',
        source: 'deterministic',
        confidence: 'high',
        visibility: 'contract',
        file: componentRelPath,
        slot: 'component_contract',
        issue_type: 'invalid_component_contract_json',
        observed: 'Component contract is not valid JSON.',
        required: 'Regenerate current-slice UX contracts.',
      });
    }
  }

  const visibleFiles = collectUserVisibleSourceFiles(targetRoot);
  const combinedSource = visibleFiles.map((file) => readText(file.absPath)).join('\n');
  for (const componentName of requiredComponents) {
    if (!componentName || componentName === 'AppShell') continue;
    const regex = new RegExp(`\\b${String(componentName).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`);
    if (!regex.test(combinedSource)) {
      findings.push({
        severity: 'warning',
        source: 'deterministic',
        confidence: 'medium',
        visibility: 'source',
        file: componentRelPath,
        slot: 'required_components',
        issue_type: 'component_contract_not_obviously_used',
        observed: `Required component ${componentName} was not found by name in user-facing source files.`,
        required: `Use the approved ${componentName} component or document the equivalent approved implementation before closeout.`,
      });
    }
  }

  for (const file of visibleFiles) {
    const text = readText(file.absPath);
    if (AD_HOC_INLINE_STYLE_REGEX.test(text)) {
      findings.push({
        severity: 'warning',
        source: 'deterministic',
        confidence: 'medium',
        visibility: 'source',
        file: file.relPath,
        slot: 'inline_style',
        issue_type: 'ad_hoc_visual_style',
        observed: 'Inline style appears to define color, spacing, radius, or layout values directly.',
        required: 'Use design tokens, theme classes, or approved component props instead of ad-hoc visual values.',
      });
    }
    const rawVisualMatch = text.match(RAW_VISUAL_VALUE_REGEX);
    if (rawVisualMatch && !/tokens\.json|design-system/i.test(file.relPath)) {
      findings.push({
        severity: 'warning',
        source: 'deterministic',
        confidence: 'medium',
        visibility: 'source',
        file: file.relPath,
        slot: 'visual_tokens',
        issue_type: 'raw_visual_value',
        observed: `Raw visual value detected: ${rawVisualMatch[0]}`,
        required: 'Replace raw visual values with semantic design tokens or approved theme classes.',
      });
    }
  }
  return findings;
}

function truncateText(text, maxChars) {
  const raw = String(text || '');
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, Math.max(0, maxChars)).trimEnd()}\n[truncated]`;
}

function collectImplementationReviewContext(targetRoot) {
  const files = collectUserVisibleSourceFiles(targetRoot).slice(0, 80);
  const contexts = [];
  let remaining = 70000;
  for (const file of files) {
    if (remaining <= 500) break;
    const text = readText(file.absPath);
    const clipped = truncateText(text, Math.min(remaining, 6000));
    remaining -= clipped.length;
    contexts.push({ relPath: file.relPath, text: clipped });
  }
  return contexts;
}

const LLM_SEMANTIC_REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'summary', 'findings'],
  properties: {
    status: { type: 'string', enum: ['pass', 'fail'] },
    summary: { type: 'string', minLength: 10, maxLength: 1200 },
    findings: {
      type: 'array',
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'file', 'slot', 'issue_type', 'observed', 'required'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'warning'] },
          file: { type: 'string', minLength: 1, maxLength: 260 },
          slot: { type: 'string', minLength: 1, maxLength: 120 },
          issue_type: { type: 'string', minLength: 1, maxLength: 120 },
          observed: { type: 'string', minLength: 1, maxLength: 600 },
          required: { type: 'string', minLength: 1, maxLength: 600 },
        },
      },
    },
  },
};

async function runLlmSemanticReview({ targetRoot, values, slice, contract, uxFlowText, briefText, framingText, sourceContexts, onProgress }) {
  const { settings, purpose } = resolveFirstValidLlmSettings(
    values,
    undefined,
    ['uiux', 'review', 'coder', 'planning', 'intake'],
  );
  if (typeof onProgress === 'function') {
    onProgress(`semantic UX reviewer profile: ${purpose}`);
  }

  const systemPrompt = [
    'You are a strict Semantic UX Reviewer in a virtual software company.',
    'Your task is to decide whether implemented user-facing UI semantics satisfy the UX contract.',
    'Review meaning and user fitness, not only whether components or sections exist.',
    'A required section that exists with generic, internal, malformed, or useless copy is a failure.',
    'Return JSON only according to the schema.',
  ].join('\n');

  const userPrompt = [
    'Active slice:',
    '```json',
    JSON.stringify({
      id: slice?.id || '',
      title: slice?.title || '',
      objective: slice?.objective || '',
      in_scope: Array.isArray(slice?.in_scope) ? slice.in_scope : [],
      out_of_scope: Array.isArray(slice?.out_of_scope) ? slice.out_of_scope : [],
      acceptance_criteria: Array.isArray(slice?.acceptance_criteria) ? slice.acceptance_criteria : [],
    }, null, 2),
    '```',
    '',
    'Semantic UX contract:',
    '```json',
    JSON.stringify(contract, null, 2),
    '```',
    '',
    'Current slice UX flow:',
    '```markdown',
    truncateText(uxFlowText, 8000),
    '```',
    '',
    'Project brief context:',
    '```markdown',
    truncateText(briefText, 8000),
    '```',
    '',
    'Product framing context:',
    '```markdown',
    truncateText(framingText, 8000),
    '```',
    '',
    'Implementation source context to review:',
    ...sourceContexts.flatMap((item) => [
      `## ${item.relPath}`,
      '```text',
      String(item.text || '').trim(),
      '```',
    ]),
    '',
    'Review rules:',
    '- Mark fail for user-visible copy that exposes internal implementation, workflow, schema, routing, slice, testing, ranking, or process language.',
    '- Mark fail for malformed user-visible dates, raw enum values, undefined/null/NaN, Invalid Date, [object Object], or raw calculation output.',
    '- Mark fail when user-facing copy only satisfies structure but not the semantic purpose in the contract.',
    '- Mark fail when required visible content is generic filler or not meaningful to an end user.',
    '- Mark pass only if the implemented UI appears semantically fit for the active slice based on available source context.',
  ].join('\n');

  const output = await invokeStructured({
    settings,
    taskName: 'semantic_ux_review_current_slice',
    caller: 'semantic-ux-validation.runLlmSemanticReview',
    targetRoot,
    systemPrompt,
    userPrompt,
    schema: LLM_SEMANTIC_REVIEW_SCHEMA,
    promptSourceFiles: [
      'docs/product/current-slice.yaml',
      semanticUxContractRelPathForSlice(slice?.id),
      `docs/ux/${normalizeSliceIdForPath(slice?.id)}-current-slice-flow.md`,
      'docs/product/project-brief.md',
      'docs/product/product-system-framing.md',
      ...sourceContexts.map((item) => item.relPath),
    ],
    onProgress,
  });

  return {
    purpose,
    settings,
    status: String(output?.status || 'fail'),
    summary: String(output?.summary || '').trim(),
    findings: Array.isArray(output?.findings) ? output.findings.map((item) => ({
      severity: String(item?.severity || 'blocker'),
      source: 'llm',
      file: String(item?.file || ''),
      slot: String(item?.slot || ''),
      issue_type: String(item?.issue_type || ''),
      observed: String(item?.observed || ''),
      required: String(item?.required || ''),
    })) : [],
  };
}

function renderSemanticUxReviewMarkdown(result) {
  const lines = [
    '# Semantic UX Review - Current Slice',
    '',
    `- Status: \`${result.status}\``,
    `- Slice: \`${result.slice_id}\` ${result.slice_title || ''}`.trimEnd(),
    `- Generated: \`${result.generated_at_utc}\``,
    `- Deterministic findings: ${String(result.deterministic_findings_count || 0)}`,
    `- LLM status: \`${result.llm_status}\``,
    `- LLM reviewer: ${result.llm_reviewer || '[not run]'}`,
    '',
    '## Summary',
    '',
    result.summary || (result.status === 'pass' ? 'Semantic UX review passed.' : 'Semantic UX review failed.'),
    '',
    '## Findings',
    '',
  ];
  const findings = Array.isArray(result.findings) ? result.findings : [];
  if (findings.length === 0) {
    lines.push('- None');
  } else {
    findings.forEach((finding, index) => {
      lines.push(`### ${index + 1}. ${finding.issue_type || 'semantic_issue'}`);
      lines.push('');
      lines.push(`- Severity: \`${finding.severity || 'blocker'}\``);
      lines.push(`- Source: \`${finding.source || 'unknown'}\``);
      if (finding.confidence) lines.push(`- Confidence: \`${finding.confidence}\``);
      if (finding.visibility) lines.push(`- Visibility: \`${finding.visibility}\``);
      if (finding.file) lines.push(`- File: \`${finding.file}\``);
      if (finding.slot) lines.push(`- Slot: \`${finding.slot}\``);
      lines.push(`- Observed: ${finding.observed || '[not provided]'}`);
      lines.push(`- Required: ${finding.required || '[not provided]'}`);
      lines.push('');
    });
  }
  lines.push('', '## Reviewer rule', '', 'A slice is not complete when a component or section merely exists. It is complete only when the user-facing behavior and language satisfy the semantic purpose of the slice.', '');
  return lines.join('\n');
}

async function reviewCurrentSliceSemantics({ targetRoot, valuesPath, onProgress } = {}) {
  const currentSlicePath = path.join(targetRoot, 'docs/product/current-slice.yaml');
  if (!fs.existsSync(currentSlicePath)) {
    throw new Error('Cannot run uiux:review-current-slice-semantics: missing docs/product/current-slice.yaml');
  }
  const slice = parseSliceBlockWithLists(readText(currentSlicePath));
  const normalizedSliceId = normalizeSliceIdForPath(slice.id);
  const contractRelPath = semanticUxContractRelPathForSlice(slice.id);
  const contractPath = path.join(targetRoot, contractRelPath);
  const uxFlowRelPath = `docs/ux/${normalizedSliceId}-current-slice-flow.md`;
  const uxFlowPath = path.join(targetRoot, uxFlowRelPath);
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  if (!fs.existsSync(contractPath)) {
    throw new Error(`Cannot run uiux:review-current-slice-semantics: missing ${contractRelPath}; run uiux:generate-current-slice-flow first`);
  }
  const contract = JSON.parse(readText(contractPath));
  const uxFlowText = fs.existsSync(uxFlowPath) ? readText(uxFlowPath) : '';
  const briefText = fs.existsSync(briefPath) ? readText(briefPath) : '';
  const framingText = fs.existsSync(framingPath) ? readText(framingPath) : '';
  const values = loadValuesIfPresent(valuesPath);
  const generatedAt = new Date().toISOString();
  const deterministicFindings = [
    ...deterministicSemanticScan({ targetRoot, contract }),
    ...deterministicDesignSystemScan({ targetRoot, sliceId: slice.id }),
  ];
  let llmStatus = 'not_run';
  let llmReviewer = '';
  let llmSummary = '';
  let llmFindings = [];
  const llmEnabled = resolveSemanticUxLlmEnabled(values);
  const llmRequired = resolveSemanticUxLlmRequired(values);
  if (llmEnabled) {
    try {
      if (typeof onProgress === 'function') {
        onProgress('running LLM semantic UX reviewer...');
      }
      const llmResult = await runLlmSemanticReview({
        targetRoot,
        values,
        slice,
        contract,
        uxFlowText,
        briefText,
        framingText,
        sourceContexts: collectImplementationReviewContext(targetRoot),
        onProgress,
      });
      llmStatus = llmResult.status;
      llmReviewer = `${llmResult.settings.provider}/${llmResult.settings.model}`;
      llmSummary = llmResult.summary;
      llmFindings = llmResult.findings;
    } catch (error) {
      llmStatus = 'unavailable';
      llmSummary = `LLM semantic review unavailable: ${error?.message ? String(error.message) : String(error)}`;
      if (llmRequired) {
        llmFindings.push({
          severity: 'blocker',
          source: 'llm',
          file: contractRelPath,
          slot: 'semantic_review_gate',
          issue_type: 'llm_review_unavailable',
          observed: llmSummary,
          required: 'Configure the semantic UX LLM reviewer or set SEMANTIC_UX_LLM_REQUIRED=false intentionally.',
        });
      }
    }
  } else {
    llmStatus = llmRequired ? 'disabled_required' : 'disabled_optional';
    llmSummary = 'LLM semantic review is disabled by configuration.';
    if (llmRequired) {
      llmFindings.push({
        severity: 'blocker',
        source: 'llm',
        file: contractRelPath,
        slot: 'semantic_review_gate',
        issue_type: 'llm_review_disabled',
        observed: llmSummary,
        required: 'Enable the semantic UX LLM reviewer or set SEMANTIC_UX_LLM_REQUIRED=false intentionally.',
      });
    }
  }

  const findings = [...deterministicFindings, ...llmFindings];
  const blockerCount = findings.filter(isBlockingFinding).length;
  const status = blockerCount > 0 || llmStatus === 'fail' ? 'fail' : 'pass';
  const result = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    slice_id: String(slice.id || 'UNKNOWN'),
    slice_title: String(slice.title || 'Current Slice'),
    status,
    summary: llmSummary || (status === 'pass' ? 'Deterministic and LLM semantic UX review passed.' : 'Semantic UX review failed.'),
    contract: contractRelPath,
    deterministic_findings_count: deterministicFindings.length,
    llm_enabled: llmEnabled,
    llm_required: llmRequired,
    llm_status: llmStatus,
    llm_reviewer: llmReviewer,
    findings,
  };

  const jsonRelPath = semanticUxReviewJsonRelPathForSlice(slice.id);
  const mdRelPath = semanticUxReviewMdRelPathForSlice(slice.id);
  writeTextAtomic(path.join(targetRoot, jsonRelPath), `${JSON.stringify(result, null, 2)}\n`);
  writeTextAtomic(path.join(targetRoot, mdRelPath), renderSemanticUxReviewMarkdown(result));

  const label = result.status === 'pass' ? 'OK' : 'FAILED';
  console.log(`fabric uiux:review-current-slice-semantics: ${label}`);
  console.log(`- slice: ${result.slice_id} ${result.slice_title}`);
  console.log(`- status: ${result.status}`);
  console.log(`- deterministic findings: ${String(result.deterministic_findings_count)}`);
  console.log(`- llm status: ${result.llm_status}`);
  console.log(`- wrote: ${jsonRelPath}`);
  console.log(`- wrote: ${mdRelPath}`);
  if (result.status !== 'pass') {
    console.log('- next: run coder:repair-semantic-ux-findings after reviewing the findings');
    console.log('  ./fabric/company/v1/fabric coder:repair-semantic-ux-findings --target . --values ./fabric.values.json --include-warnings');
    const error = new Error(`semantic UX review failed with ${String(blockerCount)} blocker finding(s)`);
    error.alreadyLogged = true;
    error.code = 'SEMANTIC_UX_REVIEW_FAILED';
    throw error;
  }
  return result;
}

export {
  buildSemanticUxContract,
  deterministicSemanticScan,
  semanticUxContractRelPathForSlice,
  semanticUxReviewJsonRelPathForSlice,
  semanticUxReviewMdRelPathForSlice,
  writeSemanticUxContract,
  readSemanticUxReviewStatus,
  reviewCurrentSliceSemantics,
};
