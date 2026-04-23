# Current Slice User Checklist

## Slice
- ID: SL-001
- Title: Self-profile Onboarding to Generated Dashboard

## Goal
Enable a first-time user to enter minimal profile data, generate a rule-based preventive plan, and land on a mobile-first dashboard with a clear next action in the same session.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: First-time user lands on the onboarding start view on a mobile viewport and has no existing profile for the current account/session.
2. Expected behavior:
3. The start view presents a short value statement and one primary CTA: 'Start my plan'.
4. Tapping the CTA opens a single onboarding form with three inputs: age, gender, and planning context.
5. Age is entered as a numeric value; gender is selected from the supported recommendation inputs; planning context is selected as either 'Self only' or 'Family planning'.
6. The primary submit action remains disabled until all three inputs are completed with valid values.
7. On submit, the app creates one account/session record if none exists, creates one active profile using the entered values, and saves the selected planning context on that account/profile context.
8. The app immediately transitions to a loading state that communicates plan generation is in progress and prevents duplicate submissions.

## Expected results
- A new user can complete onboarding with age and gender and reach a generated dashboard within 60 seconds in normal test conditions
- Every generated profile shows at least one next action from the earliest non-empty bucket or an explicit all-clear state
- The dashboard shows Now, Soon, and Later sections and a profile-level summary placeholder for the active profile
- Generated actions are stored and are visible again after page reload for the same profile
- The experience is usable on common mobile viewport sizes without horizontal scrolling

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Self-profile Onboarding to Generated Dashboard does not appear.

## Out of scope for this slice
- Adding additional family profiles
- Action detail screens
- Status updates from the user
- Reminder setting
- Vaccination entry and review

## Result
- Pass / Fail
- Notes:
