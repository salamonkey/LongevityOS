# Current Slice User Checklist

## Slice
- ID: SL-005
- Title: Family Onboarding and Family Overview

## Goal
Allow one account to manage multiple people with separate preventive plans, summaries, and navigation paths.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: Primary entry starts in onboarding immediately after the self-profile age and gender step. Secondary entry for existing users starts from the main navigation item labeled Family.
2. Expected behavior:
3. After the self profile is captured, onboarding shows a dedicated optional step titled for adding family profiles. The screen explains that the account can manage multiple people in one place and that this step can be skipped.
4. The onboarding family step presents two clear actions: a primary action to continue without adding anyone else, and a secondary action to add a family profile. Skipping must not block reaching the first dashboard.
5. Choosing to add a family profile opens the same create-profile form used elsewhere in this slice. The form contains only three fields: display label, age, and gender.
6. Submitting a valid family profile creates the profile, generates that profile's plan immediately, and returns the user to the onboarding family step with the new profile shown in a simple list of added profiles and a visible profile count such as 2 of 5.
7. From the onboarding family step, the user can add another profile, remove nothing, edit nothing, and finish onboarding at any time. When the account reaches 5 total profiles, the add action becomes unavailable and the limit message is shown in place.
8. If the user finishes onboarding with only the self profile, the product follows the existing dependency flow and lands on that profile's dashboard.

## Expected results
- App loads without blank screen or runtime error.
- A family account can create and view at least 2 profiles with separate Health Scores and priority lists
- The account cannot exceed 5 profiles
- Onboarding offers family profile creation without blocking the self-profile flow
- A user can open any family member's dashboard, checkup plan, and vaccinations from the family overview and see person-specific content

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
- [SL-004] Vaccination Tracking Area and Manual Entries
  - A user can add at least 1 manual vaccination entry to the self profile and see it appear in that profile's vaccination list in the same session
  - The vaccination area shows rule-based due guidance for the self profile without implying provider data sync
  - A vaccination entry captures both a date and status context
  - The vaccination list supports empty and populated states without breaking access to due guidance
  - The dashboard or health-plan view appears when the flow is completed.
  - Entry: User is in the self profile context and opens the Vaccinations area from an existing self-scope entry point such as the dashboard or health plan.
  - Expected behavior:
  - Render a dedicated page titled for the self profile vaccination experience, with a clear primary action to add a vaccination entry and no profile switcher on this slice.

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Family Onboarding and Family Overview does not appear.

## Out of scope for this slice
- Profile editing beyond initial creation
- Archive and delete profile actions
- Multi-user permissions or shared account roles
- Cross-profile combined scoring

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
