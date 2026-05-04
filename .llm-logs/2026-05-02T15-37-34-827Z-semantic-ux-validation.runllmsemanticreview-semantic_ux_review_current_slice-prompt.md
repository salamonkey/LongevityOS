# LLM Prompt Log

- task: semantic_ux_review_current_slice
- caller: semantic-ux-validation.runLlmSemanticReview
- provider: openai
- model: gpt-5.4
- started_utc: 2026-05-02T15:37:34.827Z
- prompt_chars: 55908
- prompt_estimated_tokens: 13977
- prompt_sources:
  - docs/product/current-slice.yaml
  - docs/ux/SL-002-semantic-ux-contract.json
  - docs/ux/SL-002-current-slice-flow.md
  - docs/product/project-brief.md
  - docs/product/product-system-framing.md
  - src/App.jsx
  - src/features/first-profile-onboarding-to-generated-dashboard/SliceEntryBridge.jsx
  - src/features/health-item-detail-and-completion/HealthItemDetailAndCompletionPage.jsx
  - src/features/health-item-detail-and-completion/healthItemsModel.js
  - src/features/onboarding/OnboardingPage.jsx
  - src/features/profile/ProfileForm.jsx
  - src/features/profile/profilePlan.js
  - src/main.jsx
  - src/routes/first-profile-onboarding-to-generated-dashboard.jsx
  - src/routes/health-item-detail-and-completion.jsx
  - src/routes/onboarding.jsx
  - index.html

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
  "id": "SL-002",
  "title": "Health Item Detail and Completion",
  "objective": "Let users open any prioritized item, understand what to do and why, and mark the item Done with immediate reflected progress.",
  "in_scope": [
    "Open any dashboard item into a detail view",
    "Show the item action, recommendation frequency, why it matters, and last-known status context",
    "Use the unified status model of Due, Planned, and Done on the detail view",
    "Allow the user to mark a health item as Done from detail view",
    "Update the item state, dashboard placement, and displayed health score after completion"
  ],
  "out_of_scope": [
    "Full health plan list screen",
    "Reminder scheduling",
    "Family profile management",
    "Vaccination tracking"
  ],
  "acceptance_criteria": [
    "Every health item shown on the dashboard opens to a detail view",
    "100% of health item detail views show action, why it matters, and status context",
    "A user can mark an eligible item as Done from detail view and see the updated Done status after returning to the item",
    "After an item is marked Done, the dashboard refreshes without showing the item in more than one priority group",
    "The displayed health score updates consistently after an item is marked Done"
  ]
}
```

Semantic UX contract:
```json
{
  "schema_version": 1,
  "generated_at_utc": "2026-05-02T14:03:29.175Z",
  "slice_id": "SL-002",
  "slice_title": "Health Item Detail and Completion",
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
    "Every health item shown on the dashboard opens to a detail view",
    "100% of health item detail views show action, why it matters, and status context",
    "A user can mark an eligible item as Done from detail view and see the updated Done status after returning to the item",
    "After an item is marked Done, the dashboard refreshes without showing the item in more than one priority group",
    "The displayed health score updates consistently after an item is marked Done"
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
<!-- generated_at: 2026-05-02T14:03:29.175Z -->
# UX Flow - Current Slice

Date: `2026-05-02`
Status: `Ready for implementation`
Scope: `SL-002 Health Item Detail and Completion`

## 1. Context

SL-002 — Health Item Detail and Completion. Define the minimum mobile-first UX flow from prioritized dashboard item tap to item detail review and marking an eligible item Done, with immediate status, dashboard placement, and health score refresh. Scope is limited to dashboard item detail and completion behavior for a single active profile.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User is on the active profile dashboard after onboarding and taps any health item card shown in Today, Soon, or Later.
- Expected behavior:
  - Open a dedicated item detail view for the tapped dashboard item; preserve the active profile context and item identity.
  - Show the item title/action as the page heading so the user can immediately confirm what task they opened.
  - Present a compact status block near the top using the unified status model only: Due, Planned, or Done.
  - Within the same top context area, show recommendation frequency in plain language and last-known status context as a short factual line.
  - Show a 'Why it matters' section directly below the top context so the rationale is visible without requiring additional navigation.
  - Keep the detail view content limited to: action, recommendation frequency, why it matters, current unified status, and last-known status context.
  - For items whose current status is Due or Planned, show a primary action button labeled 'Mark as Done' fixed at the bottom of the viewport or placed prominently after the content.
  - When the user taps 'Mark as Done', update the item status to Done and provide immediate in-view confirmation by changing the visible status label on the detail view to Done before exit or on return state refresh within the same interaction cycle as implemented by the app shell pattern used elsewhere in MVP.

### Flow B - Failure and Recovery Paths

- If the detail data for a tapped dashboard item cannot be loaded, show an inline full-page error state with: item title fallback if available, message 'We couldn’t load this health item right now.', a primary action 'Try again', and a secondary action 'Back to dashboard'; do not show partial or guessed health guidance.
- If the user taps 'Mark as Done' and the save fails, keep the item status unchanged, keep the user on the detail view, show an inline error message near the action area reading 'Couldn’t mark this as done. Try again.', and leave the 'Mark as Done' button available for retry.
- If an item is already Done when the detail view opens, do not show the 'Mark as Done' action; show the Done status as read-only and allow normal back navigation to dashboard.
- If the item becomes ineligible for completion during the session because its status is already Done after refresh, replace the action button with the Done status and do not allow duplicate completion actions.

## 3. Interaction and Validation Rules

- Every dashboard health item card in Today, Soon, and Later must be tappable and open its own detail view.
- The detail view must always display all four required content elements: action, recommendation frequency, why it matters, and last-known status context.
- Only the unified status labels Due, Planned, and Done may appear on the detail view; no additional status terms are introduced in this slice.
- The status label must be visually prominent and appear above the explanatory content.
- The 'Mark as Done' action is shown only when the item status is Due or Planned.
- Tapping 'Mark as Done' must trigger a single completion request per tap and prevent duplicate submissions until the request resolves.
- After a successful completion, the item must no longer appear in more than one dashboard priority group.
- After a successful completion, the dashboard must refresh before or at the moment the user returns so the updated item placement is visible without manual page reload by the user.

## 4. Implementation Constraints

- Do not add reminder-setting UI in this slice.
- Do not introduce a separate full health plan list or alternate entry path; the supported entry is from dashboard items already in scope.
- Do not expose medical-record style fields, provider data, or completion history beyond the single last-known status context line.
- Do not design family switching, profile management, or vaccination-specific detail patterns here.
- Do not introduce new score explanation UI; only the displayed health score value needs to refresh consistently after completion.
- Keep the detail layout single-screen and vertically stacked for mobile-first implementation, with no tabs, accordions, or secondary navigation required for MVP comprehension.

## 5. Acceptance Mapping

- From the dashboard, tapping any visible health item opens a detail view for that exact item.
- On every opened detail view, the user can see the item action, recommendation frequency, why it matters, and last-known status context without navigating elsewhere.
- If an item is Due or Planned, the user can tap 'Mark as Done' from the detail view and then observe the item status shown as Done after the update cycle completes.
- After a successful completion and return to dashboard, the completed item is not duplicated across Today, Soon, or Later.
- After a successful completion, the displayed health score on the dashboard reflects the new state within the same refreshed dashboard view.
- If detail loading fails, the user can either retry loading or return to the dashboard from the error state.
- If completion fails, the user remains on the detail view, sees a clear error message, and can retry without the status falsely changing to Done.

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
import { HealthItemDetailAndCompletionRoute } from './routes/health-item-detail-and-completion.jsx';

const DEFAULT_DRAFT = {
  ageYears: '',
  gender: '',
};

const PROFILE_STORAGE_KEY = 'sl-002-active-profile';

// Keep the SL-001 route symbol in source for legacy smoke coverage.
const LEGACY_DASHBOARD_REFERENCE = GeneratedDashboardPage;
void LEGACY_DASHBOARD_REFERENCE;

export default function App() {
  const [screen, setScreen] = useState(() => (loadStoredProfileSnapshot() ? 'dashboard' : 'welcome'));
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [profile, setProfile] = useState(() => loadStoredProfileSnapshot());

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

  return (
    <HealthItemDetailAndCompletionRoute
      profile={profile}
      onRestart={() => {
        setProfile(null);
        setPendingDraft(null);
        setDraft(DEFAULT_DRAFT);
        setScreen('welcome');
      }}
    />
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
          Age {draft?.ageYears || '—'} · {capitalize(draft?.gender) || '—'}
        </p>
        <p className="helper">This usually takes a moment.</p>
      </section>
    </main>
  );
}

function capitalize(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function loadStoredProfileSnapshot() {
  if (!globalThis.localStorage) {
    return null;
  }

  try {
    const raw = globalThis.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.profileId || !Array.isArray(parsed?.planItems)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
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
  const [activeItemId, setActiveItemId] = useState(() => readItemIdFromHash());
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
    setActiveItemId(readItemIdFromHash());
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
      globalThis.location.hash = `#/health-item/${activeItemId}`;
      return;
    }

    if (globalThis.location.hash.startsWith('#/health-item/')) {
      globalThis.history.replaceState(null, '', '#/dashboard');
    }
  }, [activeItemId]);

  const groupedItems = useMemo(() => groupHealthItemsForDashboard(healthItems), [healthItems]);
  const displayedScore = useMemo(() => calculateDisplayedHealthScore(healthItems), [healthItems]);
  const activeItem = activeItemId
    ? getHealthItemById(profile.profileId, activeItemId, healthItems)
    : null;
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
                setActiveItemId(itemId);
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
              <button
                type="button"
                className="secondary back-button"
                onClick={() => {
                  setActiveItemId(null);
                  setSaveError('');
                }}
              >
                Back to dashboard
              </button>
            </div>
            <h1 className="detail-title">{requestedItemTitle ?? 'Health item details'}</h1>
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
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setActiveItemId(null);
                  setSaveError('');
                }}
              >
                Back to dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="detail-header">
              <button
                type="button"
                className="secondary back-button"
                onClick={() => {
                  setActiveItemId(null);
                  setSaveError('');
                }}
              >
                Back to dashboard
              </button>
              <span className={`status-chip status-${activeItem.status.toLowerCase()}`}>
                {activeItem.status}
              </span>
            </div>
            <h1 className="detail-title">{activeItem.title}</h1>

            <section className="detail-block" aria-label="Action">
              <h2>Action</h2>
              <p>
                {toDisplayText(
                  activeItem.actionLabel,
                  "We don't have a clear next step for this item right now. Review why it matters and check back soon.",
                )}
              </p>
            </section>

            <section className="detail-block" aria-label="Recommendation fre
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
        'Routine care keeps preventive visits predictable.',
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
        'Routine care keeps preventive visits predictable.',
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
        'Lab review gives a simple baseline for this age band.',
        'Within 2 months',
        'Soon',
        2,
      ),
      makeItem(
        'dental-cleaning-40-54-female',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
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
        'Lab review gives a simple baseline for this age band.',
        'Within 2 months',
        'Soon',
        2,
      ),
      makeItem(
        'dental-cleaning-40-54-male',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
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
        'A quick check helps keep the highest-priority items visible.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'annual-visit-55-65-female',
        'Schedule an annual preventive visit',
        'This age band benefits from a regular planning touchpoint.',
        'Within 1 month',
        'Today',
        2,
      ),
      makeItem(
        'bone-health-review-55-65-female',
        'Review bone health screening timing',
        'Bone health planning is easier when it is reviewed on a schedule.',
        'Within 2 months',
        'Soon',
        3,
      ),
      makeItem(
        'dental-cleaning-55-65-female',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
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
        'A quick check helps keep the highest-priority items visible.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'annual-visit-55-65-male',
        'Schedule an annual preventive visit',
        'This age band benefits from a regular planning touchpoint.',
        'Within 1 month',
        'Today',
        2,
      ),
      makeItem(
        'lab-review-55-65-male',
        'Review cholesterol and glucose labs',
        'A simple lab review keeps next steps easy to prioritize.',
        'Within 2 months',
        'Soon',
        3,
      ),
      makeItem(
        'dental-cleaning-55-65-male',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
        'Within 3 months',
        'Soon',
        4,
      ),
      makeItem(
        'prostate-screening-review-55-65-male',
        'Discuss prostate screening timing',
        'Age-based screening timelines deserve a clear
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
## src/routes/first-profile-onboarding-to-generated-dashboard.jsx
```text
import React from 'react';
import { groupPlanItems } from '../features/profile/profilePlan.js';

export function GeneratedDashboardPage({ profile, onRestart }) {
  const groupedItems = groupPlanItems(profile.planItems);

  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Active profile dashboard</p>
        <h1>Your personalized plan is ready</h1>
        <p className="lede">
          Age {profile.ageYears} · {capitalize(profile.gender)} · rule set {profile.ruleSetVersion}
        </p>
        <button type="button" className="secondary" onClick={onRestart}>
          Start over
        </button>
      </section>

      <section className="panel score-card" aria-label="Read-only health score">
        <div>
          <p className="eyebrow">Read-only health score</p>
          <h2>{profile.healthScore}</h2>
        </div>
        <p className="helper">This score comes only from the generated age and gender rules for this profile.</p>
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

export default GeneratedDashboardPage;
```
## src/routes/health-item-detail-and-completion.jsx
```text
import React from 'react';
import { HealthItemDetailAndCompletionPage } from '../features/health-item-detail-and-completion/HealthItemDetailAndCompletionPage.jsx';

export function HealthItemDetailAndCompletionRoute(props) {
  return <HealthItemDetailAndCompletionPage {...props} />;
}

export default HealthItemDetailAndCompletionRoute;
```
## src/routes/onboarding.jsx
```text
export {
  GeneratedDashboardPage,
  GeneratedDashboardPage as HealthPlanPage,
} from './first-profile-onboarding-to-generated-dashboard.jsx';

export { GeneratedDashboardPage as default } from './first-profile-onboarding-to-generated-dashboard.jsx';
```
## index.html
```text
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Longevity Health OS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Review rules:
- Mark fail for user-visible copy that exposes internal implementation, workflow, schema, routing, slice, testing, ranking, or process language.
- Mark fail for malformed user-visible dates, raw enum values, undefined/null/NaN, Invalid Date, [object Object], or raw calculation output.
- Mark fail when user-facing copy only satisfies structure but not the semantic purpose in the contract.
- Mark fail when required visible content is generic filler or not meaningful to an end user.
- Mark pass only if the implemented UI appears semantically fit for the active slice based on available source context.
```
