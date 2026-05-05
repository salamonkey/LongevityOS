# Approved Visual and Behavioral States

Generated: `2026-05-05T08:01:36.576Z`

## Dashboard

- `default`: health score plus Today / Soon / Later sections.
- `empty`: no urgent actions; reassure the user and show later/planned items if available.
- `needs_attention`: Today section visually dominates without alarmist styling.

## HealthPlanItem

- `done`: completed/up to date; secondary action may open detail.
- `due`: needs attention now; primary action opens detail or reminder.
- `overdue`: clear priority but calm tone; no diagnosis language.
- `planned`: reminder or appointment exists; show next date if known.
- `soon`: upcoming action; lower visual weight than due/overdue.

## ReminderSelector

- `default`: presents 1 month / 3 months / custom date.
- `selected`: selected option is visually clear.
- `confirmed`: confirmation tells the user they will be reminded in time.
- `invalid_date`: correction is specific and user-facing.
