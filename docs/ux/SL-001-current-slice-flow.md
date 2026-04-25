<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-25T07:48:06.600Z -->
# UX Flow - Current Slice

Date: `2026-04-25`
Status: `Ready for implementation`
Scope: `SL-001 First-profile Onboarding to Generated Dashboard`

## 1. Context

Slice SL-001 defines the mobile-first responsive MVP flow from first launch to a generated dashboard for a first profile. Scope is limited to self-only onboarding, required age and gender capture, deterministic plan generation before dashboard load, and a read-only dashboard with health score plus Today/Soon/Later grouping.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User opens the app and lands on a simple welcome screen with a clear value statement and a single primary action: Start.
- Expected behavior:
  - Welcome screen purpose: reassure the user they can get a personal preventive plan quickly from minimal input. Layout contains headline, one short supporting sentence, and one primary CTA: Start.
  - Tapping Start opens a single onboarding form screen for the first profile. The screen title is personal and direct, such as 'Build your plan'.
  - The onboarding form contains only two required inputs: Age and Gender. Age is a numeric field optimized for whole-number entry. Gender is a single-select control with exactly two options: Female and Male.
  - A short helper line under the inputs explains that these answers are used only to generate rule-based preventive guidance for this profile.
  - The primary action on the form is Generate my plan. A back action returns to the welcome screen without losing already entered values during the same session.
  - On valid submission, the form transitions immediately to a blocking generating state. The screen shows progress feedback such as 'Building your dashboard...' and does not reveal dashboard content until generation succeeds.
  - When generation returns a non-empty plan, the user is taken directly to the active profile dashboard with no intermediate choice screens or setup steps.
  - Dashboard structure is fixed in this order: page header, read-only health score card, Today section, Soon section, Later section. The header labels the view as the user's dashboard for the active profile without requiring a profile name for this slice.

### Flow B - Failure and Recovery Paths

- If the user taps Generate my plan with invalid input, submission is blocked on the onboarding form. Age errors appear inline for blank, non-numeric, decimal, or out-of-range values with the message 'Enter your age in whole years.' Gender shows an inline required error such as 'Select a gender.' Focus moves to the first

## 3. Interaction and Validation Rules

- Age is required and must be a whole number from 1 to 120 inclusive.
- Gender is required and must allow exactly one selection from Female or Male.
- Only age and gender are collected in this slice; no name, email, family members, reminders, status, or medical-history fields appear in the flow.
- The onboarding form must keep entered values visible after validation errors so the user can correct them without re-entering other fields.
- The generating state must be shown after valid submission and before dashboard load; the dashboard must never appear before plan generation completes successfully.
- Successful generation must produce at least one health item before the user can land on the dashboard.
- The dashboard must always present priority groups in the fixed order Today, Soon, Later.
- Every generated health item must render in exactly one section only; duplication across sections is not allowed at the UI level or data-binding level.

## 4. Implementation Constraints

- Self-only onboarding only; no add-family choice, family CTAs, or profile-switching controls are shown.
- Health items are read-only in this slice; no tap-through to detail, no Done action, and no reminder action are exposed.
- Health score is displayed as a read-only summary value only; no calculator explanation, editing, or drill-down is included.
- Dashboard content must reflect deterministic rule output from entered age and gender only; no manual additions, inferred history, or external data sources are surfaced.
- Copy and labels must frame the product as rule-based preventive guidance and must not imply AI, diagnosis, or medical-record functionality.

## 5. Acceptance Mapping

- From welcome-screen Start to dashboard load, the happy path can be completed within 60 seconds by a new user entering valid age and gender once.
- A user who submits valid age and gender is shown a generating state and lands on a dashboard only after a non-empty plan exists.
- The dashboard visibly includes a read-only health score for the active profile above the grouped item lists.
- All displayed health items appear under exactly one of these section headers: Today, Soon, or Later.
- Out-of-scope features for this slice are absent from the UI: add-family onboarding, health item detail, mark Done, reminders, vaccination tracking, and settings.
