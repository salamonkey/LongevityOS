<!-- generated_from: templates/architecture-baseline-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-04T07:41:36.620Z -->
# Architecture Baseline

Date: `2026-05-04`
Status: `Ready for implementation`
Scope: Current slice `SL-004B Design System Component Foundation`

## 1. Context

SL-004B establishes the shared UI foundation for the already-approved MVP flows by converting documented design-system contracts into reusable source components, centralizing semantic status and priority styling, and migrating completed onboarding, dashboard, health plan, detail, and reminder paths to consume that layer without changing existing product behavior or scope.

## 2. Decisions

- Create a single shared design-system UI layer under src as the exclusive source for the slice-required primitives: StatusPill, HealthPlanItem, PrioritySection, HealthScoreCard, and ReminderSelector.
- Create a semantic presentation helper module under src that maps the existing product domain values for health-item status and dashboard priority horizon to labels, tone keys, and token references derived from docs/design-system/tokens.json; screens and components must consume this helper instead of defining colors, ad
- Keep the existing MVP domain model unchanged: health-item status remains the unified status model already used in completed slices, and dashboard grouping remains the approved time-horizon model; this slice only changes presentation ownership, not domain meaning or state transitions.
- Define StatusPill as a pure status renderer that accepts a semantic status key and resolves all visible text and visual treatment through the semantic helper layer, so the same status appears consistently on dashboard, full health plan, and item detail paths.
- Define HealthPlanItem as the shared summary row/card for a health item, owning the repeated presentation of title, recommendation/frequency text, current status, optional reminder summary, and navigation/action affordances already present in MVP screens.
- Define PrioritySection as the shared container for one dashboard horizon group, owning section heading, optional supporting copy/count, and rendering of grouped HealthPlanItem instances so Today/Soon/Later style and structure are not screen-local.
- Define HealthScoreCard as the shared read-only score presentation component for the active profile and family/profile overviews where the same score pattern already exists; it must present existing score data only and must not introduce or infer a new scoring algorithm or explanation model in this slice.a1d-style cards

## 3. Invariant and Guardrail Decisions

- Only the shared design-system layer may own status and priority visual semantics; screen modules may pass domain values and data but may not choose raw colors, variant names, or custom label mappings for those concepts.
- Migrated user-facing paths must stop rendering ad-hoc local equivalents of StatusPill, priority group containers, score cards, health item summary cards, and reminder timing selectors where an approved shared component exists.
- Design-system primitives in this slice are presentation-level components; they must not fetch data, mutate persistence directly, or embed rule-engine logic beyond local input handling required for UI selection.
- ReminderSelector may manage local selection state for preset and custom date entry, but saved reminder behavior, validation rules, and persistence remain in the existing reminder application flow owned outside the component layer.
- Component props must use current slice domain terms already evidenced by the product and UX contracts, preserving one consistent language set across dashboard, plan, detail, and reminder screens.
- If a screen needs styling not covered by the approved design-system contract, the screen may compose layout around shared components but may not bypass semantic helpers for status or priority treatment.

## 4. Verification Decisions

- Add component-level tests that render each shared primitive with the approved semantic states and verify the expected label/tone output for status and priority values supplied by the helper layer.
- Add or update regression tests for the completed SL-001 through SL-004 paths so onboarding, dashboard, full health plan, item detail, mark-done, and reminder scheduling continue to work after migration.
- Add a lightweight design-system usage audit over migrated user-facing UI paths that fails on newly introduced raw hex/rgb/hsl color literals or inline visual style objects and confirms those paths import the shared component layer for covered patterns.
- Verify that dashboard horizon sections, health plan item summaries, detail status displays, and reminder timing selection all render through the shared component layer in the migrated screens rather than screen-local duplicates.
- Run uiux:review-current-slice-semantics for SL-004B and record the passing result together with implementation notes and the completed SL-004B user checklist.

## 5. Constraints

- Do not introduce new product capabilities, data entities, navigation changes, reminder channels, family-management behavior, vaccination behavior, or health-score logic as part of this slice.
- Do not change the approved status model, priority-horizon model, or user-facing meaning of existing SL-001 through SL-004 behaviors; only centralize and standardize their presentation.
- Do not hardcode screen-specific status labels, priority labels, or visual color values in migrated paths; semantic helpers and design tokens are the only allowed source for those mappings.
- Do not broaden component scope beyond patterns already evidenced in completed slices and current design-system documents; slice-only primitives are sufficient for MVP delivery.
- Do not introduce external integrations, analytics expansions, AI behavior, or backend contract changes; this slice is a frontend component foundation and migration slice.
- Implementation must stay compatible with the project's existing frontend structure under src and produce implementation notes and testing artifacts required by the slice done definition.

## 6. Open Questions

- The current slice can proceed without additional architectural decisions because the design-system source documents and existing MVP flows define enough structure for componentization and migration.
