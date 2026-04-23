<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-23T13:52:54.543Z -->
# UX Flow - Current Slice

Date: `2026-04-23`
Status: `Ready for implementation`
Scope: `SL-001 Self-profile Onboarding to Generated Dashboard`

## 1. Context

Slice SL-001 covers the first-session mobile-first flow from minimal self-profile onboarding to a generated dashboard. The user provides only the data needed to create one active profile and a rule-based preventive plan: age, gender, and planning context selection. The session ends on a persisted dashboard for that active profile, showing a profile summary placeholder, a single clear next action from the earliest non-empty bucket, and full Now, Soon, and Later sections or an explicit all-clear state when no actions are due.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: First-time user lands on the onboarding start view on a mobile viewport and has no existing profile for the current account/session.
- Expected behavior:
  - The start view presents a short value statement and one primary CTA: 'Start my plan'.
  - Tapping the CTA opens a single onboarding form with three inputs: age, gender, and planning context.
  - Age is entered as a numeric value; gender is selected from the supported recommendation inputs; planning context is selected as either 'Self only' or 'Family planning'.
  - The primary submit action remains disabled until all three inputs are completed with valid values.
  - On submit, the app creates one account/session record if none exists, creates one active profile using the entered values, and saves the selected planning context on that account/profile context.
  - The app immediately transitions to a loading state that communicates plan generation is in progress and prevents duplicate submissions.
  - The rule service generates preventive health actions for the active profile from age and gender only.
  - When generation succeeds, the dashboard opens in the same session for the active profile without any extra setup step or family-profile creation step required by the user at this slice stage.

### Flow B - Failure and Recovery Paths

- If the user tries to proceed with an incomplete or invalid onboarding form, the form stays on screen, the invalid field is highlighted inline, a short error message explains what must be corrected, and no profile or plan is created until the form is valid.
- If profile save or plan generation fails after submit, the app shows a non-blocking full-width error state on the loading step with two actions: 'Try again' and 'Back to edit'. Previously entered values remain populated. 'Try again' repeats the same submission once; 'Back to edit' returns to the onboarding form without
- If a generated plan returns no due actions across all buckets, the dashboard loads normally and shows an explicit all-clear card instead of a next-action card; the Now, Soon, and Later sections still render with empty-state messages rather than appearing broken or missing.

## 3. Interaction and Validation Rules

- Age is required, must be numeric, and must be an integer from 18 to 120 inclusive.
- Gender is required and limited to the supported rule-engine values used by this slice.
- Planning context is required and limited to two choices: self-only or family-planning context.
- Selecting family-planning context does not ask for any additional person details in this slice and still creates only one active profile.
- Only one active profile is created and displayed for the account in this slice.
- The submit action can be triggered only once per request cycle; repeated taps during loading do not create duplicate profiles or duplicate action sets.
- Dashboard priority order is fixed as Now, then Soon, then Later for determining the single surfaced next action.
- The surfaced next action is always the first action from the earliest non-empty bucket; if all buckets are empty, the surfaced module becomes an all-clear state instead of showing a blank space or disabled CTA returnౖ. string??

## 4. Implementation Constraints

- Keep the experience mobile-first responsive and usable without horizontal scrolling on common phone widths.
- Keep onboarding limited to age, gender, and planning-context selection; do not collect additional profile fields in this slice.
- Do not expose additional family-profile creation, profile switching, or family member details.
- Do not include action detail screens, status updates, reminder setup, or vaccination entry in this slice.
- Use rule-based plan generation only; do not imply AI-generated recommendations.
- Persist the active profile, summary data, and generated actions so the same dashboard reappears after page reload for the same account/session.
- The dashboard must visibly include Now, Soon, and Later section headers plus a profile-level summary placeholder for the active profile.

## 5. Acceptance Mapping

- A first-time user can start onboarding, enter valid age and gender, choose a planning context, and reach the generated dashboard in one uninterrupted flow within 60 seconds under normal test conditions.
- A valid submission creates one active profile and lands on a dashboard in the same session without requiring extra setup or additional family-profile entry.
- The dashboard always shows one clear next-step module: either the first action from the earliest non-empty bucket or an explicit all-clear state when no actions exist in Now, Soon, or Later.
- The dashboard visibly contains a profile summary placeholder and three bucket sections labeled Now, Soon, and Later.
- Generated actions and summary data remain visible after browser refresh for the same account/session and match the active profile previously created.
- The onboarding form blocks invalid input with inline feedback, preserves entered values after an error, and allows recovery through correction or retry without starting over.
- On common mobile viewport sizes, the onboarding form, loading state, and dashboard can be completed and read without horizontal scrolling.
