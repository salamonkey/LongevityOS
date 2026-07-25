export const storybookContract = {
  "slice_id": "SL-001",
  "slice_title": "Self Onboarding to First Dashboard",
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
