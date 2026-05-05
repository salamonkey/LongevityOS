# Project Brief

Date: `2026-05-05`
Prepared by: `Product Manager`
Project: `Longevity Health OS`
Brief Approval Status: `approved`
## 1. Product Description

Longevity Health OS is the default product name for this preventive health navigation MVP for individuals and families.

The product generates a personalized health plan from minimal profile inputs and turns it into clear next actions.

The MVP focuses on guidance, status tracking, reminders, and manual vaccination tracking rather than broad health data storage.

## 2. Vision and Positioning

Position the product as a health navigator that tells users what to do next, when to do it, and why it matters.

Frame value around prevention, clarity, and follow-through rather than record keeping.

Treat rule-based guidance as the core intelligence model for MVP.

## 3. Core Problem

Users do not know which preventive actions are relevant for them.

Users miss check-ups and vaccinations because follow-up is fragmented.

Existing health tools store information without prioritizing the next action.

## 4. Target Users

- Professionals aged 30-65 who want a clear preventive health plan.
- Parents who manage preventive health tasks for multiple family members.
- Health-conscious adults who want reminders and status visibility without medical complexity.

## 5. MVP Objective

- Show a populated personal health dashboard within 60 seconds of starting onboarding.
- Give each user a prioritized plan that makes the next preventive action obvious.
- Support repeat engagement through item status updates, reminders, and family oversight.
- Keep MVP scope limited to the features listed in this brief for a 4-8 week build.

## 6. Core MVP Scope

### Onboarding and profile setup

- Capture age and gender as the only required personal inputs during first-run onboarding.
- Offer optional family profile creation during onboarding inside the same account.
- Generate the first health plan within 5 seconds of onboarding completion.

### Personal health plan

- Create a rule-based checklist from age and gender only, limited to the initial preventive check-up and vaccination item set defined for MVP.
- the MVP checklist is explicitly limited to a named, enumerated MVP preventive item set in an LLM-generated table based on the scope and purpose of the MVP, with anything not listed treated as out of scope.
- Display each item with recommendation cadence and one current status.
- Support the statuses done, due, and planned across plan views.

### Prioritized dashboard

- Group health items into Today, Soon, and Later buckets on the main dashboard.
- Show one simple Health Score per profile as an up-to-date summary indicator in %.
- Surface 1 highest-priority item on the dashboard from Today, or the earliest Soon item if Today is empty.

### Health item detail and actions

- Open each health item into a detail view with recommendation text and why-it-matters rationale.
- Allow users to mark an item as done from the detail view.
- Allow users to set a reminder for an item using 1 month, 3 months, or a chosen date.

### Vaccination tracking

- Provide a dedicated vaccination list for each profile.
- Allow manual addition of vaccination entries with date and status context.
- Show vaccination due guidance inside the vaccination area without provider sync.

### Family mode

- Let one account manage up to 5 individual profiles.
- Show per-profile Health Score and due-item summary in the family overview.
- Let users open each family member's dashboard, checkup plan, and vaccinations.

### Profile and preferences

- Provide a lightweight profile area to create, view, and edit family profiles; exclude archive and delete from MVP.
- Limit preferences to reminder settings and household management.
- Exclude broad account customization from MVP.

## 7. UX Principles and Tone

- Keep the interface mobile-first and reduce each screen to one primary action.
- Use clear, calm, trustworthy language with light motivational reinforcement.
- Explain medical relevance in plain language instead of clinical detail.
- Favor prioritization and completion signals over dense data display.

## 8. Primary User Journey

1. User starts onboarding and enters age and gender.
2. Once onboarded, the System generates a personal health plan and opens the dashboard.
3. A health plan consists of two categories: checkups and vaccinations.  
3. Onboarded users may add profiles for family members.
4. User reviews Today, Soon, and Later priorities.
5. User opens an item, reads why it matters, and marks it done or sets a reminder.
6. User returns to the app main screen as the dashboard, to track progress, manage checkups and vaccinations for themselves or for family profiles.

## 9. Technical Direction

- Default to a mobile-first responsive web app for MVP, while keeping the client architecture portable to a cross-platform build later.
- Use a simple modular backend for MVP, with exact service boundaries and domain decomposition determined during technical design.
- Keep personalization rule-based for MVP and exclude ML or real AI services.
- Design data structures to support one account with multiple profiles from launch.

## 10. Data and Privacy Constraints

- Collect only the minimum personal data needed for plan generation and profile management.
- Exclude broad medical record storage, document ingestion, and provider data sync from MVP data scope.
- Use secure handling for profile, plan, reminder, and vaccination data.
- Use test data in development environments.

## 11. Explicit Out of Scope (MVP)

- Doctor or clinic integration.
- External APIs, provider systems, or ecosystem links.
- AI-generated recommendations beyond rule-based logic.
- Complex analytics, trend dashboards, or risk scoring.
- Insurance integrations.
- Expanded record-keeping features that turn the product into a medical record system.

## 12. Delivery Expectations

- Deliver an MVP in 4-8 weeks across setup, core build, testing, and launch preparation.
- Protect scope against unsupported intake fields, integrations, and analytics additions.
- Provide a costed implementation plan that breaks work into 4 phases: setup, core build, testing, and launch preparation.
- Ship the self profile flow and family profile flow in the first launch build.

## 13. Primary Success Criteria

- A new user can complete onboarding and reach a populated dashboard in 60 seconds or less.
- In moderated MVP validation, at least 8 of 10 target users can identify their next health step within 1 minute of first dashboard load.
- 100% of generated health items show a recommendation cadence, a status, and a why-it-matters explanation.
- A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion.
- A user can add at least 1 manual vaccination entry to any profile and see it appear in that profile's vaccination list in the same session.
- A family account can create and view at least 2 profiles with separate Health Scores and priority lists.

## 14. Future Roadmap (Not MVP)

- Expand rule coverage beyond the initial preventive checklist after MVP usage validates the core flow.
- Add provider and ecosystem integrations after the manual tracking model is stable.
- Introduce advanced analytics only after the Health Score proves useful as a simple summary.
- Evaluate AI-assisted recommendations only after the rule-based guidance model and trust signals are validated.

## 15. Source Basis

- `Health_App_Wireframes.pdf`
- `Longevity_Health_OS_MVP_HighEnd.pdf`
- `UX_Copy_Health_App.pdf`
