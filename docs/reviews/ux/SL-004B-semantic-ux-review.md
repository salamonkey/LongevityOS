# Semantic UX Review - Current Slice

- Status: `pass`
- Slice: `SL-004B` Design System Component Foundation
- Generated: `2026-05-04T08:19:28.710Z`
- Deterministic findings: 1
- LLM status: `pass`
- LLM reviewer: openai/gpt-5.4

## Summary

The migrated user-facing paths are mostly semantically fit: headings, actions, statuses, reminder options, and fallback date/status copy are understandable and human-readable, and the shared component layer appears to preserve user meaning consistently. A few visible strings still lean on internal/product jargon or mechanics and should be refined for stronger UX clarity.

## Findings

### 1. component_contract_not_obviously_used

- Severity: `warning`
- Source: `deterministic`
- Confidence: `medium`
- Visibility: `source`
- File: `docs/ux/SL-004B-component-contract.json`
- Slot: `required_components`
- Observed: Required component FamilyProfileCard was not found by name in user-facing source files.
- Required: Use the approved FamilyProfileCard component or document the equivalent approved implementation before closeout.

### 2. jargon_without_recovery_guidance

- Severity: `warning`
- Source: `llm`
- File: `src/features/design-system-component-foundation/components/PrioritySection.jsx`
- Slot: `empty_or_error_state`
- Observed: The empty-state copy 'No open items in this horizon.' is understandable but uses product jargon ('horizon') instead of plain user language like Today/Soon/Later, and it does not suggest a next step.
- Required: FALSE

### 3. mechanics_over_user_value

- Severity: `warning`
- Source: `llm`
- File: `src/features/profile/ProfileForm.jsx`
- Slot: `explanation_or_rationale`
- Observed: The helper text 'These answers generate rule-based preventive guidance for this profile only.' explains system mechanics more than user value. A clearer user-facing phrasing would focus on tailoring the plan rather than how the app generates it.
- Required: FALSE


## Reviewer rule

A slice is not complete when a component or section merely exists. It is complete only when the user-facing behavior and language satisfy the semantic purpose of the slice.
