# Current Slice User Checklist

## Slice
- ID: SL-004B
- Title: Design System Component Foundation

## Goal
Materialize the approved design-system contract into reusable UI components and migrate existing MVP screens to use them before continuing with family profile management.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User reaches an already-supported MVP path: onboarding completion lands on the dashboard, or an existing user opens a profile dashboard and continues into item detail, reminder scheduling, and full health plan review.
2. Expected behavior:
3. Dashboard top area shows the existing read-only health score through the shared HealthScoreCard pattern, with no new explanation, calculation, or action added.
4. Dashboard priority groups render only through PrioritySection, using the approved horizon labels and order already used by the product so users can scan Today, Soon, and Later consistently.
5. Each health item shown in a dashboard priority group renders through HealthPlanItem, which consistently exposes the item title, recommendation or frequency text, current status, optional reminder summary, and the existing tap target to open detail.
6. Any status shown on dashboard, full plan, or item detail renders through StatusPill and resolves its visible label and tone from the semantic status helper, so the same item status reads the same in every screen location.
7. When the user opens an item, the detail screen preserves the existing information hierarchy: action first, why it matters, status context, and existing actions such as mark done and set reminder, while replacing any ad-hoc status presentation with the shared component layer.
8. When the user chooses Set reminder, the reminder UI uses ReminderSelector with the existing three choices only: 1 month, 3 months, or custom date; selecting a preset makes that choice immediately clear before save.

## Expected results
- App loads without blank screen or runtime error.
- Reusable source components exist for the core design-system components required by completed slices: StatusPill, HealthPlanItem, PrioritySection, HealthScoreCard, and ReminderSelector, or documented equivalents when the implementation architecture uses different names.
- Dashboard, full health plan, item detail, and reminder scheduling screens use the approved component layer instead of duplicating ad-hoc status, card, priority-section, or reminder-selector UI patterns.
- Status and priority display values are driven by semantic helpers or tokens rather than raw colors, raw enum labels, or screen-specific string mappings.
- Existing SL-001 through SL-004 regression paths still pass after the migration.
- A design-system usage audit shows no newly introduced raw hex/rgb/hsl colors or inline visual styles in migrated user-facing UI paths unless explicitly justified in implementation notes.
- The onboarding entry screen is visible and clear.

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Design System Component Foundation does not appear.

## Out of scope for this slice
- No new product features beyond UI component foundation and migration.
- No redesign of product scope, navigation model, or MVP slice plan.
- No external notification integrations, provider integrations, external APIs, real AI, or complex analytics.
- No expansion of family profile or vaccination functionality; those remain in later slices.

## Result
Status: Pending

Use one of:
- Pending
- Pass
- Fail

## Manual QA Findings

Use this section when manual review finds something that should be repaired before closeout.
If the checklist passes, leave this section as `None.`

None.

### Finding 1

Classification:
- [ ] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.
- [ ] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.
- [X] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
-

Expected:
-

Observed:
-

Required repair:
- Migrate existing dashboard/detail/plan/reminder screens to import and use the shared design-system components instead of defining local PrioritySection/status/card/list UI.
