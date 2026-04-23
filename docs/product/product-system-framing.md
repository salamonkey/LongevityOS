# Product System Framing

## Product Essence

A preventive health navigation product that gives users immediate clarity on what health action to take next, when to take it, and why it matters. It uses simple rule-based personalisation from minimal profile data, supports manual tracking and reminders, and is explicitly not a medical record.

## Target Users

- Professionals aged 30–65 who want simple preventive guidance
- Parents or caregivers managing health tasks for multiple family members
- Health-conscious individuals who want a clear preventive plan without medical complexity

## Jobs To Be Done

- Understand which preventive health actions are relevant for me or my family
- See what needs attention now, soon, and later without interpreting fragmented health information
- Track progress against a personal preventive health plan
- Record and review vaccination status manually
- Set reminders so important health actions are not missed
- Manage multiple household profiles from one account

## Core Concepts

- **Personal Health Plan** — A rule-based checklist of relevant preventive health actions generated from basic profile inputs such as age and gender.
- **Health Action** — A single recommended preventive step, such as a check-up, test, or vaccination, shown with status, timing context, and explanation.
- **Priority Buckets** — A dashboard grouping of health actions by urgency and timing so users can quickly understand what needs attention now, soon, or later.
- **Status** — The current state of a health action, evidenced as completed, due, or planned.
- **Reminder** — A user-set prompt for a health action using preset intervals or a custom date.
- **Vaccination Tracker** — A manual record of vaccinations and their current guidance status within the product.
- **Family Profile** — An additional person managed within one account, each with their own plan, health status summary, and vaccinations.
- **Health Score** — A summary indicator of how up to date a profile is with its recommended health actions; calculation is not yet defined.
- **Guidance Explanation** — Clear supporting content on each health action describing what it is and why it matters.

## Product Rules

- The product is a preventive navigation experience, not a medical record.
- The MVP must provide clear user value within roughly the first 60 seconds through immediate plan generation and prioritised guidance.
- Personalisation is based on simple rule-based logic from minimal user inputs; later artifacts must not assume AI-driven recommendations.
- The experience should prioritise clarity, simplicity, trust, and mobile-first usage over completeness.
- Only minimal sensitive data should be part of the product model.
- Vaccination tracking in MVP is manual-entry oriented.
- Family support means multiple profiles can exist within one account, with each profile treated as a separate planning context.
- Reminders support preset intervals and a custom date; downstream artifacts should not assume broader reminder capabilities without confirmation.
- Health actions should communicate both recommended cadence and current status where known.
- Dashboard prioritisation is a core part of the product model even though final user-facing bucket labels remain unresolved.
- Any product expansion that implies provider integration, external data syncing, or full record-keeping is outside the MVP product model.

## Primary Workflows

### Create a personal plan

1. User starts onboarding
2. User enters basic profile data
3. User chooses self-only or adds family planning context
4. Product generates a personal health plan
5. User lands on an overview of prioritised next steps

### Review priorities and act

1. User opens the dashboard
2. User reviews prioritised health actions by timing bucket
3. User selects a health action to see details
4. User understands what the action is and why it matters
5. User marks it done or sets a reminder

### Manage the health plan

1. User opens the full health plan
2. User browses all recommended health actions
3. User reviews status and cadence for each item
4. User updates an item through completion or reminder-setting

### Track vaccinations

1. User opens the vaccination tracker
2. User reviews vaccination entries and status guidance
3. User manually adds or updates a vaccination entry

### Manage family profiles

1. User opens family view
2. User reviews each profile's summary and health status
3. User selects a profile
4. Product shows that profile's plan, priorities, and vaccinations in its own context

### Set a reminder

1. User chooses a health action
2. User selects reminder timing from presets or custom date
3. Product confirms the reminder has been set

## MVP Boundaries

### In Scope

- Onboarding with minimal inputs sufficient to generate a plan
- Immediate generation of a rule-based personal health plan
- Dashboard with prioritised health actions
- Health action detail with explanation and action controls
- Completion status tracking for health actions
- Reminder setting for health actions
- Manual vaccination tracking and status visibility
- Family mode with multiple profiles in one account
- Health score as a visible summary metric if treated as placeholder until defined

### Out of Scope

- Doctor or provider integration
- External API integrations
- Real AI or AI-driven recommendation systems
- Complex or advanced analytics
- Insurance or broader ecosystem links
- Repositioning the product as a full medical record
- Unspecified clinical workflows or provider-facing functionality

## Open Decisions

- Which single platform is the MVP target: responsive web app or cross-platform mobile app?
- What exact user-facing priority taxonomy should be used for dashboard buckets?
- Is Health Score included in MVP, and if so, what is its calculation and user-facing meaning?
- Should 'Smart Insights' exist as a distinct feature surface or only as explanatory guidance within plan and detail views?
- What is the exact scope of profile/settings in MVP beyond family and preferences?
- What are the rules for family mode, including profile limits, permissions, and child/adult handling?
- What reminder delivery channels and notification behaviours are included in MVP?
- What is the minimal required data for vaccination entries and health-action history?
- What single language strategy should the MVP use for product copy and labels?
- Are onboarding inputs strictly limited to age and gender, or is any additional profile data required for plan generation?
