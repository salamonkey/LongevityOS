# Project Brief

Date: `2026-05-04`
Prepared by: `Product Manager`
Project: `Longevity Health OS`
Brief Approval Status: `approved`
## 1. Product Description

Longevity Health OS is a preventive health navigation MVP that turns minimal profile input into a personal health plan.

The product tells users what to do next, when to do it, and why it matters.

The MVP is guidance software, not a medical record or provider-connected care platform.

## 2. Vision and Positioning

Position the product as health intelligence for prevention rather than passive data storage.

Anchor the experience on one promise: users always know their next health step.

Differentiate through prioritized guidance, explanation, and follow-through support instead of record completeness.

## 3. Core Problem

Users do not know which preventive actions are relevant for them or their family.

Users miss check-ups and vaccinations because follow-up is fragmented.

Existing health tools store information but do not guide behavior with clear priorities.

## 4. Target Users

- Professionals aged 30–65 who value preventive health guidance.
- Parents who manage health tasks for children or other family members.
- Health-conscious adults who want clarity without medical complexity.

## 5. MVP Objective

- Deliver visible value within 60 seconds of first use.
- Generate a usable personal health plan from minimal onboarding data.
- Help users act on preventive tasks through prioritization, explanation, and reminders.
- Ship a tightly bounded MVP that preserves expansion paths without adding integration scope.

## 6. Core MVP Scope

### Onboarding and plan generation

- Capture only age and gender for the first health profile during onboarding.
- Offer one setup choice between self-only use and adding family profiles.
- Generate the first personal health plan immediately after onboarding without extra questionnaires.

### Dashboard and plan overview

- Show the active profile’s recommended actions in Today, Soon, and Later buckets.
- Display a health plan list with status and timing or frequency context for each item.
- Display a transparent Health Score based on current plan-item statuses.

### Health item detail and action

- Present each health item with a description, a why-it-matters explanation, and current status context.
- Let users mark a health item as done from the item detail view.
- Let users set a reminder from the item detail view.

### Family mode

- Support one account with the primary user profile plus at least 1 additional profile that belongs to the same family, with profile switching in MVP.
- Show each profile’s Health Score and a count of due items in a family overview.
- Default family management to one account owner in MVP, without adding shared-login support to the default scope.

### Vaccination tracker

- Show vaccination entries and status guidance for the active profile.
- Allow manual addition of vaccination records for the active profile.
- Exclude vaccination import, provider sync, and external validation in MVP.

### Reminder handling

- Let users schedule reminders at 1 month, 3 months, or a custom date.
- Link each reminder to one health item and one profile.
- Default reminder delivery to the product experience in MVP, without adding SMS or email to the default scope.
- MVP includes reminder setting; MVP initial implementation will use in-product reminders, while SMS/email support will be added at a later stage.

## 7. UX Principles and Tone

- Use a clear, calm, trustworthy tone with light motivation.
- Favor clarity over medical complexity in every screen.
- Keep the interface mobile-first and focused on the next action.
- Make priorities and status readable at a glance, which means within the confines of a single page. 

## 8. Primary User Journey

1. User starts onboarding and enters age and gender.
2. User chooses self-only setup or adds family profiles.
3. System generates a personal health plan and opens the dashboard.
4. User reviews Today, Soon, and Later priorities for the active profile.
5. User opens a health item to understand what it is and why it matters.
6. User marks the item done or sets a reminder.
7. User returns later to review reminders, vaccinations, and family profiles.

## 9. Technical Direction

- Default to a mobile-first MVP client, delivered as responsive web unless a cross-platform build is chosen during implementation planning.
- Use internal rule-based logic keyed to age and gender to generate plan items and priorities.
- Use a backend limited to accounts, profiles, health items, reminders, and vaccination entries.
- Default Health Score to a simple formula based on plan-item statuses, with the exact calculation finalized during MVP definition.
- Include only the account and profile settings needed for profile switching and reminder handling.

## 10. Data and Privacy Constraints

- Collect only the data needed for guidance: age, gender, profile labels, item statuses, reminder dates, and manual vaccination entries.
- Use test data during development.
- Keep profile data secured under account-bound access.
- Avoid storing documents, provider records, or broad medical histories.

## 11. Explicit Out of Scope (MVP)

- Doctor or provider integrations.
- External APIs or health-system connections.
- AI-driven recommendations or other real AI features.
- Advanced analytics beyond the displayed Health Score.
- Insurance links or broader ecosystem partnerships.
- Expanded medical-record functionality.
- Native app packaging in the MVP release.

## 12. Delivery Expectations

- Plan delivery in four phases: setup, core features, testing, and launch.
- Target a 4–8 week MVP timeline against this default scope.
- Provide a scope-aligned estimate before implementation starts.
- Escalate any scope pressure that threatens the 60-second value goal or the 8-week window.

## 13. Primary Success Criteria

- A first-time user can complete onboarding and reach a generated dashboard within 60 seconds.
- 100% of active profiles display a dashboard with Today, Soon, and Later buckets.
- 100% of visible health items display a status and timing or frequency context.
- A user can mark a selected health item done in one completed in-app flow.
- A user can schedule a reminder at 1 month, 3 months, or a custom date and see it attached to the same item after save.
- One account can hold at least 2 health profiles and switch between them without mixing profile data.
- A user can add at least 1 vaccination entry manually and see it in the same profile immediately after save.
- The launch build contains zero doctor integrations, zero external health APIs, and zero AI services.

## 14. Future Roadmap (Not MVP)

- Expand the preventive rule set after core plan usefulness is validated.
- Add outbound notification channels after in-app reminder behavior is proven.
- Add provider and health-system integrations after manual tracking flows are stable.
- Add AI-driven recommendations after rule-based guidance quality is established.
- Add deeper family permissions if shared access demand is confirmed.
- Add insurance and ecosystem links after core navigation value is proven.

## 15. Source Basis

- `Health_App_Wireframes.pdf`
- `Longevity_Health_OS_MVP_HighEnd.pdf`
- `UX_Copy_Health_App.pdf`
