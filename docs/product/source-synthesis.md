# Source Synthesis

## Product Identity

- Product name: Longevity Health OS (Health App MVP)
- Core promise: Users always know their next health step.

## Source Comparison

### docs/customer-input/Health_App_Wireframes.pdf

- Source kind: wireframe
- Defines primary screen structure: onboarding, dashboard, health plan, detail, family, vaccination pass, reminder, profile.
- Onboarding captures age and gender and offers adding family profiles.
- Dashboard uses prioritised sections labelled Today / Soon / Later plus a Health Score.
- Health Plan is a list of health items with status and frequency.
- Detail screen includes description, why it matters, and actions Done / Reminder.
- Family screen shows profiles overview and health score per person.
- Vaccination area supports list, status, and add entry.
- Reminder setup offers 1M / 3M / Custom.
- Profile includes settings, family, and preferences.

### docs/customer-input/Longevity_Health_OS_MVP_HighEnd.pdf

- Source kind: product brief
- Positions the product as a preventive health navigation platform, not a medical record.
- States core promise explicitly: users should always know their next health step.
- Defines target users: professionals 30–65, parents managing family health, health-conscious individuals.
- MVP objective emphasizes immediate value within 60 seconds, simple UX, lean architecture, and future expandability.
- Core features: personal health plan, smart reminders, vaccination tracker, family mode, dashboard, and smart insights.
- User flow: onboarding with age and gender, immediate plan generation, dashboard priorities, reminders, ongoing notifications.
- Design principles: simplicity, clarity, mobile-first, high-trust feel.
- Technical scope: web app or cross-platform, simple backend, rule-based logic, modular structure.
- Explicit MVP exclusions: no doctor integration, no external APIs, no real AI, no complex analytics.
- Privacy constraints: minimal sensitive data, secure architecture, test data for development.
- Timeline target: 4–8 weeks MVP.
- Future roadmap items are explicitly marked not MVP: AI-driven recommendations, provider integration, advanced analytics, insurance/ecosystem links.

### docs/customer-input/UX_Copy_Health_App.pdf

- Source kind: ux copy
- Confirms tone: clear, calm, trustworthy, lightly motivating.
- Reinforces the product value proposition in user-facing language: 'Wir zeigen dir, was du wann für deine Gesundheit tun solltest.'
- Onboarding copy matches age/gender input and personal plan generation.
- Family onboarding offers only two options: self only or add family.
- Dashboard copy includes today and next-up priorities plus a Health Score phrased as percentage up to date.
- Health Plan copy defines item pattern with recommendation frequency and statuses erledigt / fällig / geplant.
- Detail copy adds rationale ('Warum') and last-test status history.
- Family copy shows per-person progress and due vaccination example.
- Vaccination copy supports status view, last vaccination date, and add vaccination action.
- Reminder copy confirms options: 1 month / 3 months / choose date and says the user will be reminded in time.
- Microcopy emphasizes reassurance, prioritisation, and incremental progress.

## Recurring Themes

- Preventive guidance over passive data storage.
- Immediate clarity on what to do, when to do it, and why it matters.
- Very lean MVP centered on onboarding -> generated plan -> prioritised dashboard -> reminders.
- Age and gender as core onboarding inputs.
- Family profile support within one account.
- Vaccination tracking via manual entry.
- Prioritised health tasks grouped by time horizon.
- Simple, trustworthy, mobile-first user experience.
- Status-driven task management for health actions.
- Reminder capability as a core engagement mechanism.

## Hard Constraints

- MVP is not a medical record.
- Immediate user value should be delivered within 60 seconds.
- Use simple UX with lean architecture.
- Rule-based logic only; 'smart insights' must remain rule-based.
- Technical direction is limited to web app or cross-platform with simple backend and modular structure.
- No doctor integration in MVP.
- No external APIs in MVP.
- No real AI in MVP.
- No complex analytics in MVP.
- Collect minimal sensitive data.
- Use secure architecture.
- Use test data for development.
- Manual vaccination entry is the evidenced tracker approach.
- Core onboarding inputs evidenced are age and gender.
- Timeline expectation for MVP is 4–8 weeks.

## Out of Scope

- Doctor/provider integration.
- External API integrations such as mednet.
- Real AI / AI-driven recommendations.
- Complex or advanced analytics.
- Insurance and ecosystem links.
- Provider integrations from the future roadmap.
- Any roadmap feature explicitly marked Not MVP in the product brief.

## Ambiguities

- Platform choice is unresolved: 'Web App or cross-platform (React / Flutter)'.
- Notification delivery channels are unspecified; sources mention reminders/notifications but not push, email, or SMS.
- Health Score is shown repeatedly, but its calculation, thresholds, and data basis are undefined.
- 'Smart Insights' is named in the brief but has no dedicated wireframe screen or UX copy block.
- Dashboard priority labels differ slightly by source: wireframes say Today / Soon / Later, brief says Now / Soon / Later, UX copy uses Heute wichtig / In nächster Zeit.
- Family management location is unclear: family appears in onboarding, a dedicated family screen, and profile settings.
- Vaccination tracker scope is only clearly evidenced for manual entry and status guidance; import, verification, and document storage are not defined.
- Data model for health plan items is incomplete beyond age/gender-based rules, status, and frequency.
- Target users are stated broadly, but no localisation, language, or geography is specified despite mixed German/English source language.
- Whether profile supports only preferences/settings or broader account management is unspecified.

## Structural Corrections

- Normalize feature naming across artifacts: 'Impfpass' and 'Vaccination Tracker' should be treated as the same feature.
- Choose one consistent priority taxonomy across all artifacts; do not mix Today/Now/Heute labels without a content decision.
- Do not elevate Health Score into a fully specified requirement without defining its logic; current evidence supports display only, not methodology.
- Treat 'Smart Insights' as constrained rule-based guidance, not a separate AI capability.
- Unify status vocabulary across plan and detail views; sources imply statuses such as erledigt / fällig / geplant plus actions Done / Reminder.
- Avoid duplicating family management responsibilities across onboarding, family, and profile without clarifying ownership of create/edit/manage flows.
- Keep the product framing consistent: proactive navigator/operating system, not record storage or medical record.
- Preserve the MVP/future-roadmap boundary; later artifacts should not pull roadmap items into current scope.
- Retain manual vaccination entry as the baseline; do not imply document scanning or automated sync.
- If later artifacts add analytics language, mark it as non-MVP because current brief excludes complex analytics.

## Recommended Briefing Points

- Anchor all later artifacts to the core promise: users should instantly understand their next health step.
- Preserve the evidenced end-to-end MVP flow: onboarding with age/gender -> immediate plan -> prioritised dashboard -> reminders.
- Keep scope centered on six evidenced feature areas: health plan, dashboard, reminders, vaccination tracker, family mode, and profile/settings.
- Design for clarity, trust, and simplicity rather than medical comprehensiveness.
- Implement guidance with deterministic rules based on simple inputs; do not describe or architect AI features for MVP.
- Respect explicit exclusions: no provider integration, no external APIs, no real AI, no complex analytics.
- Assume manual data entry patterns unless a source explicitly supports automation.
- Treat family support as multi-profile under one account, but require clarification on where profile management lives.
- Require a content decision on Health Score logic before using it for prioritisation, reporting, or acceptance criteria.
- Keep privacy posture minimal-data and secure-by-design, with test data during development.
- Keep architecture lean and modular to fit the 4–8 week MVP expectation.
- Ensure copy and UX consistently explain what the action is, why it matters, and when it is due.
