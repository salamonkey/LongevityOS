export const storybookContract = {
  "slice_id": "SL-006",
  "slice_title": "Profile Area and Household Preferences",
  "required_components": [
    "AppShell",
    "HealthScoreCard",
    "PrioritySection",
    "HealthPlanItem",
    "StatusPill"
  ],
  "required_screens": [
    "family"
  ],
  "required_states": [
    "default",
    "loading",
    "empty",
    "error",
    "success"
  ],
  "required_statuses": [
    "done",
    "due",
    "soon",
    "planned",
    "overdue"
  ],
  "required_priorities": [
    "today",
    "soon",
    "later"
  ]
} as const;
