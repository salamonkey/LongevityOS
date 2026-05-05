# Current Slice User Checklist

## Slice
- ID: SL-002
- Title: Health Plan Browsing and Item Detail

## Goal
Let users understand each recommended preventive item by viewing complete plan lists and item detail with clear rationale.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: User enters the current slice from the primary application flow.
2. Expected behavior:
3. Complete the slice objective in the smallest coherent flow.
4. Handle one clear recovery path for invalid or incomplete user action.
5. Keep interactions simple, direct, and aligned to current-slice scope.
6. Avoid adding user-facing complexity outside the active slice.

## Expected results
- App loads without blank screen or runtime error.
- Every generated health item is visible in a plan view and opens into a detail view
- 100% of generated health items show a recommendation cadence, one current status, and a why-it-matters explanation
- A user can open any dashboard-highlighted item into detail and return to the prior view without losing context
- Item detail copy uses plain-language rationale rather than clinical detail

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

## Semantic UX checks
- All user-visible text speaks to the user, not about the system.
- No visible copy exposes internal implementation, workflow, schema, routing, slice, test, ranking, bucket, or process language.
- Labels, explanations, empty states, and status messages are meaningful in the product context.
- Dates, times, counts, and statuses are valid and human-readable.
- Unknown or missing data uses a safe fallback.
- A section existing with bad, generic, or internal copy is marked Fail, not Pass.

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Health Plan Browsing and Item Detail does not appear.

## Out of scope for this slice
- Changing item status
- Reminder creation
- Manual vaccination entry
- Family profile views
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

None.

### Finding 1

Classification:
- [ ] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.
- [ ] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.
- [ ] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
-

Expected:
-

Observed:
-

Required repair:
-
