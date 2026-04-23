# Project Brief

Date: `2026-04-23`
Prepared by: `Product Manager`
Project: `Longevity Health OS (Health App MVP)`
Brief Approval Status: `draft`

## 1. Product Description

Preventive health navigation product that generates a personal health plan from minimal profile data.

MVP organizes recommended health actions by timing, status, and explanation so users can act without medical interpretation.

Core surfaces are dashboard, full plan, action detail, vaccination tracker, reminders, and family profiles.

## 2. Vision and Positioning

Position the product as a proactive health operating system focused on prevention, clarity, and execution.

Keep the core promise: the user can see the next relevant health step immediately.

Do not position the product as a medical record, provider workflow, or diagnostic tool.

## 3. Core Problem

Target users do not know which preventive check-ups and vaccinations are relevant to them.

Important health actions are missed because reminders and status are fragmented across memory, paper, and disconnected apps.

Existing storage-heavy tools keep data but do not turn it into a clear next action.

## 4. Target Users

- Professionals aged 30–65 who want a low-friction preventive plan.
- Parents or caregivers who manage health tasks for more than one household member.
- Health-conscious adults who want guidance without medical complexity.

## 5. MVP Objective

- Generate a relevant personal plan and first next step within 60 seconds of starting onboarding.
- Deliver a calm, mobile-first experience that explains what to do, when to do it, and why it matters.
- Enable at least one follow-up action after onboarding through status tracking, reminders, or family profile review.
- Keep the MVP narrow enough to ship in 4–8 weeks on a modular rule-based base.

## 6. Core MVP Scope

### Onboarding and plan generation

- Collect age and gender as the required inputs for first-plan generation.
- Let the user choose self-only planning or add family planning context during onboarding.
- Generate a rule-based preventive health plan immediately after onboarding.

### Dashboard and prioritization

- Show profile-specific health actions in three timing buckets: Today, Soon, Later.
- Display an up-to-date summary percentage as an MVP summary indicator for each profile.
- Surface the most relevant next action without requiring plan browsing.

### Plan and action management

- List all recommended health actions with status and recommended cadence.
- Open an action detail view with description, why-it-matters explanation, and current status.
- Let the user mark an action as done or planned from the action flow.

### Reminders

- Allow reminder setting from a health action using 1 month, 3 months, or a custom date.
- Store reminder dates per profile and show confirmation in the app.
- Exclude multi-channel notification orchestration beyond the app-saved reminder state.

### Vaccination tracking

- Provide a dedicated vaccination tracker per profile.
- Let the user add vaccination entries manually and review current status guidance.
- Exclude external vaccine data import and provider sync.

### Family mode

- Let one account manage up to 5 profiles total in MVP, each with separate plans, summaries, and vaccinations.
- Allow switching between profiles from a family overview.
- Exclude role-based permissions, shared editing workflows, and child-specific clinical logic.

## 7. UX Principles and Tone

- Use plain-language UI copy with factual claims only, primary headings under 8 words, and no more than one motivational sentence per screen.
- Prefer plain preventive guidance over medical jargon.
- Keep the mobile-first flow focused on one primary action per screen.
- Show explanation only where it helps action, not as educational overload.
- Choose one default MVP product language before build; treat German as the current copy draft, not a locked requirement.

## 8. Primary User Journey

1. User starts onboarding and enters age and gender.
2. User selects self-only planning or adds family context.
3. Product generates a profile-specific plan and opens the dashboard.
4. User reviews Today, Soon, and Later actions and opens one action detail.
5. User marks the action done or saves a reminder.
6. User returns later to review updated status, vaccinations, or another family profile.

## 9. Technical Direction

- Default MVP delivery is a mobile-first client, implemented as either a responsive web app or a cross-platform app.
- Use rule-based recommendation logic and exclude AI-generated recommendations.
- Use a simple backend that stores profiles, health actions, statuses, vaccination entries, and reminder dates.
- Keep capability boundaries modular so future mobile packaging, provider integrations, and analytics can be added without reworking the core model.

## 10. Data and Privacy Constraints

- Limit required personal data to minimal planning inputs and manual tracking fields.
- Treat age, gender, health-action status, reminder dates, and vaccination entries as the MVP data model.
- Do not store full medical records, clinical documents, or unnecessary health history.
- Use secure architecture and test data during development.

## 11. Explicit Out of Scope (MVP)

- Doctor or provider integrations.
- External API or health-data sync.
- AI-driven recommendations or chatbot behavior.
- Complex analytics, risk scoring, or predictive health models.
- Insurance, ecosystem, or partner integrations.
- Expanded profile and settings features beyond family management and basic preferences.

## 12. Delivery Expectations

- Plan the MVP for delivery within 4–8 weeks.
- Structure delivery into setup, core feature build, testing, and launch readiness.
- Keep implementation decisions consistent with a no-overengineering mandate.
- Provide a transparent estimate and flag any scope addition as a post-MVP change.

## 13. Primary Success Criteria

- A first-time user can complete onboarding and see a generated dashboard within 60 seconds.
- 100% of generated profiles display at least one prioritized next action or an explicit all-clear state.
- A user can mark a health action done or planned and see the updated status reflected in the plan and dashboard on the next load.
- A user can save a reminder in 15 seconds or less using a preset or custom date, and the app shows confirmation.
- A user can add a vaccination entry manually and see it listed under the correct profile in the same session.
- An account can create at least one additional family profile and switch between profile-specific summaries without cross-profile data leakage.

## 14. Future Roadmap (Not MVP)

- Add AI-driven recommendations after the rule-based model proves value.
- Add provider and external health-data integrations after the manual tracking model is stable.
- Add advanced analytics after baseline engagement and status data are reliable.
- Add insurance and broader ecosystem links after core preventive workflows are established.

## 15. Source Basis

- `Health_App_Wireframes.pdf`
- `Longevity_Health_OS_MVP_HighEnd.pdf`
- `UX_Copy_Health_App.pdf`
