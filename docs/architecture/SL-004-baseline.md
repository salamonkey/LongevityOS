<!-- generated_from: templates/architecture-baseline-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-02T19:47:06.883Z -->
# Architecture Baseline

Date: `2026-05-02`
Status: `Ready for implementation`
Scope: Current slice `SL-004 Reminder Scheduling From Health Items`

## 1. Context

Architecture baseline for slice SL-004 Reminder Scheduling From Health Items. This slice adds per-profile reminder scheduling from health item detail with preset 1 month, preset 3 months, or custom date timing, and reflects saved reminder state back into item detail, dashboard, and full health plan surfaces without introducing delivery channels or broader notification preferences.

## 2. Decisions

- Model reminder as a separate per-profile, per-health-item record rather than a health item status change. The record key is the tuple (profileId, healthItemId) and there is at most one active reminder for that tuple.
- A reminder record contains only slice-required fields: profileId, healthItemId, timingType enum {ONE_MONTH, THREE_MONTHS, CUSTOM_DATE}, remindOnDate as a date-only value, createdAt, and updatedAt.
- Reminder eligibility is owned by the health item model through an explicit supportsReminder capability flag already exposed to views. The Reminder action is shown only when supportsReminder is true.
- Saving and updating use one upsert application command keyed by (profileId, healthItemId). If a reminder already exists, the new timingType and remindOnDate replace the existing values in the same record.
- Preset timings are computed as calendar-month offsets from the save date: ONE_MONTH adds 1 calendar month and THREE_MONTHS adds 3 calendar months, clamping to the last valid day of the target month when needed.
- Custom reminder input is persisted as a date-only value and must be today or later. Past custom dates are rejected by validation before persistence.
- Reminder state exposed to UI surfaces is a shared projection derived from the reminder record: hasReminder boolean, remindOnDate, and timingType. Item detail, dashboard, and full plan must all read from this same projection contract rather than duplicating reminder logic per screen module.

## 3. Invariant and Guardrail Decisions

- Do not couple reminder persistence to health item status persistence; reminder save/update must not directly mutate Due, Planned, or Done state.
- Do not add reminder delivery channels, notification jobs, provider integrations, or account-level preference dependencies in this slice.
- Do not create multiple reminders for the same profile and health item; update must replace the prior reminder rather than append history.
- Do not allow reminders on items lacking supportsReminder; reject unsupported saves in server-side/application validation even if a client attempts submission.
- Do not store time-of-day, recurrence rules, snooze logic, or family-wide reminder controls in this slice.
- Do not let dashboard or full plan compute reminder state independently; they must consume the same derived reminder projection used by item detail.

## 4. Verification Decisions

- Test that every health item rendered with supportsReminder=true shows a Reminder action and every item with supportsReminder=false does not.
- Test preset save path for ONE_MONTH and THREE_MONTHS creates a reminder record with the expected timingType and computed remindOnDate.
- Test custom date save path accepts today or a future date and rejects a past date.
- Test page reload on the same item detail rehydrates and displays the saved reminder state from persistence for the test account.
- Test updating an existing reminder for the same profileId and healthItemId keeps a single record and replaces the previous timingType and remindOnDate.
- Test dashboard and full health plan both reflect hasReminder=true for the item after save, using the shared reminder projection.
- Regression test that reminder save/update does not change item status except where pre-existing Planned status rules already derive from reminder presence outside this slice's logic path if such rules exist in the current system.

## 5. Constraints

- Scope is limited to reminder scheduling from item detail and reminder-state reflection on item detail, dashboard, and full health plan only.
- The domain boundary remains profile-scoped: reminders belong to one profile and one health item; no cross-profile or family-bulk behavior is introduced.
- Implementation must live within the SL-004 slice paths and consume existing health item/profile models rather than redefining them.
- Persistence must survive page reload for the test account and must not rely on client-only storage.
- Reminder wording and state labels must remain non-clinical and must not imply medical advice, urgency handling, or emergency support.
- This slice may expose reminder data needed for current prioritized surfaces only; it must not introduce generalized notification architecture or analytics events as required dependencies.

## 6. Open Questions

- Reminder creation must not change item status directly in this slice; if the current system already derives Planned status from reminder presence elsewhere, SL-004 must reuse that existing rule without adding a new status rule here.
