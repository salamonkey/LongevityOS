export const storybookContract = {
  "slice_id": "SL-003",
  "slice_title": "Item Completion and Reminder Actions",
  "required_components": [
    "AppShell",
    "HealthScoreCard",
    "PrioritySection",
    "HealthPlanItem",
    "StatusPill"
  ],
  "required_screens": [
    "reminder"
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
