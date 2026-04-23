# Source Synthesis

## Product Identity

- Product name: Longevity Health OS (Health App MVP)
- Core promise: Users always know their next health step through a preventive, rule-based health navigation experience.

## Source Comparison

### docs/customer-input/Health_App_Wireframes.pdf

- Source kind: wireframes / screen inventory
- Defines the primary screen set: onboarding, dashboard, health plan, detail, family, vaccination pass, reminder, profile.
- Shows onboarding inputs as age and gender, with an option to add family profiles.
- Shows dashboard prioritisation as Today / Soon / Later plus a Health Score.
- Shows health plan as a list of health items with status and frequency.
- Shows detail screen content as description, why it matters, and actions Done / Reminder.
- Includes family overview with health score per person.
- Includes vaccination list with status and manual add entry.
- Includes reminder presets 1M / 3M / Custom.
- Includes profile/settings, family, and preferences, which are not called out as core MVP features elsewhere.

### docs/customer-input/Longevity_Health_OS_MVP_HighEnd.pdf

- Source kind: product brief / MVP scope
- Explicit product positioning: preventive health navigation platform; not a medical record.
- Explicit core promise: users always know their next health step.
- Defines target users: professionals 30–65, parents managing family health, health-conscious individuals.
- States MVP objective: immediate value within 60 seconds, simple UX, lean architecture, future-expandable base.
- Defines core features: personal health plan, smart reminders, vaccination tracker, family mode, dashboard, smart insights.
- Defines user flow: onboarding -> immediate plan generation -> dashboard priorities -> reminders -> ongoing notifications.
- Sets design principles: simplicity, clarity, mobile-first, high-trust feel.
- Sets technical scope: web app or cross-platform (React / Flutter), simple backend, rule-based logic, modular structure.
- Explicit out of scope: no doctor integration, no external APIs, no real AI, no complex analytics.
- Defines data/privacy constraints: minimal sensitive data, secure architecture, test data for development.
- Gives timeline expectation: 4–8 weeks MVP.
- States future roadmap items are not MVP: AI recommendations, provider integrations, advanced analytics, insurance/ecosystem links.

### docs/customer-input/UX_Copy_Health_App.pdf

- Source kind: UX copy / content draft
- Confirms tone: clear, calm, trustworthy, lightly motivating.
- Reinforces value proposition in user-facing language: 'We show you what and when you should do for your health.'
- Provides concrete labels and microcopy for onboarding, dashboard, health plan, detail, family, vaccinations, and reminders.
- Confirms onboarding wording around generating a personal health plan from user inputs.
- Makes dashboard examples concrete: overdue dentist appointment, overdue blood test, skin check in 2 months, health score phrased as percentage up to date.
- Confirms health plan item structure with recommendation cadence and statuses erledigt / fällig / geplant.
- Confirms detail screen structure: recommendation frequency, why it matters, last status, mark done, set reminder.
- Confirms family view as overview across profiles with summary status and due vaccination.
- Confirms vaccination tracker is manual-entry oriented.
- Confirms reminder options as 1 month / 3 months / choose date.
- Introduces German-first product copy, unlike the English product brief.

## Recurring Themes

- Preventive guidance rather than passive data storage.
- Immediate clarity on what to do next.
- Simple, high-trust, mobile-first UX.
- Rule-based personalisation from basic onboarding data.
- Prioritised dashboard buckets for upcoming health actions.
- Manual vaccination tracking with status visibility.
- Reminder-driven engagement.
- Family/multi-profile support within one account.
- Lightweight MVP intended for fast delivery and future expansion.

## Hard Constraints

- Product is not a medical record.
- MVP must deliver immediate user value within 60 seconds.
- Use simple UX and lean architecture; avoid overengineering.
- Technical approach is limited to web app or cross-platform app (React or Flutter), with simple backend, modular structure, and rule-based logic.
- No doctor integration in MVP.
- No external APIs in MVP.
- No real AI in MVP.
- No complex analytics in MVP.
- Handle minimal sensitive data only.
- Use secure architecture and test data for development.
- Timeline expectation for MVP is 4–8 weeks.
- Design should be mobile-first and convey high trust.

## Out of Scope

- Doctor/provider integration.
- External API integrations (e.g. mednet).
- Real AI or AI-driven recommendations.
- Complex or advanced analytics.
- Insurance and broader ecosystem links.
- Provider integrations and ecosystem connectivity from the future roadmap.
- Anything that repositions the product as a full medical record.

## Ambiguities

- Platform choice is unresolved: 'Web App or cross-platform (React / Flutter)' is explicit, but no final implementation target is chosen.
- 'Smart Insights' is listed as a core feature in the product brief, but no separate wireframe screen or detailed UX copy defines its UI or behavior.
- Priority taxonomy is inconsistent across sources: wireframes use Today / Soon / Later, product brief uses Now / Soon / Later, UX copy uses Heute wichtig / In nächster Zeit with no explicit 'Later' label.
- Health Score is present in wireframes and UX copy, but no calculation method, inputs, or business meaning are defined.
- Family scope is partly defined: multiple profiles exist, but limits, role permissions, and child/adult logic are not specified.
- Reminder delivery is implied via notifications, but channels and platform behavior are unspecified.
- Vaccination feature naming is inconsistent: 'Impfpass', 'Vaccination Tracker', and 'Impfungen' appear across sources.
- Language strategy is unclear: product brief is English, UX copy is German, wireframes are mixed/minimal.
- Profile/settings appears in wireframes, but it is not identified as a core MVP feature in the product brief.
- Target users are defined broadly, but no prioritised primary persona is selected for MVP.
- Onboarding inputs explicitly mention age and gender, but no other profile data requirements or optional fields are specified.

## Structural Corrections

- Normalize feature and screen naming across artifacts: use one consistent term for the vaccination module instead of mixing 'Impfpass', 'Vaccination Tracker', and 'Impfungen'.
- Normalize dashboard priority labels across artifacts; later specs should choose one taxonomy and apply it consistently.
- Separate feature-level requirements from screen inventory: the wireframes list screens, while the product brief lists capabilities; later artifacts should map features to screens explicitly.
- Do not treat 'Smart Insights' as fully specified; it currently exists as a brief-level capability without matching interaction detail.
- Treat Health Score as a placeholder metric until defined; later artifacts should not invent scoring logic.
- Mark Profile/Settings as secondary/supporting scope unless separately confirmed, because it appears only in wireframes.
- Differentiate onboarding family selection from ongoing family management; they are currently split across sources without a clear relationship.
- Avoid expanding reminder requirements beyond what is evidenced: current evidence supports preset intervals, custom date, and notification intent only.
- Preserve the 'not a medical record' positioning in all later artifacts to prevent requirements drift toward record-keeping or clinical workflows.
- Resolve language inconsistency before downstream design/content work; current sources mix English structure with German UX copy.

## Recommended Briefing Points

- Confirm the single MVP platform decision: responsive web app vs cross-platform mobile app.
- Confirm whether 'Smart Insights' is just rule-based explanatory copy inside plan/detail screens or a distinct feature surface.
- Choose one language for MVP delivery and localise all labels consistently.
- Define the dashboard priority taxonomy and whether a third 'Later' bucket is required in the UX.
- Decide whether Health Score is in MVP; if yes, define its calculation and user-facing meaning.
- Confirm the exact MVP scope of Profile/Settings.
- Clarify family mode rules: number of profiles, who can be managed, and editing permissions.
- Define the minimal data model for manual vaccination entries and health-plan completion states.
- Specify reminder channels and expected notification behavior within MVP constraints.
- Confirm whether the onboarding-only inputs are strictly age and gender, and whether anything else is required for plan generation.
