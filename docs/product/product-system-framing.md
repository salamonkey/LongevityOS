# Product System Framing

## Product Essence

A preventive health navigation product that gives users immediate clarity on what health action to take next, when to take it, and why, without acting as a medical record.

## Target Users

- Professionals aged 30–65
- Parents managing health for family members
- Health-conscious individuals

## Jobs To Be Done

- Understand the next relevant preventive health action quickly
- See which health actions matter now versus later
- Follow a personalized health plan based on basic personal attributes
- Understand why a recommended action matters
- Track completion status of preventive health items
- Set reminders so preventive actions are not missed
- Manage preventive health for multiple family profiles in one place
- Track vaccination status through manual entry and guidance

## Core Concepts

- **Account** — The primary user relationship with the product that can contain one or more health profiles.
- **Health Profile** — A person-specific preventive health context defined at minimum by age and gender, used to generate guidance.
- **Personal Health Plan** — A rule-based list of recommended preventive health items for a specific profile.
- **Health Item** — A recommended preventive action with status, recommended cadence, and explanatory context.
- **Priority Buckets** — Three time-based groupings used on the dashboard to prioritize health items; exact canonical labels remain to be chosen.
- **Health Score** — A simple up-to-date summary indicator shown per profile to signal overall preventive progress, without implying complex analytics.
- **Detail View** — The item-level view showing what the action is, why it matters, current status context, and available actions.
- **Reminder** — A user-set follow-up prompt tied to a health item using preset or custom timing.
- **Vaccination Tracker** — The product area for manually recording vaccinations and showing status guidance.
- **Family Mode** — The capability to manage multiple health profiles within one account and view each profile’s status.
- **Rule-Based Guidance** — Deterministic recommendation logic that creates plans and guidance from defined rules rather than real AI.

## Product Rules

- The product must be positioned as preventive guidance, not as a medical record.
- The core promise is immediate clarity on the user's next health step.
- The MVP must deliver visible user value within 60 seconds of starting onboarding.
- Onboarding must collect at minimum age and gender for each profile.
- A personal health plan must be generated from rule-based logic using profile attributes.
- Guidance labeled as smart or insightful must remain rule-based in the MVP and must not be presented as real AI.
- The dashboard must prioritize actions using three temporal buckets and a simple overall progress summary.
- Health items must include plain-language explanation of why the action matters.
- Users must be able to mark a health item as done and set a reminder from the item context.
- Vaccination tracking is part of the MVP and must support manual entry plus status guidance.
- Family mode is part of the MVP and must allow multiple profiles under one account.
- The MVP should use minimal sensitive data and maintain a high-trust feel.
- The MVP must stay lean and simple; complex analytics are not part of the product model.
- Doctor or provider integration is excluded from the MVP.
- External APIs or ecosystem integrations are excluded from the MVP.
- Insurance links and broader health ecosystem connectivity are excluded from the MVP.

## Primary Workflows

### Onboard and generate plan

1. User starts onboarding
2. User enters minimum profile inputs: age and gender
3. User chooses whether to plan only for self or add family members
4. Product generates a personal health plan for the initial profile
5. User lands on the dashboard with prioritized next steps

### Review priorities from dashboard

1. User opens the dashboard overview
2. User sees health score or up-to-date summary
3. User reviews prioritized health items grouped into three time buckets
4. User selects an item to view more detail

### Act on a health item

1. User opens an item detail view
2. User reads description, recommendation cadence, current status, and why it matters
3. User marks the item done or chooses to set a reminder
4. Product reflects the updated item state in the plan and dashboard

### Set a reminder

1. User initiates reminder setting from an item
2. User chooses a preset interval or a custom date
3. Product confirms that the reminder is set
4. The item remains trackable for later follow-up

### Manage family profiles

1. User opens family mode
2. User views all profiles with per-person status summary
3. User selects a profile to review its dashboard or plan
4. User adds or maintains family profiles as needed

### Track vaccinations

1. User opens the vaccination tracker
2. User reviews vaccination entries and status guidance
3. User manually adds a vaccination entry
4. Vaccination status contributes to the relevant profile view

### Adjust profile and preferences

1. User opens profile or settings
2. User reviews personal or family-related settings
3. User updates basic preferences relevant to product use

## MVP Boundaries

### In Scope

- Welcome and onboarding flow
- Minimum profile capture with age and gender
- Optional family profile setup during onboarding
- Rule-based personal health plan generation
- Dashboard with three priority buckets
- Simple health score or up-to-date summary
- Health plan list with item status and recommendation cadence
- Item detail view with why-it-matters explanation
- Mark item as done
- Set reminders using preset or custom timing
- Vaccination tracker with manual entry and status guidance
- Family mode with multiple profiles in one account
- Basic profile/settings area for family and preferences
- Clear, calm, trustworthy product framing and copy

### Out of Scope

- Medical-record positioning or comprehensive record storage
- Doctor or provider integration
- External APIs or third-party health system integrations
- Real AI or AI-driven recommendations
- Advanced or complex analytics
- Insurance or ecosystem links
- Any future-roadmap integrations beyond the lean MVP

## Open Decisions

- Canonical product name: 'Longevity Health OS' vs 'Health App'
- Primary launch language and localization approach
- Canonical labels for the three dashboard priority buckets
- Initial rule set for which preventive items are included in the personal health plan
- Minimal health score calculation and how it updates without becoming analytics-heavy
- Reminder delivery channel definition
- Family mode basics such as profile limits and switching behavior
- Minimal vaccination data model and status rules
- Exact scope of profile/settings beyond family and preferences
- Platform choice between responsive web and cross-platform mobile
