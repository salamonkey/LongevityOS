<!-- generated_from: templates/architecture-baseline-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-02T18:27:24.514Z -->
# Architecture Baseline

Date: `2026-05-02`
Status: `Ready for implementation`
Scope: Current slice `SL-003 Full Health Plan View`

## 1. Context

SL-003 adds a full health plan screen for the currently active profile. The slice extends read/navigation behavior around existing generated health items and existing item detail/completion behavior. Architecture for this slice must keep one profile-scoped source of truth for generated items, naming, and unified status so the dashboard, plan view, and detail view stay consistent.

## 2. Decisions

- Create a dedicated feature module at src/features/full-health-plan-view/ that owns only plan-screen composition, profile-scoped item list rendering, and plan totals display for the active profile.
- Add a route entry at src/routes/full-health-plan-view* that resolves the active profile from the existing app profile-selection mechanism and renders the full plan for that profile only.
- Model the plan screen as a read model over existing generated profile health items; do not introduce a new domain entity for 'plan item'. Each row represents one existing generated health item instance for the active profile.
- Use the existing stable generated-item identifier as the row identity and navigation key. The full plan view must render one row per generated item identifier and must not duplicate items across sections or horizons.
- Populate the plan list from the same profile-scoped health item query/store family used by dashboard and detail, but without dashboard priority-horizon filtering. The plan view includes all generated items for the active profile, including items not currently surfaced in dashboard priorities.
- Expose recommendation frequency in the plan list from the existing health item data/view model field already used by item detail content. The plan module must not invent or transform frequency labels independently.
- Use one shared unified-status resolver for dashboard, plan view, and detail view. The displayed status vocabulary for this slice is exactly Due, Planned, or Done, with no plan-specific labels or aliases introduced in the feature module itself.

## 3. Invariant and Guardrail Decisions

- Do not create separate persistence, caching, or API contracts just for the plan screen; the slice is a new presentation surface over existing profile health item data.
- Do not add new business states, secondary status badges, horizon labels, completion subtypes, or reminder-editing affordances inside the plan module.
- Do not aggregate across profiles, show account-level totals, or expose family-management controls from the plan screen.
- Do not add filtering, sorting controls, analytics, export behavior, or grouped sections beyond a simple full list required for this slice.
- Do not fork item naming, recommendation-frequency text, or detail content. Plan rows must use the same naming/status language already used by dashboard and detail.
- Navigation from a plan row must open the existing item detail route/view, not a plan-specific detail implementation.
- The plan screen must remain mobile-first: core row content fits narrow screens without horizontal scrolling, and any metadata omitted for space must not remove required fields of name, frequency, and unified status.

## 4. Verification Decisions

- Route test verifies the full health plan screen renders for the active profile and does not include items from any other profile.
- Integration test verifies every generated health item identifier for the active profile appears exactly once in the plan list, including items absent from current dashboard priority sections.
- UI test verifies each plan row shows recommendation frequency text and exactly one unified status value from the set Due, Planned, Done.
- Navigation test verifies selecting a plan row opens the same existing item detail view and content as opening that item from the dashboard.
- State-sync test verifies a status change made in detail view causes the shared health item query/store to refresh or re-read so the plan view shows the updated unified status when the user returns.
- Consistency test verifies plan totals are computed from the same active-profile item set as dashboard counts, so totals remain aligned for identical underlying data.
- Responsive UI test verifies the plan screen has no horizontal scroll on a mobile-width viewport for required row content.

## 5. Constraints

- Scope is limited to full-plan viewing and opening existing detail; reminder creation/editing, vaccination behavior, family profile management changes, and advanced list controls are excluded.
- The plan list must be derived only from already generated health items for the active profile; this slice does not change plan-generation rules or regenerate data with plan-specific logic.
- Shared status language is mandatory across dashboard, plan, and detail. Any existing internal state mapping must terminate in exactly one displayed status: Due, Planned, or Done.
- Implementation artifacts for this slice must remain bounded to src/features/full-health-plan-view/, src/routes/full-health-plan-view*, and tests/full-health-plan-view/ plus minimal shared-query wiring needed to reuse existing health item data/status logic.
- The feature must preserve existing detail/completion behavior and must not break dashboard propagation for item updates.
- Plan membership is profile-scoped and identity-based: one generated item instance per stable item id, no duplication by priority horizon, reminder state, or display grouping.

## 6. Open Questions

- None.
