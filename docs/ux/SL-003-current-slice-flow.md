<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-02T18:49:29.716Z -->
# UX Flow - Current Slice

Date: `2026-05-02`
Status: `Ready for implementation`
Scope: `SL-003 Full Health Plan View`

## 1. Context

Slice SL-003 defines the mobile-first full health plan screen for the active profile. This screen is a read/navigation surface over the existing profile-scoped generated health items and existing item detail view. The user goal is to review every generated preventive item for the active profile in one place, see each item’s recommendation frequency and unified status, and open the existing detail view without losing consistency with the dashboard.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: From the active profile dashboard, the user selects the full-plan entry point and navigates to the full health plan route for that same active profile.
- Expected behavior:
  - Render a page header that makes the active context clear: this is the full health plan for the currently active profile, not an account-wide or family-wide list.
  - Show a compact totals summary near the top of the screen based on the same active-profile item set used by dashboard counts; totals must stay aligned with the dashboard for identical underlying data.
  - Render one simple vertical list containing every generated health item for the active profile exactly once, with no grouped priority sections and no filtering controls.
  - Each list row must expose the item name as the primary label, recommendation frequency as supporting text, and exactly one visible unified status value using only Due, Planned, or Done.
  - Required row content must fit on narrow mobile screens without horizontal scrolling; name, frequency, and status remain visible within the row layout.
  - Make the whole row the primary tap target so the user can open the existing item detail view from anywhere on that row.
  - Row selection must navigate to the existing item detail route/view for that specific generated item id; the destination content must match what the user sees when opening the same item from the dashboard.
  - When the user returns from detail to the full health plan screen, the list must reflect the current shared item state so any status change made in detail is immediately shown in the row and in the totals summary if affected.

### Flow B - Failure and Recovery Paths

- If the full health plan data for the active profile fails to load, replace the list area with a clear inline error state that explains the plan could not be loaded right now and provides a Retry action; on successful retry, restore the totals summary and full list for the same active profile.
- If no active profile can be resolved when entering the route, do not render stale or cross-profile plan data; redirect the user back to the existing profile-selection or profile-scoped home path so they can re-enter the plan from a valid active profile context.
- If navigation to item detail fails for a tapped row, keep the user on the plan screen, preserve scroll position, and show a non-blocking error message that the item could not be opened; the user can retry by tapping the row again.

## 3. Interaction and Validation Rules

- The plan screen is scoped to exactly one active profile at a time and must never mix items from other profiles.
- The plan list is a read model over existing generated health items; do not create a separate plan-item concept in the UI.
- Each rendered row maps to one stable generated health item identifier and that identifier is the source of truth for row identity and navigation.
- Every generated health item for the active profile must appear exactly once in the list, including items not currently surfaced in prioritized dashboard sections.
- Recommendation frequency text shown in the plan list must use the same underlying frequency field and wording already used by the existing item detail content.
- Displayed status must resolve through the shared unified-status logic and must terminate in exactly one visible label per row: Due, Planned, or Done.
- Do not show secondary status badges, reminder-editing affordances, priority horizons, analytics, or any other metadata not required by this slice.
- The plan screen must use the existing item detail implementation; no plan-specific detail screen or altered detail copy is allowed for this slice.

## 4. Implementation Constraints

- Scope is limited to viewing the complete health plan for the active profile and opening existing item detail.
- No reminder creation or editing behavior is added from the plan screen.
- No family profile management, cross-profile summaries, or account-level aggregation is shown on this screen.
- No vaccination tracking appears on this screen.
- No advanced filtering, sorting controls, analytics, exports, or grouped sections are introduced.
- The feature must remain mobile-first and avoid horizontal scrolling for required row content.
- Naming, frequency wording, and status language must remain consistent with existing dashboard and detail surfaces.
- State updates must come from the shared health item query/store path already used by dashboard and detail rather than plan-specific persistence or caching.

## 5. Acceptance Mapping

- Entering the full health plan from an active profile shows a screen for that same profile only.
- The screen displays all generated health items for the active profile exactly once, with no duplicates and no omissions.
- Each visible plan row shows recommendation frequency text and exactly one unified status label chosen from Due, Planned, or Done.
- Tapping a plan row opens the same existing detail view and content that the user would get by opening that item from the dashboard.
- After changing an item status in detail and returning to the plan screen, the updated status is visible on that item without requiring profile switching.
- The totals summary on the plan screen remains consistent with dashboard counts for the same active profile and underlying item data.
- On a mobile-width viewport, the plan screen shows required row content without horizontal scrolling.
- If plan data cannot be loaded, the user sees a retryable error state instead of partial, stale, or cross-profile content.
