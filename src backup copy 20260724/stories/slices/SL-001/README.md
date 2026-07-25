# Storybook stories for SL-001

Slice: Self Onboarding to First Dashboard

These stories are generated from Fabric contracts and auto-wire detected real route/component modules when available.
If no visual module is detected for a required path, Fabric falls back to a placeholder story and the Storybook review fails until that binding is resolved.

## Required components
- AppShell
- HealthScoreCard
- PrioritySection
- HealthPlanItem
- StatusPill
- FamilyProfileCard
- VaccinationStatusRow

## Required screens
- onboarding

## Required states
- default
- loading
- empty
- error
- success

## Required semantic statuses
- done
- due
- soon
- planned
- overdue

## Required priorities
- today
- soon
- later

## Closeout expectation

Run `fabric uiux:review-current-slice-storybook --target .` and resolve findings before `coder:close-current-slice`.
