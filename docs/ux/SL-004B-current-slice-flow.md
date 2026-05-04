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
- The health score display remains read-only and visually consistent wherever the existing score pattern appears, with no new scoring copy or behavior introduced.
- A design-system usage audit over the migrated user-facing paths confirms shared component use for covered patterns and finds no newly introduced raw color literals or inline visual styles in those paths unless already outside this slice's covered patterns.
- Regression checks for the completed onboarding, dashboard, full health plan, item detail, mark-done, and reminder flows still pass after migration, confirming no user-visible behavior loss from the component foundation work.
