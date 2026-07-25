export const storybookContract = {
  "slice_id": "SL-005",
  "slice_title": "Family Onboarding and Family Overview",
  "required_components": [
    "AppShell",
    "HealthScoreCard",
    "PrioritySection",
    "HealthPlanItem",
    "StatusPill",
    "FamilyProfileCard",
    "VaccinationStatusRow"
  ],
  "required_screens": [
    "onboarding"
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
