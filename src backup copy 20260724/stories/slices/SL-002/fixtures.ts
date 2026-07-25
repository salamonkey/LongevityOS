export const storybookContract = {
  "slice_id": "SL-002",
  "slice_title": "Health Plan Browsing and Item Detail",
  "required_components": [
    "AppShell",
    "HealthPlanItem",
    "StatusPill"
  ],
  "required_screens": [
    "health_plan"
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
