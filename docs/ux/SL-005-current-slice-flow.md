<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-05T15:31:06.802Z -->
# UX Flow - Current Slice

Date: `2026-05-05`
Status: `Ready for implementation`
Scope: `SL-005 Family Onboarding and Family Overview`

## 1. Context

SL-005 covers the minimum family-management UX for one signed-in account with 1 to 5 health profiles. The slice adds an optional family-profile step to onboarding, a Family Overview screen, post-onboarding profile creation, and person-specific navigation into Dashboard, Checkup Plan, and Vaccinations. UX must keep self onboarding fast, make multi-profile relationships obvious, and preserve explicit profile context on every destination screen.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: Primary entry starts in onboarding immediately after the self-profile age and gender step. Secondary entry for existing users starts from the main navigation item labeled Family.
- Expected behavior:
  - After the self profile is captured, onboarding shows a dedicated optional step titled for adding family profiles. The screen explains that the account can manage multiple people in one place and that this step can be skipped.
  - The onboarding family step presents two clear actions: a primary action to continue without adding anyone else, and a secondary action to add a family profile. Skipping must not block reaching the first dashboard.
  - Choosing to add a family profile opens the same create-profile form used elsewhere in this slice. The form contains only three fields: display label, age, and gender.
  - Submitting a valid family profile creates the profile, generates that profile's plan immediately, and returns the user to the onboarding family step with the new profile shown in a simple list of added profiles and a visible profile count such as 2 of 5.
  - From the onboarding family step, the user can add another profile, remove nothing, edit nothing, and finish onboarding at any time. When the account reaches 5 total profiles, the add action becomes unavailable and the limit message is shown in place.
  - If the user finishes onboarding with only the self profile, the product follows the existing dependency flow and lands on that profile's dashboard.
  - If the user finishes onboarding with more than one profile, the product lands on Family Overview so the user can immediately see all profiles and choose where to go next.
  - Family Overview shows one card per profile owned by the account. Each card includes the display label, Health Score, and a due-item summary derived from that profile only. No combined family score is shown anywhere on this screen.

### Flow B - Failure and Recovery Paths

- If the create-profile form is submitted with a missing display label, missing age, non-numeric age, non-whole-number age, age outside 0 to 120, or no gender selected, the form stays open, field-level errors are shown next to the affected inputs, and the save action remains available after correction.
- If the user attempts to create a sixth profile from onboarding or Family Overview, creation is blocked by the server-backed limit, the UI shows a non-technical message that the account has reached the maximum of 5 profiles, and the user stays on the current screen with existing profiles unchanged.
- If profile creation fails because the profile or plan cannot be saved, no partial profile card is inserted, a page-level error message explains that the profile could not be created right now, and the user can retry submission or cancel back to the previous screen.
- If a user opens a dashboard, plan, or vaccinations route with a profileId that does not belong to the signed-in account, no foreign content is rendered, the user sees an account-safe error state, and the recovery action returns them to Family Overview.

## 3. Interaction and Validation Rules

- Use one reusable create-profile form for both onboarding and post-onboarding creation so the fields, validation, and success behavior are identical in both places.
- The create-profile form must contain only display label, age, and gender. No relationship, medical history, contact, archive, or edit controls are shown in this slice.
- Display label is required for family identification in lists and headers. Age is required and must be a whole number from 0 to 120. Gender is required and must use the product's existing onboarding input pattern.
- The Family Overview screen purpose is status summary plus navigation. Required sections are: page title, optional add-profile action when under limit, profile count, and profile card list.
- Each Family Overview card must show: display label, Health Score as a percentage, due-item summary for that profile, and direct actions to open Dashboard, Checkup Plan, and Vaccinations.
- The due-item summary must be profile-specific and scannable. It should reflect current profile state only and never reference another profile or a household total.
- Selecting Dashboard, Checkup Plan, or Vaccinations from Family Overview must set the active profile context and navigate to the matching profile-scoped screen for that profileId.
- Every profile-scoped destination screen reached from this slice must visibly show which profile is active in the top page context using the display label. The user should never have to infer whose data they are viewing.

## 4. Implementation Constraints

- Keep the UX bounded to one account managing 1 to 5 profiles. Do not introduce invitations, multiple account owners, shared roles, or permissions controls.
- Do not add profile editing, deleting, archiving, or merge flows. This slice supports create and view only.
- Do not add a combined family Health Score, household analytics, or cross-profile prioritization.
- Reuse existing dashboard, plan, item detail, reminder, and vaccination experiences as profile-scoped destinations rather than creating family-specific variants of those screens.
- Family Overview must remain a lightweight overview and navigation surface, not a medical-record view or detailed reporting page.
- All person-specific content shown after navigation must resolve through validated profile ownership before rendering.
- Onboarding must preserve the existing self-profile completion path and must not force family creation to finish onboarding.

## 5. Acceptance Mapping

- A new user can complete onboarding without adding family profiles and lands on the self-profile dashboard without encountering a forced family step.
- A new user can add at least one additional family profile during onboarding, finish onboarding, and see more than one profile under the same account.
- Family Overview displays at least two profile cards with separate Health Scores and separate due-item summaries when at least two profiles exist.
- A signed-in user can add profiles after onboarding from Family Overview until the account reaches 5 total profiles, and the UI visibly prevents and explains any attempt to exceed that limit.
- From Family Overview, opening Dashboard, Checkup Plan, or Vaccinations for any listed profile shows person-specific content for the selected profile with the active profile clearly labeled on the destination screen.
