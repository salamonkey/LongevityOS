<!-- generated_from: templates/architecture-baseline-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-05T10:36:50.972Z -->
# Architecture Baseline

Date: `2026-05-05`
Status: `Ready for implementation`
Scope: Current slice `SL-003 Item Completion and Reminder Actions`

## 1. Context

Architecture baseline for SL-003 Item Completion and Reminder Actions. This slice adds item-level follow-through actions from the detail view for an already generated profile plan. The baseline covers only same-session completion, reminder creation, confirmation display, and immediate propagation of status-dependent plan summaries across dashboard, plan views, and detail.

## 2. Decisions

- The existing Health Item remains the only aggregate root for this slice's action state. No standalone reminder management domain is introduced; each item may carry at most one active reminder value object used only to support planned status and confirmation in the current session.
- Health Item status is constrained to the existing MVP set: due, planned, and done. Marking an item as done always sets status to done and removes any active reminder from that item. Creating a reminder always sets status to planned and stores reminder metadata on that same item.
- Reminder metadata is stored as a small value object on the item with: timingType (one_month, three_months, custom_date), scheduledFor (resolved calendar date), and createdAt. Preset choices are converted to a concrete scheduledFor date at creation time so all views and confirmation use the same resolved value.
- All status-changing behavior is owned by a single item action application service inside src/features/item-completion-and-reminder-actions/. This service exposes two use cases only for this slice: markItemDone(profileId, itemId) and scheduleItemReminder(profileId, itemId, reminderInput). UI components and routes must调用
- The profile-scoped plan store is the single mutable source of truth for item status in the session. Dashboard, plan views, detail view, highlighted next item, and Health Score must all read from shared selectors over the same store data rather than keeping independent local copies of item state.
- Highlighted next item is a derived value, not persisted data. After any item action, recompute it from the updated item collection using the approved Today-then-Soon rule: choose the highest-priority Today item if any remain, otherwise choose the earliest Soon item, otherwise show no highlighted next item.
- Health Score is also a derived value, recomputed immediately after each item action from the updated profile plan. For this slice, done items count as completed and both due and planned items count as outstanding; the score must not give planned items partial completion credit or introduce analytics beyond this rule.

## 3. Invariant and Guardrail Decisions

- Do not add new statuses such as skipped, dismissed, snoozed, overdue, or reminded in this slice.
- Do not create a notification delivery subsystem, background job, reminder inbox, or reminder preference model; reminder creation ends at in-app confirmation and stored planned state.
- Do not introduce family-wide or cross-profile action handling; all commands are scoped to one profileId and one itemId.
- Do not duplicate mutation logic in dashboard, plan, and detail components; all writes must pass through the shared item action service.
- Do not persist confirmation as a domain status; confirmation is a transient UI result derived from a successful reminder command.
- Do not allow multiple active reminders on one item in this slice; creating a reminder replaces any prior active reminder metadata on that same item.
- Do not require onboarding reruns, plan regeneration, or page reload to reflect status changes within the active session.

## 4. Verification Decisions

- Automated test: from item detail, markItemDone changes the target item's status to done and removes reminder metadata if present.
- Automated test: after markItemDone, the same updated status is visible from selectors used by detail, dashboard, and plan views for the active profile in the same session.
- Automated test: scheduleItemReminder accepts exactly three timing inputs for this slice: one_month, three_months, and custom_date; each produces status planned and a resolved scheduledFor date.
- Automated test: successful reminder creation returns data needed for a confirmation state and the confirmation is shown without introducing a new persisted status.
- Automated test: after reminder creation, the item reads as planned across dashboard, plan views, and detail in the same session.
- Automated test: after either action, highlighted next item is recomputed using Today-then-Soon from the updated profile plan rather than stale pre-action data.
- Automated test: Health Score changes immediately after item completion or reminder creation using done versus outstanding counts only, with planned counted as outstanding and done counted as completed.

## 5. Constraints

- Implementation must stay inside SL-003 scope: item completion, reminder scheduling from detail, confirmation display, same-session propagation, and derived dashboard updates only.
- The slice must reuse the existing profile plan and item detail foundations from prior slices rather than introducing a parallel action data model.
- Reminder timing must be limited to 1 month, 3 months, or an explicit chosen date; no recurring schedules, time-of-day selection, or channel selection are allowed.
- Chosen date must resolve to a date value stored on the item; this slice does not require timezone-specific delivery behavior because delivery is out of scope.
- Any repository or persistence write for this slice must preserve profile ownership boundaries so one profile's item changes cannot affect another profile's plan.
- Derived calculations for highlighted next item and Health Score must execute from the updated in-session plan data immediately after a successful action and must not depend on full profile regeneration.
- Implementation artifacts must remain bounded to src/features/item-completion-and-reminder-actions/, src/routes/item-completion-and-reminder-actions*, and tests/item-completion-and-reminder-actions/ plus the required documentation/test evidence updates named in the slice definition.

## 6. Open Questions

- None.
