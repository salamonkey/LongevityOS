# Current Slice User Checklist

## Slice
- ID: SL-004
- Title: Vaccination Tracking Area and Manual Entries

## Goal
Provide a dedicated vaccination experience that combines rule-based due guidance with manual tracking for the self profile.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User is in the self profile context and opens the Vaccinations area from an existing self-scope entry point such as the dashboard or health plan.
2. Expected behavior:
3. Render a dedicated page titled for the self profile vaccination experience, with a clear primary action to add a vaccination entry and no profile switcher on this slice.
4. Show a read-only Due Guidance section first. This section summarizes rule-based vaccination guidance for the self profile using existing MVP rules and clearly communicates what may need attention without implying provider data, verification, or sync.
5. Keep the manual tracking area as a separate section labeled as user-entered vaccination records. Do not merge due guidance rows and manual entry rows into one mixed list.
6. If the user has no manual vaccination entries yet, show an empty state in the manual tracking section with calm explanatory copy and a visible Add vaccination entry action. Due guidance remains visible above it.
7. When the user chooses Add vaccination entry, open a focused create flow with exactly three required inputs: vaccination item from the known MVP vaccination catalog, status context with allowed values completed or planned, and calendar date.
8. On save, validate inputs inline. If valid, persist the manual entry to the self profile, close the create flow, and immediately show the new record in the manual tracking section without a page reload or profile reload.

## Expected results
- App loads without blank screen or runtime error.
- A user can add at least 1 manual vaccination entry to the self profile and see it appear in that profile's vaccination list in the same session
- The vaccination area shows rule-based due guidance for the self profile without implying provider data sync
- A vaccination entry captures both a date and status context
- The vaccination list supports empty and populated states without breaking access to due guidance
- The dashboard or health-plan view appears when the flow is completed.

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
- [SL-003] Item Completion and Reminder Actions
  - A user can mark an item as done from the detail view and see status change to done across all relevant views in the same session
  - A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion
  - Setting a reminder changes the item status to planned across the applicable views in the same session
  - After a status change, the dashboard updates the highlighted next item based on the approved Today-then-Soon rule
  - Entry: User opens a health item detail view for the active profile from the dashboard or a plan list and sees the item title, why-it-matters content, recommendation cadence, current status, and available primary actions.
  - Expected behavior:
  - On detail load, show the current item status as one of due, planned, or done using the existing product status presentation; do not introduce any new labels or reminder-only status.
  - If the item status is due or planned, show two actions in the detail action area: a primary 'Mark as done' action and a secondary 'Set reminder' action.

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Vaccination Tracking Area and Manual Entries does not appear.

## Out of scope for this slice
- Provider sync
- Document upload
- Broad medical record storage
- Non-vaccination manual records
- Family profile vaccination management

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
