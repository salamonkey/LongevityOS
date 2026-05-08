# Current Slice User Checklist

## Slice
- ID: SL-006
- Title: Profile Area and Household Preferences

## Goal
Let users maintain profile basics and limited household settings without expanding the MVP into full account customization.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User opens the Profile area from app navigation or the family/household overview entry already present in the MVP.
2. Expected behavior:
3. The Profile area opens on a household list view showing one card per profile owned by the current account.
4. Each profile card shows display name, age, gender, Health Score summary, due-item summary, and three direct navigation actions: Dashboard, Plan, Vaccinations.
5. A primary Add profile action is visible while the account has fewer than 5 profiles.
6. Selecting Add profile opens a short form with fields for display name, age, and gender, plus Create profile and Cancel actions.
7. Create profile remains disabled until all required fields are valid. Inline validation appears on blur and on submit.
8. Submitting a valid create form creates the profile, generates that new profile's plan, returns the user to the household list, and shows the new profile card in the same session.

## Expected results
- App loads without blank screen or runtime error.
- A user can create, view, and edit profiles from the profile area
- Editing a profile's age or gender updates that profile's generated plan and current dashboard in the same session
- The preferences area contains reminder settings and household management only
- No archive or delete controls are present anywhere in the MVP profile management flow

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
- [SL-005] Family Onboarding and Family Overview
  - A family account can create and view at least 2 profiles with separate Health Scores and priority lists
  - The account cannot exceed 5 profiles
  - Onboarding offers family profile creation without blocking the self-profile flow
  - A user can open any family member's dashboard, checkup plan, and vaccinations from the family overview and see person-specific content
  - Entry: Primary entry starts in onboarding immediately after the self-profile age and gender step. Secondary entry for existing users starts from the main navigation item labeled Family.
  - Expected behavior:
  - After the self profile is captured, onboarding shows a dedicated optional step titled for adding family profiles. The screen explains that the account can manage multiple people in one place and that this step can be skipped.
  - The onboarding family step presents two clear actions: a primary action to continue without adding anyone else, and a secondary action to add a family profile. Skipping must not block reaching the first dashboard.

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Profile Area and Household Preferences does not appear.

## Out of scope for this slice
- Archive or delete profile actions
- Broad account customization
- Medical history capture beyond MVP inputs and vaccination entries
- New reminder channels or external notification integrations

## Result
Status: Pass

Use one of:
- Pending
- Pass
- Fail
## Manual QA Findings

Use this section when manual review finds something that should be repaired before closeout.
If the checklist passes, leave this section as `None.`

### Finding 1

Classification:
- [ ] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.
- [ ] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.
- [x] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
- Current slice artifacts are insufficient to validate the required SL-006 functional behavior end to end.

Expected:
- The current implementation evidence should clearly show or verify that users can open the Profile area, see one household card per owned profile with the required summaries/actions, add a profile through a validated form, return to the list with the new card in the same session, edit age/gender for an existing profile, and have that profile's plan and dashboard update in the same session while preferences remain limited to reminder settings and household management.

Observed:
- The provided materials show a semantic UX pass and the presence of a carry-forward invariants test file, but they do not include slice-specific functional verification or enough implementation detail to confirm the checklist behaviors. The implementation notes still show 'Completed Scope' as not closed and list no slice code changes in the repair run, and the supplied source snippets do not demonstrate the add/edit/regenerate flows.

Required repair:
- Provide or complete slice-specific implementation/verification evidence for SL-006, including tests or runnable proof covering household list rendering, Add profile form validation/submit behavior, same-session profile creation visibility, editing age/gender, same-session plan/dashboard regeneration after edits, and confirmation that preferences expose only reminder settings and household management.
