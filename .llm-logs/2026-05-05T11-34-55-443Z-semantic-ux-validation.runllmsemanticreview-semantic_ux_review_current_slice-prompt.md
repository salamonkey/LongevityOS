# LLM Prompt Log

- task: semantic_ux_review_current_slice
- caller: semantic-ux-validation.runLlmSemanticReview
- provider: openai
- model: gpt-5.4
- started_utc: 2026-05-05T11:34:55.443Z
- prompt_chars: 101139
- prompt_estimated_tokens: 25285
- prompt_sources:
  - docs/product/current-slice.yaml
  - docs/ux/SL-003-semantic-ux-contract.json
  - docs/ux/SL-003-current-slice-flow.md
  - docs/product/project-brief.md
  - docs/product/product-system-framing.md
  - src/App.jsx
  - src/features/health-plan-browsing-and-item-detail/HealthPlanBrowsingAndItemDetail.jsx
  - src/features/health-plan-browsing-and-item-detail/definitions.js
  - src/features/health-plan-browsing-and-item-detail/index.js
  - src/features/health-plan-browsing-and-item-detail/model.js
  - src/features/health-plan-browsing-and-item-detail/projection.js
  - src/features/item-completion-and-reminder-actions/ItemCompletionAndReminderActions.jsx
  - src/features/item-completion-and-reminder-actions/actions.js
  - src/features/item-completion-and-reminder-actions/index.js
  - src/features/item-completion-and-reminder-actions/model.js
  - src/features/item-completion-and-reminder-actions/selectors.js
  - src/features/self-onboarding-to-first-dashboard/SelfOnboardingToFirstDashboard.jsx
  - src/features/self-onboarding-to-first-dashboard/catalog.js
  - src/features/self-onboarding-to-first-dashboard/components.jsx
  - src/features/self-onboarding-to-first-dashboard/dashboard.js
  - src/features/self-onboarding-to-first-dashboard/index.js
  - src/features/self-onboarding-to-first-dashboard/plan.js
  - src/features/self-onboarding-to-first-dashboard/validation.js
  - src/main.jsx
  - src/routes/health-plan-browsing-and-item-detail.jsx
  - src/routes/item-completion-and-reminder-actions.jsx
  - src/routes/self-onboarding-to-first-dashboard.jsx
  - src/stories/slices/SL-001/SL-001.stories.tsx
  - src/stories/slices/SL-001/fixtures.ts
  - src/stories/slices/SL-002/SL-002.stories.tsx

## System Prompt
```text
You are a strict Semantic UX Reviewer in a virtual software company.
Your task is to decide whether implemented user-facing UI semantics satisfy the UX contract.
Review meaning and user fitness, not only whether components or sections exist.
A required section that exists with generic, internal, malformed, or useless copy is a failure.
Return JSON only according to the schema.
```

## User Prompt
```text
Active slice:
```json
{
  "id": "SL-003",
  "title": "Item Completion and Reminder Actions",
  "objective": "Turn guidance into follow-through by allowing users to mark items done or planned and see the plan update immediately.",
  "in_scope": [
    "Mark a health item as done from the detail view",
    "Set a reminder from the detail view using 1 month, 3 months, or a chosen date",
    "Show a confirmation state after reminder creation",
    "Update item status across dashboard, plan views, and detail in the same session",
    "Recalculate the highlighted next item and Health Score after status changes"
  ],
  "out_of_scope": [
    "Reminder delivery outside the app confirmation flow",
    "Reminder preference management",
    "Manual vaccination entry",
    "Family-wide reminder actions"
  ],
  "acceptance_criteria": [
    "A user can mark an item as done from the detail view and see status change to done across all relevant views in the same session",
    "A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion",
    "Setting a reminder changes the item status to planned across the applicable views in the same session",
    "After a status change, the dashboard updates the highlighted next item based on the approved Today-then-Soon rule"
  ]
}
```

Semantic UX contract:
```json
{
  "schema_version": 1,
  "generated_at_utc": "2026-05-05T10:37:28.475Z",
  "slice_id": "SL-003",
  "slice_title": "Item Completion and Reminder Actions",
  "surface_type": "user_facing",
  "global_rules": {
    "must": [
      "Use user-facing language that makes sense without internal project context.",
      "Explain user value rather than system mechanics where explanatory copy is required.",
      "Keep wording concise, concrete, and aligned to the active slice.",
      "Use safe fallback copy when data is missing or unknown.",
      "Render dates, times, counts, and statuses in valid human-readable form."
    ],
    "must_not": [
      "Expose internal workflow, slice, acceptance, schema, payload, routing, component, ranking, bucket, test, or implementation language in visible UI.",
      "Use placeholder, TODO, TBD, lorem ipsum, generic filler, or template copy as final visible UI.",
      "Render undefined, null, NaN, Invalid Date, [object Object], raw enum values, raw calculation output, or malformed years.",
      "Satisfy acceptance criteria only structurally while failing the user-facing purpose."
    ]
  },
  "visible_content_slots": [
    {
      "slot": "primary_heading",
      "purpose": "Tell the user what this screen, flow, or section is for.",
      "required": true,
      "quality_bar": [
        "Specific to the user task.",
        "Readable without internal project context.",
        "Not a generic system or component label."
      ]
    },
    {
      "slot": "primary_action",
      "purpose": "Make the next user action clear.",
      "required": true,
      "quality_bar": [
        "Uses direct, user-facing wording.",
        "Does not expose implementation, routing, schema, or test language."
      ]
    },
    {
      "slot": "empty_or_error_state",
      "purpose": "Help the user recover from missing, invalid, or unavailable state.",
      "required": false,
      "quality_bar": [
        "Explains what happened in plain language.",
        "Gives a safe next step where possible.",
        "Does not render raw undefined/null/error payloads."
      ]
    },
    {
      "slot": "status_context",
      "purpose": "Explain current state, progress, timing, or result in human-readable language when shown.",
      "required": true,
      "quality_bar": [
        "Dates, times, counts, and states are valid and human-readable.",
        "Unknown data uses safe fallback copy.",
        "Raw enum values, malformed dates, and raw calculations are never visible."
      ]
    },
    {
      "slot": "explanation_or_rationale",
      "purpose": "Explain why the user should care or what value the action creates when a rationale is shown.",
      "required": true,
      "quality_bar": [
        "Explains user value rather than app mechanics.",
        "Uses concise, concrete, trust-building wording.",
        "Does not overclaim, alarm, or invent unsupported facts."
      ]
    }
  ],
  "acceptance_criteria": [
    "A user can mark an item as done from the detail view and see status change to done across all relevant views in the same session",
    "A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion",
    "Setting a reminder changes the item status to planned across the applicable views in the same session",
    "After a status change, the dashboard updates the highlighted next item based on the approved Today-then-Soon rule"
  ],
  "deterministic_scan": {
    "forbidden_visible_fragments": [
      "TODO",
      "TBD",
      "lorem ipsum",
      "placeholder",
      "undefined",
      "null",
      "NaN",
      "Invalid Date",
      "[object Object]",
      "acceptance criteria",
      "schema",
      "payload",
      "bucket rules",
      "generated action",
      "slice id",
      "implementation detail"
    ],
    "suspicious_patterns": [
      "five_or_more_digit_year_or_numeric_state",
      "raw_error_or_debug_copy",
      "internal_factory_language_in_visible_copy"
    ]
  },
  "llm_review": {
    "required": true,
    "instruction": "Review semantic fitness of the implemented user-facing UI against this contract. A section existing with bad or generic copy is a failure."
  }
}
```

Current slice UX flow:
```markdown
<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-05T10:37:28.475Z -->
# UX Flow - Current Slice

Date: `2026-05-05`
Status: `Ready for implementation`
Scope: `SL-003 Item Completion and Reminder Actions`

## 1. Context

SL-003 covers the item detail action flow for a single profile in the current session. The user is already able to reach a health item detail view from the dashboard or plan. This slice adds two follow-through actions from that detail view only: mark the item as done, or set a reminder using 1 month, 3 months, or a chosen date. After either successful action, the item status must update immediately everywhere that same profile is shown in the session: detail view, dashboard, and plan views. The dashboard must also recompute the highlighted next item using the approved Today-then-Soon rule, and the Health Score must refresh immediately from the updated shared plan state.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User opens a health item detail view for the active profile from the dashboard or a plan list and sees the item title, why-it-matters content, recommendation cadence, current status, and available primary actions.
- Expected behavior:
  - On detail load, show the current item status as one of due, planned, or done using the existing product status presentation; do not introduce any new labels or reminder-only status.
  - If the item status is due or planned, show two actions in the detail action area: a primary 'Mark as done' action and a secondary 'Set reminder' action.
  - When the user taps 'Mark as done', submit the action immediately without a secondary form, show a pending state on the action area, and prevent duplicate taps until the request resolves.
  - On successful completion, update the item status to done on the detail view, remove any displayed reminder date for that item, and show the done state in the same rendered screen state.
  - Immediately after a successful done action, refresh all same-session views for the active profile from the shared plan store so the same item reads as done on the dashboard and plan views without reload.
  - Immediately after a successful done action, recompute and display the updated Health Score and recompute the dashboard highlighted next item using the Today-then-Soon rule.
  - If the user chooses 'Set reminder', open an in-context reminder picker within the detail view action area rather than navigating away.
  - The reminder picker shows exactly three choices for this slice: 'In 1 month', 'In 3 months', and 'Choose date'. No recurrence, time of day, or delivery channel fields are shown.

### Flow B - Failure and Recovery Paths

- If the user selects 'Choose date' and does not provide a date, keep the reminder form open, show an inline validation message attached to the date field, and do not submit the action.
- If the user selects 'Choose date' and enters a past date, keep the reminder form open, show an inline validation message stating that the reminder date must be today or later, and do not submit the action.
- If reminder creation fails after submit, keep the user on the detail view, preserve their selected timing input, remove any success confirmation, and show a non-blocking inline error in the action area with a retry path.
- If marking an item as done fails, keep the existing status unchanged, remove the pending state, and show a non-blocking inline error near the action area so the user can retry without leaving the detail view.
- If shared-session updates cannot be reflected in another open view for the same profile, the source of truth remains the updated detail view state and the user must see the updated status when they next return to dashboard or plan in the same session; no manual refresh prompt is shown in this slice.

## 3. Interaction and Validation Rules

- The detail view is the only action origin in this slice; dashboard cards and plan rows may reflect updated status but must not introduce their own completion or reminder controls.
- Action hierarchy on detail: 'Mark as done' is the primary completion action, 'Set reminder' is the secondary planning action, and both actions operate on the currently viewed item only.
- Reminder creation always changes the item status to planned and stores one resolved scheduled date; the UI must present the item as planned after success, not as due, reminded, or pending.
- Marking an item done always changes the item status to done and clears any active reminder presentation for that item in the UI.
- Reminder confirmation is a transient success state, not a persisted item status. After successful reminder creation, show a confirmation message in the detail action area that includes the resolved reminder date, while the item status presentation remains planned.
- The confirmation message must be calm and factual, for example equivalent to 'Reminder set for Jul 12, 2026'; it must not imply external delivery guarantees because delivery is out of scope.
- If the item is already done on entry, do not show the reminder picker trigger and do not show 'Mark as done' as an active primary action; the detail view should present the item as completed.
- The reminder picker must resolve preset choices to a specific calendar date before success is shown so confirmation copy and later status displays use the same date value in the same session.','After any successful action, all visible status chips, labels, and summary counts for the active profile must be driven from a

## 4. Implementation Constraints

- Stay within the existing mobile-first detail screen pattern; add action controls to the current detail view rather than creating a new reminder management page or modal flow that changes information architecture.
- Use only the existing MVP statuses: due, planned, done. No skipped, snoozed, overdue, reminded, completed-later, or custom labels.
- Limit reminder timing inputs to exactly three selectable options: one_month, three_months, custom_date. No recurring schedules, no time picker, no notification channel selector, no reminder preferences.
- Keep scope to one item under one active profile. No family-wide bulk actions, no cross-profile updates, and no combined multi-item editing.
- All writes must go through the shared item action service so UX behavior stays consistent across detail, dashboard, and plan views.
- Derived dashboard outputs must update from the mutated shared plan state in the same session; do not require profile regeneration, app restart, or page reload to see the new next item or Health Score.
- Success and error feedback for this slice must appear in or directly adjacent to the detail action area so the user can understand the result without leaving context.
- Copy must keep the product framed as preventive guidance, not a medical record or clinician substitute; avoid alarmist or shame-based language in success and error states.

## 5. Acceptance Mapping

- From a health item detail view, a user can mark the item as done and then observe that same item as done on the detail view, dashboard, and plan views in the same session.
- From a health item detail view, a user can open reminder controls and schedule a reminder using exactly one of these options: 1 month, 3 months, or a chosen date.
- After successful reminder creation, the user sees an in-context confirmation state on the detail view that includes the resolved reminder date.
- After successful reminder creation, the item is shown as planned on the detail view, dashboard, and plan views in the same session.
- After either successful action, the dashboard highlighted next item changes immediately when the updated plan changes which item qualifies under the Today-then-Soon rule.
- After either successful action, the Health Score refreshes immediately from the updated item statuses in the same session.
- If the user attempts to save a custom reminder date with no da
[truncated]
```

Project brief context:
```markdown
# Project Brief

Date: `2026-05-05`
Prepared by: `Product Manager`
Project: `Longevity Health OS`
Brief Approval Status: `approved`
## 1. Product Description

Longevity Health OS is the default product name for this preventive health navigation MVP for individuals and families.

The product generates a personalized health plan from minimal profile inputs and turns it into clear next actions.

The MVP focuses on guidance, status tracking, reminders, and manual vaccination tracking rather than broad health data storage.

## 2. Vision and Positioning

Position the product as a health navigator that tells users what to do next, when to do it, and why it matters.

Frame value around prevention, clarity, and follow-through rather than record keeping.

Treat rule-based guidance as the core intelligence model for MVP.

## 3. Core Problem

Users do not know which preventive actions are relevant for them.

Users miss check-ups and vaccinations because follow-up is fragmented.

Existing health tools store information without prioritizing the next action.

## 4. Target Users

- Professionals aged 30-65 who want a clear preventive health plan.
- Parents who manage preventive health tasks for multiple family members.
- Health-conscious adults who want reminders and status visibility without medical complexity.

## 5. MVP Objective

- Show a populated personal health dashboard within 60 seconds of starting onboarding.
- Give each user a prioritized plan that makes the next preventive action obvious.
- Support repeat engagement through item status updates, reminders, and family oversight.
- Keep MVP scope limited to the features listed in this brief for a 4-8 week build.

## 6. Core MVP Scope

### Onboarding and profile setup

- Capture age and gender as the only required personal inputs during first-run onboarding.
- Offer optional family profile creation during onboarding inside the same account.
- Generate the first health plan within 5 seconds of onboarding completion.

### Personal health plan

- Create a rule-based checklist from age and gender only, limited to the initial preventive check-up and vaccination item set defined for MVP.
- the MVP checklist is explicitly limited to a named, enumerated MVP preventive item set in an LLM-generated table based on the scope and purpose of the MVP, with anything not listed treated as out of scope.
- Display each item with recommendation cadence and one current status.
- Support the statuses done, due, and planned across plan views.

### Prioritized dashboard

- Group health items into Today, Soon, and Later buckets on the main dashboard.
- Show one simple Health Score per profile as an up-to-date summary indicator in %.
- Surface 1 highest-priority item on the dashboard from Today, or the earliest Soon item if Today is empty.

### Health item detail and actions

- Open each health item into a detail view with recommendation text and why-it-matters rationale.
- Allow users to mark an item as done from the detail view.
- Allow users to set a reminder for an item using 1 month, 3 months, or a chosen date.

### Vaccination tracking

- Provide a dedicated vaccination list for each profile.
- Allow manual addition of vaccination entries with date and status context.
- Show vaccination due guidance inside the vaccination area without provider sync.

### Family mode

- Let one account manage up to 5 individual profiles.
- Show per-profile Health Score and due-item summary in the family overview.
- Let users open each family member's dashboard, checkup plan, and vaccinations.

### Profile and preferences

- Provide a lightweight profile area to create, view, and edit family profiles; exclude archive and delete from MVP.
- Limit preferences to reminder settings and household management.
- Exclude broad account customization from MVP.

## 7. UX Principles and Tone

- Keep the interface mobile-first and reduce each screen to one primary action.
- Use clear, calm, trustworthy language with light motivational reinforcement.
- Explain medical relevance in plain language instead of clinical detail.
- Favor prioritization and completion signals over dense data display.

## 8. Primary User Journey

1. User starts onboarding and enters age and gender.
2. Once onboarded, the System generates a personal health plan and opens the dashboard.
3. A health plan consists of two categories: checkups and vaccinations.  
3. Onboarded users may add profiles for family members.
4. User reviews Today, Soon, and Later priorities.
5. User opens an item, reads why it matters, and marks it done or sets a reminder.
6. User returns to the app main screen as the dashboard, to track progress, manage checkups and vaccinations for themselves or for family profiles.

## 9. Technical Direction

- Default to a mobile-first responsive web app for MVP, while keeping the client architecture portable to a cross-platform build later.
- Use a simple modular backend for MVP, with exact service boundaries and domain decomposition determined during technical design.
- Keep personalization rule-based for MVP and exclude ML or real AI services.
- Design data structures to support one account with multiple profiles from launch.

## 10. Data and Privacy Constraints

- Collect only the minimum personal data needed for plan generation and profile management.
- Exclude broad medical record storage, document ingestion, and provider data sync from MVP data scope.
- Use secure handling for profile, plan, reminder, and vaccination data.
- Use test data in development environments.

## 11. Explicit Out of Scope (MVP)

- Doctor or clinic integration.
- External APIs, provider systems, or ecosystem links.
- AI-generated recommendations beyond rule-based logic.
- Complex analytics, trend dashboards, or risk scoring.
- Insurance integrations.
- Expanded record-keeping features that turn the product into a medical record system.

## 12. Delivery Expectations

- Deliver an MVP in 4-8 weeks across setup, core build, testing, and launch preparation.
- Protect scope against unsupported intake fields, integrations, and analytics additions.
- Provide a costed implementation plan that breaks work into 4 phases: setup, core build, testing, and launch preparation.
- Ship the self profile flow and family profile flow in the first launch build.

## 13. Primary Success Criteria

- A new user can complete onboarding and reach a populated dashboard in 60 seconds or less.
- In moderated MVP validation, at least 8 of 10 target users can identify their next health step within 1 minute of first dashboard load.
- 100% of generated health items show a recommendation cadence, a status, and a why-it-matters explanation.
- A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion.
- A user can add at least 1 manual vaccination entry to any profile and see it appear in that profile's vaccination list in the same session.
- A family account can create and view at least 2 profiles with separate Health Scores and priority lists.

## 14. Future Roadmap (Not MVP)

- Expand rule coverage beyond the initial preventive checklist after MVP usage validates the core flow.
- Add provider and ecosystem integrations after the manual tracking model is stable.
- Introduce advanced analytics only after the Health Score proves useful as a simple summary.
- Evaluate AI-assisted recommendations only after the rule-based guidance model and trust signals are validated.

## 15. Source Basis

- `Health_App_Wireframes.pdf`
- `Longevity_Health_OS_MVP_HighEnd.pdf`
- `UX_Copy_Health_App.pdf`

```

Product framing context:
```markdown
# Product System Framing

## Product Essence

A preventive health navigation product that gives users immediate clarity on what health action to take next, when to take it, and why, without acting as a medical record.

## Target Users

- Professionals aged 30–65
- Parents managing health for family members
- Health-conscious individuals

## Jobs To Be Done

- Understand the next relevant preventive health action quickly
- See which health actions matter now versus later
- Follow a personalized health plan based on basic personal attributes
- Understand why a recommended action matters
- Track completion status of preventive health items
- Set reminders so preventive actions are not missed
- Manage preventive health for multiple family profiles in one place
- Track vaccination status through manual entry and guidance

## Core Concepts

- **Account** — The primary user relationship with the product that can contain one or more health profiles.
- **Health Profile** — A person-specific preventive health context defined at minimum by age and gender, used to generate guidance.
- **Personal Health Plan** — A rule-based list of recommended preventive health items for a specific profile.
- **Health Item** — A recommended preventive action with status, recommended cadence, and explanatory context.
- **Priority Buckets** — Three time-based groupings used on the dashboard to prioritize health items; exact canonical labels remain to be chosen.
- **Health Score** — A simple up-to-date summary indicator shown per profile to signal overall preventive progress, without implying complex analytics.
- **Detail View** — The item-level view showing what the action is, why it matters, current status context, and available actions.
- **Reminder** — A user-set follow-up prompt tied to a health item using preset or custom timing.
- **Vaccination Tracker** — The product area for manually recording vaccinations and showing status guidance.
- **Family Mode** — The capability to manage multiple health profiles within one account and view each profile’s status.
- **Rule-Based Guidance** — Deterministic recommendation logic that creates plans and guidance from defined rules rather than real AI.

## Product Rules

- The product must be positioned as preventive guidance, not as a medical record.
- The core promise is immediate clarity on the user's next health step.
- The MVP must deliver visible user value within 60 seconds of starting onboarding.
- Onboarding must collect at minimum age and gender for each profile.
- A personal health plan must be generated from rule-based logic using profile attributes.
- Guidance labeled as smart or insightful must remain rule-based in the MVP and must not be presented as real AI.
- The dashboard must prioritize actions using three temporal buckets and a simple overall progress summary.
- Health items must include plain-language explanation of why the action matters.
- Users must be able to mark a health item as done and set a reminder from the item context.
- Vaccination tracking is part of the MVP and must support manual entry plus status guidance.
- Family mode is part of the MVP and must allow multiple profiles under one account.
- The MVP should use minimal sensitive data and maintain a high-trust feel.
- The MVP must stay lean and simple; complex analytics are not part of the product model.
- Doctor or provider integration is excluded from the MVP.
- External APIs or ecosystem integrations are excluded from the MVP.
- Insurance links and broader health ecosystem connectivity are excluded from the MVP.

## Primary Workflows

### Onboard and generate plan

1. User starts onboarding
2. User enters minimum profile inputs: age and gender
3. User chooses whether to plan only for self or add family members
4. Product generates a personal health plan for the initial profile
5. User lands on the dashboard with prioritized next steps

### Review priorities from dashboard

1. User opens the dashboard overview
2. User sees health score or up-to-date summary
3. User reviews prioritized health items grouped into three time buckets
4. User selects an item to view more detail

### Act on a health item

1. User opens an item detail view
2. User reads description, recommendation cadence, current status, and why it matters
3. User marks the item done or chooses to set a reminder
4. Product reflects the updated item state in the plan and dashboard

### Set a reminder

1. User initiates reminder setting from an item
2. User chooses a preset interval or a custom date
3. Product confirms that the reminder is set
4. The item remains trackable for later follow-up

### Manage family profiles

1. User opens family mode
2. User views all profiles with per-person status summary
3. User selects a profile to review its dashboard or plan
4. User adds or maintains family profiles as needed

### Track vaccinations

1. User opens the vaccination tracker
2. User reviews vaccination entries and status guidance
3. User manually adds a vaccination entry
4. Vaccination status contributes to the relevant profile view

### Adjust profile and preferences

1. User opens profile or settings
2. User reviews personal or family-related settings
3. User updates basic preferences relevant to product use

## MVP Boundaries

### In Scope

- Welcome and onboarding flow
- Minimum profile capture with age and gender
- Optional family profile setup during onboarding
- Rule-based personal health plan generation
- Dashboard with three priority buckets
- Simple health score or up-to-date summary
- Health plan list with item status and recommendation cadence
- Item detail view with why-it-matters explanation
- Mark item as done
- Set reminders using preset or custom timing
- Vaccination tracker with manual entry and status guidance
- Family mode with multiple profiles in one account
- Basic profile/settings area for family and preferences
- Clear, calm, trustworthy product framing and copy

### Out of Scope

- Medical-record positioning or comprehensive record storage
- Doctor or provider integration
- External APIs or third-party health system integrations
- Real AI or AI-driven recommendations
- Advanced or complex analytics
- Insurance or ecosystem links
- Any future-roadmap integrations beyond the lean MVP

## Open Decisions

- Canonical product name: 'Longevity Health OS' vs 'Health App'
- Primary launch language and localization approach
- Canonical labels for the three dashboard priority buckets
- Initial rule set for which preventive items are included in the personal health plan
- Minimal health score calculation and how it updates without becoming analytics-heavy
- Reminder delivery channel definition
- Family mode basics such as profile limits and switching behavior
- Minimal vaccination data model and status rules
- Exact scope of profile/settings beyond family and preferences
- Platform choice between responsive web and cross-platform mobile

```

Implementation source context to review:
## src/App.jsx
```text
import React, { useEffect, useState } from 'react';
import ItemCompletionAndReminderActionsRoute from './routes/item-completion-and-reminder-actions.jsx';
import SelfOnboardingToFirstDashboardRoute from './routes/self-onboarding-to-first-dashboard.jsx';
import { generateInitialPlanSnapshot } from './features/self-onboarding-to-first-dashboard/plan.js';
import { DETAIL_ORIGIN, PLAN_CATEGORIES } from './features/health-plan-browsing-and-item-detail/model.js';

const DEMO_PROFILE = Object.freeze({
  profileId: 'self',
  name: 'You',
  age: 45,
  gender: 'female',
});

const demoPlanSnapshot = generateInitialPlanSnapshot(DEMO_PROFILE, { now: new Date() });

function normalizeView(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'plan') return 'plan';
  // Keep legacy SL-003 URL working but fold it into the canonical plan flow.
  if (normalized === 'actions') return 'plan';
  return 'onboarding';
}

function currentViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeView(params.get('view'));
}

function replaceViewInUrl(view) {
  const url = new URL(window.location.href);
  if (view === 'plan') url.searchParams.set('view', 'plan');
  else url.searchParams.delete('view');
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(null, '', next);
  }
}

export default function App() {
  const [activeView, setActiveView] = useState(() => currentViewFromUrl());
  const [runtimeProfile, setRuntimeProfile] = useState(null);
  const [runtimePlanSnapshot, setRuntimePlanSnapshot] = useState(null);
  const [runtimePlanEntry, setRuntimePlanEntry] = useState({
    initialItemKey: undefined,
    initialOrigin: undefined,
    initialCategory: undefined,
  });

  useEffect(() => {
    replaceViewInUrl(activeView);
  }, [activeView]);

  const openHealthPlan = ({
    planSnapshot,
    profile,
    initialItemKey,
    initialOrigin,
    initialCategory,
  } = {}) => {
    if (planSnapshot) setRuntimePlanSnapshot(planSnapshot);
    if (profile) setRuntimeProfile(profile);
    setRuntimePlanEntry({
      initialItemKey,
      initialOrigin,
      initialCategory,
    });
    setActiveView('plan');
  };

  const handlePlanNavigate = (target) => {
    if (target?.destination === DETAIL_ORIGIN.dashboard) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
      });
      setActiveView('onboarding');
    }
  };

  const handlePlanSnapshotChange = (nextPlanSnapshot) => {
    if (nextPlanSnapshot) {
      setRuntimePlanSnapshot(nextPlanSnapshot);
    }
  };

  if (activeView === 'plan') {
    return (
      <ItemCompletionAndReminderActionsRoute
        profile={runtimeProfile || DEMO_PROFILE}
        initialPlanSnapshot={runtimePlanSnapshot || demoPlanSnapshot}
        initialItemKey={runtimePlanEntry.initialItemKey}
        initialOrigin={runtimePlanEntry.initialOrigin}
        initialCategory={runtimePlanEntry.initialCategory}
        onNavigate={handlePlanNavigate}
        onPlanSnapshotChange={handlePlanSnapshotChange}
      />
    );
  }

  return (
    <SelfOnboardingToFirstDashboardRoute
      initialProfile={runtimeProfile}
      initialPlanSnapshot={runtimePlanSnapshot}
      onOpenHealthPlan={openHealthPlan}
    />
  );
}
```
## src/features/health-plan-browsing-and-item-detail/HealthPlanBrowsingAndItemDetail.jsx
```text
import React, { useMemo, useState } from 'react';
import { AppShell, StatusPill } from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  getCategoryLabel,
} from './model.js';
import {
  buildCategoryTabs,
  buildHealthPlanReadModel,
  resolveDetailBackTarget,
  resolveItemDetail,
} from './projection.js';

function ListEmptyState({ activeCategory, onSwitchCategory }) {
  const nextCategory = activeCategory === PLAN_CATEGORIES.checkup
    ? PLAN_CATEGORIES.vaccination
    : PLAN_CATEGORIES.checkup;

  return (
    <section className="sl002-empty-state" role="status" aria-live="polite">
      <h3>No {getCategoryLabel(activeCategory).toLowerCase()} in your plan right now</h3>
      <p>
        There are no {getCategoryLabel(activeCategory).toLowerCase()} to show for this plan yet.
      </p>
      <button
        type="button"
        className="sl001-primary-action"
        onClick={() => onSwitchCategory(nextCategory)}
      >
        View {getCategoryLabel(nextCategory)}
      </button>
    </section>
  );
}

function PlanRow({ item, onOpen }) {
  return (
    <li>
      <button type="button" className="sl002-plan-row" onClick={() => onOpen(item.itemKey)}>
        <span className="sl002-plan-row-copy">
          <span className="sl002-plan-row-title">{item.displayName}</span>
          <span className="sl002-plan-row-cadence">{item.cadenceText}</span>
        </span>
        <StatusPill status={item.status} label={item.statusLabel} />
      </button>
    </li>
  );
}

function NotFoundState({ onRecover }) {
  return (
    <section className="sl002-not-found" role="alert">
      <h2>This item is not available in your current plan</h2>
      <p>It may no longer be part of this plan. You can return to your checkups and vaccinations list.</p>
      <button type="button" className="sl001-primary-action" onClick={onRecover}>Return to your plan</button>
    </section>
  );
}

function DetailView({ item }) {
  return (
    <section className="sl002-detail-view" aria-label={`${item.displayName} details`}>
      <div className="sl002-detail-topline">
        <StatusPill status={item.status} label={item.statusLabel} />
        <span className="sl002-detail-category">{item.categoryLabel}</span>
      </div>
      <p className="sl002-detail-cadence">Recommended cadence: {item.cadenceText}</p>

      <section className="sl002-detail-section" aria-label="Recommendation">
        <h3>Recommendation</h3>
        <p>{item.recommendationText}</p>
      </section>

      <section className="sl002-detail-section" aria-label="Why it matters">
        <h3>Why it matters</h3>
        <p>{item.whyItMattersText}</p>
      </section>
    </section>
  );
}

export default function HealthPlanBrowsingAndItemDetail({
  planSnapshot,
  initialCategory = PLAN_CATEGORIES.checkup,
  initialItemKey,
  initialOrigin = DETAIL_ORIGIN.direct,
  onNavigate,
}) {
  const readModel = useMemo(() => buildHealthPlanReadModel(planSnapshot), [planSnapshot]);

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [detailState, setDetailState] = useState(initialItemKey ? {
    itemKey: initialItemKey,
    origin: initialOrigin,
  } : null);

  if (!planSnapshot) {
    return (
      <AppShell title="Your preventive plan">
        <p className="sl001-support-copy">Loading your checkups and vaccinations...</p>
        <div className="sl002-loading-block" aria-hidden="true" />
        <div className="sl002-loading-block" aria-hidden="true" />
      </AppShell>
    );
  }

  const detailItem = detailState ? resolveItemDetail(readModel, detailState.itemKey) : null;
  const activeItems = activeCategory === PLAN_CATEGORIES.vaccination ? readModel.vaccinations : readModel.checkups;

  const handleOpenDetail = (itemKey) => {
    setDetailState({
      itemKey,
      origin: activeCategory === PLAN_CATEGORIES.vaccination ? DETAIL_ORIGIN.vaccinations : DETAIL_ORIGIN.checkups,
    });
  };

  const handleBackFromDetail = () => {
    const target = resolveDetailBackTarget({
      origin: detailState?.origin,
      detailItem,
    });

    if (target.destination === DETAIL_ORIGIN.dashboard) {
      if (typeof onNavigate === 'function') {
        onNavigate(target);
      } else if (detailItem) {
        setActiveCategory(detailItem.category);
      }
      setDetailState(null);
      return;
    }

    if (target.destination === DETAIL_ORIGIN.vaccinations) {
      setActiveCategory(PLAN_CATEGORIES.vaccination);
      setDetailState(null);
      return;
    }

    setActiveCategory(PLAN_CATEGORIES.checkup);
    setDetailState(null);
  };

  const handleBackToDashboard = () => {
    if (typeof onNavigate === 'function') {
      onNavigate({ destination: DETAIL_ORIGIN.dashboard });
    }
  };

  if (detailState && !detailItem) {
    return (
      <AppShell title="Plan item unavailable">
        <NotFoundState
          onRecover={() => {
            setActiveCategory(PLAN_CATEGORIES.checkup);
            setDetailState(null);
          }}
        />
      </AppShell>
    );
  }

  if (detailItem) {
    return (
      <AppShell
        title={detailItem.displayName}
        headerAction={(
          <button type="button" className="sl002-back-button" onClick={handleBackFromDetail}>
            Back
          </button>
        )}
      >
        <DetailView item={detailItem} />
      </AppShell>
    );
  }

  const tabs = buildCategoryTabs(activeCategory);

  return (
    <AppShell title={getCategoryLabel(activeCategory)}>
      {typeof onNavigate === 'function' ? (
        <button type="button" className="sl002-back-to-dashboard" onClick={handleBackToDashboard}>
          Back to dashboard
        </button>
      ) : null}
      <div className="sl002-category-switch" role="tablist" aria-label="Plan categories">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            className={tab.isActive ? 'sl00
[truncated]
```
## src/features/health-plan-browsing-and-item-detail/definitions.js
```text
import { MVP_PREVENTIVE_CATALOG } from '../self-onboarding-to-first-dashboard/catalog.js';

const RECOMMENDATION_TEXT_BY_ITEM_KEY = Object.freeze({
  'annual-wellness-visit': 'Schedule a yearly wellness visit so you and your clinician can review your preventive plan and update it as your needs change.',
  'blood-pressure-check': 'Check your blood pressure at least once a year, or sooner if your clinician recommends closer follow-up.',
  'cholesterol-screening': 'Repeat cholesterol screening every 4 to 6 years for most adults, with shorter intervals when personal risk is higher.',
  'diabetes-screening': 'Plan diabetes screening about every 3 years starting in adulthood, and discuss earlier or more frequent checks if risk factors apply.',
  'cervical-cancer-screening': 'Follow routine cervical screening on the recommended interval for your age group, usually every 3 to 5 years.',
  'prostate-health-discussion': 'Start a prostate health conversation around age 50 so screening decisions can match your values and personal risk.',
  'influenza-vaccine': 'Get a flu vaccine every year, ideally before each flu season begins.',
  'tdap-booster': 'Get a tetanus, diphtheria, and pertussis booster every 10 years to keep protection current.',
  'shingles-vaccine': "Complete the 2-dose shingles vaccine series after age 50, spaced according to your clinician's timing guidance.",
});

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export const LOCKED_PREVENTIVE_ITEM_DEFINITIONS = Object.freeze(
  MVP_PREVENTIVE_CATALOG.map((catalogItem) => ({
    itemKey: catalogItem.itemId,
    displayName: normalizeText(catalogItem.name),
    category: normalizeText(catalogItem.category),
    cadenceText: normalizeText(catalogItem.cadenceLabel),
    recommendationText: normalizeText(RECOMMENDATION_TEXT_BY_ITEM_KEY[catalogItem.itemId]),
    whyItMattersText: normalizeText(catalogItem.whyItMatters),
  })),
);

export const PREVENTIVE_ITEM_DEFINITION_INDEX = Object.freeze(
  LOCKED_PREVENTIVE_ITEM_DEFINITIONS.reduce((index, definition) => {
    index[definition.itemKey] = definition;
    return index;
  }, {}),
);

export function isCompletePreventiveItemDefinition(definition) {
  return Boolean(
    definition
      && normalizeText(definition.itemKey)
      && normalizeText(definition.displayName)
      && normalizeText(definition.category)
      && normalizeText(definition.cadenceText)
      && normalizeText(definition.recommendationText)
      && normalizeText(definition.whyItMattersText),
  );
}

export function assertCompletePreventiveDefinitions(definitions = LOCKED_PREVENTIVE_ITEM_DEFINITIONS) {
  const incompleteKeys = definitions
    .filter((definition) => !isCompletePreventiveItemDefinition(definition))
    .map((definition) => definition?.itemKey ?? 'unknown');

  if (incompleteKeys.length > 0) {
    throw new Error(`Preventive item definitions are incomplete: ${incompleteKeys.join(', ')}`);
  }

  return true;
}

assertCompletePreventiveDefinitions();
```
## src/features/health-plan-browsing-and-item-detail/index.js
```text
export { default as HealthPlanBrowsingAndItemDetail } from './HealthPlanBrowsingAndItemDetail.jsx';
export {
  LOCKED_PREVENTIVE_ITEM_DEFINITIONS,
  PREVENTIVE_ITEM_DEFINITION_INDEX,
  assertCompletePreventiveDefinitions,
  isCompletePreventiveItemDefinition,
} from './definitions.js';
export {
  ALLOWED_PLAN_CATEGORIES,
  ALLOWED_PLAN_STATUSES,
  CATEGORY_LABELS,
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  PLAN_STATUSES,
  STATUS_LABELS,
  getCategoryLabel,
  getCategoryRouteKey,
  getStatusLabel,
  isAllowedPlanCategory,
  isAllowedPlanStatus,
} from './model.js';
export {
  buildCategoryTabs,
  buildCoverageSnapshot,
  buildHealthPlanReadModel,
  resolveDetailBackTarget,
  resolveItemDetail,
} from './projection.js';
```
## src/features/health-plan-browsing-and-item-detail/model.js
```text
export const PLAN_CATEGORIES = Object.freeze({
  checkup: 'checkup',
  vaccination: 'vaccination',
});

export const PLAN_STATUSES = Object.freeze({
  due: 'due',
  planned: 'planned',
  done: 'done',
});

export const ALLOWED_PLAN_CATEGORIES = Object.freeze(Object.values(PLAN_CATEGORIES));
export const ALLOWED_PLAN_STATUSES = Object.freeze(Object.values(PLAN_STATUSES));

export const STATUS_LABELS = Object.freeze({
  due: 'Due now',
  planned: 'Planned',
  done: 'Done',
});

export const CATEGORY_LABELS = Object.freeze({
  checkup: {
    singular: 'Checkup',
    plural: 'Checkups',
  },
  vaccination: {
    singular: 'Vaccination',
    plural: 'Vaccinations',
  },
});

export const DETAIL_ORIGIN = Object.freeze({
  dashboard: 'dashboard',
  checkups: 'checkups',
  vaccinations: 'vaccinations',
  direct: 'direct',
});

export function isAllowedPlanCategory(value) {
  return ALLOWED_PLAN_CATEGORIES.includes(value);
}

export function isAllowedPlanStatus(value) {
  return ALLOWED_PLAN_STATUSES.includes(value);
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? STATUS_LABELS.planned;
}

export function getCategoryLabel(category, mode = 'plural') {
  const labels = CATEGORY_LABELS[category] ?? CATEGORY_LABELS.checkup;
  return labels[mode] ?? labels.plural;
}

export function getCategoryRouteKey(category) {
  return category === PLAN_CATEGORIES.vaccination ? DETAIL_ORIGIN.vaccinations : DETAIL_ORIGIN.checkups;
}
```
## src/features/health-plan-browsing-and-item-detail/projection.js
```text
import {
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  getCategoryLabel,
  getCategoryRouteKey,
  getStatusLabel,
  isAllowedPlanCategory,
  isAllowedPlanStatus,
} from './model.js';
import {
  LOCKED_PREVENTIVE_ITEM_DEFINITIONS,
  PREVENTIVE_ITEM_DEFINITION_INDEX,
} from './definitions.js';

function toDefinitionIndex(definitions) {
  if (!Array.isArray(definitions)) {
    return PREVENTIVE_ITEM_DEFINITION_INDEX;
  }

  return definitions.reduce((index, definition) => {
    if (!definition?.itemKey) {
      return index;
    }

    index[definition.itemKey] = definition;
    return index;
  }, {});
}

function toSafeStatus(status) {
  return isAllowedPlanStatus(status) ? status : 'planned';
}

function toViewItem(generatedItem, definition) {
  const status = toSafeStatus(generatedItem?.status);

  return {
    itemKey: definition.itemKey,
    displayName: definition.displayName,
    category: definition.category,
    categoryLabel: getCategoryLabel(definition.category, 'singular'),
    cadenceText: definition.cadenceText,
    status,
    statusLabel: getStatusLabel(status),
    recommendationText: definition.recommendationText,
    whyItMattersText: definition.whyItMattersText,
  };
}

export function buildHealthPlanReadModel(planSnapshot, options = {}) {
  const definitions = options.definitions ?? LOCKED_PREVENTIVE_ITEM_DEFINITIONS;
  const definitionIndex = toDefinitionIndex(definitions);
  const generatedItems = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];

  const checkups = [];
  const vaccinations = [];
  const byItemKey = {};
  const missingDefinitionKeys = [];
  const unavailableItemKeys = [];

  for (const generatedItem of generatedItems) {
    const itemKey = generatedItem?.catalogItemId;
    const definition = definitionIndex[itemKey];

    if (!definition) {
      missingDefinitionKeys.push(itemKey);
      continue;
    }

    if (!isAllowedPlanCategory(definition.category)) {
      unavailableItemKeys.push(itemKey);
      continue;
    }

    const item = toViewItem(generatedItem, definition);

    byItemKey[item.itemKey] = item;
    if (item.category === PLAN_CATEGORIES.checkup) {
      checkups.push(item);
    } else if (item.category === PLAN_CATEGORIES.vaccination) {
      vaccinations.push(item);
    }
  }

  return {
    generatedAt: planSnapshot?.generatedAt ?? null,
    checkups,
    vaccinations,
    allItems: [...checkups, ...vaccinations],
    byItemKey,
    missingDefinitionKeys,
    unavailableItemKeys,
  };
}

export function resolveItemDetail(readModel, itemKey) {
  if (!itemKey) {
    return null;
  }

  return readModel?.byItemKey?.[itemKey] ?? null;
}

export function buildCoverageSnapshot(readModel, sourcePlanSnapshot) {
  const generatedItems = Array.isArray(sourcePlanSnapshot?.items) ? sourcePlanSnapshot.items : [];
  const generatedKeys = generatedItems.map((item) => item.catalogItemId);
  const visibleKeys = readModel.allItems.map((item) => item.itemKey);

  return {
    generatedKeys,
    visibleKeys,
    generatedCount: generatedKeys.length,
    visibleCount: visibleKeys.length,
  };
}

export function resolveDetailBackTarget({ origin, detailItem }) {
  if (origin === DETAIL_ORIGIN.dashboard) {
    return { destination: DETAIL_ORIGIN.dashboard };
  }

  if (origin === DETAIL_ORIGIN.checkups || origin === DETAIL_ORIGIN.vaccinations) {
    return { destination: origin };
  }

  return {
    destination: getCategoryRouteKey(detailItem?.category),
  };
}

export function buildCategoryTabs(activeCategory) {
  return [
    {
      key: DETAIL_ORIGIN.checkups,
      category: PLAN_CATEGORIES.checkup,
      label: getCategoryLabel(PLAN_CATEGORIES.checkup),
      isActive: activeCategory === PLAN_CATEGORIES.checkup,
    },
    {
      key: DETAIL_ORIGIN.vaccinations,
      category: PLAN_CATEGORIES.vaccination,
      label: getCategoryLabel(PLAN_CATEGORIES.vaccination),
      isActive: activeCategory === PLAN_CATEGORIES.vaccination,
    },
  ];
}
```
## src/features/item-completion-and-reminder-actions/ItemCompletionAndReminderActions.jsx
```text
import React, { useMemo, useRef, useState } from 'react';
import {
  AppShell,
  StatusPill,
} from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  getCategoryLabel,
} from '../health-plan-browsing-and-item-detail/model.js';
import {
  resolveDetailBackTarget,
  resolveItemDetail,
} from '../health-plan-browsing-and-item-detail/projection.js';
import {
  createItemActionService,
} from './actions.js';
import {
  DETAIL_ACTION_ERRORS,
  REMINDER_OPTION_LABELS,
  REMINDER_TIMING_TYPES,
  formatDateForConfirmation,
} from './model.js';
import {
  buildPlanReadModelForSlice,
  resolveOriginForCategory,
} from './selectors.js';

function PlanRow({ item, onOpen }) {
  return (
    <li>
      <button type="button" className="sl002-plan-row" onClick={() => onOpen(item.itemKey)}>
        <span className="sl002-plan-row-copy">
          <span className="sl002-plan-row-title">{item.displayName}</span>
          <span className="sl002-plan-row-cadence">{item.cadenceText}</span>
        </span>
        <StatusPill status={item.status} label={item.statusLabel} />
      </button>
    </li>
  );
}

function ListEmptyState({ activeCategory, onSwitchCategory }) {
  const nextCategory = activeCategory === PLAN_CATEGORIES.checkup
    ? PLAN_CATEGORIES.vaccination
    : PLAN_CATEGORIES.checkup;

  return (
    <section className="sl002-empty-state" role="status" aria-live="polite">
      <h3>No {getCategoryLabel(activeCategory).toLowerCase()} in your plan right now</h3>
      <p>There are no {getCategoryLabel(activeCategory).toLowerCase()} to show yet.</p>
      <button
        type="button"
        className="sl001-primary-action"
        onClick={() => onSwitchCategory(nextCategory)}
      >
        View {getCategoryLabel(nextCategory)}
      </button>
    </section>
  );
}

function ReminderForm({
  selectedTiming,
  customDate,
  onTimingChange,
  onCustomDateChange,
  onSubmit,
  onCancel,
  pending,
  validationMessage,
}) {
  return (
    <form className="sl003-reminder-form" onSubmit={onSubmit} noValidate>
      <fieldset className="sl003-reminder-fieldset" disabled={pending}>
        <legend>Set a reminder</legend>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.one_month}
            checked={selectedTiming === REMINDER_TIMING_TYPES.one_month}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {REMINDER_OPTION_LABELS[REMINDER_TIMING_TYPES.one_month]}
        </label>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.three_months}
            checked={selectedTiming === REMINDER_TIMING_TYPES.three_months}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {REMINDER_OPTION_LABELS[REMINDER_TIMING_TYPES.three_months]}
        </label>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.custom_date}
            checked={selectedTiming === REMINDER_TIMING_TYPES.custom_date}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {REMINDER_OPTION_LABELS[REMINDER_TIMING_TYPES.custom_date]}
        </label>
        {selectedTiming === REMINDER_TIMING_TYPES.custom_date ? (
          <div className="sl003-custom-date">
            <label htmlFor="sl003-custom-date">Reminder date</label>
            <input
              id="sl003-custom-date"
              type="date"
              value={customDate}
              onChange={(event) => onCustomDateChange(event.target.value)}
              aria-invalid={Boolean(validationMessage)}
            />
          </div>
        ) : null}
      </fieldset>
      {validationMessage ? <p className="sl001-field-error" role="alert">{validationMessage}</p> : null}
      <div className="sl003-reminder-actions">
        <button className="sl001-primary-action" type="submit" disabled={pending}>
          {pending ? 'Saving reminder...' : 'Save reminder'}
        </button>
        <button className="sl003-quiet-button" type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DetailView({
  item,
  onMarkDone,
  donePending,
  reminderPending,
  showReminderForm,
  onOpenReminder,
  onReminderSubmit,
  onReminderCancel,
  onReminderTimingChange,
  onCustomReminderDateChange,
  selectedReminderTiming,
  customReminderDate,
  actionError,
  confirmationMessage,
}) {
  const actionsDisabled = donePending || reminderPending;

  return (
    <section className="sl002-detail-view" aria-label={`${item.displayName} details`}>
      <div className="sl002-detail-topline">
        <StatusPill status={item.status} label={item.statusLabel} />
        <span className="sl002-detail-category">{item.categoryLabel}</span>
      </div>
      <p className="sl002-detail-cadence">Recommended cadence: {item.cadenceText}</p>
      {item.reminderDateLabel ? (
        <p className="sl003-reminder-note">Planned for {item.reminderDateLabel}</p>
      ) : null}

      <section className="sl002-detail-section" aria-label="Recommendation">
        <h3>Recommendation</h3>
        <p>{item.recommendationText}</p>
      </section>

      <section className="sl002-detail-section" aria-label="Why it matters">
        <h3>Why it matters</h3>
        <p>{item.whyItMattersText}</p>
      </section>

      <section className="sl003-action-area" aria-label="Item actions">
        <h3>Next step</h3>
        {item.status === 'done' ? (
          <p className="sl003-complete-message">This item is marked as done.</p>
        ) : (
          <>
            <button
              type="button"
              className="sl001-primary-action"
              onClick={onMarkDone}
              disabled={actionsDisabled}
            >
[truncated]
```
## src/features/item-completion-and-reminder-actions/actions.js
```text
import {
  ALLOWED_REMINDER_TIMING_TYPES,
  DETAIL_ACTION_ERRORS,
  resolveReminderScheduledFor,
} from './model.js';

function cloneSnapshotItems(items) {
  return items.map((item) => ({
    ...item,
    reminder: item?.reminder ? { ...item.reminder } : undefined,
  }));
}

function assertProfileScope(planSnapshot, profileId) {
  if (!planSnapshot || planSnapshot.profileId !== profileId) {
    throw new Error('This plan is not available for the selected profile.');
  }
}

function updateItemInSnapshot(planSnapshot, itemId, updater) {
  const currentItems = Array.isArray(planSnapshot?.items) ? cloneSnapshotItems(planSnapshot.items) : [];
  let didUpdate = false;

  const items = currentItems.map((item) => {
    if (item.catalogItemId !== itemId) {
      return item;
    }

    didUpdate = true;
    return updater(item);
  });

  if (!didUpdate) {
    throw new Error('This item is not available in your current plan.');
  }

  return {
    ...planSnapshot,
    items,
  };
}

function resolveNow(clock) {
  const now = typeof clock === 'function' ? clock() : new Date();
  const parsed = now instanceof Date ? new Date(now.getTime()) : new Date(now);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid system date.');
  }

  return parsed;
}

export function markItemDoneInSnapshot(planSnapshot, profileId, itemId) {
  assertProfileScope(planSnapshot, profileId);

  const updatedSnapshot = updateItemInSnapshot(planSnapshot, itemId, (item) => ({
    ...item,
    status: 'done',
    reminder: undefined,
  }));

  const updatedItem = updatedSnapshot.items.find((item) => item.catalogItemId === itemId) ?? null;

  return {
    planSnapshot: updatedSnapshot,
    item: updatedItem,
  };
}

export function scheduleItemReminderInSnapshot(planSnapshot, profileId, itemId, reminderInput, clock) {
  assertProfileScope(planSnapshot, profileId);

  const timingType = reminderInput?.timingType;
  if (!ALLOWED_REMINDER_TIMING_TYPES.includes(timingType)) {
    throw new Error('Please choose one of the available reminder options.');
  }

  const now = resolveNow(clock);
  const resolvedReminder = resolveReminderScheduledFor(reminderInput, now);
  const reminder = {
    timingType: resolvedReminder.timingType,
    scheduledFor: resolvedReminder.scheduledFor,
    createdAt: now.toISOString(),
  };

  const updatedSnapshot = updateItemInSnapshot(planSnapshot, itemId, (item) => ({
    ...item,
    status: 'planned',
    reminder,
  }));

  const updatedItem = updatedSnapshot.items.find((item) => item.catalogItemId === itemId) ?? null;

  return {
    planSnapshot: updatedSnapshot,
    item: updatedItem,
    reminder,
  };
}

export function createItemActionService({ profileId, getPlanSnapshot, setPlanSnapshot, clock = () => new Date() }) {
  if (typeof getPlanSnapshot !== 'function' || typeof setPlanSnapshot !== 'function') {
    throw new Error('Item action service requires getPlanSnapshot and setPlanSnapshot callbacks.');
  }

  return {
    markItemDone(targetProfileId, itemId) {
      try {
        const result = markItemDoneInSnapshot(getPlanSnapshot(), targetProfileId, itemId);
        setPlanSnapshot(result.planSnapshot);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw error;
        }

        throw new Error(DETAIL_ACTION_ERRORS.action_failed);
      }
    },

    scheduleItemReminder(targetProfileId, itemId, reminderInput) {
      try {
        const result = scheduleItemReminderInSnapshot(
          getPlanSnapshot(),
          targetProfileId,
          itemId,
          reminderInput,
          clock,
        );

        setPlanSnapshot(result.planSnapshot);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw error;
        }

        throw new Error(DETAIL_ACTION_ERRORS.action_failed);
      }
    },

    get profileId() {
      return profileId;
    },
  };
}
```
## src/features/item-completion-and-reminder-actions/index.js
```text
export { default as ItemCompletionAndReminderActions } from './ItemCompletionAndReminderActions.jsx';

export {
  createItemActionService,
  markItemDoneInSnapshot,
  scheduleItemReminderInSnapshot,
} from './actions.js';

export {
  ALLOWED_REMINDER_TIMING_TYPES,
  DETAIL_ACTION_ERRORS,
  REMINDER_OPTION_LABELS,
  REMINDER_TIMING_TYPES,
  formatDateForConfirmation,
  parseIsoDateInput,
  resolveReminderScheduledFor,
  toIsoDate,
} from './model.js';

export {
  buildDashboardProjectionForSlice,
  buildPlanReadModelForSlice,
  calculateHealthScoreDoneVsOutstanding,
  groupItemsByPriorityForSlice,
  selectHighlightedItemTodayThenSoon,
} from './selectors.js';
```
## src/features/item-completion-and-reminder-actions/model.js
```text
import { getStatusLabel } from '../health-plan-browsing-and-item-detail/model.js';

export const REMINDER_TIMING_TYPES = Object.freeze({
  one_month: 'one_month',
  three_months: 'three_months',
  custom_date: 'custom_date',
});

export const ALLOWED_REMINDER_TIMING_TYPES = Object.freeze(Object.values(REMINDER_TIMING_TYPES));

export const REMINDER_OPTION_LABELS = Object.freeze({
  [REMINDER_TIMING_TYPES.one_month]: 'In 1 month',
  [REMINDER_TIMING_TYPES.three_months]: 'In 3 months',
  [REMINDER_TIMING_TYPES.custom_date]: 'Choose date',
});

export const DETAIL_ACTION_ERRORS = Object.freeze({
  missing_date: 'Please choose a reminder date.',
  past_date: 'Choose today or a later date for your reminder.',
  invalid_date: 'Enter a valid calendar date.',
  action_failed: 'We could not save your update. Please try again.',
});

function toDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  return new Date(value);
}

export function toIsoDate(value) {
  const parsed = toDate(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function parseIsoDateInput(value) {
  const trimmed = String(value ?? '').trim();
  const pattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = pattern.exec(trimmed);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function formatDateForConfirmation(isoDate, locale = 'en-US') {
  if (!isoDate || typeof isoDate !== 'string') {
    return 'your selected date';
  }

  const parsed = parseIsoDateInput(isoDate);
  if (!parsed) {
    return 'your selected date';
  }

  const date = new Date(`${parsed}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function addMonthsToIsoDate(baseIsoDate, months) {
  const [yearText, monthText, dayText] = baseIsoDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const candidate = new Date(Date.UTC(year, month - 1 + months, day));
  const monthOverflowed = candidate.getUTCDate() !== day;

  if (!monthOverflowed) {
    return candidate.toISOString().slice(0, 10);
  }

  const endOfTargetMonth = new Date(Date.UTC(year, month - 1 + months + 1, 0));
  return endOfTargetMonth.toISOString().slice(0, 10);
}

export function resolveReminderScheduledFor(reminderInput, nowValue = new Date()) {
  const timingType = reminderInput?.timingType;
  const todayIso = toIsoDate(nowValue);

  if (!todayIso) {
    throw new Error('Invalid current date for reminder resolution.');
  }

  if (timingType === REMINDER_TIMING_TYPES.one_month) {
    return {
      timingType,
      scheduledFor: addMonthsToIsoDate(todayIso, 1),
    };
  }

  if (timingType === REMINDER_TIMING_TYPES.three_months) {
    return {
      timingType,
      scheduledFor: addMonthsToIsoDate(todayIso, 3),
    };
  }

  if (timingType === REMINDER_TIMING_TYPES.custom_date) {
    const customIsoDate = parseIsoDateInput(reminderInput?.customDate);

    if (!customIsoDate) {
      const missingDate = String(reminderInput?.customDate ?? '').trim().length === 0;
      throw new Error(missingDate ? DETAIL_ACTION_ERRORS.missing_date : DETAIL_ACTION_ERRORS.invalid_date);
    }

    if (customIsoDate < todayIso) {
      throw new Error(DETAIL_ACTION_ERRORS.past_date);
    }

    return {
      timingType,
      scheduledFor: customIsoDate,
    };
  }

  throw new Error(`Unsupported reminder timing type: ${timingType}`);
}

export function getReminderOptionLabel(timingType) {
  return REMINDER_OPTION_LABELS[timingType] ?? REMINDER_OPTION_LABELS[REMINDER_TIMING_TYPES.custom_date];
}

export function getSafeStatusLabel(status) {
  return getStatusLabel(status);
}
```
## src/features/item-completion-and-reminder-actions/selectors.js
```text
import {
  CATEGORY_LABELS,
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  PLAN_STATUSES,
} from '../health-plan-browsing-and-item-detail/model.js';
import { buildHealthPlanReadModel } from '../health-plan-browsing-and-item-detail/projection.js';
import {
  formatDateForConfirmation,
  getSafeStatusLabel,
} from './model.js';

const BUCKET_ORDER = ['today', 'soon', 'later'];

const BUCKET_LABELS = Object.freeze({
  today: 'Today',
  soon: 'Soon',
  later: 'Later',
});

function sortWithinBucket(a, b) {
  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
}

function toDisplayItem(item) {
  const categoryLabel = CATEGORY_LABELS[item.category]?.singular ?? 'Preventive item';
  const reminderDate = item?.reminder?.scheduledFor;

  return {
    ...item,
    categoryLabel,
    statusLabel: getSafeStatusLabel(item.status),
    reminderDate,
    reminderDateLabel: reminderDate ? formatDateForConfirmation(reminderDate) : null,
  };
}

function toItems(snapshot) {
  return Array.isArray(snapshot?.items) ? snapshot.items.map(toDisplayItem) : [];
}

function isOutstanding(item) {
  return item?.status !== PLAN_STATUSES.done;
}

export function groupItemsByPriorityForSlice(planSnapshot) {
  const buckets = {
    today: [],
    soon: [],
    later: [],
  };

  for (const item of toItems(planSnapshot)) {
    if (!buckets[item.dashboardBucket]) {
      continue;
    }

    buckets[item.dashboardBucket].push(item);
  }

  for (const bucket of BUCKET_ORDER) {
    buckets[bucket].sort(sortWithinBucket);
  }

  return buckets;
}

export function selectHighlightedItemTodayThenSoon(planSnapshot) {
  const grouped = groupItemsByPriorityForSlice(planSnapshot);
  const todayOutstanding = grouped.today.filter(isOutstanding);

  if (todayOutstanding.length > 0) {
    return todayOutstanding[0];
  }

  const soonOutstanding = grouped.soon.filter(isOutstanding);
  if (soonOutstanding.length > 0) {
    return soonOutstanding[0];
  }

  return null;
}

export function calculateHealthScoreDoneVsOutstanding(planSnapshot) {
  const items = toItems(planSnapshot);

  if (items.length === 0) {
    return 0;
  }

  const completedCount = items.filter((item) => item.status === PLAN_STATUSES.done).length;
  return Math.round((completedCount / items.length) * 100);
}

export function buildDashboardProjectionForSlice(planSnapshot, profile = null) {
  const grouped = groupItemsByPriorityForSlice(planSnapshot);
  const highlightedItem = selectHighlightedItemTodayThenSoon(planSnapshot);
  const profileName = profile?.name?.trim() || 'You';
  const dueTodayCount = grouped.today.filter(isOutstanding).length;

  return {
    profileName,
    dueTodayCount,
    healthScore: calculateHealthScoreDoneVsOutstanding(planSnapshot),
    highlightedItem,
    sections: BUCKET_ORDER.map((priority) => ({
      priority,
      title: BUCKET_LABELS[priority],
      items: grouped[priority],
    })),
  };
}

export function buildPlanReadModelForSlice(planSnapshot) {
  const baseReadModel = buildHealthPlanReadModel(planSnapshot);

  const withReminderDetails = (item) => {
    const source = planSnapshot?.items?.find((sourceItem) => sourceItem.catalogItemId === item.itemKey);
    const reminderDate = source?.reminder?.scheduledFor ?? null;

    return {
      ...item,
      reminderDate,
      reminderDateLabel: reminderDate ? formatDateForConfirmation(reminderDate) : null,
      statusLabel: getSafeStatusLabel(source?.status ?? item.status),
      status: source?.status ?? item.status,
    };
  };

  const checkups = baseReadModel.checkups.map(withReminderDetails);
  const vaccinations = baseReadModel.vaccinations.map(withReminderDetails);
  const allItems = [...checkups, ...vaccinations];

  const byItemKey = allItems.reduce((index, item) => {
    index[item.itemKey] = item;
    return index;
  }, {});

  return {
    ...baseReadModel,
    checkups,
    vaccinations,
    allItems,
    byItemKey,
  };
}

export function resolveDefaultCategoryForItem(item) {
  if (item?.category === PLAN_CATEGORIES.vaccination) {
    return PLAN_CATEGORIES.vaccination;
  }

  return PLAN_CATEGORIES.checkup;
}

export function resolveOriginForCategory(category) {
  return category === PLAN_CATEGORIES.vaccination ? DETAIL_ORIGIN.vaccinations : DETAIL_ORIGIN.checkups;
}
```
## src/features/self-onboarding-to-first-dashboard/SelfOnboardingToFirstDashboard.jsx
```text
import React, { useMemo, useRef, useState } from 'react';
import {
  AppShell,
  FamilyProfileCard,
  HealthScoreCard,
  NextRecommendedStepCard,
  PrioritySection,
} from './components';
import { buildDashboardProjection, hasPopulatedDashboard } from './dashboard';
import { generateInitialPlanSnapshotAsync } from './plan';
import { normalizeSelfProfileInput, validateSelfProfileInput } from './validation';

export default function SelfOnboardingToFirstDashboard({
  planGenerator = generateInitialPlanSnapshotAsync,
  initialProfile = null,
  initialPlanSnapshot = null,
  onOpenHealthPlan,
}) {
  const ageRef = useRef(null);
  const genderRef = useRef(null);

  const [form, setForm] = useState({ age: '', gender: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const [profile, setProfile] = useState(initialProfile);
  const [planSnapshot, setPlanSnapshot] = useState(initialPlanSnapshot);
  const [fatalIntegrityError, setFatalIntegrityError] = useState(false);

  const projection = useMemo(() => {
    if (!planSnapshot || !profile) {
      return null;
    }

    return buildDashboardProjection(planSnapshot, profile);
  }, [planSnapshot, profile]);

  const isDashboardReady = Boolean(projection && hasPopulatedDashboard(projection));

  const handleFieldChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      return {
        ...previous,
        [field]: undefined,
      };
    });
  };

  const focusFirstInvalidField = (fieldErrors) => {
    if (fieldErrors.age) {
      ageRef.current?.focus();
      return;
    }

    if (fieldErrors.gender) {
      genderRef.current?.focus();
    }
  };

  const canSubmit = form.age.toString().trim().length > 0 && (form.gender === 'female' || form.gender === 'male') && !isSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmissionError('');

    const validation = validateSelfProfileInput(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      focusFirstInvalidField(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    const normalized = normalizeSelfProfileInput(form);
    const profileData = {
      profileId: 'self',
      name: 'You',
      age: normalized.age,
      gender: normalized.gender,
      createdAt: new Date().toISOString(),
      onboardingCompletedAt: new Date().toISOString(),
    };

    try {
      const generatedPlan = await planGenerator(profileData);
      const generatedProjection = buildDashboardProjection(generatedPlan, profileData);

      if (!hasPopulatedDashboard(generatedProjection)) {
        setFatalIntegrityError(true);
        return;
      }

      setProfile(profileData);
      setPlanSnapshot(generatedPlan);
    } catch {
      setSubmissionError("We couldn't create your plan right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetToOnboarding = () => {
    setFatalIntegrityError(false);
    setPlanSnapshot(null);
    setProfile(null);
  };

  const openHealthPlan = () => {
    if (typeof onOpenHealthPlan !== 'function' || !planSnapshot || !profile) return;
    onOpenHealthPlan({ planSnapshot, profile });
  };

  const openHealthPlanFromDashboardItem = (item) => {
    if (typeof onOpenHealthPlan !== 'function' || !planSnapshot || !profile || !item?.catalogItemId) return;
    onOpenHealthPlan({
      planSnapshot,
      profile,
      initialItemKey: item.catalogItemId,
      initialOrigin: 'dashboard',
      initialCategory: item.category,
    });
  };

  if (fatalIntegrityError) {
    return (
      <AppShell title="Let's set up your first plan">
        <div className="sl001-blocking-error" role="alert">
          <h2>We couldn't load your dashboard.</h2>
          <p>Please return to onboarding and try again.</p>
          <button type="button" className="sl001-primary-action" onClick={resetToOnboarding}>
            Return to onboarding
          </button>
        </div>
      </AppShell>
    );
  }

  if (isDashboardReady && projection) {
    const dueTodayCount = projection.sections.find((section) => section.priority === 'today')?.items.length ?? 0;
    let dashboardHeaderAction;
    if (typeof onOpenHealthPlan === 'function') {
      dashboardHeaderAction = (
        <button type="button" className="sl001-primary-action sl001-dashboard-plan-cta" onClick={openHealthPlan}>
          Browse full plan
        </button>
      );
    }

    return (
      <AppShell title="Your preventive dashboard" headerAction={dashboardHeaderAction}>
        <div className="sl001-dashboard-summary-cards">
          <FamilyProfileCard
            name={projection.profileName}
            age={projection.profileAge}
            gender={projection.profileGender}
            dueCount={dueTodayCount}
          />
          <HealthScoreCard score={projection.healthScore} />
          <NextRecommendedStepCard highlightedItem={projection.highlightedItem} />
        </div>
        <div className="sl001-dashboard-sections">
          {projection.sections.map((section) => (
            <PrioritySection
              key={section.priority}
              priority={section.priority}
              title={section.title}
              items={section.items}
              onOpenDetail={typeof onOpenHealthPlan === 'function' ? openHealthPlanFromDashboardItem : undefined}
            />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Build your first preventive plan">
      <p className="sl001-support-copy">
        Share your age and gender so we can create a personalized plan with clear next steps.
      </p>
      <form className="sl001-form" onSubmit={handleSubmit} noValidate>
        {submiss
[truncated]
```
## src/features/self-onboarding-to-first-dashboard/catalog.js
```text
export const MVP_CATALOG_VERSION = 'sl001-mvp-v1';

export const MVP_PREVENTIVE_CATALOG = Object.freeze([
  {
    itemId: 'annual-wellness-visit',
    name: 'Annual wellness visit',
    category: 'checkup',
    cadenceLabel: 'Every year',
    whyItMatters: 'Regular checkups help catch changes early and keep your prevention plan current.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 1 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'blood-pressure-check',
    name: 'Blood pressure check',
    category: 'checkup',
    cadenceLabel: 'At least every year',
    whyItMatters: 'Blood pressure checks can identify heart risk factors before symptoms appear.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 2 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'cholesterol-screening',
    name: 'Cholesterol screening',
    category: 'checkup',
    cadenceLabel: 'Every 4 to 6 years',
    whyItMatters: 'This screening helps track cardiovascular risk and guide timely prevention.',
    ruleBands: [
      { gender: 'female', minAge: 20, maxAge: 120, targetAge: 20, dashboardBucket: 'soon', priorityOrder: 1 },
      { gender: 'male', minAge: 20, maxAge: 120, targetAge: 20, dashboardBucket: 'soon', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'diabetes-screening',
    name: 'Diabetes screening',
    category: 'checkup',
    cadenceLabel: 'Every 3 years',
    whyItMatters: 'Screening can catch blood sugar changes early and support prevention decisions.',
    ruleBands: [
      { gender: 'female', minAge: 35, maxAge: 120, targetAge: 35, dashboardBucket: 'soon', priorityOrder: 2 },
      { gender: 'male', minAge: 35, maxAge: 120, targetAge: 35, dashboardBucket: 'soon', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'cervical-cancer-screening',
    name: 'Cervical cancer screening',
    category: 'checkup',
    cadenceLabel: 'Every 3 to 5 years',
    whyItMatters: 'Routine screening can detect cell changes early and support effective follow-up.',
    ruleBands: [
      { gender: 'female', minAge: 25, maxAge: 65, targetAge: 25, dashboardBucket: 'later', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'prostate-health-discussion',
    name: 'Prostate health discussion',
    category: 'checkup',
    cadenceLabel: 'Discuss around age 50',
    whyItMatters: 'A timely discussion helps you decide with your clinician which screening path fits you.',
    ruleBands: [
      { gender: 'male', minAge: 45, maxAge: 120, targetAge: 50, dashboardBucket: 'later', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'influenza-vaccine',
    name: 'Flu vaccine',
    category: 'vaccination',
    cadenceLabel: 'Every year',
    whyItMatters: 'Yearly vaccination lowers the risk of severe seasonal illness.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 3 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 3 },
    ],
  },
  {
    itemId: 'tdap-booster',
    name: 'Tetanus, diphtheria, and pertussis booster',
    category: 'vaccination',
    cadenceLabel: 'Every 10 years',
    whyItMatters: 'Boosters help maintain protection against serious bacterial infections.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'later', priorityOrder: 2 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'later', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'shingles-vaccine',
    name: 'Shingles vaccine',
    category: 'vaccination',
    cadenceLabel: '2-dose series after age 50',
    whyItMatters: 'Vaccination reduces the chance of shingles and long-lasting nerve pain.',
    ruleBands: [
      { gender: 'female', minAge: 50, maxAge: 120, targetAge: 50, dashboardBucket: 'soon', priorityOrder: 3 },
      { gender: 'male', minAge: 50, maxAge: 120, targetAge: 50, dashboardBucket: 'soon', priorityOrder: 3 },
    ],
  },
]);
```
## src/features/self-onboarding-to-first-dashboard/components.jsx
```text
import React from 'react';

const STATUS_CLASS_MAP = {
  done: 'status-done',
  due: 'status-due',
  soon: 'status-soon',
  planned: 'status-planned',
  overdue: 'status-overdue',
};

const PRIORITY_CLASS_MAP = {
  today: 'priority-today',
  soon: 'priority-soon',
  later: 'priority-later',
};

export function AppShell({ title, headerAction = null, children }) {
  return (
    <main className="app-shell">
      <section className="app-panel sl001-shell">
        <header className="sl001-header">
          <p className="sl001-kicker">Longevity Health OS</p>
          <div className="sl001-header-row">
            <h1>{title}</h1>
            {headerAction ? (
              <div className="sl001-header-action">{headerAction}</div>
            ) : null}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

export function StatusPill({ status, label }) {
  const className = STATUS_CLASS_MAP[status] ?? 'status-planned';

  return (
    <span className={`sl001-status-pill ${className}`} aria-label={`Status: ${label}`}>
      {label}
    </span>
  );
}

export function HealthPlanItem({ item, onOpenDetail }) {
  const body = (
    <>
      <div className="sl001-plan-topline">
        <h3>{item.name}</h3>
        <StatusPill status={item.status} label={item.statusLabel} />
      </div>
      <p className="sl001-plan-meta">{item.categoryLabel} - {item.cadenceLabel}</p>
      <p className="sl001-plan-why">{item.whyItMatters}</p>
      {item.category === 'vaccination' ? (
        <VaccinationStatusRow
          vaccine={item.name}
          status={item.status}
          statusLabel={item.statusLabel}
          lastDate={null}
        />
      ) : null}
    </>
  );

  if (typeof onOpenDetail !== 'function') {
    return (
      <article className="sl001-plan-item">
        {body}
      </article>
    );
  }

  return (
    <article className="sl001-plan-item">
      <button
        type="button"
        className="sl001-plan-item-button"
        aria-label={`Open details for ${item.name}`}
        onClick={() => onOpenDetail(item)}
      >
        {body}
      </button>
    </article>
  );
}

export function PrioritySection({ priority, title, items, onOpenDetail }) {
  const sectionClass = PRIORITY_CLASS_MAP[priority] ?? 'priority-later';

  return (
    <section className={`sl001-priority-section ${sectionClass}`} aria-labelledby={`priority-${priority}`}>
      <h2 id={`priority-${priority}`}>{title}</h2>
      {items.length === 0 ? (
        <p className="sl001-empty">No items in this section right now.</p>
      ) : (
        <div className="sl001-priority-list">
          {items.map((item) => (
            <HealthPlanItem item={item} key={item.catalogItemId} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HealthScoreCard({ score }) {
  const scoreText = Number.isFinite(score) ? `${score}%` : '0%';

  return (
    <section className="sl001-score-card sl001-summary-card" aria-label="Health summary">
      <p className="sl001-label">Health Score</p>
      <h2 className="sl001-summary-title">{scoreText}</h2>
      <p className="sl001-summary-meta">
        Use this score to track your progress as you complete today&apos;s and upcoming preventive care.
      </p>
    </section>
  );
}

export function NextRecommendedStepCard({ highlightedItem }) {
  return (
    <section className="sl001-next-step-card sl001-summary-card" aria-label="Next recommended step">
      <p className="sl001-label">Next recommended step</p>
      <h2 className="sl001-summary-title">{highlightedItem?.name ?? 'No next step available'}</h2>
      <p className="sl001-summary-meta">
        {highlightedItem ? `${highlightedItem.categoryLabel} - ${highlightedItem.cadenceLabel}` : 'You are all set for now. Check back soon for your next recommended item.'}
      </p>
    </section>
  );
}

function formatProfileDescriptor({ age, gender }) {
  const parts = [];
  if (Number.isFinite(Number(age))) {
    parts.push(`Age ${Number(age)}`);
  }
  const normalizedGender = String(gender || '').trim().toLowerCase();
  if (normalizedGender) {
    parts.push(normalizedGender[0].toUpperCase() + normalizedGender.slice(1));
  }
  return parts.join(' - ');
}

export function FamilyProfileCard({ name, age, gender, dueCount }) {
  const descriptor = formatProfileDescriptor({ age, gender });
  return (
    <section className="sl001-profile-card sl001-summary-card" aria-label="Profile summary">
      <p className="sl001-label">Profile</p>
      <h2 className="sl001-summary-title">{name}</h2>
      {descriptor ? <p className="sl001-summary-meta">{descriptor}</p> : null}
      <p className="sl001-summary-meta">{dueCount} due today</p>
    </section>
  );
}

export function VaccinationStatusRow({ vaccine, status, statusLabel, lastDate }) {
  const safeStatusLabel = statusLabel || status || 'Planned';
  const normalizedLastDate = typeof lastDate === 'string' ? lastDate.trim() : '';
  let statusContext = 'Review this item';

  if (normalizedLastDate) {
    statusContext = `Last dose: ${normalizedLastDate}`;
  } else if (status === 'done') {
    statusContext = 'Marked as done';
  } else if (status === 'planned') {
    statusContext = 'Reminder set';
  } else if (status === 'due' || status === 'overdue') {
    statusContext = 'Action needed';
  } else if (status === 'soon') {
    statusContext = 'Coming up';
  }

  return (
    <div className="sl001-vaccine-row" aria-label={`${vaccine} status`}>
      <span>{vaccine}</span>
      <span>
        <span className="sl001-vaccine-date">
          {safeStatusLabel} - {statusContext}
        </span>
      </span>
    </div>
  );
}
```
## src/features/self-onboarding-to-first-dashboard/dashboard.js
```text
const BUCKET_ORDER = ['today', 'soon', 'later'];

const BUCKET_LABELS = {
  today: 'Today',
  soon: 'Soon',
  later: 'Later',
};

const CATEGORY_LABELS = {
  checkup: 'Checkup',
  vaccination: 'Vaccination',
};

const STATUS_LABELS = {
  done: 'Done',
  due: 'Due now',
  soon: 'Coming up',
  planned: 'Planned',
  overdue: 'Overdue',
};

const HEALTH_SCORE_BUCKET_WEIGHTS = {
  today: 50,
  soon: 30,
  later: 20,
};

function sortWithinBucket(a, b) {
  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
}

function mapDisplayItem(item) {
  return {
    ...item,
    categoryLabel: CATEGORY_LABELS[item.category] ?? 'Preventive item',
    statusLabel: STATUS_LABELS[item.status] ?? 'Planned',
  };
}

export function groupItemsByPriority(items) {
  const buckets = {
    today: [],
    soon: [],
    later: [],
  };

  for (const item of items) {
    if (!buckets[item.dashboardBucket]) {
      continue;
    }

    buckets[item.dashboardBucket].push(mapDisplayItem(item));
  }

  for (const bucket of BUCKET_ORDER) {
    buckets[bucket].sort(sortWithinBucket);
  }

  return buckets;
}

export function selectHighlightedItem(bucketed) {
  if (bucketed.today.length > 0) {
    return bucketed.today[0];
  }

  if (bucketed.soon.length > 0) {
    return bucketed.soon[0];
  }

  if (bucketed.later.length > 0) {
    return bucketed.later[0];
  }

  return null;
}

export function calculateHealthScore(items) {
  const totalWeight = items.reduce((sum, item) => (
    sum + (HEALTH_SCORE_BUCKET_WEIGHTS[item.dashboardBucket] ?? 0)
  ), 0);

  if (totalWeight === 0) {
    return 0;
  }

  const creditedWeight = items.reduce((sum, item) => {
    const bucketWeight = HEALTH_SCORE_BUCKET_WEIGHTS[item.dashboardBucket] ?? 0;
    const itemValue = item.status === 'due' || item.status === 'overdue' ? 0 : bucketWeight;
    return sum + itemValue;
  }, 0);

  return Math.round((creditedWeight / totalWeight) * 100);
}

export function buildDashboardProjection(planSnapshot, profile) {
  const items = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];
  const bucketed = groupItemsByPriority(items);
  const highlightedItem = selectHighlightedItem(bucketed);
  const healthScore = calculateHealthScore(items);
  const profileName = profile?.name?.trim() || 'You';
  const profileAge = Number.isFinite(Number(profile?.age)) ? Number(profile.age) : null;
  const profileGender = String(profile?.gender || '').trim().toLowerCase();

  return {
    profileName,
    profileAge,
    profileGender,
    healthScore,
    highlightedItem,
    sections: BUCKET_ORDER.map((priority) => ({
      priority,
      title: BUCKET_LABELS[priority],
      items: bucketed[priority],
    })),
  };
}

export function hasPopulatedDashboard(projection) {
  const sectionItemCount = projection.sections.reduce((sum, section) => sum + section.items.length, 0);
  return sectionItemCount > 0 && Boolean(projection.highlightedItem);
}

export const dashboardLabels = {
  BUCKET_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
};
```
## src/features/self-onboarding-to-first-dashboard/index.js
```text
export { default as SelfOnboardingToFirstDashboard } from './SelfOnboardingToFirstDashboard';
export { MVP_CATALOG_VERSION, MVP_PREVENTIVE_CATALOG } from './catalog';
export { buildDashboardProjection, calculateHealthScore, groupItemsByPriority, hasPopulatedDashboard, selectHighlightedItem } from './dashboard';
export { generateInitialPlanSnapshot, generateInitialPlanSnapshotAsync } from './plan';
export { normalizeSelfProfileInput, validateSelfProfileInput, validationMessages } from './validation';
```
## src/features/self-onboarding-to-first-dashboard/plan.js
```text
import { MVP_CATALOG_VERSION, MVP_PREVENTIVE_CATALOG } from './catalog.js';

const ALLOWED_CATEGORIES = new Set(['checkup', 'vaccination']);

function findMatchingRuleBand(ruleBands, profile) {
  return ruleBands.find((band) => (
    band.gender === profile.gender
    && profile.age >= band.minAge
    && profile.age <= band.maxAge
  ));
}

function comparePlanItems(a, b) {
  if (a.dashboardBucket !== b.dashboardBucket) {
    const bucketOrder = { today: 0, soon: 1, later: 2 };
    return bucketOrder[a.dashboardBucket] - bucketOrder[b.dashboardBucket];
  }

  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
}

export function generateInitialPlanSnapshot(profile, options = {}) {
  const nowIso = (options.now ?? new Date()).toISOString();
  const catalog = options.catalog ?? MVP_PREVENTIVE_CATALOG;
  const catalogVersion = options.catalogVersion ?? MVP_CATALOG_VERSION;

  const items = [];

  for (const catalogItem of catalog) {
    const matchedBand = findMatchingRuleBand(catalogItem.ruleBands, profile);

    if (!matchedBand) {
      continue;
    }

    if (!ALLOWED_CATEGORIES.has(catalogItem.category)) {
      throw new Error(`Unsupported category in catalog: ${catalogItem.category}`);
    }

    items.push({
      catalogItemId: catalogItem.itemId,
      name: catalogItem.name,
      category: catalogItem.category,
      cadenceLabel: catalogItem.cadenceLabel,
      whyItMatters: catalogItem.whyItMatters,
      dashboardBucket: matchedBand.dashboardBucket,
      targetAge: matchedBand.targetAge,
      priorityOrder: matchedBand.priorityOrder,
      status: matchedBand.dashboardBucket === 'today' ? 'due' : 'planned',
    });
  }

  items.sort(comparePlanItems);

  return {
    planId: `plan-${profile.profileId}`,
    profileId: profile.profileId,
    catalogVersion,
    generatedAt: nowIso,
    items,
  };
}

export async function generateInitialPlanSnapshotAsync(profile, options = {}) {
  const delayMs = options.delayMs ?? 250;
  const timeoutDelay = Math.max(0, Number(delayMs));

  await new Promise((resolve) => {
    setTimeout(resolve, timeoutDelay);
  });

  return generateInitialPlanSnapshot(profile, options);
}
```
## src/features/self-onboarding-to-first-dashboard/validation.js
```text
const AGE_REQUIRED = 'Age is required.';
const AGE_WHOLE_NUMBER = 'Enter a whole number.';
const AGE_RANGE = 'Enter an age from 0 to 120.';
const GENDER_REQUIRED = 'Select a gender to continue.';

export function validateSelfProfileInput(input) {
  const errors = {};
  const ageValue = (input?.age ?? '').toString().trim();
  const genderValue = input?.gender;

  if (!ageValue) {
    errors.age = AGE_REQUIRED;
  } else if (!/^\d+$/.test(ageValue)) {
    errors.age = AGE_WHOLE_NUMBER;
  } else {
    const age = Number(ageValue);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.age = AGE_RANGE;
    }
  }

  if (genderValue !== 'female' && genderValue !== 'male') {
    errors.gender = GENDER_REQUIRED;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeSelfProfileInput(input) {
  return {
    age: Number((input?.age ?? '').toString().trim()),
    gender: input?.gender,
  };
}

export const validationMessages = {
  AGE_REQUIRED,
  AGE_WHOLE_NUMBER,
  AGE_RANGE,
  GENDER_REQUIRED,
};
```
## src/main.jsx
```text
/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/main.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-05-05T10:38:08.640Z
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```
## src/routes/health-plan-browsing-and-item-detail.jsx
```text
import React from 'react';
import { HealthPlanBrowsingAndItemDetail } from '../features/health-plan-browsing-and-item-detail';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';
import '../features/health-plan-browsing-and-item-detail/health-plan-browsing-and-item-detail.css';

export default function HealthPlanBrowsingAndItemDetailRoute(props) {
  return <HealthPlanBrowsingAndItemDetail {...props} />;
}
```
## src/routes/item-completion-and-reminder-actions.jsx
```text
import React from 'react';
import { ItemCompletionAndReminderActions } from '../features/item-completion-and-reminder-actions';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';
import '../features/health-plan-browsing-and-item-detail/health-plan-browsing-and-item-detail.css';
import '../features/item-completion-and-reminder-actions/item-completion-and-reminder-actions.css';

export default function ItemCompletionAndReminderActionsRoute(props) {
  return <ItemCompletionAndReminderActions {...props} />;
}
```
## src/routes/self-onboarding-to-first-dashboard.jsx
```text
import React from 'react';
import { SelfOnboardingToFirstDashboard } from '../features/self-onboarding-to-first-dashboard';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';

export default function SelfOnboardingToFirstDashboardRoute(props) {
  return <SelfOnboardingToFirstDashboard {...props} />;
}
```
## src/stories/slices/SL-001/SL-001.stories.tsx
```text
import React from 'react';
import { storybookContract } from './fixtures';
import RouteSurface1 from '../../../routes/self-onboarding-to-first-dashboard.jsx';
import { AppShell as ComponentSurface2 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { HealthScoreCard as ComponentSurface3 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { PrioritySection as ComponentSurface4 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { HealthPlanItem as ComponentSurface5 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { StatusPill as ComponentSurface6 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { FamilyProfileCard as ComponentSurface7 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { VaccinationStatusRow as ComponentSurface8 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';

const meta = {
  title: 'Slices/SL-001',
  parameters: {
    layout: 'centered',
    fabric: storybookContract,
  },
};

export default meta;

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <section className="app-panel">{children}</section>
    </main>
  );
}

function ContractSurface({ title, type }: { title: string; type: 'component' | 'screen' }) {
  return (
    <StoryFrame>
      <p className="kicker">{type} contract story</p>
      <h1>{title}</h1>
      <p className="subtle">{storybookContract.slice_title}</p>
      <section>
        <strong>Required states</strong>
        <ul>{storybookContract.required_states.map((state) => <li key={state}>{state}</li>)}</ul>
      </section>
      <section>
        <strong>Semantic statuses</strong>
        <ul>{storybookContract.required_statuses.map((status) => <li key={status}>{status}</li>)}</ul>
      </section>
      <section>
        <strong>Priority groups</strong>
        <ul>{storybookContract.required_priorities.map((priority) => <li key={priority}>{priority}</li>)}</ul>
      </section>
    </StoryFrame>
  );
}

function ComponentFallback({ component }: { component: string }) {
  const token = component.toLowerCase();
  if (token.includes('status')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <div>
          <span className="status-pill status-pill-due">Due</span>{' '}
          <span className="status-pill status-pill-soon">Upcoming</span>
        </div>
      </StoryFrame>
    );
  }
  if (token.includes('item')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <article className="health-plan-item">
          <button type="button" className="health-plan-item-button">
            <div>
              <h4>Annual blood panel</h4>
              <p className="subtle">Due in 1 month</p>
            </div>
            <span className="status-pill status-pill-due">Due</span>
          </button>
        </article>
      </StoryFrame>
    );
  }
  if (token.includes('section')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="priority-section priority-today">
          <h3>Today</h3>
        </section>
        <section className="priority-section priority-soon">
          <h3>Soon</h3>
        </section>
        <section className="priority-section priority-later">
          <h3>Later</h3>
        </section>
      </StoryFrame>
    );
  }
  if (token.includes('score')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="health-score-card">
          <p className="kicker">Health Score</p>
          <p className="health-score-value">78</p>
          <p className="subtle">4 due now, 2 due soon.</p>
        </section>
      </StoryFrame>
    );
  }
  if (token.includes('profile')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="family-profile-card">
          <p className="kicker">Active profile</p>
          <h2>Alex, age 42</h2>
          <p className="subtle">3 actions need attention soon.</p>
        </section>
      </StoryFrame>
    );
  }
  return <ContractSurface title={component} type="component" />;
}

export const AppShellVisual = {
  render: () => <ComponentSurface2 />,
  name: 'Product/AppShell',
};

export const HealthScoreCardVisual = {
  render: () => <ComponentSurface3 />,
  name: 'Product/HealthScoreCard',
};

export const PrioritySectionVisual = {
  render: () => <ComponentSurface4 />,
  name: 'Product/PrioritySection',
};

export const HealthPlanItemVisual = {
  render: () => <ComponentSurface5 />,
  name: 'Product/HealthPlanItem',
};

export const StatusPillVisual = {
  render: () => <ComponentSurface6 />,
  name: 'Product/StatusPill',
};

export const FamilyProfileCardVisual = {
  render: () => <ComponentSurface7 />,
  name: 'Product/FamilyProfileCard',
};

export const VaccinationStatusRowVisual = {
  render: () => <ComponentSurface8 />,
  name: 'Product/VaccinationStatusRow',
};

export const OnboardingVisual = {
  render: () => <RouteSurface1 />,
  name: 'Screens/onboarding',
};
```
## src/stories/slices/SL-001/fixtures.ts
```text
export const storybookContract = {
  "slice_id": "SL-001",
  "slice_title": "Self Onboarding to First Dashboard",
  "required_components": [
    "AppShell",
    "HealthScoreCard",
    "PrioritySection",
    "HealthPlanItem",
    "StatusPill",
    "FamilyProfileCard",
    "VaccinationStatusRow"
  ],
  "required_screens": [
    "onboarding"
  ],
  "required_states": [
    "default",
    "loading",
    "empty",
    "error",
    "success"
  ],
  "required_statuses": [
    "done",
    "due",
    "soon",
    "planned",
    "overdue"
  ],
  "required_priorities": [
    "today",
    "soon",
    "later"
  ]
} as const;
```
## src/stories/slices/SL-002/SL-002.stories.tsx
```text
import React from 'react';
import { storybookContract } from './fixtures';
import RouteSurface1 from '../../../routes/health-plan-browsing-and-item-detail.jsx';
import { generateInitialPlanSnapshot as PlanFactory2 } from '../../../features/self-onboarding-to-first-dashboard/plan.js';
import { AppShell as ComponentSurface3 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { HealthPlanItem as ComponentSurface4 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { StatusPill as ComponentSurface5 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';

const storyPlanSnapshot1 = PlanFactory2({ profileId: 'storybook-self', age: 52, gender: 'female' });


const meta = {
  title: 'Slices/SL-002',
  parameters: {
    layout: 'centered',
    fabric: storybookContract,
  },
};

export default meta;

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <section className="app-panel">{children}</section>
    </main>
  );
}

function ContractSurface({ title, type }: { title: string; type: 'component' | 'screen' }) {
  return (
    <StoryFrame>
      <p className="kicker">{type} contract story</p>
      <h1>{title}</h1>
      <p className="subtle">{storybookContract.slice_title}</p>
      <section>
        <strong>Required states</strong>
        <ul>{storybookContract.required_states.map((state) => <li key={state}>{state}</li>)}</ul>
      </section>
      <section>
        <strong>Semantic statuses</strong>
        <ul>{storybookContract.required_statuses.map((status) => <li key={status}>{status}</li
[truncated]
```

Review rules:
- Mark fail for user-visible copy that exposes internal implementation, workflow, schema, routing, slice, testing, ranking, or process language.
- Mark fail for malformed user-visible dates, raw enum values, undefined/null/NaN, Invalid Date, [object Object], or raw calculation output.
- Mark fail when user-facing copy only satisfies structure but not the semantic purpose in the contract.
- Mark fail when required visible content is generic filler or not meaningful to an end user.
- Mark pass only if the implemented UI appears semantically fit for the active slice based on available source context.
```
