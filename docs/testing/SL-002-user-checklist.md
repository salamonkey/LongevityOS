# Current Slice User Checklist

## Slice
- ID: SL-002
- Title: Health Item Detail and Completion

## Goal
Let users open any prioritized item, understand what to do and why, and mark the item Done with immediate reflected progress.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User is on the active profile dashboard after onboarding and taps any health item card shown in Today, Soon, or Later.
2. Expected behavior:
3. Open a dedicated item detail view for the tapped dashboard item; preserve the active profile context and item identity.
4. Show the item title/action as the page heading so the user can immediately confirm what task they opened.
5. Present a compact status block near the top using the unified status model only: Due, Planned, or Done.
6. Within the same top context area, show recommendation frequency in plain language and last-known status context as a short factual line.
7. Show a 'Why it matters' section directly below the top context so the rationale is visible without requiring additional navigation.
8. Keep the detail view content limited to: action, recommendation frequency, why it matters, current unified status, and last-known status context.

## Expected results
- App loads without blank screen or runtime error.
- Every health item shown on the dashboard opens to a detail view
- 100% of health item detail views show action, why it matters, and status context
- A user can mark an eligible item as Done from detail view and see the updated Done status after returning to the item
- After an item is marked Done, the dashboard refreshes without showing the item in more than one priority group
- The displayed health score updates consistently after an item is marked Done
- The onboarding entry screen is visible and clear.

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Health Item Detail and Completion does not appear.

## Out of scope for this slice
- Full health plan list screen
- Reminder scheduling
- Family profile management
- Vaccination tracking

## Result
- Pass
