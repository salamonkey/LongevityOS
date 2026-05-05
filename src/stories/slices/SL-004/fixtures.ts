export const storybookContract = {
  "slice_id": "SL-004",
  "slice_title": "Vaccination Tracking Area and Manual Entries",
  "required_components": [
    "AppShell",
    "HealthPlanItem",
    "StatusPill",
    "VaccinationStatusRow"
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
