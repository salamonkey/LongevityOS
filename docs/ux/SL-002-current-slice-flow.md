<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-02T14:03:29.175Z -->
# UX Flow - Current Slice

Date: `2026-05-02`
Status: `Ready for implementation`
Scope: `SL-002 Health Item Detail and Completion`

## 1. Context

SL-002 — Health Item Detail and Completion. Define the minimum mobile-first UX flow from prioritized dashboard item tap to item detail review and marking an eligible item Done, with immediate status, dashboard placement, and health score refresh. Scope is limited to dashboard item detail and completion behavior for a single active profile.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User is on the active profile dashboard after onboarding and taps any health item card shown in Today, Soon, or Later.
- Expected behavior:
  - Open a dedicated item detail view for the tapped dashboard item; preserve the active profile context and item identity.
  - Show the item title/action as the page heading so the user can immediately confirm what task they opened.
  - Present a compact status block near the top using the unified status model only: Due, Planned, or Done.
  - Within the same top context area, show recommendation frequency in plain language and last-known status context as a short factual line.
  - Show a 'Why it matters' section directly below the top context so the rationale is visible without requiring additional navigation.
  - Keep the detail view content limited to: action, recommendation frequency, why it matters, current unified status, and last-known status context.
  - For items whose current status is Due or Planned, show a primary action button labeled 'Mark as Done' fixed at the bottom of the viewport or placed prominently after the content.
  - When the user taps 'Mark as Done', update the item status to Done and provide immediate in-view confirmation by changing the visible status label on the detail view to Done before exit or on return state refresh within the same interaction cycle as implemented by the app shell pattern used elsewhere in MVP.

### Flow B - Failure and Recovery Paths

- If the detail data for a tapped dashboard item cannot be loaded, show an inline full-page error state with: item title fallback if available, message 'We couldn’t load this health item right now.', a primary action 'Try again', and a secondary action 'Back to dashboard'; do not show partial or guessed health guidance.
- If the user taps 'Mark as Done' and the save fails, keep the item status unchanged, keep the user on the detail view, show an inline error message near the action area reading 'Couldn’t mark this as done. Try again.', and leave the 'Mark as Done' button available for retry.
- If an item is already Done when the detail view opens, do not show the 'Mark as Done' action; show the Done status as read-only and allow normal back navigation to dashboard.
- If the item becomes ineligible for completion during the session because its status is already Done after refresh, replace the action button with the Done status and do not allow duplicate completion actions.

## 3. Interaction and Validation Rules

- Every dashboard health item card in Today, Soon, and Later must be tappable and open its own detail view.
- The detail view must always display all four required content elements: action, recommendation frequency, why it matters, and last-known status context.
- Only the unified status labels Due, Planned, and Done may appear on the detail view; no additional status terms are introduced in this slice.
- The status label must be visually prominent and appear above the explanatory content.
- The 'Mark as Done' action is shown only when the item status is Due or Planned.
- Tapping 'Mark as Done' must trigger a single completion request per tap and prevent duplicate submissions until the request resolves.
- After a successful completion, the item must no longer appear in more than one dashboard priority group.
- After a successful completion, the dashboard must refresh before or at the moment the user returns so the updated item placement is visible without manual page reload by the user.

## 4. Implementation Constraints

- Do not add reminder-setting UI in this slice.
- Do not introduce a separate full health plan list or alternate entry path; the supported entry is from dashboard items already in scope.
- Do not expose medical-record style fields, provider data, or completion history beyond the single last-known status context line.
- Do not design family switching, profile management, or vaccination-specific detail patterns here.
- Do not introduce new score explanation UI; only the displayed health score value needs to refresh consistently after completion.
- Keep the detail layout single-screen and vertically stacked for mobile-first implementation, with no tabs, accordions, or secondary navigation required for MVP comprehension.

## 5. Acceptance Mapping

- From the dashboard, tapping any visible health item opens a detail view for that exact item.
- On every opened detail view, the user can see the item action, recommendation frequency, why it matters, and last-known status context without navigating elsewhere.
- If an item is Due or Planned, the user can tap 'Mark as Done' from the detail view and then observe the item status shown as Done after the update cycle completes.
- After a successful completion and return to dashboard, the completed item is not duplicated across Today, Soon, or Later.
- After a successful completion, the displayed health score on the dashboard reflects the new state within the same refreshed dashboard view.
- If detail loading fails, the user can either retry loading or return to the dashboard from the error state.
- If completion fails, the user remains on the detail view, sees a clear error message, and can retry without the status falsely changing to Done.
