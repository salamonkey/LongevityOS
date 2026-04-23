<!-- generated_from: templates/architecture-baseline-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-23T13:23:04.747Z -->
# Architecture Baseline

Date: `2026-04-23`
Status: `Ready for implementation`
Scope: Current slice `SL-001 Self-profile Onboarding to Generated Dashboard`

## 1. Context

SL-001 delivers the first-use path of a mobile-first responsive web app: a new user enters minimal profile data, the backend generates a deterministic preventive plan from age and gender, and the user lands on a persisted dashboard in the same session. The slice is intentionally limited to one anonymous account with one active profile, a stored planning context choice, server-generated health actions, and a dashboard that always shows either a clear next action or an explicit all-clear state.

## 2. Decisions

- Implement onboarding as a single short mobile-first form with required inputs age, gender, and planning context, followed by one primary submit action that generates the dashboard without intermediate account setup.
- Create the account lazily on first successful onboarding submission and persist the account identifier in a first-party httpOnly cookie so the same profile and dashboard reload correctly without adding authentication to this slice.
- Model persistence with three slice-local entities only: account, active_profile, and generated_action.
- Store active_profile fields as age_years, gender, planning_context, created_at, and updated_at; do not store name, birthdate, medical history, or additional family member data in SL-001.
- Support planning_context as an enum with values self and family; persist it for future continuity, but do not let it change recommendation output in this slice.
- Constrain age input to an integer range of 18 to 120 and constrain gender input to the current rule-supported enum values female and male so plan generation remains deterministic and testable for SL-001.
- Run recommendation generation synchronously on the server during onboarding submit; do not use client-side rule execution, background jobs, or external services for plan generation in this slice.

## 3. Invariant and Guardrail Decisions

- Do not add sign-in, sign-up, email capture, password flows, or any authenticated account management for SL-001.
- Do not add multiple profiles, family member creation, profile switching, or any family-specific rule logic beyond storing the planning context choice.
- Do not add action detail screens, completion updates, planned status updates, reminders, vaccination data, or any mutation of generated actions after creation.
- Do not collect or persist personal data beyond age, gender, planning_context, anonymous account identifier, and generated dashboard data required for reload.
- Do not integrate external APIs, clinical systems, analytics platforms, or AI/LLM recommendation services.
- Do not introduce health score calculation; keep the profile summary as a placeholder summary block only.
- Do not let the frontend become a source of truth for rules or persisted plan state; the backend remains authoritative for generated actions and dashboard payloads.

## 4. Verification Decisions

- Automated validation tests prove onboarding rejects missing age, missing gender, missing planning context, non-integer age, and ages outside 18 to 120, and accepts valid inputs within range.
- At least 10 rule-engine fixture tests covering age and gender combinations produce deterministic action lists, bucket assignments, and sort order with a fixed rule_version.
- An integration test for POST /api/onboarding/complete verifies that a new anonymous account, one active profile, and the generated actions are persisted and that the response includes summary, next_action or all_clear, and the three bucket arrays.
- An integration test for GET /api/dashboard verifies that a page reload with the same account cookie returns the same persisted profile summary and generated actions without regenerating a different plan.
- A UI test on a common mobile viewport completes onboarding from empty form to dashboard render without horizontal scrolling and with Now, Soon, and Later sections visible.
- A UI test verifies that the dashboard primary next action is the first action from the earliest non-empty bucket in the order Now, then Soon, then Later.
- A UI test with a rule fixture that generates zero actions verifies that the dashboard shows the prominent all-clear state and renders empty bucket messaging for Now, Soon, and Later sections instead of a next action card.

## 5. Constraints

- Scope is limited to the first-session onboarding-to-dashboard path for one anonymous account and one active profile only.
- Recommendations must be generated only from age and gender using an in-repo deterministic rule catalog; planning context is stored but not used as an input to rules in this slice.
- Dashboard scope is limited to a summary placeholder, a primary next-action or all-clear area, and Now/Soon/Later action buckets.
- Persistence scope is limited to account, active profile, and generated actions needed to survive reload; no status history, reminders, or vaccination records are included.
- The experience must remain mobile-first and usable on common mobile viewports without horizontal scrolling.
- English copy and fixed bucket labels Now, Soon, and Later are the only supported presentation choices in SL-001.
- All logging for this slice must remain internal server logging only, with anonymous identifiers and no third-party analytics dependencies.

## 6. Open Questions

- none: SL-001 baseline is intentionally closed on platform, inputs, persistence approach, rule source, and dashboard behavior to keep delivery bounded.
