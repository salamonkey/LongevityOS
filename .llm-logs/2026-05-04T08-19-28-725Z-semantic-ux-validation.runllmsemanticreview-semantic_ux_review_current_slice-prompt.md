# LLM Prompt Log

- task: semantic_ux_review_current_slice
- caller: semantic-ux-validation.runLlmSemanticReview
- provider: openai
- model: gpt-5.4
- started_utc: 2026-05-04T08:19:28.725Z
- prompt_chars: 101638
- prompt_estimated_tokens: 25410
- prompt_sources:
  - docs/product/current-slice.yaml
  - docs/ux/SL-004B-semantic-ux-contract.json
  - docs/ux/SL-004B-current-slice-flow.md
  - docs/product/project-brief.md
  - docs/product/product-system-framing.md
  - src/App.jsx
  - src/features/design-system-component-foundation/components/AppShell.jsx
  - src/features/design-system-component-foundation/components/HealthPlanItem.jsx
  - src/features/design-system-component-foundation/components/HealthScoreCard.jsx
  - src/features/design-system-component-foundation/components/PrioritySection.jsx
  - src/features/design-system-component-foundation/components/ReminderSelector.jsx
  - src/features/design-system-component-foundation/components/StatusPill.jsx
  - src/features/design-system-component-foundation/components/index.js
  - src/features/design-system-component-foundation/semanticPresentation.js
  - src/features/first-profile-onboarding-to-generated-dashboard/SliceEntryBridge.jsx
  - src/features/full-health-plan-view/FullHealthPlanViewPage.jsx
  - src/features/full-health-plan-view/fullHealthPlanModel.js
  - src/features/health-item-detail-and-completion/HealthItemDetailAndCompletionPage.jsx
  - src/features/health-item-detail-and-completion/healthItemsModel.js
  - src/features/onboarding/OnboardingPage.jsx
  - src/features/profile/ProfileForm.jsx
  - src/features/profile/profilePlan.js
  - src/features/reminder-scheduling-from-health-items/ReminderSchedulingDashboardDetailPage.jsx
  - src/features/reminder-scheduling-from-health-items/ReminderSchedulingFullHealthPlanPage.jsx
  - src/features/reminder-scheduling-from-health-items/reminderSchedulingModel.js
  - src/main.jsx
  - src/routes/design-system-component-foundation.jsx
  - src/routes/first-profile-onboarding-to-generated-dashboard.jsx

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
  "id": "SL-004B",
  "title": "Design System Component Foundation",
  "objective": "Materialize the approved design-system contract into reusable UI components and migrate existing MVP screens to use them before continuing with family profile management.",
  "in_scope": [
    "Create reusable UI component primitives from docs/design-system/components.json, including StatusPill, HealthPlanItem, PrioritySection, HealthScoreCard, and ReminderSelector where applicable.",
    "Create semantic status and priority helpers from docs/design-system/tokens.json so status and priority styling is not hardcoded per screen.",
    "Migrate existing onboarding, dashboard, health plan, detail, and reminder UI paths to use approved design-system components where those patterns exist.",
    "Preserve all completed SL-001 through SL-004 behavior while reducing ad-hoc UI duplication.",
    "Add lightweight verification that the approved components are present and used by relevant screens."
  ],
  "out_of_scope": [
    "No new product features beyond UI component foundation and migration.",
    "No redesign of product scope, navigation model, or MVP slice plan.",
    "No external notification integrations, provider integrations, external APIs, real AI, or complex analytics.",
    "No expansion of family profile or vaccination functionality; those remain in later slices."
  ],
  "acceptance_criteria": [
    "Reusable source components exist for the core design-system components required by completed slices: StatusPill, HealthPlanItem, PrioritySection, HealthScoreCard, and ReminderSelector, or documented equivalents when the implementation architecture uses different names.",
    "Dashboard, full health plan, item detail, and reminder scheduling screens use the approved component layer instead of duplicating ad-hoc status, card, priority-section, or reminder-selector UI patterns.",
    "Status and priority display values are driven by semantic helpers or tokens rather than raw colors, raw enum labels, or screen-specific string mappings.",
    "Existing SL-001 through SL-004 regression paths still pass after the migration.",
    "A design-system usage audit shows no newly introduced raw hex/rgb/hsl colors or inline visual styles in migrated user-facing UI paths unless explicitly justified in implementation notes."
  ]
}
```

Semantic UX contract:
```json
{
  "schema_version": 1,
  "generated_at_utc": "2026-05-04T07:42:11.944Z",
  "slice_id": "SL-004B",
  "slice_title": "Design System Component Foundation",
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
    "Reusable source components exist for the core design-system components required by completed slices: StatusPill, HealthPlanItem, PrioritySection, HealthScoreCard, and ReminderSelector, or documented equivalents when the implementation architecture uses different names.",
    "Dashboard, full health plan, item detail, and reminder scheduling screens use the approved component layer instead of duplicating ad-hoc status, card, priority-section, or reminder-selector UI patterns.",
    "Status and priority display values are driven by semantic helpers or tokens rather than raw colors, raw enum labels, or screen-specific string mappings.",
    "Existing SL-001 through SL-004 regression paths still pass after the migration.",
    "A design-system usage audit shows no newly introduced raw hex/rgb/hsl colors or inline visual styles in migrated user-facing UI paths unless explicitly justified in implementation notes."
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
<!-- generated_at: 2026-05-04T07:42:11.944Z -->
# UX Flow - Current Slice

Date: `2026-05-04`
Status: `Ready for implementation`
Scope: `SL-004B Design System Component Foundation`

## 1. Context

SL-004B defines the current-slice UX playbook for migrating completed MVP screens to the approved design-system component layer without changing product scope, routes, domain meaning, or user tasks. The user-visible goal is continuity: existing onboarding, dashboard, health plan, detail, and reminder paths must feel more consistent and easier to scan while behaving exactly as in SL-001 through SL-004. This slice covers only shared component use, semantic status/priority presentation, and reminder selector migration where that pattern already exists.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User reaches an already-supported MVP path: onboarding completion lands on the dashboard, or an existing user opens a profile dashboard and continues into item detail, reminder scheduling, and full health plan review.
- Expected behavior:
  - Dashboard top area shows the existing read-only health score through the shared HealthScoreCard pattern, with no new explanation, calculation, or action added.
  - Dashboard priority groups render only through PrioritySection, using the approved horizon labels and order already used by the product so users can scan Today, Soon, and Later consistently.
  - Each health item shown in a dashboard priority group renders through HealthPlanItem, which consistently exposes the item title, recommendation or frequency text, current status, optional reminder summary, and the existing tap target to open detail.
  - Any status shown on dashboard, full plan, or item detail renders through StatusPill and resolves its visible label and tone from the semantic status helper, so the same item status reads the same in every screen location.
  - When the user opens an item, the detail screen preserves the existing information hierarchy: action first, why it matters, status context, and existing actions such as mark done and set reminder, while replacing any ad-hoc status presentation with the shared component layer.
  - When the user chooses Set reminder, the reminder UI uses ReminderSelector with the existing three choices only: 1 month, 3 months, or custom date; selecting a preset makes that choice immediately clear before save.
  - If the user selects Custom date, the date input appears within ReminderSelector, keeping the selection context visible and preserving the existing save destination and post-save return behavior.
  - After a reminder is saved, the user returns through the same existing path and sees the updated reminder summary reflected in HealthPlanItem and related detail status context without any navigation change or new confirmation flow added by this slice.

### Flow B - Failure and Recovery Paths

- ReminderSelector recovery path: if the user chooses Custom date and the date field is empty, malformed, or outside the existing accepted input rules, the component shows inline validation adjacent to the date control, keeps the current selection visible, and prevents save until a valid date is entered; once corrected,.
- Migration safety path: if a migrated screen has no applicable design-system component for a pattern not covered by this slice, the screen keeps its current layout and behavior rather than inventing a new local variant of StatusPill, HealthPlanItem, PrioritySection, HealthScoreCard, or ReminderSelector.
- Consistency recovery path: if the same domain status or priority value appears on multiple screens, those screens must resolve to the same visible label and visual tone through the semantic helper; any mismatch is treated as a regression and corrected in the shared helper rather than patched per screen.

## 3. Interaction and Validation Rules

- Status presentation is semantic, not screen-owned: screens pass the current domain status value, and StatusPill plus the semantic helper determine the final label and visual treatment.
- Priority presentation is semantic, not screen-owned: dashboard groups use the approved time-horizon model and render through PrioritySection; screens do not define local priority copy, local color mapping, or alternate group styling.
- HealthPlanItem is the default summary pattern wherever a health item appears in dashboard groups or the full health plan list; repeated ad-hoc cards or rows for the same information are not allowed in migrated paths.
- HealthScoreCard is read-only in this slice and may display only existing score data already available to the screen; it must not introduce scoring controls, scoring explanations, or implied health guidance beyond the current product evidence.
- ReminderSelector must present exactly the existing reminder options evidenced in MVP: 1 month, 3 months, and custom date.
- When Custom date is selected, save remains unavailable or blocked until the date input is valid, and the validation message must explain what needs correction in plain language rather than technical terms.
- The same health item must show the same status label on dashboard, detail, and full plan for the same underlying state, including after mark-done and reminder updates.
- User-facing copy must use calm, product-facing terms such as Due, Planned, Done, Today, Soon, Later, and reminder timing labels; internal implementation labels, token names, or variant names must never be exposed to users users usersusersusersusersusersusersusersusersusersusersusersusersusersusersusersusersusersusersии

## 4. Implementation Constraints

- No new product capabilities may be introduced; this slice changes presentation ownership only.
- No route changes, action changes, or navigation model changes are allowed in migrated flows.
- No change to the approved domain model, status model, priority-horizon model, or reminder feature scope is allowed.
- Shared components in this slice are presentation components only; they do not fetch data, own persistence, or introduce new business rules beyond local reminder input handling.
- Migrated user-facing paths may not add raw hex, rgb, or hsl colors, or inline visual style objects, when approved semantic tokens or shared components cover the pattern.
- Where an approved shared component exists, screen-local duplicates for status pills, priority group containers, health item summary cards, score cards, or reminder selectors are not allowed.
- If a screen needs composition around a shared component, it may add layout only; it may not bypass semantic helpers for status or priority meaning.
- This slice must preserve completed SL-001 through SL-004 regression behavior, including onboarding completion, dashboard scanning, item detail access, mark done, and reminder scheduling outcomes.

## 5. Acceptance Mapping

- A user can complete the existing dashboard-to-detail-to-reminder journey without encountering new steps, missing actions, or changed destinations, while all covered UI patterns are visibly rendered through the approved shared component layer.
- On dashboard and full health plan screens, health items appear in a consistent HealthPlanItem pattern, and dashboard horizons appear in a consistent PrioritySection pattern using the approved horizon order and labels.
- The same underlying health-item status displays the same user-facing label and visual tone on dashboard, full plan, and detail screens, demonstrating that status semantics come from the shared helper rather than per-screen mappings.
- Reminder scheduling still supports 1 month, 3 months, and custom date; choosing an invalid custom date produces inline validation and blocks save until corrected; after a valid save, the reminder state is visible when the user returns to the item context.
- The health score display remains read-only and visually consistent wherever the existing score pattern app
[truncated]
```

Project brief context:
```markdown
# Project Brief

Date: `2026-04-25`
Prepared by: `Product Manager`
Project: `Longevity Health OS (Health App MVP)`
Brief Approval Status: `approved`
## 1. Product Description

Preventive health navigation app that tells users what health action to take next, when to take it, and why it matters.

MVP centers on onboarding, generated health plan, prioritized dashboard, reminders, vaccination tracking, and family profile management.

Product operates as a guidance layer over user-entered data and is explicitly not a medical record.

## 2. Vision and Positioning

Position the product as a proactive health operating system focused on prevention, clarity, and execution.

Anchor the experience to the promise that users always know their next health step.

Present guidance as deterministic rule-based insight, not clinical advice and not AI.

## 3. Core Problem

Users do not know which preventive check-ups and actions are relevant to them.

Users miss health actions because reminders and priorities are fragmented.

Existing health tools store information but do not turn it into a clear next action.

## 4. Target Users

- Professionals aged 30–65 who want a fast view of relevant preventive actions.
- Parents who manage health tasks for multiple family members in one account.
- Health-conscious individuals who want structured follow-through on routine prevention.

## 5. MVP Objective

- Deliver a generated personal health plan and prioritized dashboard within 60 seconds of onboarding start.
- Turn age-and-gender onboarding input into clear preventive guidance with action, timing, and rationale.
- Enable users to track status, set reminders, and manage family preventive tasks from one account.

## 6. Core MVP Scope

### Onboarding and plan generation

- Capture age and gender for the first profile during onboarding.
- Offer a self-only or add-family choice during onboarding.
- Generate the initial health plan from deterministic age-and-gender rules at the end of onboarding, before the user lands on the prioritized dashboard.

### Dashboard and progress overview

- Show a prioritized dashboard grouped into Today, Soon, and Later.
- Display a read-only health score for the active profile as an at-a-glance indicator of how up to date the profile is.
- Let users open any prioritized item from the dashboard into detail view.

### Health plan and item detail

- List preventive health items with recommendation frequency and a unified status of Due, Planned, or Done.
- Show each item’s description, why it matters, and last-known status context on detail view.
- Let users mark a health item as Done from detail view.

### Reminders

- Let users set a reminder from a health item detail view.
- Offer reminder timings of 1 month, 3 months, or a custom date.
- Update the item and dashboard to reflect the saved reminder state.

### Vaccination tracking

- Show a per-profile vaccination list with status guidance.
- Allow users to add vaccination entries manually.
- Show the last vaccination date when an entry includes it.

### Family and settings

- Let a user create and switch between the primary profile and 1 additional family profile within one account.
- Show each profile’s health score and due-item summary in the family area.
- Provide a profile/settings area with two MVP functions only: view saved family profiles and turn reminder notifications on or off.

## 7. UX Principles and Tone

- Use clear, calm, trustworthy language across all core flows.
- Favor clarity over medical complexity in labels, explanations, and actions.
- Keep the experience mobile-first and focused on fast comprehension.
- Use lightly motivating microcopy that reinforces progress without pressure.

## 8. Primary User Journey

1. User starts onboarding and enters age and gender for the first profile.
2. User chooses self-only or adds family profiles under the same account.
3. System generates a personal health plan and lands the user on the dashboard.
4. User reviews Today, Soon, and Later priorities and opens an item for context.
5. User marks an item Done or sets a reminder with a preset or custom date.
6. User checks family profiles and vaccination status as needed from the same account.

## 9. Technical Direction

- Build a mobile-first responsive web app backed by 1 backend service and 1 primary database.
- Implement guidance with deterministic rule-based logic driven by profile inputs and item status.
- Keep MVP implementation modular, with clear separation between rules, application logic, and data access, and exclude external integrations from MVP.
- Use a unified domain model for profiles, health items, reminders, and vaccination entries.

## 10. Data and Privacy Constraints

- Collect only the minimum data needed for MVP guidance: age, gender, profile records, item status, reminder timing, and vaccination entries.
- Treat the product as a preventive navigator and not as a medical record repository.
- Encrypt stored profile and health-status data at rest and in transit, and restrict production access to named team accounts only.
- Use test data during development and testing.

## 11. Explicit Out of Scope (MVP)

- Doctor or provider integration.
- External API integrations.
- Real AI or AI-driven recommendations.
- Complex or advanced analytics.
- Insurance or ecosystem links.
- Automated vaccination import, verification, or document scanning.
- Medical record functionality or comprehensive clinical data storage.

## 12. Delivery Expectations

- Plan delivery within a 4–8 week MVP window.
- Sequence work as setup, core features, testing, and launch.
- Keep implementation limited to the evidenced MVP feature set and stated out-of-scope exclusions; do not add integrations or advanced analytics in MVP.
- Provide a clear costed scope before build starts.

## 13. Primary Success Criteria

- A new user reaches a generated health plan and prioritized dashboard within 60 seconds of tapping Start.
- 100% of completed onboardings with age and gender inputs produce a non-empty health plan.
- 100% of dashboard health items appear in exactly one priority group: Today, Soon, or Later.
- 100% of health item detail views show action, why it matters, and status context.
- A user can save a reminder with 1 month, 3 months, and custom date options for 100% of health items shown with a Reminder action.
- A user can add 1 additional family profile under one account and open both saved profiles’ overviews.
- A user can manually add a vaccination entry and see it in the vaccination list within the same session.
- Binary: the released MVP contains no provider integrations, no external APIs, no real AI, and no complex analytics.

## 14. Future Roadmap (Not MVP)

- AI-driven recommendations built on top of the rule-based foundation.
- Provider and doctor integrations.
- Advanced analytics and deeper progress reporting.
- Insurance and broader health ecosystem links.
- Expanded vaccination capabilities such as import or verification.

## 15. Source Basis

- `Health_App_Wireframes.pdf`
- `Longevity_Health_OS_MVP_HighEnd.pdf`
- `UX_Copy_Health_App.pdf`

```

Product framing context:
```markdown
# Product System Framing

## Product Essence

A preventive health navigation product that gives users a clear, prioritized view of what health action to take next, when to take it, and why it matters; it is explicitly not a medical record.

## Target Users

- Professionals aged 30–65
- Parents managing health for family members
- Health-conscious individuals

## Jobs To Be Done

- Understand which preventive health actions are relevant to me now and next
- Get a personal health plan quickly from minimal input
- Track whether health actions are due, planned, or completed
- Manage preventive health tasks for multiple family members in one account
- Track vaccination status through manual entry and guidance
- Set reminders so important health actions are not missed

## Core Concepts

- **Account** — The primary user container that can hold one or more managed profiles.
- **Profile** — An individual person for whom a health plan, status, reminders, vaccinations, and score are shown.
- **Onboarding Inputs** — The minimal initial personal data used to generate a first plan; explicitly evidenced as age and gender.
- **Personal Health Plan** — A rule-based checklist of preventive health items relevant to a profile.
- **Health Item** — A preventive action or check-up shown with recommendation frequency, current status, and supporting explanation.
- **Priority Horizon** — The time-based grouping used to organize health items into immediate and upcoming attention windows.
- **Dashboard** — The overview screen that surfaces a profile’s prioritized items and health progress at a glance.
- **Health Score** — A displayed indicator of how up to date a profile is, without a defined calculation method in current evidence.
- **Reminder** — A user-set prompt for a health item, with preset or custom timing.
- **Vaccination Tracker** — The vaccination area for viewing status guidance and manually adding vaccination entries.
- **Rule-based Guidance** — Deterministic health guidance derived from simple inputs and rules; not AI and not clinical decision-making.
- **Family Mode** — Multi-profile support within one account for planning and monitoring family health.

## Product Rules

- The product must remain framed as a preventive navigator, not as a medical record or data-storage system.
- The core promise is that users should always know their next health step.
- The MVP must deliver obvious user value immediately, with a personal plan generated from initial onboarding.
- Core onboarding inputs are age and gender.
- Guidance in MVP is rule-based only; smart guidance must not be framed as real AI.
- Health items must communicate the action, timing, and why it matters.
- Health items are status-driven and must use a unified status model across plan and detail experiences.
- Dashboard content must be prioritized by time horizon rather than presented as an undifferentiated list.
- Family support means multiple profiles can be managed within one account.
- Vaccination tracking in MVP is based on manual entry and status guidance.
- Reminder setting is a core product behavior and must support preset and custom timing choices.
- The product should use minimal sensitive data and maintain a high-trust, clarity-first experience.
- MVP scope excludes doctor or provider integration, external API integration, real AI, and complex analytics.
- Future-roadmap capabilities must not be implied as part of MVP scope.

## Primary Workflows

### Create initial personal plan

1. Start onboarding
2. Enter age and gender
3. Choose self-only or add family
4. Generate a profile-specific health plan
5. Land on the prioritized dashboard

### Review priorities from dashboard

1. Open dashboard overview
2. See health score and priority horizons
3. Identify the next relevant health item
4. Open an item for more context

### Act on a health item

1. Open health item detail
2. Read description, recommendation, and why it matters
3. Review current or last-known status context
4. Mark the item done or set a reminder

### Set a reminder

1. Start reminder from a health item
2. Choose 1 month, 3 months, or a custom date
3. Confirm reminder timing
4. Return to the item or dashboard with reminder state updated

### Manage family health

1. Open family area
2. View all profiles and per-person progress
3. Select a profile
4. Review that profile’s dashboard and plan

### Track vaccinations

1. Open vaccination tracker for a profile
2. Review vaccination list and status guidance
3. Add a vaccination entry manually
4. Return to updated vaccination status overview

### Adjust profile and preferences

1. Open profile/settings area
2. Review account, family, and preference options
3. Update relevant settings
4. Return to core navigation

## MVP Boundaries

### In Scope

- Onboarding with age and gender
- Immediate generation of a personal health plan
- Prioritized dashboard with time-horizon grouping
- Health item list and detail views
- Status-driven health action tracking
- Reminder setup with preset and custom timing
- Vaccination tracker with manual entry
- Family mode with multiple profiles in one account
- Profile/settings area
- Rule-based guidance presented as smart but non-AI insights

### Out of Scope

- Doctor or provider integration
- External API integrations
- Real AI or AI-driven recommendations
- Complex or advanced analytics
- Insurance or ecosystem links
- Automated vaccination imports, verification, or document scanning
- Any future-roadmap feature not explicitly evidenced for MVP

## Open Decisions

- Which single label set should define the priority horizons consistently across product surfaces
- How Health Score is calculated, updated, and explained to users
- How rule-based guidance is surfaced and whether it appears only within items or also as dashboard insights
- Where family management ownership lives across onboarding, family area, and profile/settings
- Which reminder delivery channels are included in MVP
- How deep the vaccination model goes beyond status, last date, and manual add entry
- What the complete data model is for health plan items beyond frequency, status, and simple history
- Which languages and geographic/medical guideline context the MVP supports
- Whether profile/settings includes only preferences or broader account-management capabilities
- Which product form factor is chosen for MVP, given source evidence leaves platform unresolved

```

Implementation source context to review:
## src/App.jsx
```text
import React, { useEffect, useState } from 'react';
import { OnboardingPage } from './features/onboarding/OnboardingPage.jsx';
import { createProfileSnapshot } from './features/profile/profilePlan.js';
import { GeneratedDashboardPage } from './routes/first-profile-onboarding-to-generated-dashboard.jsx';
import { FullHealthPlanViewRoute } from './routes/full-health-plan-view.jsx';
import { HealthItemDetailAndCompletionRoute } from './routes/health-item-detail-and-completion.jsx';
import { ReminderSchedulingFromHealthItemsRoute } from './routes/reminder-scheduling-from-health-items.jsx';
import { DesignSystemComponentFoundationRoute } from './routes/design-system-component-foundation.jsx';

const DEFAULT_DRAFT = {
  ageYears: '',
  gender: '',
};

const PROFILE_STORAGE_KEY = 'sl-002-active-profile';

// Keep the SL-001 route symbol in source for legacy smoke coverage.
const LEGACY_DASHBOARD_REFERENCE = GeneratedDashboardPage;
void LEGACY_DASHBOARD_REFERENCE;
const LEGACY_FULL_PLAN_REFERENCE = FullHealthPlanViewRoute;
void LEGACY_FULL_PLAN_REFERENCE;
const LEGACY_DETAIL_REFERENCE = HealthItemDetailAndCompletionRoute;
void LEGACY_DETAIL_REFERENCE;
const LEGACY_REMINDER_REFERENCE = ReminderSchedulingFromHealthItemsRoute;
void LEGACY_REMINDER_REFERENCE;

export default function App() {
  const [screen, setScreen] = useState(() => (loadStoredProfileSnapshot() ? 'dashboard' : 'welcome'));
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [profile, setProfile] = useState(() => loadStoredProfileSnapshot());
  const [routeState, setRouteState] = useState(() => readRouteStateFromHash());

  useEffect(() => {
    if (screen !== 'generating' || !pendingDraft) {
      return undefined;
    }

    const timerId = globalThis.setTimeout(() => {
      const nextProfile = createProfileSnapshot(pendingDraft);
      setProfile(nextProfile);
      setPendingDraft(null);
      setScreen('dashboard');
    }, 160);

    return () => globalThis.clearTimeout(timerId);
  }, [pendingDraft, screen]);

  useEffect(() => {
    if (!globalThis.localStorage) {
      return;
    }

    if (!profile) {
      globalThis.localStorage.removeItem(PROFILE_STORAGE_KEY);
      return;
    }

    globalThis.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (!globalThis.addEventListener) {
      return undefined;
    }

    const onHashChange = () => {
      setRouteState(readRouteStateFromHash());
    };

    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  if (screen === 'welcome') {
    return (
      <WelcomeScreen
        onStart={() => {
          setScreen('onboarding');
        }}
      />
    );
  }

  if (screen === 'onboarding') {
    return (
      <OnboardingPage
        draft={draft}
        onDraftChange={(updates) => {
          setDraft((current) => ({ ...current, ...updates }));
        }}
        onSubmit={(nextDraft) => {
          setPendingDraft(nextDraft);
          setScreen('generating');
        }}
        onBack={() => {
          setScreen('welcome');
        }}
      />
    );
  }

  if (screen === 'generating') {
    return <GeneratingScreen draft={pendingDraft ?? draft} />;
  }

  if (!profile) {
    return (
      <WelcomeScreen
        onStart={() => {
          setScreen('onboarding');
        }}
      />
    );
  }

  if (routeState.route === 'plan') {
    return (
      <DesignSystemComponentFoundationRoute
        view="plan"
        profile={profile}
        onBackToDashboard={() => {
          setHashRoute('#/dashboard');
        }}
        onOpenItem={(itemId) => {
          setHashRoute(`#/health-item/${encodeURIComponent(itemId)}?from=plan`);
        }}
      />
    );
  }

  return (
    <>
      {routeState.route === 'dashboard' ? (
        <section className="app-shell app-route-actions-shell" aria-label="Plan navigation">
          <section className="panel app-route-actions">
            <p className="eyebrow">Health plan</p>
            <h2>Review every recommended item</h2>
            <p className="helper">
              Open your full health plan to view all preventive items, including completed steps.
            </p>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setHashRoute('#/plan');
                }}
              >
                View full health plan
              </button>
            </div>
          </section>
        </section>
      ) : null}
      <DesignSystemComponentFoundationRoute
        view="dashboard-detail"
        profile={profile}
        onRestart={() => {
          setProfile(null);
          setPendingDraft(null);
          setDraft(DEFAULT_DRAFT);
          setScreen('welcome');
        }}
      />
    </>
  );
}

function WelcomeScreen({ onStart }) {
  return (
    <main className="app-shell">
      <section className="panel hero welcome-hero">
        <p className="eyebrow">Longevity Health OS</p>
        <h1>Your preventive plan starts with two answers</h1>
        <p className="lede">
          Answer two quick questions to see your next preventive health actions.
        </p>
        <div className="actions">
          <button type="button" className="primary" onClick={onStart}>
            Start
          </button>
        </div>
        <p className="helper">Guidance to help you plan. Not medical advice.</p>
      </section>
    </main>
  );
}

function GeneratingScreen({ draft }) {
  return (
    <main className="app-shell">
      <section className="panel hero generating-panel">
        <div className="loading-mark" aria-hidden="true" />
        <p className="eyebrow">Building your dashboard</p>
        <h1>We are generating your first plan</h1>
        <p className="lede">
          Age
[truncated]
```
## src/features/design-system-component-foundation/components/AppShell.jsx
```text
import React from 'react';

export function AppShell({ children, className = '' }) {
  const shellClassName = className ? `app-shell ${className}` : 'app-shell';
  return <main className={shellClassName}>{children}</main>;
}

export default AppShell;
```
## src/features/design-system-component-foundation/components/HealthPlanItem.jsx
```text
import React from 'react';
import { StatusPill } from './StatusPill.jsx';

export function HealthPlanItem({ item, onOpenItem, showWhy = true, showReminder = true, className = '' }) {
  const title = toDisplayText(item?.title, 'Preventive care step');
  const recommendation = toDisplayText(item?.recommendationFrequency, 'Timing to be confirmed');
  const whyItMatters = toDisplayText(item?.whyItMatters, 'This action supports your preventive health plan.');

  return (
    <li className={className ? `health-item ${className}` : 'health-item'}>
      <button
        type="button"
        className="health-item-button"
        onClick={() => {
          if (typeof onOpenItem === 'function') {
            onOpenItem(item?.id);
          }
        }}
      >
        <span className="health-item-header">
          <span className="health-item-title">{title}</span>
          <StatusPill status={item?.status} />
        </span>
        <span className="plan-frequency">Recommendation frequency: {recommendation}</span>
        {showWhy ? <span className="health-item-why">{whyItMatters}</span> : null}
        {showReminder && item?.hasReminder ? (
          <span className="health-item-reminder">Reminder: {item.reminderDateLabel}</span>
        ) : null}
      </button>
    </li>
  );
}

function toDisplayText(value, fallback) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

export default HealthPlanItem;
```
## src/features/design-system-component-foundation/components/HealthScoreCard.jsx
```text
import React from 'react';

export function HealthScoreCard({ score, summary }) {
  const parsedScore = Number(score);
  const hasValidScore = Number.isFinite(parsedScore);
  const safeScore = hasValidScore ? Math.max(0, Math.round(parsedScore)) : null;
  const scoreLabel = hasValidScore ? safeScore : 'Score unavailable';
  const safeSummary = String(summary ?? '').trim() || 'Keep going. Every completed step improves your preventive progress.';

  return (
    <section className="panel score-card" aria-label="Health progress score">
      <div>
        <p className="eyebrow">Health progress score</p>
        <h2>{scoreLabel}</h2>
      </div>
      <p className="helper">{safeSummary}</p>
    </section>
  );
}

export default HealthScoreCard;
```
## src/features/design-system-component-foundation/components/PrioritySection.jsx
```text
import React from 'react';
import { resolvePrioritySemantics } from '../semanticPresentation.js';
import { HealthPlanItem } from './HealthPlanItem.jsx';

export function PrioritySection({ priority, items, onOpenItem, emptyLabel = 'No open items in this horizon.' }) {
  const semantic = resolvePrioritySemantics(priority);
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section className={`panel section-card priority-section ${semantic.toneClassName}`} data-token={semantic.token}>
      <h2>{semantic.label}</h2>
      <ul className="priority-list">
        {safeItems.map((item) => (
          <HealthPlanItem
            key={item.id}
            item={item}
            onOpenItem={onOpenItem}
            showReminder
          />
        ))}
        {safeItems.length === 0 ? <li className="health-item-empty">{emptyLabel}</li> : null}
      </ul>
    </section>
  );
}

export default PrioritySection;
```
## src/features/design-system-component-foundation/components/ReminderSelector.jsx
```text
import React from 'react';

export function ReminderSelector({
  timingType,
  customDate,
  minimumDate,
  customDateError,
  customDateHint,
  saveError,
  isSaving,
  isSaveDisabled,
  hasReminder,
  reminderPreview,
  onTimingTypeChange,
  onCustomDateChange,
  onSave,
  onCancel,
  options,
}) {
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <section className="panel reminder-sheet" aria-label="Reminder timing">
      <h2>{hasReminder ? 'Change reminder' : 'Set reminder'}</h2>
      <p className="helper">Choose when to be reminded for this care step.</p>

      <fieldset className="reminder-options">
        <legend className="visually-hidden">Reminder timing options</legend>
        {safeOptions.map((option) => (
          <label key={option.value} className="reminder-option">
            <input
              type="radio"
              name="timingType"
              checked={timingType === option.value}
              onChange={() => {
                onTimingTypeChange(option.value);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {timingType === 'CUSTOM_DATE' ? (
        <label className="field">
          <span>Custom reminder date</span>
          <input
            type="date"
            value={customDate}
            min={minimumDate}
            onChange={(event) => {
              onCustomDateChange(event.target.value);
            }}
          />
          {customDateError ? <span className="field-error">{customDateError}</span> : null}
          {!customDateError && customDateHint ? <span className="helper">{customDateHint}</span> : null}
        </label>
      ) : (
        <p className="helper">Remind me on {reminderPreview}.</p>
      )}

      {saveError ? (
        <p className="inline-error" role="status">
          {saveError}
        </p>
      ) : null}

      <div className="actions">
        <button type="button" className="primary" disabled={isSaving || isSaveDisabled} onClick={onSave}>
          {isSaving ? 'Saving...' : hasReminder ? 'Update reminder' : 'Save reminder'}
        </button>
        <button type="button" className="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </section>
  );
}

export default ReminderSelector;
```
## src/features/design-system-component-foundation/components/StatusPill.jsx
```text
import React from 'react';
import { resolveStatusSemantics } from '../semanticPresentation.js';

export function StatusPill({ status }) {
  const semantic = resolveStatusSemantics(status);

  return (
    <span className={`status-chip ${semantic.toneClassName}`} data-token={semantic.token}>
      {semantic.label}
    </span>
  );
}

export default StatusPill;
```
## src/features/design-system-component-foundation/components/index.js
```text
export { AppShell } from './AppShell.jsx';
export { StatusPill } from './StatusPill.jsx';
export { HealthPlanItem } from './HealthPlanItem.jsx';
export { PrioritySection } from './PrioritySection.jsx';
export { HealthScoreCard } from './HealthScoreCard.jsx';
export { ReminderSelector } from './ReminderSelector.jsx';
```
## src/features/design-system-component-foundation/semanticPresentation.js
```text
export const STATUS_SEMANTICS = Object.freeze({
  done: {
    key: 'done',
    label: 'Done',
    toneClassName: 'status-done',
    token: 'color.status.done',
  },
  due: {
    key: 'due',
    label: 'Due',
    toneClassName: 'status-due',
    token: 'color.status.due',
  },
  soon: {
    key: 'soon',
    label: 'Soon',
    toneClassName: 'status-soon',
    token: 'color.status.soon',
  },
  planned: {
    key: 'planned',
    label: 'Planned',
    toneClassName: 'status-planned',
    token: 'color.status.planned',
  },
  overdue: {
    key: 'overdue',
    label: 'Overdue',
    toneClassName: 'status-overdue',
    token: 'color.status.overdue',
  },
  unknown: {
    key: 'unknown',
    label: 'Status unavailable',
    toneClassName: 'status-planned',
    token: 'color.status.planned',
  },
});

const DOMAIN_STATUS_TO_KEY = Object.freeze({
  done: 'done',
  due: 'due',
  soon: 'soon',
  planned: 'planned',
  overdue: 'overdue',
});

export const PRIORITY_SEMANTICS = Object.freeze({
  today: {
    key: 'today',
    label: 'Today',
    toneClassName: 'priority-today',
    token: 'color.priority.today',
  },
  soon: {
    key: 'soon',
    label: 'Soon',
    toneClassName: 'priority-soon',
    token: 'color.priority.soon',
  },
  later: {
    key: 'later',
    label: 'Later',
    toneClassName: 'priority-later',
    token: 'color.priority.later',
  },
  unknown: {
    key: 'unknown',
    label: 'Priority unavailable',
    toneClassName: 'priority-later',
    token: 'color.priority.later',
  },
});

const DOMAIN_PRIORITY_TO_KEY = Object.freeze({
  today: 'today',
  soon: 'soon',
  later: 'later',
});

export function resolveStatusSemantics(domainStatus) {
  const normalized = String(domainStatus ?? '').trim().toLowerCase();
  const key = DOMAIN_STATUS_TO_KEY[normalized] ?? 'unknown';
  return STATUS_SEMANTICS[key];
}

export function resolvePrioritySemantics(domainPriority) {
  const normalized = String(domainPriority ?? '').trim().toLowerCase();
  const key = DOMAIN_PRIORITY_TO_KEY[normalized] ?? 'unknown';
  return PRIORITY_SEMANTICS[key];
}

export function toPriorityKey(priorityHorizon) {
  const normalized = String(priorityHorizon ?? '').trim().toLowerCase();

  if (normalized === 'today') {
    return 'today';
  }

  if (normalized === 'soon') {
    return 'soon';
  }

  return 'later';
}
```
## src/features/first-profile-onboarding-to-generated-dashboard/SliceEntryBridge.jsx
```text
import React from 'react';
import { OnboardingPage } from '../onboarding/OnboardingPage.jsx';

export function SliceEntryBridge(props) {
  return <OnboardingPage {...props} />;
}
```
## src/features/full-health-plan-view/FullHealthPlanViewPage.jsx
```text
import React, { useEffect, useMemo, useState } from 'react';
import {
  HEALTH_ITEM_STATUS,
  loadPersistedHealthItems,
  mergePersistedHealthItems,
} from '../health-item-detail-and-completion/healthItemsModel.js';
import { calculatePlanTotals, hasUniqueHealthItemsById, sortHealthPlanItems } from './fullHealthPlanModel.js';

export function FullHealthPlanViewPage({ profile, onBackToDashboard, onOpenItem }) {
  const [healthItems, setHealthItems] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [navigationError, setNavigationError] = useState('');

  useEffect(() => {
    refreshItems(profile, setHealthItems, setLoadError);
    setNavigationError('');
  }, [profile]);

  const totals = useMemo(() => calculatePlanTotals(healthItems), [healthItems]);

  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Active profile health plan</p>
        <h1>Your complete preventive care plan for this profile</h1>
        <p className="lede">
          See every due, planned, and done care step in one place so nothing for this profile gets missed.
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onBackToDashboard}>
            Back to dashboard
          </button>
        </div>
      </section>

      {loadError ? (
        <section className="panel" aria-live="polite">
          <p className="inline-error">{loadError}</p>
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                refreshItems(profile, setHealthItems, setLoadError);
              }}
            >
              Retry
            </button>
            <button type="button" className="secondary" onClick={onBackToDashboard}>
              Back to dashboard
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="panel plan-totals" aria-label="Plan totals">
            <div className="plan-total-block">
              <p className="eyebrow">Total items</p>
              <h2>{totals.totalCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Due</p>
              <h2>{totals.dueCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Planned</p>
              <h2>{totals.plannedCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Done</p>
              <h2>{totals.doneCount}</h2>
            </div>
            <p className="helper plan-totals-helper">
              Status summary for this profile: Due {totals.dueCount}, Planned {totals.plannedCount}, Done{' '}
              {totals.doneCount}.
            </p>
          </section>

          {navigationError ? (
            <section className="panel" aria-live="polite">
              <p className="inline-error">{navigationError}</p>
            </section>
          ) : null}

          <section className="panel" aria-label="Health plan list">
            <h2>All recommended preventive care steps</h2>
            <ul className="plan-list">
              {healthItems.map((item) => (
                <li key={item.id} className="health-item">
                  <button
                    type="button"
                    className="plan-item-button"
                    onClick={() => {
                      if (!item.id) {
                        setNavigationError("We couldn't open this item right now. Please try again.");
                        return;
                      }

                      setNavigationError('');
                      onOpenItem(item.id);
                    }}
                  >
                    <span className="health-item-header plan-item-header">
                      <span className="health-item-title">{toDisplayText(item.title, 'Preventive care step')}</span>
                      <span className={`status-chip status-${toStatusToken(item.status)}`}>
                        {toUnifiedStatus(item.status)}
                      </span>
                    </span>
                    <span className="plan-frequency">
                      Recommendation frequency: {toDisplayText(item.recommendationFrequency, 'Timing to be confirmed')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function refreshItems(profile, setHealthItems, setLoadError) {
  try {
    const persisted = loadPersistedHealthItems(profile.profileId);
    const mergedItems = mergePersistedHealthItems(profile, persisted);
    const sortedItems = sortHealthPlanItems(mergedItems);

    if (!hasUniqueHealthItemsById(sortedItems)) {
      throw new Error('Duplicate health item ids found.');
    }

    setHealthItems(sortedItems);
    setLoadError('');
  } catch {
    setHealthItems([]);
    setLoadError("We couldn't load your full health plan right now.");
  }
}

function toUnifiedStatus(status) {
  if (status === HEALTH_ITEM_STATUS.DUE) {
    return HEALTH_ITEM_STATUS.DUE;
  }

  if (status === HEALTH_ITEM_STATUS.PLANNED) {
    return HEALTH_ITEM_STATUS.PLANNED;
  }

  return HEALTH_ITEM_STATUS.DONE;
}

function toStatusToken(status) {
  if (status === HEALTH_ITEM_STATUS.DUE) {
    return 'due';
  }

  if (status === HEALTH_ITEM_STATUS.PLANNED) {
    return 'planned';
  }

  return 'done';
}

function toDisplayText(value, fallback) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

export default FullHealthPlanViewPage;
```
## src/features/full-health-plan-view/fullHealthPlanModel.js
```text
import {
  HEALTH_ITEM_STATUS,
  groupHealthItemsForDashboard,
} from '../health-item-detail-and-completion/healthItemsModel.js';

const HORIZON_ORDER = Object.freeze({
  Today: 0,
  Soon: 1,
  Later: 2,
});

export function sortHealthPlanItems(items) {
  return [...items].sort((left, right) => {
    const leftHorizonRank = HORIZON_ORDER[left.priorityHorizon] ?? Number.MAX_SAFE_INTEGER;
    const rightHorizonRank = HORIZON_ORDER[right.priorityHorizon] ?? Number.MAX_SAFE_INTEGER;
    if (leftHorizonRank !== rightHorizonRank) {
      return leftHorizonRank - rightHorizonRank;
    }

    const leftOrder = Number.isFinite(left.displayOrder) ? left.displayOrder : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.displayOrder) ? right.displayOrder : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.title ?? '').localeCompare(String(right.title ?? ''));
  });
}

export function calculatePlanTotals(healthItems) {
  const dueCount = healthItems.filter((item) => item.status === HEALTH_ITEM_STATUS.DUE).length;
  const plannedCount = healthItems.filter((item) => item.status === HEALTH_ITEM_STATUS.PLANNED).length;
  const doneCount = healthItems.filter((item) => item.status === HEALTH_ITEM_STATUS.DONE).length;
  const grouped = groupHealthItemsForDashboard(healthItems);
  const dashboardOpenCount = grouped.Today.length + grouped.Soon.length + grouped.Later.length;

  return {
    totalCount: healthItems.length,
    dueCount,
    plannedCount,
    doneCount,
    dashboardOpenCount,
  };
}

export function hasUniqueHealthItemsById(healthItems) {
  return new Set(healthItems.map((item) => item.id)).size === healthItems.length;
}
```
## src/features/health-item-detail-and-completion/HealthItemDetailAndCompletionPage.jsx
```text
import React, { useEffect, useMemo, useState } from 'react';
import {
  HEALTH_ITEM_STATUS,
  calculateDisplayedHealthScore,
  getHealthItemById,
  getHealthItemStatusContext,
  groupHealthItemsForDashboard,
  loadPersistedHealthItems,
  markHealthItemDone,
  mergePersistedHealthItems,
  persistHealthItems,
} from './healthItemsModel.js';

export function HealthItemDetailAndCompletionPage({ profile, onRestart }) {
  const [detailHashState, setDetailHashState] = useState(() => readDetailHashStateFromHash());
  const { itemId: activeItemId, fromPlan: isFromPlanRoute } = detailHashState;
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [healthItems, setHealthItems] = useState(() => {
    const persisted = loadPersistedHealthItems(profile.profileId);
    return mergePersistedHealthItems(profile, persisted);
  });

  useEffect(() => {
    const persisted = loadPersistedHealthItems(profile.profileId);
    setHealthItems(mergePersistedHealthItems(profile, persisted));
    setDetailHashState(readDetailHashStateFromHash());
    setIsSaving(false);
    setSaveError('');
    setSaveSuccess('');
  }, [profile]);

  useEffect(() => {
    persistHealthItems(profile.profileId, healthItems);
  }, [profile.profileId, healthItems]);

  useEffect(() => {
    if (!globalThis.location) {
      return;
    }

    if (activeItemId) {
      const encodedItemId = encodeURIComponent(activeItemId);
      const nextHash = isFromPlanRoute
        ? `#/health-item/${encodedItemId}?from=plan`
        : `#/health-item/${encodedItemId}`;
      if (globalThis.location.hash !== nextHash) {
        globalThis.location.hash = nextHash;
      }
      return;
    }

    if (globalThis.location.hash.startsWith('#/health-item/')) {
      const nextHash = isFromPlanRoute ? '#/plan' : '#/dashboard';
      if (globalThis.location.hash !== nextHash) {
        globalThis.location.hash = nextHash;
      }
    }
  }, [activeItemId, isFromPlanRoute]);

  const groupedItems = useMemo(() => groupHealthItemsForDashboard(healthItems), [healthItems]);
  const displayedScore = useMemo(() => calculateDisplayedHealthScore(healthItems), [healthItems]);
  const activeItem = activeItemId
    ? getHealthItemById(profile.profileId, activeItemId, healthItems)
    : null;
  const backButtonLabel = isFromPlanRoute ? 'Back to health plan' : 'Back to dashboard';
  const handleBack = () => {
    setDetailHashState((current) => ({ ...current, itemId: null }));
    setSaveError('');
    setSaveSuccess('');
  };
  const requestedItemTitle = useMemo(
    () => resolveRequestedItemTitle(profile, healthItems, activeItemId),
    [activeItemId, healthItems, profile],
  );

  if (!activeItemId) {
    return (
      <main className="app-shell">
        <section className="panel hero">
          <p className="eyebrow">Active profile dashboard</p>
          <h1>Your personalized plan is ready</h1>
          <p className="lede">
            Age {profile.ageYears} · {capitalize(profile.gender)}
          </p>
          <button type="button" className="secondary" onClick={onRestart}>
            Start over
          </button>
        </section>

        <section className="panel score-card" aria-label="Health progress score">
          <div>
            <p className="eyebrow">Health progress score</p>
            <h2>{displayedScore}</h2>
          </div>
          <p className="helper">
            As you mark items done, this score updates to reflect your completed preventive care steps.
          </p>
        </section>

        <section className="dashboard-grid">
          {['Today', 'Soon', 'Later'].map((horizon) => (
            <PrioritySection
              key={horizon}
              title={horizon}
              items={groupedItems[horizon]}
              onOpenItem={(itemId) => {
                setDetailHashState({
                  itemId,
                  fromPlan: false,
                });
              }}
            />
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="panel detail-panel">
        {!activeItem ? (
          <>
            <div className="detail-header">
              <button type="button" className="secondary back-button" onClick={handleBack}>
                {backButtonLabel}
              </button>
            </div>
            <h1 className="detail-title">{requestedItemTitle ?? 'Review this care step'}</h1>
            <div className="inline-error" role="status">
              <p>
                {requestedItemTitle
                  ? `We couldn't load details for ${requestedItemTitle} right now.`
                  : "We couldn't load this health item right now."}
              </p>
            </div>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const persisted = loadPersistedHealthItems(profile.profileId);
                  setHealthItems(mergePersistedHealthItems(profile, persisted));
                }}
              >
                Try again
              </button>
              <button type="button" className="secondary" onClick={handleBack}>
                {backButtonLabel}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="detail-header">
              <button type="button" className="secondary back-button" onClick={handleBack}>
                {backButtonLabel}
              </button>
              <span className={`status-chip status-${activeItem.status.toLowerCase()}`}>
                {activeItem.status}
              </span>
            </div>
            <h1 className="detail-title">{activeItem.title}</h1>

            <section className="detail-block" aria-label="Action">
              <h2>Action</h2>
              <p>
[truncated]
```
## src/features/health-item-detail-and-completion/healthItemsModel.js
```text
import { calculateHealthScore, PRIORITY_HORIZONS } from '../profile/profilePlan.js';

export const HEALTH_ITEM_STATUS = Object.freeze({
  DUE: 'Due',
  PLANNED: 'Planned',
  DONE: 'Done',
});

const STATUS_VALUES = new Set(Object.values(HEALTH_ITEM_STATUS));
const STORAGE_KEY_PREFIX = 'sl-002-health-items:';

function assertStatus(status) {
  if (!STATUS_VALUES.has(status)) {
    throw new Error(`Unsupported health item status: ${status}`);
  }
}

function buildInitialStatusContext(priorityHorizon, generatedAtDate) {
  const generatedTime = new Date(generatedAtDate);
  if (Number.isNaN(generatedTime.getTime())) {
    throw new Error('Profile generatedAt date must be a valid ISO timestamp.');
  }

  if (priorityHorizon === 'Today') {
    return {
      status: HEALTH_ITEM_STATUS.DUE,
      nextDueDate: generatedTime.toISOString(),
      plannedForDate: null,
      lastCompletedAt: null,
    };
  }

  const plannedDate = new Date(generatedTime);
  const dayDelta = priorityHorizon === 'Soon' ? 30 : 90;
  plannedDate.setDate(plannedDate.getDate() + dayDelta);

  return {
    status: HEALTH_ITEM_STATUS.PLANNED,
    nextDueDate: null,
    plannedForDate: plannedDate.toISOString(),
    lastCompletedAt: null,
  };
}

export function createHealthItemsFromProfile(profile) {
  if (!profile?.profileId || !Array.isArray(profile?.planItems)) {
    throw new Error('Profile with generated plan items is required.');
  }

  return profile.planItems.map((planItem) => {
    const statusContext = buildInitialStatusContext(planItem.priorityHorizon, profile.generatedAt);

    return {
      id: planItem.itemCode,
      profileId: profile.profileId,
      title: planItem.title,
      actionLabel: planItem.title,
      whyItMatters: planItem.whyItMatters,
      recommendationFrequency: planItem.frequencyLabel,
      priorityHorizon: planItem.priorityHorizon,
      displayOrder: planItem.displayOrder,
      status: statusContext.status,
      nextDueDate: statusContext.nextDueDate,
      plannedForDate: statusContext.plannedForDate,
      lastCompletedAt: statusContext.lastCompletedAt,
      updatedAt: profile.generatedAt,
    };
  });
}

function normalizeHealthItem(healthItem) {
  assertStatus(healthItem.status);

  return {
    ...healthItem,
    nextDueDate: healthItem.nextDueDate ?? null,
    plannedForDate: healthItem.plannedForDate ?? null,
    lastCompletedAt: healthItem.lastCompletedAt ?? null,
  };
}

export function mergePersistedHealthItems(profile, persistedItems) {
  const baseItems = createHealthItemsFromProfile(profile);
  if (!Array.isArray(persistedItems) || persistedItems.length === 0) {
    return baseItems;
  }

  const persistedById = new Map(
    persistedItems
      .filter((item) => item.profileId === profile.profileId)
      .map((item) => [item.id, normalizeHealthItem(item)]),
  );

  return baseItems.map((baseItem) => {
    const persisted = persistedById.get(baseItem.id);
    if (!persisted) {
      return baseItem;
    }

    return {
      ...baseItem,
      status: persisted.status,
      nextDueDate: persisted.nextDueDate,
      plannedForDate: persisted.plannedForDate,
      lastCompletedAt: persisted.lastCompletedAt,
      updatedAt: persisted.updatedAt ?? baseItem.updatedAt,
    };
  });
}

export function groupHealthItemsForDashboard(healthItems) {
  const grouped = Object.fromEntries(PRIORITY_HORIZONS.map((horizon) => [horizon, []]));

  for (const item of healthItems) {
    assertStatus(item.status);

    if (!grouped[item.priorityHorizon]) {
      throw new Error(`Unsupported priority horizon: ${item.priorityHorizon}`);
    }

    if (item.status === HEALTH_ITEM_STATUS.DONE) {
      continue;
    }

    grouped[item.priorityHorizon].push({ ...item });
  }

  for (const horizon of PRIORITY_HORIZONS) {
    grouped[horizon].sort((left, right) => left.displayOrder - right.displayOrder);
  }

  return grouped;
}

export function getHealthItemStatusContext(healthItem, locale = 'en-US') {
  assertStatus(healthItem.status);

  const formatDate = (isoDate) => {
    if (!isoDate) {
      return null;
    }

    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsed);
  };

  if (healthItem.status === HEALTH_ITEM_STATUS.DUE) {
    const dueText = formatDate(healthItem.nextDueDate);
    return dueText ? `Due on ${dueText}` : 'Due now';
  }

  if (healthItem.status === HEALTH_ITEM_STATUS.PLANNED) {
    const plannedText = formatDate(healthItem.plannedForDate);
    return plannedText ? `Planned for ${plannedText}` : 'Planned timing needs confirmation';
  }

  const completedText = formatDate(healthItem.lastCompletedAt);
  return completedText ? `Completed on ${completedText}` : 'Marked done';
}

export function markHealthItemDone(activeProfileId, healthItemId, healthItems, completedAt = new Date()) {
  const completionIso = completedAt.toISOString();
  let itemFound = false;

  const nextItems = healthItems.map((item) => {
    if (item.profileId !== activeProfileId || item.id !== healthItemId) {
      return item;
    }

    itemFound = true;
    assertStatus(item.status);

    if (item.status === HEALTH_ITEM_STATUS.DONE) {
      throw new Error('This item is already done.');
    }

    return {
      ...item,
      status: HEALTH_ITEM_STATUS.DONE,
      lastCompletedAt: completionIso,
      plannedForDate: null,
      updatedAt: completionIso,
    };
  });

  if (!itemFound) {
    throw new Error('Health item was not found in the active profile.');
  }

  return nextItems;
}

export function calculateDisplayedHealthScore(healthItems) {
  const activePlanItems = healthItems
    .filter((item) => item.status !== HEALTH_ITEM_STATUS.DONE)
    .map((item) => ({ priorityHorizon: item.priorityHorizon }));

  return calculateHealthScore(activePlanItems);
}

export function getHealthItemById(activeProfileId, healthItem
[truncated]
```
## src/features/onboarding/OnboardingPage.jsx
```text
import React from 'react';
import { ProfileForm } from '../profile/ProfileForm.jsx';

export function OnboardingPage({ draft, onDraftChange, onSubmit, onBack }) {
  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Personal onboarding</p>
        <h1>Build your first profile</h1>
        <p className="lede">
          Enter your age and gender to get a personalized preventive plan you can use right away.
        </p>
        <div className="microcopy">
          This takes about a minute and helps tailor your recommended next steps.
        </div>
      </section>

      <section className="panel">
        <header className="section-header">
          <h2>Profile details</h2>
          <p>After you continue, you&apos;ll see your first set of recommended health actions.</p>
        </header>

        <ProfileForm
          draft={draft}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          onBack={onBack}
        />
      </section>
    </main>
  );
}
```
## src/features/profile/ProfileForm.jsx
```text
import React, { useState } from 'react';
import { validateOnboardingDraft } from './profilePlan.js';

export function ProfileForm({ draft, onDraftChange, onSubmit, onBack }) {
  const [didAttemptSubmit, setDidAttemptSubmit] = useState(false);
  const validationErrors = didAttemptSubmit ? validateOnboardingDraft(draft) : {};

  function handleSubmit(event) {
    event.preventDefault();
    setDidAttemptSubmit(true);

    const nextErrors = validateOnboardingDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSubmit(draft);
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="field">
        <span>Age</span>
        <input
          autoComplete="off"
          inputMode="numeric"
          min="30"
          max="65"
          name="ageYears"
          placeholder="30"
          type="number"
          step="1"
          value={draft.ageYears}
          onChange={(event) => onDraftChange({ ageYears: event.target.value })}
        />
        {validationErrors.ageYears ? (
          <span className="field-error" role="alert">
            {validationErrors.ageYears}
          </span>
        ) : null}
      </label>

      <label className="field">
        <span>Gender</span>
        <select
          name="gender"
          value={draft.gender}
          onChange={(event) => onDraftChange({ gender: event.target.value })}
        >
          <option value="">Select gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
        {validationErrors.gender ? (
          <span className="field-error" role="alert">
            {validationErrors.gender}
          </span>
        ) : null}
      </label>

      <p className="helper">
        These answers generate rule-based preventive guidance for this profile only.
      </p>

      <div className="actions">
        <button type="button" className="secondary" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="primary">
          Generate my plan
        </button>
      </div>
    </form>
  );
}
```
## src/features/profile/profilePlan.js
```text
export const RULE_SET_VERSION = 'sl-001-2026-04-25';

export const PRIORITY_HORIZONS = ['Today', 'Soon', 'Later'];

const HORIZON_SCORE_WEIGHTS = {
  Today: 12,
  Soon: 8,
  Later: 5,
};

const AGE_BANDS = [
  { key: '30-39', min: 30, max: 39 },
  { key: '40-54', min: 40, max: 54 },
  { key: '55-65', min: 55, max: 65 },
];

function makeItem(itemCode, title, whyItMatters, frequencyLabel, priorityHorizon, displayOrder) {
  return {
    itemCode,
    title,
    whyItMatters,
    frequencyLabel,
    priorityHorizon,
    displayOrder,
  };
}

const RULE_CATALOG = {
  '30-39': {
    female: [
      makeItem(
        'bp-check-30-39-female',
        'Check blood pressure',
        'Early checks catch silent changes sooner.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'dental-cleaning-30-39-female',
        'Book a dental cleaning',
        'Regular cleanings help prevent cavities and gum disease.',
        'Within 3 months',
        'Soon',
        2,
      ),
      makeItem(
        'cervical-screening-review-30-39-female',
        'Review cervical screening timing',
        'Timelines shift with age and should be confirmed at your annual visit.',
        'At your next annual visit',
        'Later',
        3,
      ),
    ],
    male: [
      makeItem(
        'bp-check-30-39-male',
        'Check blood pressure',
        'Early checks catch silent changes sooner.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'dental-cleaning-30-39-male',
        'Book a dental cleaning',
        'Regular cleanings help prevent cavities and gum disease.',
        'Within 3 months',
        'Soon',
        2,
      ),
      makeItem(
        'cholesterol-screening-review-30-39-male',
        'Review cholesterol screening timing',
        'Age-based screening windows deserve a quick annual review.',
        'At your next annual visit',
        'Later',
        3,
      ),
    ],
  },
  '40-54': {
    female: [
      makeItem(
        'bp-check-40-54-female',
        'Check blood pressure',
        'A routine check helps catch trend changes early.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'blood-panel-40-54-female',
        'Plan a preventive blood panel',
        'These labs can reveal early changes before symptoms appear.',
        'Within 2 months',
        'Soon',
        2,
      ),
      makeItem(
        'dental-cleaning-40-54-female',
        'Book a dental cleaning',
        'Regular cleanings help prevent cavities and gum disease.',
        'Within 3 months',
        'Soon',
        3,
      ),
      makeItem(
        'breast-screening-review-40-54-female',
        'Review breast screening timing',
        'Screening windows can change across this age band.',
        'At your next annual visit',
        'Later',
        4,
      ),
    ],
    male: [
      makeItem(
        'bp-check-40-54-male',
        'Check blood pressure',
        'A routine check helps catch trend changes early.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'blood-panel-40-54-male',
        'Plan a preventive blood panel',
        'These labs can reveal early changes before symptoms appear.',
        'Within 2 months',
        'Soon',
        2,
      ),
      makeItem(
        'dental-cleaning-40-54-male',
        'Book a dental cleaning',
        'Regular cleanings help prevent cavities and gum disease.',
        'Within 3 months',
        'Soon',
        3,
      ),
      makeItem(
        'colorectal-screening-review-40-54-male',
        'Review colorectal screening timing',
        'Screening windows can change across this age band.',
        'At your next annual visit',
        'Later',
        4,
      ),
    ],
  },
  '55-65': {
    female: [
      makeItem(
        'bp-check-55-65-female',
        'Check blood pressure',
        'Blood pressure often changes quietly, and early action lowers risk.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'annual-visit-55-65-female',
        'Schedule an annual preventive visit',
        'A yearly visit helps catch concerns early and keep care up to date.',
        'Within 1 month',
        'Today',
        2,
      ),
      makeItem(
        'bone-health-review-55-65-female',
        'Review bone health screening timing',
        'Timely screening can catch bone loss early and reduce fracture risk.',
        'Within 2 months',
        'Soon',
        3,
      ),
      makeItem(
        'dental-cleaning-55-65-female',
        'Book a dental cleaning',
        'Regular cleanings help prevent cavities and gum disease.',
        'Within 3 months',
        'Soon',
        4,
      ),
      makeItem(
        'mammogram-timeline-55-65-female',
        'Review mammogram timing',
        'Age-based screening timelines deserve a clear annual review.',
        'At your next annual visit',
        'Later',
        5,
      ),
    ],
    male: [
      makeItem(
        'bp-check-55-65-male',
        'Check blood pressure',
        'Blood pressure often changes quietly, and early action lowers risk.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'annual-visit-55-65-male',
        'Schedule an annual preventive visit',
        'A yearly visit helps catch concerns early and keep care up to date.',
        'Within 1 month',
        'Today',
        2,
      ),
      makeItem(
        'lab-review-55-65-male',
        'Review cholesterol and glucose labs',
        'Reviewing these labs helps lower heart and diabetes risk sooner.',
        'Within 2 months',
        'Soon',
        3,
      ),
      makeItem(
        'dental-cleaning-55-65-male',
        'Book a dental cleaning',
        'Regular cleanings help prevent cavities and gum disease.',
        'Within 3 months',
        'Soon',
        4,
      ),
      makeItem(
        'prostate-screening-review-55-65-male',
[truncated]
```
## src/features/reminder-scheduling-from-health-items/ReminderSchedulingDashboardDetailPage.jsx
```text
import React, { useEffect, useMemo, useState } from 'react';
import {
  HEALTH_ITEM_STATUS,
  calculateDisplayedHealthScore,
  getHealthItemById,
  getHealthItemStatusContext,
  groupHealthItemsForDashboard,
  markHealthItemDone,
  persistHealthItems,
} from '../health-item-detail-and-completion/healthItemsModel.js';
import {
  REMINDER_TIMING_TYPE,
  applyReminderProjection,
  formatReminderDateForDisplay,
  getReminderStatusText,
  getReminderTimingLabel,
  loadPersistedReminderRecords,
  loadReminderSchedulingItems,
  persistReminderRecords,
  resolveReminderDate,
  upsertReminderRecord,
} from './reminderSchedulingModel.js';

export function ReminderSchedulingDashboardDetailPage({ profile, onRestart }) {
  const [detailHashState, setDetailHashState] = useState(() => readDetailHashStateFromHash());
  const { itemId: activeItemId, fromPlan: isFromPlanRoute } = detailHashState;

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [baseHealthItems, setBaseHealthItems] = useState(() => loadReminderSchedulingItems(profile));
  const [reminderRecords, setReminderRecords] = useState(() => loadPersistedReminderRecords(profile.profileId));

  const [isReminderSheetOpen, setIsReminderSheetOpen] = useState(false);
  const [reminderTimingType, setReminderTimingType] = useState(REMINDER_TIMING_TYPE.ONE_MONTH);
  const [customReminderDate, setCustomReminderDate] = useState('');
  const [customDateError, setCustomDateError] = useState('');
  const [reminderSaveError, setReminderSaveError] = useState('');

  useEffect(() => {
    const freshProjectedItems = loadReminderSchedulingItems(profile);
    setBaseHealthItems(freshProjectedItems);
    setReminderRecords(loadPersistedReminderRecords(profile.profileId));
    setDetailHashState(readDetailHashStateFromHash());
    setIsSaving(false);
    setIsSavingReminder(false);
    setSaveError('');
    setSaveSuccess('');
    closeReminderSheet();
  }, [profile]);

  useEffect(() => {
    persistHealthItems(profile.profileId, baseHealthItems);
  }, [baseHealthItems, profile.profileId]);

  useEffect(() => {
    persistReminderRecords(profile.profileId, reminderRecords);
  }, [profile.profileId, reminderRecords]);

  useEffect(() => {
    if (!globalThis.location) {
      return;
    }

    if (activeItemId) {
      const encodedItemId = encodeURIComponent(activeItemId);
      const nextHash = isFromPlanRoute
        ? `#/health-item/${encodedItemId}?from=plan`
        : `#/health-item/${encodedItemId}`;
      if (globalThis.location.hash !== nextHash) {
        globalThis.location.hash = nextHash;
      }
      return;
    }

    if (globalThis.location.hash.startsWith('#/health-item/')) {
      const nextHash = isFromPlanRoute ? '#/plan' : '#/dashboard';
      if (globalThis.location.hash !== nextHash) {
        globalThis.location.hash = nextHash;
      }
    }
  }, [activeItemId, isFromPlanRoute]);

  const healthItems = useMemo(
    () => applyReminderProjection(baseHealthItems, reminderRecords),
    [baseHealthItems, reminderRecords],
  );
  const groupedItems = useMemo(() => groupHealthItemsForDashboard(healthItems), [healthItems]);
  const displayedScore = useMemo(() => calculateDisplayedHealthScore(healthItems), [healthItems]);
  const activeItem = activeItemId
    ? getHealthItemById(profile.profileId, activeItemId, healthItems)
    : null;

  const backButtonLabel = isFromPlanRoute ? 'Back to health plan' : 'Back to dashboard';
  const requestedItemTitle = useMemo(
    () => resolveRequestedItemTitle(profile, healthItems, activeItemId),
    [activeItemId, healthItems, profile],
  );

  const handleBack = () => {
    setDetailHashState((current) => ({ ...current, itemId: null }));
    setSaveError('');
    setSaveSuccess('');
    closeReminderSheet();
  };

  const openReminderSheet = () => {
    if (!activeItem || !activeItem.supportsReminder) {
      return;
    }

    if (activeItem.reminder) {
      setReminderTimingType(activeItem.reminder.timingType);
      setCustomReminderDate(activeItem.reminder.remindOnDate);
    } else {
      setReminderTimingType(REMINDER_TIMING_TYPE.ONE_MONTH);
      setCustomReminderDate('');
    }

    setCustomDateError('');
    setReminderSaveError('');
    setIsReminderSheetOpen(true);
  };

  const handleSaveReminder = () => {
    if (!activeItem) {
      return;
    }

    setIsSavingReminder(true);
    setCustomDateError('');
    setReminderSaveError('');

    globalThis.setTimeout(() => {
      try {
        const resolvedDate = resolveReminderDate({
          timingType: reminderTimingType,
          customDate: customReminderDate,
          now: new Date(),
        });

        setReminderRecords((currentRecords) =>
          upsertReminderRecord({
            profileId: profile.profileId,
            healthItem: activeItem,
            reminderRecords: currentRecords,
            timingType: reminderTimingType,
            customDate: customReminderDate,
            now: new Date(),
          }),
        );

        setSaveError('');
        setSaveSuccess(
          activeItem.reminder
            ? `Reminder updated to ${formatReminderDateForDisplay(resolvedDate)}.`
            : `Reminder saved for ${formatReminderDateForDisplay(resolvedDate)}.`,
        );
        closeReminderSheet();
      } catch (error) {
        if (error instanceof Error && error.message === 'Choose today or a future date.') {
          setCustomDateError(error.message);
        } else {
          setReminderSaveError("Couldn't save reminder. Try again.");
        }
      } finally {
        setIsSavingReminder(false);
      }
    }, 180);
  };

  if (!activeItemId) {
    return (
      <main className="app-shell">
        <section className="panel hero">
          <p className="eyebrow">Active profile dashboard</p>
          <h1>Your personalized plan is
[truncated]
```
## src/features/reminder-scheduling-from-health-items/ReminderSchedulingFullHealthPlanPage.jsx
```text
import React, { useEffect, useMemo, useState } from 'react';
import { HEALTH_ITEM_STATUS } from '../health-item-detail-and-completion/healthItemsModel.js';
import {
  calculatePlanTotals,
  hasUniqueHealthItemsById,
  sortHealthPlanItems,
} from '../full-health-plan-view/fullHealthPlanModel.js';
import { loadPersistedReminderRecords, loadReminderSchedulingItems } from './reminderSchedulingModel.js';

export function ReminderSchedulingFullHealthPlanPage({ profile, onBackToDashboard, onOpenItem }) {
  const [healthItems, setHealthItems] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [navigationError, setNavigationError] = useState('');

  useEffect(() => {
    refreshItems(profile, setHealthItems, setLoadError);
    setNavigationError('');
  }, [profile]);

  const totals = useMemo(() => calculatePlanTotals(healthItems), [healthItems]);

  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Active profile health plan</p>
        <h1>Your complete preventive care plan for this profile</h1>
        <p className="lede">
          See every due, planned, and done care step in one place so nothing for this profile gets missed.
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onBackToDashboard}>
            Back to dashboard
          </button>
        </div>
      </section>

      {loadError ? (
        <section className="panel" aria-live="polite">
          <p className="inline-error">{loadError}</p>
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                refreshItems(profile, setHealthItems, setLoadError);
              }}
            >
              Retry
            </button>
            <button type="button" className="secondary" onClick={onBackToDashboard}>
              Back to dashboard
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="panel plan-totals" aria-label="Plan totals">
            <div className="plan-total-block">
              <p className="eyebrow">Total items</p>
              <h2>{totals.totalCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Due</p>
              <h2>{totals.dueCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Planned</p>
              <h2>{totals.plannedCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Done</p>
              <h2>{totals.doneCount}</h2>
            </div>
            <p className="helper plan-totals-helper">
              Status summary for this profile: Due {totals.dueCount}, Planned {totals.plannedCount}, Done{' '}
              {totals.doneCount}.
            </p>
          </section>

          {navigationError ? (
            <section className="panel" aria-live="polite">
              <p className="inline-error">{navigationError}</p>
            </section>
          ) : null}

          <section className="panel" aria-label="Health plan list">
            <h2>All recommended preventive care steps</h2>
            <ul className="plan-list">
              {healthItems.map((item) => (
                <li key={item.id} className="health-item">
                  <button
                    type="button"
                    className="plan-item-button"
                    onClick={() => {
                      if (!item.id) {
                        setNavigationError("We couldn't open this item right now. Please try again.");
                        return;
                      }

                      setNavigationError('');
                      onOpenItem(item.id);
                    }}
                  >
                    <span className="health-item-header plan-item-header">
                      <span className="health-item-title">{toDisplayText(item.title, 'Preventive care step')}</span>
                      <span className={`status-chip status-${toStatusToken(item.status)}`}>
                        {toUnifiedStatus(item.status)}
                      </span>
                    </span>
                    <span className="plan-frequency">
                      Recommendation frequency: {toDisplayText(item.recommendationFrequency, 'Timing to be confirmed')}
                    </span>
                    {item.hasReminder ? (
                      <span className="plan-reminder">Reminder: {item.reminderDateLabel}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function refreshItems(profile, setHealthItems, setLoadError) {
  try {
    const reminderRecords = loadPersistedReminderRecords(profile.profileId);
    const projectedItems = loadReminderSchedulingItems(profile);
    const filteredByProfile = projectedItems.filter((item) => item.profileId === profile.profileId);
    const reminderSet = new Set(reminderRecords.map((record) => record.healthItemId));

    const normalizedItems = filteredByProfile.map((item) => ({
      ...item,
      hasReminder: reminderSet.has(item.id),
    }));

    const sortedItems = sortHealthPlanItems(normalizedItems);

    if (!hasUniqueHealthItemsById(sortedItems)) {
      throw new Error('Duplicate health item ids found.');
    }

    setHealthItems(sortedItems);
    setLoadError('');
  } catch {
    setHealthItems([]);
    setLoadError("We couldn't load your full health plan right now.");
  }
}

function toUnifiedStatus(status) {
  if (status === HEALTH_ITEM_STATUS.DUE) {
    return HEALTH_ITEM_STATUS.DUE;
  }

  if (status === HEALTH_ITEM_STATUS.PLANNED) {
    return HEALTH_ITEM_STATUS.PLANNED;
  }

  return HEALTH_ITEM_STATUS.DONE;
}

function toStatu
[truncated]
```
## src/features/reminder-scheduling-from-health-items/reminderSchedulingModel.js
```text
import {
  HEALTH_ITEM_STATUS,
  loadPersistedHealthItems,
  mergePersistedHealthItems,
} from '../health-item-detail-and-completion/healthItemsModel.js';

export const REMINDER_TIMING_TYPE = Object.freeze({
  ONE_MONTH: 'ONE_MONTH',
  THREE_MONTHS: 'THREE_MONTHS',
  CUSTOM_DATE: 'CUSTOM_DATE',
});

const TIMING_TYPES = new Set(Object.values(REMINDER_TIMING_TYPE));
const REMINDER_STORAGE_KEY_PREFIX = 'sl-004-reminders:';

export function loadReminderSchedulingItems(profile) {
  const persistedItems = loadPersistedHealthItems(profile.profileId);
  const mergedItems = mergePersistedHealthItems(profile, persistedItems);
  const reminders = loadPersistedReminderRecords(profile.profileId);
  return applyReminderProjection(mergedItems, reminders);
}

export function applyReminderProjection(healthItems, reminderRecords) {
  const remindersByItemId = new Map(
    reminderRecords.map((record) => [record.healthItemId, record]),
  );

  return healthItems.map((item) => {
    const reminder = remindersByItemId.get(item.id) ?? null;

    return {
      ...item,
      supportsReminder: supportsReminderForItem(item),
      reminder,
      hasReminder: Boolean(reminder),
      reminderDateLabel: reminder ? formatReminderDateForDisplay(reminder.remindOnDate) : '',
    };
  });
}

export function supportsReminderForItem(item) {
  return Boolean(item?.id);
}

export function loadPersistedReminderRecords(profileId) {
  if (!profileId || !globalThis.localStorage) {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(`${REMINDER_STORAGE_KEY_PREFIX}${profileId}`);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidReminderRecord);
  } catch {
    return [];
  }
}

export function persistReminderRecords(profileId, reminderRecords) {
  if (!profileId || !globalThis.localStorage) {
    return;
  }

  globalThis.localStorage.setItem(
    `${REMINDER_STORAGE_KEY_PREFIX}${profileId}`,
    JSON.stringify(reminderRecords.filter(isValidReminderRecord)),
  );
}

export function upsertReminderRecord({
  profileId,
  healthItem,
  reminderRecords,
  timingType,
  customDate,
  now = new Date(),
}) {
  if (!profileId) {
    throw new Error('Profile id is required to save a reminder.');
  }

  if (!supportsReminderForItem(healthItem)) {
    throw new Error('This health item does not support reminders.');
  }

  if (!TIMING_TYPES.has(timingType)) {
    throw new Error('Unsupported reminder timing type.');
  }

  const nowIso = toIsoTimestamp(now);
  const remindOnDate = resolveReminderDate({ timingType, customDate, now });

  const nextRecord = {
    profileId,
    healthItemId: healthItem.id,
    timingType,
    remindOnDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  let replaced = false;
  const updatedRecords = reminderRecords.map((record) => {
    if (record.profileId !== profileId || record.healthItemId !== healthItem.id) {
      return record;
    }

    replaced = true;
    return {
      ...record,
      timingType: nextRecord.timingType,
      remindOnDate: nextRecord.remindOnDate,
      updatedAt: nowIso,
    };
  });

  if (!replaced) {
    updatedRecords.push(nextRecord);
  }

  return updatedRecords;
}

export function resolveReminderDate({ timingType, customDate, now = new Date() }) {
  if (timingType === REMINDER_TIMING_TYPE.ONE_MONTH) {
    return addCalendarMonthsAsDateOnly(now, 1);
  }

  if (timingType === REMINDER_TIMING_TYPE.THREE_MONTHS) {
    return addCalendarMonthsAsDateOnly(now, 3);
  }

  const customDateOnly = toDateOnly(customDate);
  if (!customDateOnly) {
    throw new Error('A custom reminder date is required.');
  }

  if (isDateBeforeToday(customDateOnly, now)) {
    throw new Error('Choose today or a future date.');
  }

  return customDateOnly;
}

export function addCalendarMonthsAsDateOnly(input, monthsToAdd) {
  const baseDate = toValidDate(input);
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const day = baseDate.getUTCDate();

  const targetMonthIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, normalizedTargetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDayOfMonth);

  const targetDate = new Date(Date.UTC(targetYear, normalizedTargetMonth, targetDay));
  return toDateOnly(targetDate);
}

export function formatReminderDateForDisplay(dateOnly, locale = 'en-US') {
  const isoText = toDateOnly(dateOnly);
  if (!isoText) {
    return 'Date to be confirmed';
  }

  const parsed = new Date(`${isoText}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date to be confirmed';
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function getReminderStatusText(reminder) {
  if (!reminder) {
    return 'No reminder saved yet.';
  }

  return `Reminder set for ${formatReminderDateForDisplay(reminder.remindOnDate)}.`;
}

export function getReminderTimingLabel(timingType) {
  if (timingType === REMINDER_TIMING_TYPE.ONE_MONTH) {
    return 'In 1 month';
  }

  if (timingType === REMINDER_TIMING_TYPE.THREE_MONTHS) {
    return 'In 3 months';
  }

  return 'Custom date';
}

export function isReminderSupportedStatus(status) {
  return (
    status === HEALTH_ITEM_STATUS.DUE
    || status === HEALTH_ITEM_STATUS.PLANNED
    || status === HEALTH_ITEM_STATUS.DONE
  );
}

function isDateBeforeToday(dateOnly, nowDate) {
  const today = toDateOnly(nowDate);
  if (!today) {
    return false;
  }

  return dateOnly < today;
}

function toIsoTimestamp(input) {
  return toValidDate(input).toISOString();
}

function toValidDate(input) {
  const parsed = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if
[truncated]
```
## src/main.jsx
```text
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
## src/routes/design-system-component-foundation.jsx
```text
import React, { useEffect, useMemo, useState } from 'react';
import {
  HEALTH_ITEM_STATUS,
  calculateDisplayedHealthScore,
  getHealthItemById,
  getHealthItemStatusContext,
  groupHealthItemsForDashboard,
  markHealthItemDone,
  persistHealthItems,
} from '../features/health-item-detail-and-completion/healthItemsModel.js';
import {
  calculatePlanTotals,
  hasUniqueHealthItemsById,
  sortHealthPlanItems,
} from '../features/full-health-plan-view/fullHealthPlanModel.js';
import {
  REMINDER_TIMING_TYPE,
  formatReminderDateForDisplay,
  getReminderStatusText,
  getReminderTimingLabel,
  loadPersistedReminderRecords,
  loadReminderSchedulingItems,
  persistReminderRecords,
  resolveReminderDate,
  upsertReminderRecord,
} from '../features/reminder-scheduling-from-health-items/reminderSchedulingModel.js';
import {
  AppShell,
  HealthPlanItem,
  HealthScoreCard,
  PrioritySection,
  ReminderSelector,
  StatusPill,
} from '../features/design-system-component-foundation/components/index.js';
import { toPriorityKey } from '../features/design-system-component-foundation/semanticPresentation.js';

const REMINDER_OPTIONS = Object.freeze([
  { value: REMINDER_TIMING_TYPE.ONE_MONTH, label: 'In 1 month' },
  { value: REMINDER_TIMING_TYPE.THREE_MONTHS, label: 'In 3 months' },
  { value: REMINDER_TIMING_TYPE.CUSTOM_DATE, label: 'Custom date' },
]);

export function DesignSystemComponentFoundationRoute({ view, ...props }) {
  if (view === 'plan') {
    return <DesignSystemComponentFoundationPlanPage {...props} />;
  }

  return <DesignSystemComponentFoundationDashboardDetailPage {...props} />;
}

function DesignSystemComponentFoundationPlanPage({ profile, onBackToDashboard, onOpenItem }) {
  const [healthItems, setHealthItems] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [navigationError, setNavigationError] = useState('');

  useEffect(() => {
    refreshPlanItems(profile, setHealthItems, setLoadError);
    setNavigationError('');
  }, [profile]);

  const totals = useMemo(() => calculatePlanTotals(healthItems), [healthItems]);

  return (
    <AppShell>
      <section className="panel hero">
        <p className="eyebrow">Active profile health plan</p>
        <h1>Your complete preventive care plan for this profile</h1>
        <p className="lede">
          See every due, planned, and done care step in one place so nothing for this profile gets missed.
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onBackToDashboard}>
            Back to dashboard
          </button>
        </div>
      </section>

      {loadError ? (
        <section className="panel" aria-live="polite">
          <p className="inline-error">{loadError}</p>
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                refreshPlanItems(profile, setHealthItems, setLoadError);
              }}
            >
              Retry
            </button>
            <button type="button" className="secondary" onClick={onBackToDashboard}>
              Back to dashboard
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="panel plan-totals" aria-label="Plan totals">
            <div className="plan-total-block">
              <p className="eyebrow">Total items</p>
              <h2>{totals.totalCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Due</p>
              <h2>{totals.dueCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Planned</p>
              <h2>{totals.plannedCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Done</p>
              <h2>{totals.doneCount}</h2>
            </div>
            <p className="helper plan-totals-helper">
              Status summary for this profile: Due {totals.dueCount}, Planned {totals.plannedCount}, Done{' '}
              {totals.doneCount}.
            </p>
          </section>

          {navigationError ? (
            <section className="panel" aria-live="polite">
              <p className="inline-error">{navigationError}</p>
            </section>
          ) : null}

          <section className="panel" aria-label="Health plan list">
            <h2>All recommended preventive care steps</h2>
            <ul className="plan-list">
              {healthItems.map((item) => (
                <HealthPlanItem
                  key={item.id}
                  item={item}
                  showWhy={false}
                  showReminder
                  onOpenItem={(itemId) => {
                    if (!itemId) {
                      setNavigationError("We couldn't open this item right now. Please try again.");
                      return;
                    }

                    setNavigationError('');
                    onOpenItem(itemId);
                  }}
                />
              ))}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}

function DesignSystemComponentFoundationDashboardDetailPage({ profile, onRestart }) {
  const [detailHashState, setDetailHashState] = useState(() => readDetailHashStateFromHash());
  const { itemId: activeItemId, fromPlan: isFromPlanRoute } = detailHashState;

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [baseHealthItems, setBaseHealthItems] = useState(() => loadReminderSchedulingItems(profile));
  const [reminderRecords, setReminderRecords] = useState(() => loadPersistedReminderRecords(profile.profileId));

  const [isReminderSheetOpen, setIsReminderSheetOpen] = useState(false);
  const [r
[truncated]
```
## src/routes/first-profile-onboarding-to-generated-dashboard.jsx
```text
import React from 'react';
import { groupPlanItems } from '../features/profile/profilePlan.js';

export function GeneratedDashboardPage({ profile, onRestart }) {
  const groupedItems = groupPlanItems(profile.planItems);
  const profileSummary = [formatAge(profile.ageYears), formatGender(profile.gender)].filter(Boolean).join(' · ');

  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Active profile dashboard</p>
        <h1>Your personalized plan is ready</h1>
        <p className="lede">{profileSummary || 'Your plan is tailored to your profile details.'}</p>
        <button type="button" className="secondary" onClick={onRestart}>
          Start over
        </button>
      </section>

      <section className="panel score-card" aria-label="Health score overview">
        <div>
          <p className="eyebrow">Health score</p>
          <h2>{profile.healthScore ?? '—'}</h2>
        </div>
        <p className="helper">Use this score as your starting point and track progress as you complete your plan.</p>
      </section>

      <section className="dashboard-grid">
        {['Today', 'Soon', 'Later'].map((horizon) => (
          <PrioritySection key={horizon} title={horizon} items={groupedItems[horizon]} />
        ))}
      </section>
    </main>
  );
}

function PrioritySection({ title, items }) {
  return (
    <section className="panel section-card">
      <h2>{title}</h2>
      <ul className="priority-list">
        {items.map((item) => (
          <li key={item.itemCode} className="health-item">
            <div className="health-item-header">
              <span className="health-item-title">{item.title}</span>
              <span className="badge">{item.frequencyLabel}</span>
            </div>
            <p>{item.whyItMatters}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function capitalize(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

functio
[truncated]
```

Review rules:
- Mark fail for user-visible copy that exposes internal implementation, workflow, schema, routing, slice, testing, ranking, or process language.
- Mark fail for malformed user-visible dates, raw enum values, undefined/null/NaN, Invalid Date, [object Object], or raw calculation output.
- Mark fail when user-facing copy only satisfies structure but not the semantic purpose in the contract.
- Mark fail when required visible content is generic filler or not meaningful to an end user.
- Mark pass only if the implemented UI appears semantically fit for the active slice based on available source context.
```
