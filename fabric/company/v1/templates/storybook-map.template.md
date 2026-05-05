# Storybook Map

Generated at: {{generated_at_utc}}

Storybook is the executable validation surface for Fabric UI/UX and design-system contracts. Fabric contracts remain the source of truth; Storybook stories make those contracts visible, reviewable, and testable.

## Contract-to-story mapping

| Fabric contract | Component/screen | Storybook path | Required stories/states | Validation focus |
|---|---|---|---|---|
| docs/design-system/components.json | Design-system component | Design System/{ComponentName} | default, loading, empty, error, semantic states | Approved props, tokens, states, composition |
| docs/ux/{slice_id}-component-contract.json | Slice component | Product/{ComponentName} | default, loading, empty, error, semantic statuses | Component coverage and user-facing state labels |
| docs/ux/{slice_id}-screen-contract.json | Slice screen | Screens/{ScreenId} | default, loading, empty, error, success | Screen sections, action hierarchy, mobile clarity |
| docs/ux/{slice_id}-copy-contract.json | Visible copy slot | Product/{ComponentName} or Screens/{ScreenId} | slots represented in relevant states | Calm, trustworthy, non-internal copy |

## Closeout rule

A slice is not UX-complete until every introduced or modified user-facing component has a Storybook story covering default, loading, empty, error/invalid, and primary semantic states where applicable.
