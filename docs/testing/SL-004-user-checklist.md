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
1. Entry: User opens a health item detail view for the active profile on an item where supportsReminder=true.
2. Expected behavior:
3. Item detail shows a secondary Reminder action in the action area near the item status and primary item actions; items without reminder support show no Reminder action.
4. Selecting Reminder opens a reminder picker as a focused overlay with three mutually exclusive timing choices: In 1 month, In 3 months, and Custom date.
5. If no reminder exists yet, the overlay title is Set reminder and the save action is Save reminder; if a reminder already exists, the title is Update reminder and the current saved option is preselected when it matches the stored timingType, otherwise Custom date is selected with the stored date populated.
6. Choosing In 1 month or In 3 months requires no additional input and immediately enables the save action.
7. Choosing Custom date reveals a date input seeded to today or the currently saved custom date; the user must choose today or a future date before save is enabled.
8. On save, the overlay submits one upsert for the active profile and current health item; while saving, the save button shows a loading state and duplicate submissions are blocked.

## Expected results
- A user can save a reminder with 1 month, 3 months, and custom date options for 100% of health items shown with a Reminder action
- A saved reminder remains visible on the same item after page reload in the test account
- The dashboard and full plan view reflect that the item has a saved reminder state
- Updating an existing reminder replaces the previously saved timing
- Reminder creation does not change the item's status unless the existing rules for Planned status require it

## Semantic UX checks
- All user-visible text speaks to the user, not about the system.
- No visible copy exposes internal implementation, workflow, schema, routing, slice, test, ranking, bucket, or process language.
- Labels, explanations, empty states, and status messages are meaningful in the product context.
- Dates, times, counts, and statuses are valid and human-readable.
- Unknown or missing data uses a safe fallback.
- A section existing with bad, generic, or internal copy is marked Fail, not Pass.

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
Status: Pass

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
