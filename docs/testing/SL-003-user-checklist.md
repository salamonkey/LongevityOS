# Current Slice User Checklist

## Slice
- ID: SL-003
- Title: Full Health Plan View

## Goal
Provide a complete per-profile plan view so users can review all generated preventive items and their current status beyond the prioritized dashboard.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: From the active profile dashboard, the user selects the full-plan entry point and navigates to the full health plan route for that same active profile.
2. Expected behavior:
3. Render a page header that makes the active context clear: this is the full health plan for the currently active profile, not an account-wide or family-wide list.
4. Show a compact totals summary near the top of the screen based on the same active-profile item set used by dashboard counts; totals must stay aligned with the dashboard for identical underlying data.
5. Render one simple vertical list containing every generated health item for the active profile exactly once, with no grouped priority sections and no filtering controls.
6. Each list row must expose the item name as the primary label, recommendation frequency as supporting text, and exactly one visible unified status value using only Due, Planned, or Done.
7. Required row content must fit on narrow mobile screens without horizontal scrolling; name, frequency, and status remain visible within the row layout.
8. Make the whole row the primary tap target so the user can open the existing item detail view from anywhere on that row.

## Expected results
- App loads without blank screen or runtime error.
- All generated health items for the active profile appear exactly once in the health plan view
- Each plan item shows recommendation frequency and one unified status value: Due, Planned, or Done
- Opening an item from the plan view shows the same detail content as opening that item from the dashboard
- A status change made in detail view is reflected when the user returns to the plan view
- Plan totals remain consistent with dashboard items for the same active profile

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Full Health Plan View does not appear.

## Out of scope for this slice
- Reminder creation or editing
- Family profile management
- Vaccination tracking
- Advanced filtering, sorting, or analytics

## Result
Status: Pass

Use one of:
- Fail
- Pass
- Pending

## Manual QA Findings

Use this section when manual review finds something that should be repaired before closeout.
If the checklist passes, leave this section as `None.`

None.

### Finding 1

Classification:
- [X] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.
- [ ] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.
- [ ] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
- After entering the user age and gender we land on the page that shows the button 'view full health plan'. when we click on any of the boxes in the 'All recommended preventive care steps' section, we see the details of that step, but no button to get back to anywhere. the only button is the 'Mark as Done' button. THe only way to get back is to use the browser back button. 

Expected:
- Button that allows us to go back from the step details to the full health plan view. 

Observed:
-

Required repair:
- Include a button taking us back to the health plan view.


### Finding 2

Classification:
- [ ] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.
- [X] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.
- [ ] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
- from the main page, when we click on an item and get its detailed view, we do get the 'Back to dashboard' button. when we click on it, it takes us back to the dashboard, but then the Health Plan section is missing entirely. If we do a refresh of the browser page, the Health plan section appears again.

Expected:
- When we come back, the health plan section should be still available.

Observed:
-

Required repair:
- Review and fix the behavior.
