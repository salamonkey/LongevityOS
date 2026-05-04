# Design System Usage Rules

Generated: `2026-05-04T06:34:08.337Z`

## Core rule

Screens must be composed from the approved product components before introducing generic layout or one-off UI.

## Token rules

- Do not use raw hex, rgb, hsl, or named color values in user-facing components when a semantic token exists.
- Status styling must use `color.status.*` tokens.
- Priority styling must use `color.priority.*` tokens.
- Spacing and radius must use named tokens or project theme values, not arbitrary one-off values.

## Component rules

- Dashboard priority groups must use `PrioritySection` in this order: Today / Soon / Later.
- Preventive health actions must use `HealthPlanItem`.
- Status labels must use `StatusPill`.
- Family summaries must use `FamilyProfileCard`.
- Vaccination list entries must use `VaccinationStatusRow`.

## Tone rules

- Copy must be clear, calm, trustworthy, and lightly motivating.
- Overdue or due states must create action without fear.
- UI must not imply diagnosis or replace medical advice.
- Empty states must tell the user what is true and what they can do next.
