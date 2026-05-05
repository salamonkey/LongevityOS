import fs from 'node:fs';
import path from 'node:path';
import { readText, writeTextAtomic, loadManifest, parseSliceBlockWithLists } from '../lib/core.mjs';

function normalizeSliceIdForPath(sliceId) {
  return String(sliceId || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '-');
}

function listFromMaybe(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\r?\n/).map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  return [];
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(String(text || '')));
}

function currentSliceRelPath(sliceId, suffix) {
  return `docs/ux/${normalizeSliceIdForPath(sliceId)}-${suffix}`;
}

function designTokensRelPath() { return 'docs/design-system/tokens.json'; }
function designComponentsRelPath() { return 'docs/design-system/components.json'; }
function designUsageRulesRelPath() { return 'docs/design-system/component-usage-rules.md'; }
function designVisualStatesRelPath() { return 'docs/design-system/visual-states.md'; }
function interactionModelRelPathForSlice(sliceId) { return currentSliceRelPath(sliceId, 'interaction-model.json'); }
function screenContractRelPathForSlice(sliceId) { return currentSliceRelPath(sliceId, 'screen-contract.json'); }
function componentContractRelPathForSlice(sliceId) { return currentSliceRelPath(sliceId, 'component-contract.json'); }
function copyContractRelPathForSlice(sliceId) { return currentSliceRelPath(sliceId, 'copy-contract.json'); }

function defaultTokens({ briefText = '', framingText = '' } = {}) {
  const generatedAt = new Date().toISOString();
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    source: 'fabric.uiux.design-system',
    principle: 'Tokens encode semantic product meaning, not decorative preferences.',
    tone: {
      clarity: 'clear',
      emotional_register: 'calm_trustworthy_lightly_motivating',
      forbidden: ['alarmist medical wording', 'shame or guilt language', 'raw implementation labels'],
    },
    color: {
      status: {
        done: { meaning: 'completed and up to date', label_de: 'erledigt', token: 'color.status.done' },
        due: { meaning: 'requires attention now', label_de: 'fällig', token: 'color.status.due' },
        soon: { meaning: 'upcoming but not urgent', label_de: 'bald', token: 'color.status.soon' },
        planned: { meaning: 'scheduled or reminder set', label_de: 'geplant', token: 'color.status.planned' },
        overdue: { meaning: 'past recommended timing without implying diagnosis', label_de: 'überfällig', token: 'color.status.overdue' },
      },
      priority: {
        today: { meaning: 'highest attention group', label_de: 'Heute wichtig', token: 'color.priority.today' },
        soon: { meaning: 'upcoming attention group', label_de: 'In nächster Zeit', token: 'color.priority.soon' },
        later: { meaning: 'lower attention group', label_de: 'Später', token: 'color.priority.later' },
      },
      surface: {
        page: 'color.surface.page',
        card: 'color.surface.card',
        subtle: 'color.surface.subtle',
      },
      text: {
        primary: 'color.text.primary',
        secondary: 'color.text.secondary',
        muted: 'color.text.muted',
      },
    },
    spacing: {
      xs: 'space.2',
      sm: 'space.3',
      md: 'space.4',
      lg: 'space.6',
      xl: 'space.8',
    },
    radius: {
      card: 'radius.card',
      pill: 'radius.pill',
      sheet: 'radius.sheet',
    },
    typography: {
      page_title: 'type.page_title',
      section_title: 'type.section_title',
      body: 'type.body',
      helper: 'type.helper',
      status_label: 'type.status_label',
    },
    notes: [
      'Raw hex/rgb colors must not be introduced in user-facing components once tokenized equivalents exist.',
      'Status labels must map to product meaning and must not expose enum names.',
      'Health guidance must remain action-oriented without medical diagnosis claims.',
    ],
    context_fingerprint: {
      has_health_navigation_brief: /health|gesund|vorsorge|prevent/i.test(`${briefText}\n${framingText}`),
      has_priority_dashboard: /today|soon|later|heute|bald|später|spaeter/i.test(`${briefText}\n${framingText}`),
    },
  };
}

function defaultComponents() {
  return {
    schema_version: 1,
    generated_at_utc: new Date().toISOString(),
    principle: 'Components are the product grammar. Screens compose approved components instead of inventing one-off UI.',
    components: {
      AppShell: {
        purpose: 'Provide stable mobile-first page frame and navigation context.',
        props: { title: 'string', children: 'node' },
        states: ['default'],
        rules: ['Use for user-facing app screens.', 'Do not duplicate page frame styling in feature components.'],
      },
      PrioritySection: {
        purpose: 'Group health actions by attention level.',
        props: { priority: ['today', 'soon', 'later'], items: 'HealthPlanItem[]' },
        states: ['default', 'empty'],
        rules: ['Dashboard order must be today -> soon -> later.', 'Must contain HealthPlanItem or approved empty state only.'],
      },
      HealthPlanItem: {
        purpose: 'Represent one preventive health action with status and next action.',
        props: {
          title: 'string',
          status: ['done', 'due', 'soon', 'planned', 'overdue'],
          priority: ['today', 'soon', 'later'],
          frequency: 'string',
          actions: ['mark_done', 'set_reminder', 'open_detail'],
        },
        states: ['default', 'done', 'due', 'soon', 'planned', 'overdue', 'loading'],
        rules: ['Must use StatusPill for status display.', 'Must expose a user action when status is due or overdue.', 'Must not imply diagnosis.'],
      },
      StatusPill: {
        purpose: 'Display a semantic status label consistently.',
        props: { status: ['done', 'due', 'soon', 'planned', 'overdue'] },
        states: ['default'],
        rules: ['Use semantic token color.status.* only.', 'Visible label must be localized/user-facing, never a raw enum.'],
      },
      HealthScoreCard: {
        purpose: 'Summarize progress without creating anxiety.',
        props: { score: 'number', summary: 'string' },
        states: ['default', 'empty', 'improving'],
        rules: ['Explain the score in plain language.', 'Do not make clinical risk claims.'],
      },
      ReminderSelector: {
        purpose: 'Let the user set a simple reminder.',
        props: { options: ['1_month', '3_months', 'custom_date'] },
        states: ['default', 'selected', 'confirmed', 'invalid_date'],
        rules: ['Confirmation copy must be calm and specific.', 'Custom dates must validate before save.'],
      },
      FamilyProfileCard: {
        purpose: 'Show one profile in family mode with attention summary.',
        props: { name: 'string', score: 'number', dueCount: 'number' },
        states: ['default', 'needs_attention', 'up_to_date'],
        rules: ['Must make profile ownership clear.', 'Must not mix health actions between profiles.'],
      },
      VaccinationStatusRow: {
        purpose: 'Show one vaccination status and optional add/update action.',
        props: { vaccine: 'string', status: ['done', 'due', 'soon', 'planned', 'overdue'], lastDate: 'string' },
        states: ['default', 'missing', 'due', 'up_to_date'],
        rules: ['Use StatusPill.', 'Missing date must use safe fallback copy, not raw null/undefined.'],
      },
    },
  };
}

function defaultUsageRulesMarkdown({ generatedAt }) {
  return [
    '# Design System Usage Rules',
    '',
    `Generated: \`${generatedAt}\``,
    '',
    '## Core rule',
    '',
    'Screens must be composed from the approved product components before introducing generic layout or one-off UI.',
    '',
    '## Token rules',
    '',
    '- Do not use raw hex, rgb, hsl, or named color values in user-facing components when a semantic token exists.',
    '- Status styling must use `color.status.*` tokens.',
    '- Priority styling must use `color.priority.*` tokens.',
    '- Spacing and radius must use named tokens or project theme values, not arbitrary one-off values.',
    '',
    '## Component rules',
    '',
    '- Dashboard priority groups must use `PrioritySection` in this order: Today / Soon / Later.',
    '- Preventive health actions must use `HealthPlanItem`.',
    '- Status labels must use `StatusPill`.',
    '- Family summaries must use `FamilyProfileCard`.',
    '- Vaccination list entries must use `VaccinationStatusRow`.',
    '',
    '## Tone rules',
    '',
    '- Copy must be clear, calm, trustworthy, and lightly motivating.',
    '- Overdue or due states must create action without fear.',
    '- UI must not imply diagnosis or replace medical advice.',
    '- Empty states must tell the user what is true and what they can do next.',
    '',
  ].join('\n');
}

function defaultVisualStatesMarkdown({ generatedAt }) {
  return [
    '# Approved Visual and Behavioral States',
    '',
    `Generated: \`${generatedAt}\``,
    '',
    '## Dashboard',
    '',
    '- `default`: health score plus Today / Soon / Later sections.',
    '- `empty`: no urgent actions; reassure the user and show later/planned items if available.',
    '- `needs_attention`: Today section visually dominates without alarmist styling.',
    '',
    '## HealthPlanItem',
    '',
    '- `done`: completed/up to date; secondary action may open detail.',
    '- `due`: needs attention now; primary action opens detail or reminder.',
    '- `overdue`: clear priority but calm tone; no diagnosis language.',
    '- `planned`: reminder or appointment exists; show next date if known.',
    '- `soon`: upcoming action; lower visual weight than due/overdue.',
    '',
    '## ReminderSelector',
    '',
    '- `default`: presents 1 month / 3 months / custom date.',
    '- `selected`: selected option is visually clear.',
    '- `confirmed`: confirmation tells the user they will be reminded in time.',
    '- `invalid_date`: correction is specific and user-facing.',
    '',
  ].join('\n');
}

function generateDesignSystemArtifacts({ targetRoot, briefText = '', framingText = '', force = false } = {}) {
  const generatedAt = new Date().toISOString();
  const artifacts = [
    { relPath: designTokensRelPath(), content: `${JSON.stringify(defaultTokens({ briefText, framingText }), null, 2)}\n` },
    { relPath: designComponentsRelPath(), content: `${JSON.stringify(defaultComponents(), null, 2)}\n` },
    { relPath: designUsageRulesRelPath(), content: defaultUsageRulesMarkdown({ generatedAt }) },
    { relPath: designVisualStatesRelPath(), content: defaultVisualStatesMarkdown({ generatedAt }) },
  ];
  const written = [];
  for (const artifact of artifacts) {
    const absPath = path.join(targetRoot, artifact.relPath);
    if (fs.existsSync(absPath) && !force) continue;
    writeTextAtomic(absPath, artifact.content.endsWith('\n') ? artifact.content : `${artifact.content}\n`);
    written.push(artifact.relPath);
  }
  return { generatedAt, written, expected: artifacts.map((item) => item.relPath) };
}

function uiuxGenerateDesignSystem({ targetRoot, force = false } = {}) {
  const briefPath = path.join(targetRoot, 'docs/product/project-brief.md');
  const framingPath = path.join(targetRoot, 'docs/product/product-system-framing.md');
  const briefText = fs.existsSync(briefPath) ? readText(briefPath) : '';
  const framingText = fs.existsSync(framingPath) ? readText(framingPath) : '';
  const result = generateDesignSystemArtifacts({ targetRoot, briefText, framingText, force });
  console.log('fabric uiux:generate-design-system: OK');
  for (const relPath of result.expected) {
    console.log(`- ${result.written.includes(relPath) ? 'wrote' : 'exists'}: ${relPath}`);
  }
  console.log('- status: Design-system contract available');
  return result;
}

function ensureDesignSystemArtifacts({ targetRoot, briefText = '', framingText = '' } = {}) {
  return generateDesignSystemArtifacts({ targetRoot, briefText, framingText, force: false });
}

function deriveScreenId(slice = {}) {
  const text = `${slice.id || ''} ${slice.title || ''} ${slice.objective || ''}`.toLowerCase();
  if (/onboard|welcome|first[- ]?run/.test(text)) return 'onboarding';
  if (/dashboard|overview|home/.test(text)) return 'dashboard';
  if (/health plan|plan item|checklist/.test(text)) return 'health_plan';
  if (/detail/.test(text)) return 'detail';
  if (/family|profile/.test(text)) return 'family';
  if (/vaccin|impf/.test(text)) return 'vaccination';
  if (/reminder|erinner/.test(text)) return 'reminder';
  return normalizeSliceIdForPath(slice.id || slice.title || 'current_slice').toLowerCase();
}

function componentsForSlice(slice = {}) {
  const titleAndObjective = `${slice.id || ''} ${slice.title || ''} ${slice.objective || ''}`.toLowerCase();
  const inScope = listFromMaybe(slice.in_scope).map((entry) => entry.toLowerCase());
  const outOfScope = listFromMaybe(slice.out_of_scope).map((entry) => entry.toLowerCase());
  const inScopeText = inScope.join(' ');
  const outOfScopeText = outOfScope.join(' ');
  const text = `${titleAndObjective} ${inScopeText}`;
  const components = new Set(['AppShell']);
  const mentionsDashboardSurface = includesAny(text, [/dashboard|overview|today|soon|later|heute|bald/]);
  const dashboardMentionIsNavigationOnly = includesAny(
    text,
    [/from (the )?dashboard/, /dashboard[- ]highlighted/, /navigation from dashboard/, /dashboard priority item/],
  );
  if (mentionsDashboardSurface && !dashboardMentionIsNavigationOnly) {
    components.add('HealthScoreCard');
    components.add('PrioritySection');
    components.add('HealthPlanItem');
    components.add('StatusPill');
  }
  if (includesAny(text, [/health plan|checklist|item|detail|vorsorge|checkup|vaccin/])) {
    components.add('HealthPlanItem');
    components.add('StatusPill');
  }
  if (includesAny(text, [/reminder|erinner/]) && !includesAny(outOfScopeText, [/reminder|erinner/])) {
    components.add('ReminderSelector');
  }
  if (
    includesAny(text, [/family|familie/])
    && !includesAny(text, [/self[- ]profile only|self profile only|self profile/])
    && !includesAny(outOfScopeText, [/family|familie/])
  ) {
    components.add('FamilyProfileCard');
  }
  if (
    includesAny(text, [/vaccin|impf/])
    && includesAny(text, [/status row|status list|record|table|last date|history|manual entry|add/])
    && !includesAny(outOfScopeText, [/manual vaccination entry|add vaccination|manual entry/])
  ) {
    components.add('VaccinationStatusRow');
    components.add('StatusPill');
  }
  return [...components];
}

function buildInteractionModel({ slice = {}, generatedAt }) {
  const screenId = deriveScreenId(slice);
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    slice_id: String(slice.id || 'UNKNOWN'),
    user_goal: String(slice.objective || slice.title || 'Complete the current user-facing slice.'),
    entry_points: ['primary_app_flow'],
    screens: [screenId],
    states: ['default', 'loading', 'empty', 'validation_error', 'success'],
    transitions: [
      { from: 'entry', action: 'open', to: screenId },
      { from: screenId, action: 'primary_action', to: 'success_or_next_state' },
      { from: screenId, action: 'invalid_input', to: 'validation_error' },
    ],
    primary_actions: ['primary_action'],
    secondary_actions: ['open_detail', 'set_reminder'],
    validation_rules: ['Required user inputs must be validated before transition.', 'Errors must be specific and user-facing.'],
    recovery_paths: ['Let the user correct invalid or missing input without losing context.'],
    trust_constraints: ['Do not imply medical diagnosis.', 'Use calm, clear, trustworthy copy.'],
  };
}

function buildScreenContract({ slice = {}, generatedAt }) {
  const screenId = deriveScreenId(slice);
  const components = componentsForSlice(slice);
  const priorityDashboard = components.includes('PrioritySection');
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    slice_id: String(slice.id || 'UNKNOWN'),
    screens: [{
      screen_id: screenId,
      purpose: String(slice.objective || `Support ${slice.title || 'the current slice'} in a clear user-facing flow.`),
      required_sections: priorityDashboard ? ['health_score', 'today', 'soon', 'later'] : ['main_content', 'primary_action'],
      required_components: components,
      visible_data: priorityDashboard ? ['profile_name', 'health_score', 'due_items', 'upcoming_items'] : ['user_relevant_state', 'available_actions'],
      states: ['default', 'loading', 'empty', 'error', 'success'],
      action_hierarchy: priorityDashboard ? ['open_next_due_action', 'set_reminder', 'open_later_item'] : ['primary_action', 'secondary_action'],
      rules: priorityDashboard ? ['Today / Soon / Later order is mandatory.', 'Today can dominate visually but must not create anxiety.'] : ['Primary action must be visually and semantically clear.'],
    }],
  };
}

function buildComponentContract({ slice = {}, generatedAt }) {
  const required = componentsForSlice(slice);
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    slice_id: String(slice.id || 'UNKNOWN'),
    required_components: required,
    allowed_statuses: ['done', 'due', 'soon', 'planned', 'overdue'],
    allowed_priorities: ['today', 'soon', 'later'],
    rules: [
      'Use approved components before creating one-off equivalents.',
      'Status display must use StatusPill when status is visible.',
      'Preventive action rows/cards must use HealthPlanItem when applicable.',
      'Dashboard priority groups must use PrioritySection when applicable.',
      'Do not introduce raw visual values where design tokens exist.',
    ],
  };
}

function buildCopyContract({ slice = {}, generatedAt }) {
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    slice_id: String(slice.id || 'UNKNOWN'),
    tone: ['klar', 'ruhig', 'vertrauensvoll', 'leicht motivierend'],
    copy_slots: {
      primary_heading: { intent: 'orient_user', rules: ['Plain language.', 'No internal implementation terms.'] },
      status_label: { intent: 'show_action_state', rules: ['Use user-facing localized labels.', 'No raw enum values.'] },
      empty_state: { intent: 'explain_missing_or_complete_state', rules: ['Tell the user what is true and what to do next.'] },
      confirmation: { intent: 'reinforce_progress', rules: ['Calm and specific.', 'No exaggerated praise.'] },
      error: { intent: 'recover_without_blame', rules: ['Specific correction.', 'No blame or shame.'] },
    },
    forbidden: ['TODO', 'TBD', 'undefined', 'null', 'slice', 'schema', 'backend', 'route'],
  };
}

function writeCurrentSliceDesignContracts({ targetRoot, slice = {}, generatedAt = new Date().toISOString() } = {}) {
  const artifacts = [
    { relPath: interactionModelRelPathForSlice(slice.id), data: buildInteractionModel({ slice, generatedAt }) },
    { relPath: screenContractRelPathForSlice(slice.id), data: buildScreenContract({ slice, generatedAt }) },
    { relPath: componentContractRelPathForSlice(slice.id), data: buildComponentContract({ slice, generatedAt }) },
    { relPath: copyContractRelPathForSlice(slice.id), data: buildCopyContract({ slice, generatedAt }) },
  ];
  for (const artifact of artifacts) {
    writeTextAtomic(path.join(targetRoot, artifact.relPath), `${JSON.stringify(artifact.data, null, 2)}\n`);
  }
  return artifacts.map((item) => item.relPath);
}

function requiredDesignSystemRelPaths() {
  return [designTokensRelPath(), designComponentsRelPath(), designUsageRulesRelPath(), designVisualStatesRelPath()];
}

function requiredSliceUxContractRelPaths(sliceId) {
  return [interactionModelRelPathForSlice(sliceId), screenContractRelPathForSlice(sliceId), componentContractRelPathForSlice(sliceId), copyContractRelPathForSlice(sliceId)];
}

function assertDesignSystemReadyForSlice(targetRoot, sliceId, commandName = 'current command') {
  const missing = [...requiredDesignSystemRelPaths(), ...requiredSliceUxContractRelPaths(sliceId)]
    .filter((relPath) => !fs.existsSync(path.join(targetRoot, relPath)));
  if (missing.length > 0) {
    throw new Error(`Cannot run ${commandName}: missing UI/UX design-system contract artifact(s):\n${missing.map((relPath) => `- ${relPath}`).join('\n')}\nRun uiux:generate-design-system and uiux:generate-current-slice-flow first.`);
  }
}

function loadDesignSystemContext(targetRoot, sliceId) {
  const relPaths = [...requiredDesignSystemRelPaths(), ...requiredSliceUxContractRelPaths(sliceId)];
  const parts = [];
  for (const relPath of relPaths) {
    const absPath = path.join(targetRoot, relPath);
    if (!fs.existsSync(absPath)) continue;
    parts.push(`\n## ${relPath}\n\n\`\`\`${relPath.endsWith('.json') ? 'json' : 'markdown'}\n${readText(absPath).trim()}\n\`\`\``);
  }
  return parts.join('\n');
}

export {
  designTokensRelPath,
  designComponentsRelPath,
  designUsageRulesRelPath,
  designVisualStatesRelPath,
  interactionModelRelPathForSlice,
  screenContractRelPathForSlice,
  componentContractRelPathForSlice,
  copyContractRelPathForSlice,
  requiredDesignSystemRelPaths,
  requiredSliceUxContractRelPaths,
  ensureDesignSystemArtifacts,
  writeCurrentSliceDesignContracts,
  uiuxGenerateDesignSystem,
  assertDesignSystemReadyForSlice,
  loadDesignSystemContext,
};
