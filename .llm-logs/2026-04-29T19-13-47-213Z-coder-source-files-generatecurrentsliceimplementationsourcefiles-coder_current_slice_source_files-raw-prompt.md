# LLM Prompt Variant Log

- task: coder_current_slice_source_files
- caller: coder-source-files.generateCurrentSliceImplementationSourceFiles
- variant: raw
- started_utc: 2026-04-29T19:13:47.213Z
- prompt_chars: 52964
- prompt_estimated_tokens: 13241
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
  - src/styles.css
  - src/features/onboarding/OnboardingPage.jsx
  - src/features/profile/ProfileForm.jsx
  - src/routes/onboarding.jsx
  - tests/onboarding/onboarding.smoke.test.mjs
- compacted_sources:
  - [none]
- excluded_sources:
  - [none]
- compression_notes:
  - raw prompt baseline before compression treatment
  - prompt_estimated_tokens=13241

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

Product system framing markdown (optional):
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
### src/styles.css
```text
:root {
  color: #0f172a;
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.16), transparent 30%),
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.14), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light;
  --panel: rgba(255, 255, 255, 0.9);
  --panel-border: rgba(148, 163, 184, 0.26);
  --text-muted: #475569;
  --text-soft: #64748b;
  --accent: #0f766e;
  --accent-strong: #115e59;
  --shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  --shadow-soft: 0 14px 32px rgba(15, 23, 42, 0.06);
  --danger: #b91c1c;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  min-height: 100%;
}

body {
  margin: 0;
  min-height: 100vh;
  background: transparent;
}

#root {
  min-height: 100vh;
}

button,
input,
select {
  font: inherit;
}

button {
  border: 0;
}

.app-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 24px 0 48px;
  display: grid;
  gap: 20px;
}

.panel {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
  padding: 24px;
  animation: fade-up 180ms ease-out both;
}

.panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, rgba(15, 118, 110, 0.08), transparent 55%);
  pointer-events: none;
}

.hero {
  padding: 28px;
}

.welcome-hero {
  min-height: 56vh;
  display: grid;
  align-content: center;
  gap: 18px;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  color: var(--accent);
  font-weight: 700;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0;
  font-size: clamp(2rem, 4vw, 3.6rem);
  line-height: 1.02;
  letter-spacing: -0.05em;
}

h2 {
  margin-bottom: 0.6rem;
  font-size: 1.12rem;
  letter-spacing: -0.02em;
}

.lede {
  max-width: 60ch;
  margin-bottom: 0;
  color: var(--text-muted);
  font-size: 1.04rem;
}

.helper,
.microcopy {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.94rem;
}

.microcopy {
  max-width: 52ch;
}

.section-header {
  margin-bottom: 18px;
}

.section-header p {
  margin-bottom: 0;
  color: var(--text-muted);
}

.stack {
  display: grid;
  gap: 18px;
}

.field {
  display: grid;
  gap: 8px;
  font-weight: 600;
}

.field span:first-child {
  font-size: 0.95rem;
}

input,
select {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 16px;
  padding: 13px 14px;
  background: rgba(255, 255, 255, 0.94);
  color: inherit;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

input:focus,
select:focus,
button:focus-visible {
  outline: 2px solid rgba(15, 118, 110, 0.22);
  outline-offset: 2px;
}

input::placeholder {
  color: #94a3b8;
}

.field-error {
  color: var(--danger);
  font-weight: 500;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.primary,
.secondary {
  min-height: 48px;
  padding: 0 18px;
  border-radius: 14px;
  cursor: pointer;
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    background-color 140ms ease,
    border-color 140ms ease;
}

.primary {
  background: linear-gradient(180deg, var(--accent), var(--accent-strong));
  color: white;
  box-shadow: 0 14px 24px rgba(15, 118, 110, 0.2);
}

.secondary {
  background: rgba(255, 255, 255, 0.88);
  color: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.primary:hover,
.secondary:hover {
  transform: translateY(-1px);
}

.primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
  box-shadow: none;
}

.score-card {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}

.score-card h2 {
  margin-bottom: 0;
  font-size: clamp(2rem, 5vw, 3rem);
}

.score-card .helper {
  max-width: 42ch;
}

.dashboard-grid {
  display: grid;
  gap: 18px;
}

.section-card {
  min-height: 100%;
}

.priority-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.health-item {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.88);
  padding: 14px;
}

.health-item p {
  margin: 10px 0 0;
  color: var(--text-muted);
}

.health-item-header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
}

.health-item-title {
  font-weight: 700;
}

.badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--accent-strong);
  font-size: 0.82rem;
  font-weight: 700;
}

.loading-mark {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 4px solid rgba(15, 118, 110, 0.14);
  border-top-color: var(--accent);
  animation: spin 900ms linear infinite;
}

.generating-panel {
  display: grid;
  gap: 18px;
  align-content: start;
  min-height: 46vh;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 760px) {
  .app-shell {
    padding: 36px 0 56px;
    gap: 24px;
  }

  .dashboard-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .app-shell {
    width: min(100% - 20px, 1120px);
    padding: 16px 0 32px;
  }

  .panel {
    border-radius: 20px;
    padding: 20px;
  }

  .welcome-hero {
    min-height: auto;
    padding-top: 34px;
    padding-bottom: 34px;
  }

  .score-card {
    align-items: start;
  }

  .primary,
  .secondary {
    width: 100%;
    justify-content: center;
  }
}
```
### src/features/onboarding/OnboardingPage.jsx
```text
import React from 'react';
import { ProfileForm } from '../profile/ProfileForm.jsx';

export function OnboardingPage({ draft, onDraftChange, onSubmit, onBack }) {
  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Self-only onboarding</p>
        <h1>Build your first profile</h1>
        <p className="lede">
          Enter age and gender. The plan is generated locally from rule-based guidance before the dashboard opens.
        </p>
        <div className="microcopy">
          Only age and gender are collected in this slice. No family mode, reminders, or item editing are included.
        </div>
      </section>

      <section className="panel">
        <header className="section-header">
          <h2>Profile details</h2>
          <p>The generated dashboard will appear only after the first profile plan is built.</p>
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
### src/features/profile/ProfileForm.jsx
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
### src/routes/onboarding.jsx
```text
export {
  GeneratedDashboardPage,
  GeneratedDashboardPage as HealthPlanPage,
} from './first-profile-onboarding-to-generated-dashboard.jsx';

export { GeneratedDashboardPage as default } from './first-profile-onboarding-to-generated-dashboard.jsx';
```
### tests/onboarding/onboarding.smoke.test.mjs
```text
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIORITY_HORIZONS,
  calculateHealthScore,
  createProfileSnapshot,
  generatePersonalHealthPlan,
  groupPlanItems,
  validateOnboardingDraft,
} from '../../src/features/profile/profilePlan.js';

test('valid onboarding inputs generate a deterministic, non-empty plan', () => {
  const draft = { ageYears: '42', gender: 'female' };

  assert.deepEqual(validateOnboardingDraft(draft), {});

  const firstPlan = generatePersonalHealthPlan(draft);
  const secondPlan = generatePersonalHealthPlan(draft);

  assert.deepEqual(firstPlan, secondPlan);
  assert.ok(firstPlan.planItems.length > 0);
  assert.equal(firstPlan.healthScore, calculateHealthScore(firstPlan.planItems));

  const grouped = groupPlanItems(firstPlan.planItems);
  assert.deepEqual(Object.keys(grouped), PRIORITY_HORIZONS);

  const flattened = Object.values(grouped).flat();
  assert.equal(flattened.length, firstPlan.planItems.length);
  assert.equal(new Set(flattened.map((item) => item.itemCode)).size, firstPlan.planItems.length);
  assert.ok(flattened.every((item) => PRIORITY_HORIZONS.includes(item.priorityHorizon)));
});

test('boundary inputs at 30 and 65 still generate plans', () => {
  for (const draft of [
    { ageYears: '30', gender: 'female' },
    { ageYears: '30', gender: 'male' },
    { ageYears: '65', gender: 'female' },
    { ageYears: '65', gender: 'male' },
  ]) {
    const plan = generatePersonalHealthPlan(draft);
    assert.ok(plan.planItems.length > 0);
  }
});

test('invalid onboarding inputs are rejected', () => {
  assert.ok(validateOnboardingDraft({ ageYears: '', gender: '' }).ageYears);
  assert.ok(validateOnboardingDraft({ ageYears: '29', gender: 'female' }).ageYears);
  assert.ok(validateOnboardingDraft({ ageYears: '40.5', gender: 'female' }).ageYears);
  assert.ok(validateOnboardingDraft({ ageYears: '40', gender: 'other' }).gender);
});

test('profile snapshots are generated from the validated draft only', () => {
  const snapshot = createProfileSnapshot({ ageYears: '55', gender: 'male' });

  assert.equal(snapshot.ageYears, 55);
  assert.equal(snapshot.gender, 'male');
  assert.equal(snapshot.ruleSetVersion, 'sl-001-2026-04-25');
  assert.ok(snapshot.generatedAt.includes('T'));
  assert.ok(snapshot.planItems.length > 0);
  assert.equal(snapshot.healthScore, calculateHealthScore(snapshot.planItems));
});
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
