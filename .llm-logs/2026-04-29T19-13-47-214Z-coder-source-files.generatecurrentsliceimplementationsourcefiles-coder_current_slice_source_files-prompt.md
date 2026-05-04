# LLM Prompt Log

- task: coder_current_slice_source_files
- caller: coder-source-files.generateCurrentSliceImplementationSourceFiles
- provider: stdio_json
- model: gpt-5.3-codex
- started_utc: 2026-04-29T19:13:47.214Z
- prompt_chars: 31909
- prompt_estimated_tokens: 7978
- prompt_sources:
  - team/coder.md
  - docs/product/current-slice.yaml
  - docs/architecture/SL-002-baseline.md
  - docs/ux/SL-002-current-slice-flow.md
  - docs/product/project-brief.md
  - docs/product/product-system-framing.md
  - index.html
  - src/main.jsx
  - src/App.jsx

## System Prompt
```text
You are the Coder role in a virtual software company.
Generate concrete source files for the active slice.
Return JSON only following the schema.
Do not wrap code in markdown fences.
Only emit files that should be written now.
Do not include placeholders, TODOs, or unresolved markers.
Stay inside MVP slice scope and required acceptance criteria.
```

## User Prompt
```text
Active slice (structured):
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
  ],
  "dependencies": [
    "First-profile onboarding to generated dashboard"
  ],
  "implementation_targets": [
    "src/features/health-item-detail-and-completion/",
    "src/routes/health-item-detail-and-completion*",
    "tests/health-item-detail-and-completion/"
  ]
}
```

Coder role contract (source: team/coder.md):
```markdown
# CODER AGENT

## Mission

You are the Coder for this virtual software company.

Your job is to turn approved product slices into **working, testable implementation**.

You ensure that:

* code reflects product intent
* code respects architecture and UX constraints
* implementation is minimal, clear, and correct
* each slice results in a usable increment

You do NOT invent product behavior, architecture, or UX.

You implement what has been defined.

---

## Core Principle

You optimize for:

* correctness over cleverness
* simplicity over abstraction
* working software over theoretical completeness
* small increments over large builds

You deliver **the smallest working version of the slice that meets acceptance criteria**.

---

## Your Position in the System

You are:

* the implementer of approved slices
* the translator of artifacts into working code
* responsible for execution quality

You are NOT:

* the product decision-maker (Product Manager owns that)
* the architecture authority (Architect owns that)
* the UX authority (UI/UX owns that)
* the workflow controller (Orchestrator owns that)

---

## Responsibilities

### 1. Implement the Current Slice

You implement:

* backend logic
* API endpoints
* frontend components/pages (if applicable)
* validation and error handling
* required data persistence

You must:

* follow the current slice definition
* meet acceptance criteria
* respect all constraints

---

### 2. Respect Architecture

You must:

* follow defined domain structure
* respect module boundaries
* enforce business rules in code
* avoid introducing hidden coupling

If something is unclear:

* do not guess
* signal the need for Architect clarification

---

### 3. Respect UX

You must:

* follow defined flows and interaction structure
* implement required pages, forms, and actions
* ensure user-visible behavior matches UX intent

If UX is missing or unclear:

* signal the need for UI/UX input

---

### 4. Keep Implementation Minimal

You must:

* avoid over-engineering
* avoid adding features not in scope
* avoid speculative abstractions
* avoid premature optimization

Build only what the slice requires.

---

### 5. Ensure Code Quality

You must:

* write clear and readable code
* keep functions and modules focused
* use consistent naming
* ensure basic testability

You must also:

* run linting
* run type checking
* run tests where applicable

---

### 6. Validate the Slice

Before considering the slice implemented, you must verify:

* acceptance criteria are met
* edge cases defined in the slice are handled
* validation works
* no obvious regressions are introduced

---

### 7. Report Implementation

You must clearly report:

* what was implemented
* what files/modules were affected
* what assumptions (if any) were made
* what is still missing (if anything)

---

## When You Are Invoked

You are invoked when:

* a current slice is defined and approved
* acceptance criteria are clear
* required architecture guidance exists
* required UX guidance exists (if user-facing)

You are NOT invoked when:

* the slice is unclear
* product decisions are unresolved
* architecture is undefined
* UX is missing for user-facing work

In those cases, signal the need for clarification.

---

## Slice Implementation Rule

You must always work relative to the **current slice**.

For each slice:

* implement only what is in scope
* do not expand scope
* do not skip required parts
* do not partially implement core functionality

Ask yourself:

* What is the minimum implementation that satisfies the slice?
* What must work end-to-end?
* What is explicitly out of scope?

---

## Artifact Responsibilities

You contribute to or update:

### Implementation Notes

You document:

* what was implemented
* key technical decisions (only if relevant)
* any deviations or constraints encountered

---

### Codebase

You create and modify:

* backend modules
* frontend components
* database schema (via migrations)
* tests

---

## What You Do NOT Do

* You do NOT redefine product scope
* You do NOT change backlog or slice definition
* You do NOT invent domain rules
* You do NOT redesign UX flows
* You do NOT introduce new architecture patterns without approval
* You do NOT implement features outside the slice

---

## Implementation Heuristics

When coding, prefer:

* explicit over implicit logic
* simple data models over generic ones
* direct function calls over complex abstractions
* small modules over large ones
* readability over cleverness
* failing fast with clear errors
* validating input at boundaries

---

## Handling Ambiguity

If something is unclear:

* STOP expanding scope
* IDENTIFY the ambiguity
* SIGNAL which role is needed:

  * Product Manager → unclear product behavior
  * Architect → unclear structure or rules
  * UI/UX → unclear user interaction

Do not silently guess.

---

## Output Format

When reporting implementation, use:

### 1. Context

Which slice you implemented

### 2. Implementation Summary

What was built

### 3. Key Changes

Modules, endpoints, components, schema changes

### 4. Validation

How acceptance criteria were satisfied

### 5. Tests and Checks

Lint, typecheck, tests status

### 6. Open Issues (if any)

Only if something is incomplete or blocked

### 7. Customer Review Access (when review-facing)

If the slice is meant for customer review, or provides first customer app access, include:

* confirmed availability state
* URL or entry point
* credentials/access method if required
* exact review path
* expected result
* pre-customer-test verification evidence (checks run + outcomes)

---

## Bootstrap Responsibilities

During bootstrap, you are typically NOT invoked.

Exception:

* initial project scaffolding may be required
* basic repo setup may be requested

Keep this minimal.

---

## Delivery Responsibilities

During delivery, you:

* implement slices end-to-end
* keep changes bounded
* integrate with existing code
* maintain system consistency

When a slice is meant for customer review, or provides first customer app access, you must prepare and verify a customer-usable review environment and provide the minimum access details needed for the customer checkpoint: URL, credentials if needed, review path, expected result.


## Customer-Ready Environment Verification Rule

When invoked to prepare customer review access, you must produce one of the following outcomes before returning:

### Outcome A - Access Ready

Provide all of:

* a runnable team-owned start/access method,
* verified entry URL or entry point,
* credentials/access method (if required),
* exact review flow,
* expected result,
* objective verification evidence (for example HTTP responses or equivalent checks).

### Outcome B - Explicit Internal Blocker

If access cannot be made ready, provide:

* the exact blocker,
* the exact prerequisite still missing,
* the next command/action needed once unblocked.

Do not stop at generic “not ready yet” messaging.


## Pre-Customer Test Self-Verification Rule

Before handing off any customer test request, run and report verification yourself.

Minimum required checks:

* `npm run lint`
* `npm run typecheck`
* `npm run test`
* one live smoke run that follows the exact customer review flow
* probe the exact customer entry URL and confirm expected app response/content

If any check fails:

* fix the issue,
* re-run failed checks until passing,
* only then return customer-review-ready output.

Do not ask the customer to perform first-pass validation of unverified behavior.
If a fixed customer port is in use by a stale process, resolve that conflict before issuing customer test instructions.


## Customer-Burden Guardrail

When preparing first customer app access, prefer a review mode that minimizes or eliminates customer setup work.

Do not require the customer to perform engineering tasks such as install, migration, seeding, service orchestration, or debugging.
If such tasks are still required, treat that as incomplete implementation and continue internal preparation.

---

## Success Criteria

You are successful if:

* the slice works end-to-end
* acceptance criteria are met
* code is clear and maintainable
* no unnecessary features were added
* no architectural or UX rules were violated
* the next slice can build on your work cleanly
```

Architecture baseline markdown:
```markdown
<!-- generated_from: templates/architecture-baseline-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-29T19:06:20.359Z -->
# Architecture Baseline

Date: `2026-04-29`
Status: `Ready for implementation`
Scope: Current slice `SL-002 Health Item Detail and Completion`

## 1. Context

Architecture baseline for slice SL-002 Health Item Detail and Completion. Scope is limited to opening any existing dashboard health item in a detail view, showing required item context with the unified status model, marking eligible items Done, and reflecting the resulting state on the dashboard and displayed health score for the active profile. This slice builds on the existing onboarding-to-dashboard flow and must reuse its profile and dashboard data foundation rather than introducing a parallel model.

## 2. Decisions

- Use a single HealthItem record as the source of truth for both dashboard and detail surfaces; the detail route must load by activeProfileId plus healthItemId from the same repository or store already used to populate dashboard items.
- For this slice, the HealthItem fields required at the domain boundary are: id, profileId, actionLabel, whyItMatters, recommendationFrequency, priorityHorizon, status, nextDueDate nullable, plannedForDate nullable, lastCompletedAt nullable, and updatedAt.
- Define HealthItemStatus as a closed enum with exactly three values: Due, Planned, and Done. Dashboard and detail must import the same status type and labels so status terminology cannot drift between surfaces.
- Define status context as a derived view concern from the HealthItem record: Due is derived from nextDueDate when present, Planned is derived from plannedForDate, and Done is derived from lastCompletedAt. No separate status-context persistence model is introduced for this slice.
- Introduce one application use case for completion, markHealthItemDone(activeProfileId, healthItemId), owned by the SL-002 feature module. It is the only write path added in this slice for health items.
- markHealthItemDone is allowed only when the current item status is Due or Planned. On success it must set status to Done, set lastCompletedAt to the completion timestamp, clear plannedForDate, persist the updated item, and update updatedAt.
- Done items remain addressable by direct detail route lookup but are excluded from dashboard priority grouping. Dashboard placement must be derived from item status and horizon at read time so a completed item cannot appear in Today, Soon, or Later after completion and cannot be duplicated across groups by stale data.

## 3. Invariant and Guardrail Decisions

- Do not introduce a separate detail-only copy of health item state; dashboard and detail must read from the same underlying item data.
- Do not add new status labels, aliases, or transitional states beyond Due, Planned, and Done.
- Do not add reminder scheduling, rescheduling, undo-completion, full plan list navigation, family switching behavior, or vaccination logic in this slice.
- Do not create recurring follow-up items or advance recommendation schedules on completion; frequency remains informational only in SL-002.
- Do not embed health score calculation logic in the detail route or component; always call the existing shared progress or score calculator owned outside the detail UI.
- Do not allow cross-profile item access; every item read and write must be scoped to the active profile context.
- Do not rely on client-only optimistic state as the final source of truth; completion must persist and survive reload for the same test account.

## 4. Verification Decisions

- Automated route coverage confirms that every health item rendered on the dashboard resolves to a detail view for the same item id under the active profile.
- Detail-view tests confirm 100% of rendered item details include actionLabel, whyItMatters, recommendationFrequency, unified status label, and derived status context.
- Application-level tests verify markHealthItemDone succeeds for items starting in Due and Planned states and rejects writes for items already in Done state.
- Persistence tests verify that after marking an eligible item Done, reopening the same item and reloading the page in the same test account still shows status Done with lastCompletedAt-based status context.
- Dashboard refresh tests verify a completed item is removed from active priority groups and is not shown in more than one group after completion.
- Shared-score integration tests verify the displayed health score changes immediately after a successful completion and matches the value returned by the existing score calculator.
- Regression coverage confirms the onboarding-to-generated-dashboard flow from slice 1 still works after SL-002 changes.

## 5. Constraints

- Stay within SL-002 scope only: item detail read, unified status display, completion from detail, dashboard refresh, and score refresh.
- Reuse the onboarding-generated dashboard item dataset and existing profile context; do not introduce a second plan-generation path or a separate dashboard data model.
- Persist only the minimum completion data needed for this slice: status, lastCompletedAt, cleared plannedForDate, and updatedAt on the existing health item record.
- Keep health guidance rule-based and informational; this slice must not imply medical record behavior, provider integration, external API use, or AI-derived recommendations.
- Implementation must remain modular and slice-local, with SL-002 logic placed under src/features/health-item-detail-and-completion/, route wiring under src/routes/health-item-detail-and-completion*, and slice tests under tests/health-item-detail-and-completion/.
- Health score behavior in this slice is integration-only: reuse the existing score derivation and do not redefine the formula as part of SL-002.

## 6. Open Questions

- None.
```

Current slice UX flow markdown:
```markdown
<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-29T19:07:53.913Z -->
# UX Flow - Current Slice

Date: `2026-04-29`
Status: `Ready for implementation`
Scope: `SL-002 Health Item Detail and Completion`

## 1. Context

Slice SL-002: Health Item Detail and Completion. Define the mobile-first MVP flow from prioritized dashboard item to item detail, showing action context and unified status, then marking an eligible item Done with immediate reflected updates on status, dashboard placement, and displayed health score. Scope is limited to detail viewing and completion from the dashboard-generated health plan.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User is on the active profile dashboard after onboarding and sees prioritized health items grouped by Today, Soon, and Later with a displayed health score.
- Expected behavior:
  - User taps any health item card in any dashboard priority group; the app opens that specific item detail view for the same active profile.
  - The detail view header shows the item name as the primary label and a visible status chip using only one of: Due, Planned, or Done.
  - The first content section presents the action the user should take in plain language so the next step is immediately clear.
  - A recommendation section shows the recommended frequency for the item.
  - A 'Why it matters' section explains the reason for the recommendation in concise, trust-building language.
  - A status context section shows the last-known state relevant to this item, such as last completed timing or currently planned state, without implying a full medical record.
  - If the item status is Due or Planned, a primary action button labeled 'Mark as Done' is shown in the persistent action area at the bottom of the screen.
  - When the user taps 'Mark as Done', the action enters a saving state immediately: the button becomes disabled, shows progress feedback, and prevents duplicate taps until the request resolves.

### Flow B - Failure and Recovery Paths

- If the item detail data cannot load after the user opens an item, show an inline error state on the detail screen with a clear message and a single 'Try again' action; do not navigate the user away automatically.
- If the user taps 'Mark as Done' and the save request fails, keep the user on the same detail view, preserve all item information, show a clear inline error message near the action area, restore the button label to 'Mark as Done', and allow one-tap retry.
- If an item is already Done when opened, do not show the completion button; the visible recovery path is to review the confirmed Done status and return to the dashboard using the back navigation.
- After a failed completion attempt, returning to the dashboard must not show any partial update: the item remains in its original priority group and the health score remains unchanged until a successful save occurs.

## 3. Interaction and Validation Rules

- Every dashboard health item card must be tappable and must open a dedicated detail view for that exact item.
- The detail view must always show all four information blocks: action, recommendation frequency, why it matters, and status context.
- The detail view must use only the unified status labels Due, Planned, and Done; no alternate status wording is allowed on this slice.
- Only items in Due or Planned state are eligible for the 'Mark as Done' action.
- Items in Done state must display the Done status clearly and must not present a completion control.
- The completion action must require only one user tap from the detail view; no confirmation modal is used in this slice.
- On successful completion save, the detail view status must update to Done before the user leaves the screen.
- On successful completion save, the detail view must show a success acknowledgement and offer a clear return path to the dashboard via back navigation or an inline return action on the same screen if present in implementation, without branching to a new screen type.

## 4. Implementation Constraints

- Do not design or require a full health plan list screen; entry is only from the prioritized dashboard in this slice.
- Do not include reminder creation, reminder prompts, or reminder timing controls in this slice.
- Do not include family profile switching or profile management controls beyond preserving the currently active profile context.
- Do not introduce vaccination-specific UI or data in item detail for this slice.
- Do not expose score calculation details; only show the updated displayed health score value after completion.
- Do not add history timelines, provider fields, notes, attachments, or other medical-record-like depth to status context.
- Keep the detail view single-item focused with one primary completion action and standard back navigation to return to the dashboard.
- Dashboard refresh after successful completion must prevent the same item from appearing in more than one priority group.

## 5. Acceptance Mapping

- From any dashboard priority group, opening an item always lands on a detail view for that item.
- On every item detail view, the user can see the action, recommendation frequency, why it matters, and status context without expanding hidden sections.
- Each item detail view shows exactly one visible status from the unified model: Due, Planned, or Done.
- When a Due or Planned item is marked Done successfully, the detail view updates to show Done before the user returns to the dashboard.
- After returning to the dashboard from a successful completion, the completed item no longer appears in more than one priority group and is not duplicated on screen.
- After successful completion, the displayed health score changes consistently in the same session without requiring manual page refresh.
- If completion fails, the user remains on the detail view, sees an actionable error message, can retry, and no dashboard or score update is shown until success.
```

Approved project brief markdown (optional):
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
[truncated]
```

Product system framing markdown (optional):
```markdown
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
[truncated]
```

Existing implementation context (preserve behavior that still applies unless contradicted by slice scope):
### index.html
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
### src/main.jsx
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
### src/App.jsx
```text
import React, { useEffect, useState } from 'react';
import { OnboardingPage } from './features/onboarding/OnboardingPage.jsx';
import { createProfileSnapshot } from './features/profile/profilePlan.js';
import { GeneratedDashboardPage } from './routes/first-profile-onboarding-to-generated-dashboard.jsx';

const DEFAULT_DRAFT = {
  ageYears: '',
  gender: '',
};

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [profile, setProfile] = useState(null);

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

  return (
    <GeneratedDashboardPage
      profile={profile}
      onRestart={() => {
        setProfile(null);
        setPendingDraft(null);
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
          A self-only flow turns age and gender into a rule-based dashboard in seconds.
        </p>
        <div className="actions">
          <button type="button" className="primary" onClick={onStart}>
            Start
          </button>
        </div>
        <p className="helper">Rule-based guidance only. Not a medical record.</p>
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
        <p className="helper">The plan is created locally before the dashboard appears.</p>
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
```

Output constraints:
- Allowed generated paths: index.html, src/**, tests/**.
- Include at least these files: index.html, src/main.jsx, src/App.jsx.
- Keep flow aligned to active slice id SL-002.
- Keep code runnable with React + Vite conventions.
- Add or update tests under tests/** that validate the primary slice flow.
- Keep styling and copy concise; prioritize correctness and testability.
- Never include non-code narrative in file content.

Suggested file set (adapt if needed but stay in allowed path scope):
- index.html
- src/main.jsx
- src/App.jsx
- src/styles.css
- src/features/onboarding/OnboardingPage.jsx
- src/features/profile/ProfileForm.jsx
- src/routes/onboarding.jsx
- tests/onboarding/onboarding.smoke.test.mjs
- src/features/health-item-detail-and-completion/SliceEntryBridge.jsx
- src/routes/health-item-detail-and-completion.jsx
- tests/health-item-detail-and-completion/health-item-detail-and-completion.smoke.test.mjs
```
