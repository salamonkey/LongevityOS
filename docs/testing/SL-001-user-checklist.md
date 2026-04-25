# Current Slice User Checklist

## Slice
- ID: SL-001
- Title: First-profile Onboarding to Generated Dashboard

## Goal
Enable a new user to enter age and gender for the first profile, generate a deterministic health plan, and land on a prioritized dashboard within 60 seconds.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User opens the app and lands on a simple welcome screen with a clear value statement and a single primary action: Start.
2. Expected behavior:
3. Welcome screen purpose: reassure the user they can get a personal preventive plan quickly from minimal input. Layout contains headline, one short supporting sentence, and one primary CTA: Start.
4. Tapping Start opens a single onboarding form screen for the first profile. The screen title is personal and direct, such as 'Build your plan'.
5. The onboarding form contains only two required inputs: Age and Gender. Age is a numeric field optimized for whole-number entry. Gender is a single-select control with exactly two options: Female and Male.
6. A short helper line under the inputs explains that these answers are used only to generate rule-based preventive guidance for this profile.
7. The primary action on the form is Generate my plan. A back action returns to the welcome screen without losing already entered values during the same session.
8. On valid submission, the form transitions immediately to a blocking generating state. The screen shows progress feedback such as 'Building your dashboard...' and does not reveal dashboard content until generation succeeds.

## Expected results
- App loads without blank screen or runtime error.
- A completed onboarding with valid age and gender inputs produces a non-empty health plan before the user lands on the dashboard
- The tested happy path from tapping Start to seeing the generated dashboard completes within 60 seconds
- Every dashboard health item appears in exactly one priority group: Today, Soon, or Later
- The dashboard shows a read-only health score for the active profile
- Dashboard content reflects deterministic rule output from the entered age and gender only

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for First-profile Onboarding to Generated Dashboard does not appear.

## Out of scope for this slice
- Add-family onboarding path
- Health item detail view
- Mark item Done
- Reminder creation
- Vaccination tracking or settings

## Result
- Pass / Fail
- Notes:
