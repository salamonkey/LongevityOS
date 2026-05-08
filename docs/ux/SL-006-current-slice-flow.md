<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-05T18:10:31.352Z -->
# UX Flow - Current Slice

Date: `2026-05-05`
Status: `Ready for implementation`
Scope: `SL-006 Profile Area and Household Preferences`

## 1. Context

SL-006 defines the MVP profile area and preferences experience for an account with up to 5 health profiles. The slice covers four user-visible surfaces only: a profile area that lists all profiles, a create-profile form, a profile detail/edit view, and a preferences view limited to reminder settings plus household management. The core user goal is to maintain basic profile data and move between household members' dashboard, plan, and vaccinations without expanding into full account settings or profile lifecycle management.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User opens the Profile area from app navigation or the family/household overview entry already present in the MVP.
- Expected behavior:
  - The Profile area opens on a household list view showing one card per profile owned by the current account.
  - Each profile card shows display name, age, gender, Health Score summary, due-item summary, and three direct navigation actions: Dashboard, Plan, Vaccinations.
  - A primary Add profile action is visible while the account has fewer than 5 profiles.
  - Selecting Add profile opens a short form with fields for display name, age, and gender, plus Create profile and Cancel actions.
  - Create profile remains disabled until all required fields are valid. Inline validation appears on blur and on submit.
  - Submitting a valid create form creates the profile, generates that new profile's plan, returns the user to the household list, and shows the new profile card in the same session.
  - Selecting a profile card or Edit action opens that profile's detail view.
  - The profile detail view has two sections only: Profile basics and Quick links. Profile basics shows editable display name, age, and gender. Quick links provides Dashboard, Plan, and Vaccinations navigation for that same profile only.

### Flow B - Failure and Recovery Paths

- If the create or edit form is submitted with an empty display name, non-numeric age, age outside the allowed range, or no gender selected, the form stays open, the invalid field is highlighted inline, and a clear corrective message is shown next to that field.
- If the account already has 5 profiles, the Add profile action is not available and the household list shows a non-blocking limit message stating that the account can hold up to 5 profiles.
- If saving an edit fails before plan regeneration completes, the user remains on the profile detail view, no refreshed dashboard or plan data is shown, prior saved profile values remain visible, and an inline error banner offers Retry.
- If plan regeneration fails after an age or gender edit request, the profile detail view shows that the update was not applied, keeps the prior dashboard/plan context unchanged, and offers Retry without affecting other profiles.
- If household list or preferences data fails to load, the page shows an inline error state with Retry and does not present partial navigation actions that could misroute the user.

## 3. Interaction and Validation Rules

- Use a mobile-first page structure with one primary action per screen: Add profile on the household list, Create profile on the create screen, Save changes on the profile detail screen, and Save reminder settings on the preferences screen.
- Household list is the default landing state for this slice and must always show profile-to-destination relationship clarity by keeping Dashboard, Plan, and Vaccinations links on each profile card.
- Required profile fields for creation are display name, age, and gender.
- Age input accepts whole numbers only. Invalid characters are rejected or normalized before submit.
- Age validation must be explicit and testable: value is required, must be numeric, and must be within the supported MVP range of 0 to 120.
- Gender is a required single-select field using the product's approved values; no free-text gender entry is allowed in this slice.
- Editing display name alone updates profile basics only and does not trigger plan regeneration.
- Editing age or gender triggers a blocking save flow that calls the canonical rule-based plan generator for that profile only before success is shown to the user. During this state, Save changes is disabled and the screen shows a progress message indicating the plan is being updated for that profile only.

## 4. Implementation Constraints

- Do not include archive, delete, remove, deactivate, or destructive profile actions anywhere in the profile area, profile detail, household list, preferences, menus, or empty states.
- Do not expose any account settings beyond reminder settings and household management in this slice.
- Do not show provider, insurance, analytics, medical history, document, or integration fields or routes.
- Do not let profile edits imply cross-profile impact; all save, refresh, and navigation outcomes must clearly stay scoped to the selected profile.
- Do not present regenerated plan content as user-entered medical record data; keep framing as preventive guidance.
- Do not create a separate household object in the UX; household management is presented as the account's profile list.
- Do not remove or alter manual vaccination entries during profile edits; vaccination navigation after regeneration must still show that profile's existing manual entries.
- Keep action labels user-facing and plain-language; avoid internal terms such as regenerate rules, recalc, sync job, or profile aggregate.

## 5. Acceptance Mapping

- User can open the Profile area, see the current account's profiles, add a new profile with display name, age, and gender, and then reopen that profile from the same area in the same session.
- User can edit an existing profile's age or gender, save successfully, and then see that same profile's refreshed dashboard summary and plan content in the same session without affecting any other profile.
- Preferences view contains exactly two content sections: reminder settings and household management.
- Each household/profile card exposes direct navigation to that person's dashboard, plan, and vaccinations.
- No archive or delete controls are visible anywhere in the MVP profile management or preferences flow.
- When unchanged recommendation item codes survive regeneration, the user's existing completion and reminder state still appears on that edited profile after refresh.
- Manual vaccination entries remain visible for the edited profile after an age or gender change and regeneration.
