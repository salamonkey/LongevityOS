<!-- generated_from: templates/architecture-baseline-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-05T08:53:49.062Z -->
# Architecture Baseline

Date: `2026-05-05`
Status: `Ready for implementation`
Scope: Current slice `SL-002 Health Plan Browsing and Item Detail`

## 1. Context

Architecture baseline for SL-002 Health Plan Browsing and Item Detail. This slice adds read-only self-profile plan browsing and item detail using the generated preventive item set from onboarding/dashboard, with consistent item identity, content, status display, and back-navigation context.

## 2. Decisions

- Model health plan content with two read-side structures only: `PreventiveItemDefinition` for locked catalog content and `GeneratedHealthItem` for self-profile instance state. Views compose them by stable `itemKey` instead of duplicating display strings.
- For this slice, `PreventiveItemDefinition` owns `itemKey`, `displayName`, `category`, `cadenceText`, `recommendationText`, and `whyItMattersText`. `GeneratedHealthItem` owns `itemKey`, `profileId`, and one current `status`.
- The only valid categories in SL-002 are `checkup` and `vaccination`. Every generated item belongs to exactly one category based on its definition, and plan browsing derives exactly two list sections from that category.
- The only valid statuses in SL-002 are `due`, `planned`, and `done`. Each generated item exposes exactly one current status, and list/detail/dashboard views must all consume the same status mapping.
- Health item detail is not a separate entity or persistence record. It is the same generated item instance rendered with extended catalog content from its linked definition.
- This feature is self-profile only. Plan lists and detail routes resolve data from the current account's self profile created by onboarding and do not introduce family profile selection or cross-profile lookup.
- The feature owns three route surfaces: self checkups list, self vaccinations list, and self item detail by `itemKey`. Route handlers may assemble read models and handle missing/not-found cases, but they do not generate plans or mutate item state for this slice alone and must not recompute recommendation logic. The only

## 3. Invariant and Guardrail Decisions

- Do not introduce write actions for status changes, reminders, manual vaccination entry, or profile updates inside this feature.
- Do not duplicate item names, cadence text, recommendation text, why-it-matters text, or status labels across dashboard, plan list, and detail components; consume them from shared definition/constants and mappers.
- Do not allow free-form category or status values in UI or adapters; use only the canonical enums for this slice.
- Do not persist navigation origin or back-stack state as domain data; keep it as transient router state/history only.
- Do not broaden data access beyond the current self profile, even if account data already contains family profiles.
- Do not create a separate vaccination tracker model in this slice; vaccination plan browsing here is read-only list/detail presentation of generated health items.
- Do not render an item detail view unless the `itemKey` exists in both the self profile's generated plan and the locked preventive item definition set.

## 4. Verification Decisions

- Test that the combined self checkups list and self vaccinations list contain every generated self-profile `itemKey` exactly once.
- Test that every rendered plan item shows a display name, cadence text, and exactly one status label from the allowed set.
- Test that opening any plan-list item or dashboard-highlighted item loads detail for the same `itemKey` and shows matching name and status plus non-empty recommendation and why-it-matters content.
- Test that direct access to an unknown `itemKey`, an item outside the self profile plan, or an item missing from the locked definition set resolves to not-found behavior rather than partial rendering.
- User-flow test that entering detail from dashboard returns to dashboard, and entering detail from checkups or vaccinations returns to the originating list with browser history context preserved.
- Content verification that 100% of locked MVP preventive item definitions used in this slice have populated `category`, `displayName`, `cadenceText`, `recommendationText`, and plain-language `whyItMattersText` fields.
- Test that dashboard, plan list, and detail render the same item display name and status label for the same `itemKey`.

## 5. Constraints

- Implementation must stay read-only for SL-002; changing item status is out of scope.
- Implementation must stay self-profile only; family profile views and switching are out of scope.
- Only the locked MVP preventive item set may be displayed in this slice; items outside that set are excluded.
- Only two plan sections are allowed in this slice: checkups and vaccinations.
- Detail content must explain why the item matters in plain language and must not expand into medical-record behavior, provider integration, or clinical reference workflows.
- A generated health item must always have one stable `itemKey`, one category, one cadence text, and one current status wherever it is rendered.
- This slice may consume onboarding/dashboard outputs but must not introduce new recommendation-generation logic or separate plan-calculation rules.

## 6. Open Questions

- should return-to-origin while detail is open, or may it be considered no longer valid if list data changes during the same session?
- should a direct-loaded detail page without history show a visible back target to checkups/vaccinations, or is browser back only sufficient for this slice?
