# Source Synthesis

## Product Identity

- Product name: Longevity Health OS / Health App MVP
- Core promise: A preventive health navigation product that tells users what health action to take next, when to take it, and why, with immediate clarity rather than medical-record storage.

## Source Comparison

### docs/customer-input/Longevity_Health_OS_MVP_HighEnd.pdf

- Source kind: product/MVP brief
- Strongest source for vision, scope, constraints, and MVP boundaries.
- Explicitly positions product as preventive guidance, not a medical record.
- Defines target users: professionals 30–65, parents managing family health, health-conscious individuals.
- Defines MVP objective: immediate value within 60 seconds, simple UX, lean architecture, future-ready base.
- Enumerates core features: personal health plan, smart reminders, vaccination tracker, family mode, dashboard, rule-based smart insights.
- Specifies canonical prioritisation as 'Now / Soon / Later'.
- Technical scope is constrained: web app or cross-platform, simple backend, rule-based logic, modular structure.
- Contains explicit out-of-scope list: no doctor integration, no external APIs, no real AI, no complex analytics.
- Adds privacy and delivery constraints: minimal sensitive data, secure architecture, test data for development, 4–8 week target.

### docs/customer-input/Health_App_Wireframes.pdf

- Source kind: wireframe/screen structure
- Strongest source for screen inventory and basic IA.
- Confirms onboarding flow with welcome, age/gender input, and optional family profile addition.
- Confirms dashboard with health score and three prioritisation buckets, but labels them 'Today / Soon / Later' rather than 'Now / Soon / Later'.
- Confirms health plan list with status and frequency per item.
- Confirms detail screen includes description, why-it-matters explanation, and actions Done / Reminder.
- Confirms dedicated family screen with per-person overview and health score.
- Confirms dedicated vaccination area ('Impfpass') with vaccination list, status, and add-entry action.
- Confirms reminder setup screen with 1M / 3M / Custom options.
- Confirms profile/settings area for family and preferences.
- Provides structure but not business rules, scoring logic, or technical constraints.

### docs/customer-input/UX_Copy_Health_App.pdf

- Source kind: UX copy/content
- Strongest source for tone and user-facing wording: clear, calm, trustworthy, lightly motivating.
- Reinforces onboarding inputs and immediate generation of a personal health plan.
- Reinforces dashboard concept with concrete examples and a health score phrasing ('70% up to date').
- Reinforces health plan item format with recommendation frequency and statuses: erledigt / fällig / geplant.
- Reinforces detail view pattern: recommended cadence, rationale, last action timing, mark done, set reminder.
- Reinforces family mode with per-person summary and overdue vaccine example.
- Reinforces vaccination tracker with manual add flow and status guidance.
- Reinforces reminder options as 1 month / 3 months / choose date.
- Adds microcopy direction but does not define additional scope or technical requirements.
- Uses German copy and labels, unlike the more English product brief.

## Recurring Themes

- Prevention-focused health guidance rather than record storage.
- Immediate clarity on next health steps is central.
- Lean MVP with simple UX and high-trust presentation.
- Core flow repeats across sources: onboarding -> generated plan -> dashboard priorities -> reminders -> ongoing use.
- Personalized plan is driven at minimum by age and gender.
- Family/multiple profiles are part of MVP.
- Vaccination tracking is part of MVP and appears to support manual entry.
- Dashboard prioritisation and a health score/status summary recur across sources.
- Why-it-matters explanations are part of the user value.
- Reminder-setting is a core engagement mechanism.

## Hard Constraints

- Do not position or build the MVP as a medical record; positioning is preventive guidance.
- Onboarding must at minimum collect age and gender.
- MVP must provide immediate user value within 60 seconds.
- Include these MVP capabilities: personal health plan, reminders, vaccination tracker, family mode, dashboard.
- Use rule-based guidance; 'smart insights' must not be implemented as real AI.
- No doctor integration in MVP.
- No external APIs/integrations in MVP.
- No complex analytics in MVP.
- Use minimal sensitive data and secure architecture; use test data for development.
- Architecture should stay lean/simple/modular; avoid overengineering.
- Platform is constrained to web app or cross-platform app approach.
- Target timeline expectation is 4–8 weeks.

## Out of Scope

- Doctor/provider integration.
- External APIs or ecosystem integrations (e.g. mednet).
- Real AI / AI-driven recommendations in MVP.
- Advanced/complex analytics.
- Insurance and broader ecosystem links.
- Provider integrations and advanced analytics listed in roadmap are future, not MVP.

## Ambiguities

- Canonical product name is inconsistent: 'Longevity Health OS' vs generic 'Health App'.
- Canonical language is unclear: brief is English, UX copy is German, wireframes mix English and German ('Impfpass').
- Dashboard priority labels conflict: 'Now / Soon / Later' vs 'Today / Soon / Later' vs German dashboard copy.
- Health score is visible across sources, but scoring method, data basis, and update logic are unspecified.
- 'Smart reminders' / notifications are referenced, but delivery channel is unspecified (in-app, push, email, SMS not defined).
- Vaccination tracker scope is unclear beyond manual entry and status guidance; supported vaccine model and status rules are not defined.
- Family mode is confirmed, but profile limits, permissions, and switching behavior are not specified.
- Rule set for the personal health plan is not defined beyond age/gender inputs.
- Platform choice remains open between web app and cross-platform mobile approach.
- Profile/settings scope is vague beyond family and preferences.

## Structural Corrections

- Normalize terminology for the prioritisation buckets in all downstream artifacts; do not mix 'Now', 'Today', and localized variants without an explicit decision.
- Treat 'Smart Insights' as rule-based guidance within the MVP, not as a separate AI capability.
- Keep 'Family Option' in onboarding and 'Family Screen/Mode' as parts of one feature, not separate product lines.
- Normalize vaccination feature naming across artifacts: 'Impfpass', 'Impfungen', and 'Vaccination Tracker' refer to the same MVP area.
- Do not let the visible 'Health Score' drift into a complex analytics requirement; scoring exists in UI evidence, but advanced analytics are explicitly out of scope.
- Preserve screen structure from wireframes, but do not infer hidden workflows or data models not present in the sources.
- Separate UX copy examples from functional requirements; sample items like dentist or blood test are illustrative, not a full requirements list.
- Maintain distinction between explicit MVP scope and roadmap items; later artifacts must not pull future integrations or AI into the MVP.

## Recommended Briefing Points

- Choose and document the canonical product name and primary launch language.
- Decide the canonical dashboard bucket labels and keep them consistent in product, design, and copy.
- Define the initial rule-based health plan logic: which preventive items are included and how age/gender map to them.
- Decide whether the MVP includes a simple health score and, if yes, define a minimal non-analytic calculation.
- Choose platform approach: responsive web vs cross-platform mobile.
- Define reminder delivery channels and any notification dependencies while staying within no-external-API constraints.
- Specify family mode basics: number of profiles, switching, and whether profiles are adult/child only or mixed.
- Define vaccination data model minimally enough to support manual entry, status, and reminders.
- Document privacy approach for minimal sensitive data and secure test/development handling.
- Keep all downstream solutioning aligned to lean MVP and 4–8 week delivery expectations.
