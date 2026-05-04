<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-04T06:35:24.956Z -->
# UX Flow - Current Slice

Date: `2026-05-04`
Status: `Ready for implementation`
Scope: `SL-004 Reminder Scheduling From Health Items`

## 1. Context

SL-004 Reminder Scheduling From Health Items. Define the MVP user-visible flow for creating and updating a per-profile reminder from health item detail, then reflecting that reminder state on the same item detail, dashboard, and full health plan using the shared reminder projection. Scope is limited to items with supportsReminder=true and reminder timing choices of 1 month, 3 months, or custom date.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User opens a health item detail view for the active profile on an item where supportsReminder=true.
- Expected behavior:
  - Item detail shows a secondary Reminder action in the action area near the item status and primary item actions; items without reminder support show no Reminder action.
  - Selecting Reminder opens a reminder picker as a focused overlay with three mutually exclusive timing choices: In 1 month, In 3 months, and Custom date.
  - If no reminder exists yet, the overlay title is Set reminder and the save action is Save reminder; if a reminder already exists, the title is Update reminder and the current saved option is preselected when it matches the stored timingType, otherwise Custom date is selected with the stored date populated.
  - Choosing In 1 month or In 3 months requires no additional input and immediately enables the save action.
  - Choosing Custom date reveals a date input seeded to today or the currently saved custom date; the user must choose today or a future date before save is enabled.
  - On save, the overlay submits one upsert for the active profile and current health item; while saving, the save button shows a loading state and duplicate submissions are blocked.
  - On successful save, the overlay closes and item detail immediately shows reminder state in the item summary area as Reminder set for [date], with the Reminder action changing to Edit reminder.
  - When the user reloads the same item detail, the saved reminder state is still shown from persisted data, not local-only UI state; opening Edit reminder shows the saved timing as the current selection and saving again replaces the previous timing/date instead of creating a second reminder state in the UI projection for

### Flow B - Failure and Recovery Paths

- If the user selects Custom date and chooses a past date, inline validation appears directly under the date input: Choose today or a future date. Save remains disabled until the date is corrected.
- If save fails because the item does not support reminders or the server rejects the request, the overlay stays open, preserves the user’s selection, and shows a non-blocking error message at the top of the overlay: Reminder couldn’t be saved. Try again.
- If save fails بسبب a temporary network or server issue, the overlay stays open, the loading state ends, the prior input remains intact, and the user can retry save or close the overlay without changing the existing reminder shown elsewhere.
- If dashboard or full plan data has not refreshed yet after a successful save, surfaces that re-query the shared reminder projection must show the saved reminder state on next load; no surface may compute a different reminder status locally.

## 3. Interaction and Validation Rules

- Show the Reminder action only when supportsReminder=true for that health item; do not render a disabled Reminder control for unsupported items.
- Use one reminder state per profileId plus healthItemId; the UI must present update semantics, not add-another semantics.
- Reminder UI must be launched from item detail only in this slice; dashboard and full plan may reflect reminder state but do not provide reminder editing entry points unless already present outside this slice.
- The timing choices must be labeled in user language, not enum language: In 1 month, In 3 months, Custom date.
- Preset dates are not manually editable once selected; the actual remindOnDate is displayed only after save in the saved state summary.
- Custom date validation is date-only and must reject any calendar date before today in the user-facing form before persistence is attempted.
- Saving a reminder must not by itself change the visible item status unless an existing system rule already derives Planned from reminder presence; this slice must not introduce a new status transition message or celebration state.
- Saved reminder state on item detail must include both presence and date, using calm non-clinical copy such as Reminder set for Jun 12, 2026; avoid urgent or medical-advice language.

## 4. Implementation Constraints

- Do not include reminder delivery channel selection, notification preferences, recurrence, snooze, time-of-day, or delete/cancel reminder flows in this slice.
- Do not design or imply family-wide reminder controls; all reminder behavior is for the currently active profile and current health item only.
- Do not allow the dashboard or full health plan to invent reminder labels independently; both must consume the same shared projection fields hasReminder, remindOnDate, and timingType.
- Do not couple reminder save UI to health item status editing UI; reminder action remains a separate control from Mark done or other item actions.
- Persistence must survive page reload for the test account; UI cannot rely on client-only memory to display saved reminder state.
- Use calm, trustworthy language consistent with a preventive navigator product; avoid clinical instructions, alarmist phrasing, or unsupported claims about outcomes.
- Keep the flow lightweight: one overlay, three choices, one save action, immediate return to the item detail context.

## 5. Acceptance Mapping

- For every rendered health item detail with supportsReminder=true, the user can open the reminder picker and save using In 1 month, In 3 months, or Custom date.
- After saving, the same item detail visibly changes from no saved reminder state to a saved reminder summary plus an Edit reminder action without requiring manual navigation away.
- Reloading the same item detail in the test account still shows the previously saved reminder summary for that profile and item.
- When an existing reminder is edited and saved with a different timing, reopening the picker shows only the latest saved timing/date and the UI does not expose multiple reminders for the same item.
- Dashboard prioritized item surfaces and the full health plan both show that the item has a saved reminder state after the save path completes and data reloads.
- Saving or updating a reminder does not visibly change the item status unless the current product already derives Planned from reminder presence through an existing rule outside this slice.
