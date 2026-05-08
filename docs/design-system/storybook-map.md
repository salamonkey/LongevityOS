# Storybook Map

Generated at: 2026-05-05T18:11:20.843Z

Storybook is the executable validation surface for Fabric UI/UX and design-system contracts. It must not become a competing source of truth: Fabric contracts drive stories, story review findings update implementation or the contracts deliberately.

## Active slice

- Slice ID: SL-006
- Slice title: Profile Area and Household Preferences

## Contract-to-story mapping

| Fabric contract | Component/screen | Storybook path | Required stories/states | Validation focus |
|---|---|---|---|---|
| docs/ux/SL-006-component-contract.json | AppShell | Product/AppShell | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-006-component-contract.json | HealthScoreCard | Product/HealthScoreCard | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-006-component-contract.json | PrioritySection | Product/PrioritySection | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-006-component-contract.json | HealthPlanItem | Product/HealthPlanItem | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-006-component-contract.json | StatusPill | Product/StatusPill | default, loading, empty, error, semantic statuses | State coverage, copy tone, token usage |
| docs/ux/SL-006-screen-contract.json | family | Screens/family | default, loading, empty, error, success | Layout order, action hierarchy, mobile clarity |

## Closeout rule

A slice is not UX-complete until every introduced or modified user-facing component has a Storybook story covering default, loading, empty, error/invalid, and primary semantic states where applicable.

## CI expectation

- `npm run build-storybook` should pass before release readiness.
- `npm run test:storybook` should pass once Storybook/Vitest interaction tests are enabled.

