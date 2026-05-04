# Current Slice User Checklist

## Slice
- ID: SL-004
- Title: Reminder Scheduling From Health Items

## Goal
Allow users to save a reminder from item detail with preset or custom timing and see that reminder state reflected back in the app.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User opens a profile-specific health item detail page from the dashboard or full health plan for an item where supportsReminder=true.
2. Expected behavior:
3. The item detail action area shows a Reminder action only for items with supportsReminder=true. Items without support show no reminder control.
4. If the item has no saved reminder, the action label is "Set reminder". If the item already has a saved reminder, the detail page shows a reminder summary row with the saved date and an action label of "Change reminder".
5. Tapping the reminder action opens a focused reminder sheet/modal on top of item detail with a single-select timing form and a primary save action.
6. The reminder form presents exactly three timing choices: "In 1 month", "In 3 months", and "Choose a date".
7. Preset choices immediately show the resolved reminder date in helper text so the user sees the exact saved date before confirming.
8. Selecting "Choose a date" reveals a date input using a native date picker. The field is required only when the custom option is selected.

## Expected results
- A user can save a reminder with 1 month, 3 months, and custom date options for 100% of health items shown with a Reminder action
- A saved reminder remains visible on the same item after page reload in the test account
- The dashboard and full plan view reflect that the item has a saved reminder state
- Updating an existing reminder replaces the previously saved timing
- Reminder creation does not change the item's status unless the existing rules for Planned status require it

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Reminder Scheduling From Health Items does not appear.

## Out of scope for this slice
- Push, email, or SMS channel selection
- Global reminder notifications preference
- Family-specific reminder controls
- Vaccination tracking

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
- [ ] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
-

Expected:
-

Observed:
-

Required repair:
-
