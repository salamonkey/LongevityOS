# Project Brief

Date: `2026-05-05`
Prepared by: `Product Manager`
Project: `Longevity Health OS / Health App MVP`
Brief Approval Status: `draft`

## 1. Product Description

Longevity Health OS is a responsive web MVP for preventive health navigation.

The MVP generates a personal health plan from age and gender, then helps users track actions, reminders, vaccinations, and family profiles.

The product gives immediate next-step clarity for prevention and does not act as a medical record or diagnostic tool.

## 2. Vision and Positioning

Position the product as a health navigator that tells users what to do next, when to do it, and why it matters.

Anchor the MVP on prevention, clarity, and execution rather than data storage.

Use 'Now / Soon / Later' as the canonical priority model across dashboard and plan surfaces.

## 3. Core Problem

Users do not know which preventive health actions are relevant to them.

Users miss check-ups and vaccinations because follow-up is fragmented.

Existing health tools store information but do not turn it into a clear next action.

## 4. Target Users

- Professionals aged 30–65 who want a clear prevention plan.
- Parents who manage preventive health for multiple family members.
- Health-conscious adults who want guidance without medical complexity.

## 5. MVP Objective

- Deliver visible personal value within 60 seconds of onboarding start.
- Show each profile the next relevant preventive action, its timing, and its rationale in the first session.
- Establish a focused MVP that covers plan generation, action tracking, reminders, vaccinations, and family management without integrations.

## 6. Core MVP Scope

### Onboarding and profile setup

- Capture age and gender for each health profile during onboarding; exclude medical history, symptoms, and lab intake.
- Offer a self-only path and a family path during onboarding; exclude profile invitations and shared account permissions.
- Create one account that can hold multiple health profiles; exclude separate household accounts in MVP.

### Personal health plan and dashboard

- Generate a rule-based personal health plan immediately after onboarding from a fixed MVP rule table keyed to age and gender.
- Display prioritized actions in 'Now', 'Soon', and 'Later' buckets on the dashboard; limit prioritization to internal timing rules.
- Show a simple health score per profile as the percentage of plan items currently up to date; exclude predictive or comparative analytics.

### Health item detail and actioning

- List health plan items with status and recommended cadence; use the MVP statuses done, due, and planned.
- Show item detail with description, why-it-matters explanation, recommendation cadence, and current status context; exclude clinician advice.
- Allow users to mark an item as done from item detail and reflect the update in the plan and dashboard state.

### Reminders

- Let users set a reminder from a health item using 1 month, 3 months, or a custom date.
- Store reminder timing in the product and confirm the reminder on screen; exclude SMS, push, and provider-linked notifications in MVP.
- Keep reminders tied to a single health item and visible through that item's state.

### Vaccination tracking

- Provide a vaccination tracker per profile with manual entry of vaccination records.
- Show vaccination status guidance from stored entries and internal rules; exclude provider verification and external vaccination imports.
- Surface vaccination status within the relevant profile context; exclude a separate record-management workflow.

### Family mode and settings

- Show a family overview with one summary row per profile, including health score and due-state highlights.
- Let users switch between profiles to view profile-specific dashboard, plan, and vaccination data.
- Provide a basic settings area for family management and product preferences; exclude advanced account administration.

## 7. UX Principles and Tone

- Use a clear, calm, trustworthy, lightly motivating tone in all user-facing copy.
- Keep the interface mobile-first and reduce medical jargon to plain-language explanations.
- Use German as the initial launch language across core screens and system copy.
- Favor immediate comprehension over completeness on every primary screen.

## 8. Primary User Journey

1. User starts onboarding and enters age and gender for the first profile.
2. User chooses self-only setup or adds family profiles.
3. Product generates the first profile's health plan immediately after onboarding.
4. User lands on the dashboard and sees health score plus 'Now / Soon / Later' priorities.
5. User opens a health item to read what it is, why it matters, and what action to take.
6. User marks the item done or sets a reminder.
7. User reviews family profiles and vaccination status as needed.
8. User returns later to continue acting on due items.

## 9. Technical Direction

- Build the MVP as a responsive web application to fit the 4–8 week delivery target.
- Use a simple authenticated backend with modular entities for accounts, profiles, plan items, reminders, and vaccinations.
- Implement all guidance through deterministic rule tables rather than AI services.
- Keep content and rules configurable without introducing third-party health integrations.
- Limit the system to core end-to-end flows and reject architecture work that does not support the launch scope.

## 10. Data and Privacy Constraints

- Collect only the data required for accounts, profile age and gender, plan-item state, reminder dates, and vaccination entries.
- Use secure authenticated access and secure storage for all profile data.
- Use test data in development and demo environments.
- Avoid storing medical documents, lab results, clinician notes, or unnecessary free-text health data.

## 11. Explicit Out of Scope (MVP)

- Doctor or provider integration.
- External APIs or third-party health system integrations.
- Real AI or AI-driven recommendations.
- Advanced or complex analytics.
- Insurance links or broader health ecosystem connectivity.
- Comprehensive medical-record storage.

## 12. Delivery Expectations

- Deliver the MVP in 4–8 weeks across setup, core build, testing, and launch readiness.
- Prioritize a complete onboarding-to-action flow over breadth of preventive content.
- Maintain clear scope and cost control by rejecting non-MVP additions during delivery.
- Provide a modular base that supports later expansion without adding unused infrastructure in MVP.

## 13. Primary Success Criteria

- A first-time user reaches a generated dashboard with at least one prioritized health item within 60 seconds of tapping Start.
- In moderated testing with 5 target users, at least 4 users identify their next health step from the dashboard within 30 seconds without facilitator explanation.
- In acceptance testing, 100% of MVP health items show status, recommendation cadence, and a why-it-matters explanation.
- In acceptance testing, marking an item done updates that profile's item status and health score within 5 seconds.
- In acceptance testing, a user sets a reminder from item detail with 1 month, 3 months, and custom date in 3 of 3 tested flows.
- In acceptance testing, an account creates at least 2 profiles and each profile shows an independent dashboard, plan, vaccination list, and health score.
- Launch scope contains zero doctor integrations, zero external health APIs, and zero AI services.

## 14. Future Roadmap (Not MVP)

- Expand the rule set and content depth for more preventive health scenarios after MVP validation.
- Add outbound notification channels after the core reminder model proves useful.
- Add provider and ecosystem integrations after the standalone guidance experience is stable.
- Explore AI-assisted recommendations only after the rule-based foundation and data model are proven.
- Add advanced analytics and insurance-linked experiences after the core navigation product shows sustained use.

## 15. Source Basis

- `Health_App_Wireframes.pdf`
- `Longevity_Health_OS_MVP_HighEnd.pdf`
- `UX_Copy_Health_App.pdf`
