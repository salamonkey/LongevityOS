# Current Slice User Checklist

## Slice
- ID: SL-001
- Title: Self Onboarding to First Dashboard

## Goal
Enable a new user to enter the minimum required profile inputs, generate a rule-based preventive plan, and land on a populated personal dashboard in one session.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User opens the first-run onboarding screen for the self profile in an unauthenticated or pre-established current-user context; no family, settings, or alternate destinations are shown in this slice.
2. Expected behavior:
3. Onboarding screen purpose: collect the minimum required inputs and set expectation that a personalized preventive plan will be created immediately after submission.
4. Onboarding layout is a single vertical form with two required fields and one primary action. Sections in order: brief value statement, age field, gender field, primary submit button.
5. Age input uses a numeric text field optimized for mobile number entry. Label: Age. Helper copy clarifies that age is used to generate the first plan. Field accepts whole numbers only.
6. Gender input uses a required segmented control or radio group with exactly two visible options: Female and Male. No additional options, free text, or preference controls are shown in this slice.
7. Primary action label is Generate my plan. The button remains disabled until age is present and one gender option is selected.
8. Inline validation behavior on age: if empty after attempted submit, show Age is required. If non-integer, show Enter a whole number. If outside 0 to 120, show Enter an age from 0 to 120. Validation appears at the field and focus moves to the first invalid field on submit.

## Expected results
- App loads without blank screen or runtime error.
- A new user can complete onboarding and reach a populated dashboard in 60 seconds or less in a standard moderated walkthrough
- The first health plan is generated within 5 seconds of onboarding completion
- Every generated item comes from the locked MVP preventive item set and is assigned to checkups or vaccinations
- The dashboard shows Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage for the self profile

## Carry-forward capabilities to preserve (auto-inherited)
- None yet (no prior passed slices detected).

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Self Onboarding to First Dashboard does not appear.

## Out of scope for this slice
- Family profile creation
- Health item detail screens
- Mark-as-done and reminder actions
- Manual vaccination entry
- Profile editing and preferences

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
- The current slice artifacts do not provide verifiable implementation for the onboarding screen structure and content required by checklist items 1, 3, 4, 5, 6, and 7.

Expected:
- Source or test evidence should show a first-run self onboarding screen with only the in-scope experience: brief value statement, Age field, Gender field with exactly Female/Male, and a primary action labeled 'Generate my plan'.

Observed:
- The provided source snippets only show App routing to `self-onboarding-to-first-dashboard` and do not include the route/component implementation needed to confirm the required fields, labels, options, ordering, or absence of alternate destinations.

Required repair:
- Provide or restore verifiable implementation and/or automated test coverage for the onboarding route so the required screen structure, labels, and in-scope-only entry experience can be confirmed against the checklist.

### Finding 2

Classification:
- [ ] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.
- [ ] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.
- [x] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
- The current artifacts do not verify the required age-field interaction and validation behavior from checklist items 5, 7, and 8.

Expected:
- The implementation should show an age input optimized for numeric entry, whole-number-only handling, helper copy explaining age is used to generate the first plan, disabled submit until age and gender are present, exact inline validation messages for empty/non-integer/out-of-range values, and focus moving to the first invalid field on submit.

Observed:
- No route/component source or test evidence was provided for the age input behavior, submit disabling logic, validation messages, or focus management.

Required repair:
- Add or expose the onboarding form implementation and validation tests that demonstrate the exact required messages and focus behavior.

### Finding 3

Classification:
- [ ] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.
- [ ] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.
- [x] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
- The current artifacts do not verify the required post-submit outcome of reaching a populated first dashboard with generated preventive items.

Expected:
- After onboarding, the user should land on a populated dashboard showing Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage, with plan items generated from the locked MVP preventive item set and assigned to checkups or vaccinations.

Observed:
- Implementation notes mention this scope, and a prior semantic review finding references a Health Score card, but no provided source or test evidence confirms the dashboard buckets, highlighted next item, plan-generation rules, or successful end-to-end transition after submission.

Required repair:
- Provide verifiable implementation and/or automated end-to-end tests covering onboarding submission through dashboard rendering, including bucket population and rule-based plan generation constraints.
