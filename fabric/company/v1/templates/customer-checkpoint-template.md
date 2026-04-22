# Customer Checkpoint Template

Date: `YYYY-MM-DD`
Prepared by: `{{owner_role}}`
Project: `{{project_name}}`

## 1. Checkpoint Type

`Informational Checkpoint | Review Checkpoint | Decision Checkpoint | Completion Checkpoint`

## 2. Current Slice

`{{slice_id}} - {{slice_title}}`

## 3. Objective

`One plain-language sentence on the slice objective.`

## 4. Status

`Not started | In progress | Milestone complete | Completed | Blocked`

## 5. What Was Completed

- `Plain-language outcome 1`
- `Plain-language outcome 2`

## 6. Why It Matters

`Short customer-facing value statement.`

## 7. Customer Action Classification

`No action required | Optional review | Decision required`

## 7A. Execution State

`Continues | Paused`

## 8. Exactly What You Need To Do Now

Use one of these sections and keep only the applicable one.

### If `No action required`

- [ ] `No action required now.`
- [ ] `Team next steps: <what the team is doing next>.`

### If `Optional review`

- [ ] `Optional: review the flow below.`
- [ ] `This review is optional and does not pause delivery.`

### If `Decision required`

- [ ] `Decision required before continuation.`
- [ ] `Choose: Option A | Option B | Option C`

## 9. Customer-Ready Access Instructions

Include this section only when customer review is requested (`Optional review` or `Decision required`).

- Availability confirmed by team: `Yes`
- Entry point / URL: `<url or route>`
- Credentials/access details: `<none or explicit details>`
- Customer setup required: `None`

### Exact Steps To Access The Relevant Screen

1. `<step 1>`
2. `<step 2>`
3. `<step 3>`

### Exact Review Flow To Perform

1. `<review action 1>`
2. `<review action 2>`
3. `<review action 3>`

### Expected Result

- `<expected outcome 1>`
- `<expected outcome 2>`

If availability is not confirmed, do not ask for review.
Set classification to `No action required`, state team next steps, and re-issue when ready.

If classification is `Optional review`, do not make slice closeout or internal continuation contingent on customer reply.

## 9A. Team Verification Evidence

Required when customer review is requested (`Optional review` or `Decision required`).

- Lint: `<pass/fail + command>`
- Typecheck: `<pass/fail + command>`
- Automated tests: `<pass/fail + command>`
- Live smoke review flow: `<pass/fail + what was validated>`
- Entry URL probe: `<pass/fail + URL + expected marker>`
- DB migration applied or not required: `<pass/fail + evidence>`

If any item is failing or missing, do not ask for customer testing.

## 9B. Migration Status

Include this section when schema or migration files changed in the slice.

- Migration required: `yes | no`
- Migration command: `{{db_migration_command}}` (when required)
- Migration evidence: `<status output, deploy log, or checkpoint reference>`

## 10. Exact Recommended Reply

`<single copy-pasteable customer reply>`

## 11. What Happens Next After Your Reply

1. `<next team step 1>`
2. `<next team step 2>`
3. `<next checkpoint or delivery action>`

Also state whether execution is paused or continues:
- `No action required` and `Optional review`: continues
- `Decision required`: paused until decision

## 12. Short Customer Checklist

- [ ] `Understand current slice and status`
- [ ] `Take required action (or confirm no action)`
- [ ] `Send exact recommended reply`
