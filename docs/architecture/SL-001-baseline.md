<!-- generated_from: templates/architecture-baseline-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-25T07:36:55.962Z -->
# Architecture Baseline

Date: `2026-04-25`
Status: `Ready for implementation`
Scope: Current slice `SL-001 First-profile Onboarding to Generated Dashboard`

## 1. Context

SL-001 establishes the minimum architecture for a self-only onboarding flow that captures age and gender, generates a deterministic first health plan before navigation, and renders a read-only prioritized dashboard for the sole active profile. The baseline is intentionally limited to the onboarding-to-dashboard path and does not introduce family, reminders, item completion, vaccination, item detail, or broader account architecture.

## 2. Decisions

- For SL-001, the Profile aggregate is the only required domain root. It owns the onboarding inputs and the generated dashboard snapshot: profileId, ageYears, gender, ruleSetVersion, generatedAt, healthScore, and planItems[].
- SL-001 supports exactly one persisted profile and that profile is always the active profile. No Account aggregate, profile switching model, or family relationship model is introduced in this slice.
- Valid onboarding input for this slice is ageYears as a whole number from 30 through 65 inclusive and gender as one of two supported values: female or male. These bounds define the supported rule domain for SL-001.
- planItems are immutable generated records in this slice. Each item contains itemCode, title, whyItMatters, frequencyLabel, priorityHorizon, and displayOrder. Mutable status, reminders, history, and completion metadata are not introduced in SL-001.
- priorityHorizon is a closed enum with exactly three values: Today, Soon, and Later. Every generated item must carry exactly one priorityHorizon value at generation time; dashboard grouping is a direct projection of that stored value.
- Health plan generation is implemented as a deterministic domain service owned by src/features/profile/. It evaluates an in-repo static rule catalog keyed only by age and gender and produces a complete ordered item list plus a derived healthScore.
- The rule catalog is versioned with a ruleSetVersion constant stored on the Profile aggregate. The invariant is: same ageYears, same gender, same ruleSetVersion yields identical item codes, horizons, order, and healthScore on every run of the generator service for SL-001 inputs within range 30-65 inclusive. The initiale

## 3. Invariant and Guardrail Decisions

- All rule predicates, generated item metadata, horizon assignment, and health score calculation must live in the profile domain layer, not in routes, UI components, or ad hoc helpers.
- Dashboard rendering must consume the persisted generated snapshot from the Profile aggregate. The dashboard route must not regenerate plan data during render.
- Onboarding completion is a single application command: validate input, create or overwrite the sole Profile aggregate, generate the plan, persist the aggregate, then navigate to the dashboard only after persistence succeeds.
- The rule catalog must be authored so every supported age-and-gender input produces at least one item. An empty plan is an invalid generation result and must block dashboard navigation.
- Item ordering must be stable and deterministic. Within each horizon group, ordering comes only from displayOrder; UI code must not apply additional sorting heuristics.
- Copy shown in onboarding and dashboard must come from static product copy and must state that guidance is rule-based, not AI, and not a medical record.
- SL-001 code under src/features/onboarding/ owns input collection and submission orchestration only; src/features/profile/ owns domain types, rule evaluation, score derivation, persistence boundary, and dashboard read shaping for the active profile slice state only. This is the single source of truth for Profile types,

## 4. Verification Decisions

- Automated tests cover input validation for ageYears values below 30, above 65, non-integer entries, and unsupported gender values, and confirm that only valid inputs can complete onboarding.
- Determinism tests run the generator multiple times for the same valid input pairs and verify identical itemCode lists, priorityHorizon values, displayOrder values, and healthScore outputs for the current ruleSetVersion.
- Coverage tests verify that each supported boundary input pair for the slice domain produces a non-empty plan: age 30 female, age 30 male, age 65 female, and age 65 male.
- Model tests verify that every generated item belongs to exactly one of Today, Soon, or Later and that the dashboard grouping partitions the full item set without omission or duplication.
- Health score tests verify that the stored healthScore equals the value produced by the declared formula from the generated plan items and that the dashboard displays that stored value read-only.
- An end-to-end mobile viewport test covers the happy path from Start through age-and-gender submission to dashboard load, verifies that generation occurs before navigation, and completes within 60 seconds.
- A repository-level check confirms that SL-001 implementation paths do not import analytics SDKs, external API clients, or provider integration code, and that docs/testing/SL-001-user-checklist.md is marked Pass with corresponding evidence in docs/implementation/SL-001-implementation-notes.md.

## 5. Constraints

- Scope is limited to the self-only onboarding path for the first profile and the resulting dashboard for that same active profile.
- Only age and gender may be collected as onboarding data in SL-001; no names, family members, dates of birth, medical history, reminders, vaccination entries, or provider data are introduced.
- Dashboard behavior is read-only in this slice. No item detail route, mark-done action, reminder creation, editing, or status mutation is part of the architecture baseline.
- Dashboard content must reflect deterministic rule output from age and gender only. No AI logic, personalization heuristics, manual overrides, machine learning, or external guideline lookups are allowed.
- Today, Soon, and Later are the only permitted priority groups in this slice, and each item must appear in exactly one group.
- The architecture must remain mobile-first and fast enough to support the accepted happy path duration; generation logic must therefore be local, synchronous from the user's perspective, and free of external dependencies.
- No external APIs, provider integrations, analytics features, or speculative account-management structures may be introduced for SL-001 under the guise of future-proofing the slice.

## 6. Open Questions

- None.
