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
- If the user attempts to save a custom reminder date with no date or a past date, the reminder is not created and the user sees an inline validation message with the form still available for correction.
- If a done or reminder action request fails, the prior item status remains visible and the user can retry from the same detail view without losing context.
