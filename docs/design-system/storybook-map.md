# Storybook Map

Generated at: 2026-05-05T11:44:01.829Z

Storybook is the executable validation surface for Fabric UI/UX and design-system contracts. It must not become a competing source of truth: Fabric contracts drive stories, story review findings update implementation or the contracts deliberately.

## Active slice

- Slice ID: SL-004
- Slice title: Vaccination Tracking Area and Manual Entries

## Contract-to-story mapping

| Fabric contract | Component/screen | Storybook path | Required stories/states | Validation focus |
|---|---|---|---|---|
| docs/ux/SL-004-component-contract.json | AppShell | Product/AppShell | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-004-component-contract.json | HealthPlanItem | Product/HealthPlanItem | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-004-component-contract.json | StatusPill | Product/StatusPill | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-004-component-contract.json | VaccinationStatusRow | Product/VaccinationStatusRow | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-004-screen-contract.json | family | Screens/family | default, loading, empty, error, success | Layout order, action hierarchy, mobile clarity |

## Closeout rule

A slice is not UX-complete until every introduced or modified user-facing component has a Storybook story covering default, loading, empty, error/invalid, and primary semantic states where applicable.

## CI expectation

- `npm run build-storybook` should pass before release readiness.
- `npm run test:storybook` should pass once Storybook/Vitest interaction tests are enabled.

