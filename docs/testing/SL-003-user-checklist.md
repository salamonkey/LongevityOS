# Current Slice User Checklist

## Slice
- ID: SL-003
- Title: Item Completion and Reminder Actions

## Goal
Turn guidance into follow-through by allowing users to mark items done or planned and see the plan update immediately.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User opens a health item detail view for the active profile from the dashboard or a plan list and sees the item title, why-it-matters content, recommendation cadence, current status, and available primary actions.
2. Expected behavior:
3. On detail load, show the current item status as one of due, planned, or done using the existing product status presentation; do not introduce any new labels or reminder-only status.
4. If the item status is due or planned, show two actions in the detail action area: a primary 'Mark as done' action and a secondary 'Set reminder' action.
5. When the user taps 'Mark as done', submit the action immediately without a secondary form, show a pending state on the action area, and prevent duplicate taps until the request resolves.
6. On successful completion, update the item status to done on the detail view, remove any displayed reminder date for that item, and show the done state in the same rendered screen state.
7. Immediately after a successful done action, refresh all same-session views for the active profile from the shared plan store so the same item reads as done on the dashboard and plan views without reload.
8. Immediately after a successful done action, recompute and display the updated Health Score and recompute the dashboard highlighted next item using the Today-then-Soon rule.

## Expected results
- App loads without blank screen or runtime error.
- A user can mark an item as done from the detail view and see status change to done across all relevant views in the same session
- A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion
- Setting a reminder changes the item status to planned across the applicable views in the same session
- After a status change, the dashboard updates the highlighted next item based on the approved Today-then-Soon rule

## Carry-forward capabilities to preserve (auto-inherited)
- [SL-001] Self Onboarding to First Dashboard
  - A new user can complete onboarding and reach a populated dashboard in 60 seconds or less in a standard moderated walkthrough
  - The first health plan is generated within 5 seconds of onboarding completion
  - Every generated item comes from the locked MVP preventive item set and is assigned to checkups or vaccinations
  - The dashboard shows Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage for the self profile
  - Entry: User opens the first-run onboarding screen for the self profile in an unauthenticated or pre-established current-user context; no family, settings, or alternate destinations are shown in this slice.
  - Expected behavior:
  - Onboarding screen purpose: collect the minimum required inputs and set expectation that a personalized preventive plan will be created immediately after submission.
  - Onboarding layout is a single vertical form with two required fields and one primary action. Sections in order: brief value statement, age field, gender field, primary submit button.
- [SL-002] Health Plan Browsing and Item Detail
  - Every generated health item is visible in a plan view and opens into a detail view
  - 100% of generated health items show a recommendation cadence, one current status, and a why-it-matters explanation
  - A user can open any dashboard-highlighted item into detail and return to the prior view without losing context
  - Item detail copy uses plain-language rationale rather than clinical detail
  - Entry: User enters the current slice from the primary application flow.
  - Expected behavior:
  - Complete the slice objective in the smallest coherent flow.
  - Handle one clear recovery path for invalid or incomplete user action.

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Item Completion and Reminder Actions does not appear.

## Out of scope for this slice
- Reminder delivery outside the app confirmation flow
- Reminder preference management
- Manual vaccination entry
- Family-wide reminder actions

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
