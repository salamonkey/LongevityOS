# LLM Prompt Log

- task: brief_clarity_semantic_validation
- caller: brief-clarity-gate.reviewGeneratedBriefClarityAllSemantic
- provider: openai
- model: gpt-5.4
- started_utc: 2026-05-05T07:39:56.227Z
- prompt_chars: 34042
- prompt_estimated_tokens: 8511
- prompt_sources:
  - team/product-manager.md
  - docs/product/project-brief.md
  - docs/product/source-evidence-pack.md
  - docs/product/source-synthesis.md
  - docs/product/product-system-framing.md

## System Prompt
```text
You are a strict clarity gate reviewer for product briefs.
Respect Product Manager role guidance, but prioritize clarity rules and schema requirements.
Return JSON only according to the schema.
Judge semantics, not keyword presence.
Report only real violations of the clarity rules.
Rules:
- unresolved_alternative: unresolved decision options remain without a default.
- ambiguous_term: soft wording is not concretely bounded in context.
- missing_observable_signal: success criterion lacks observable signal (time/count/threshold/binary completion condition).
- scope_not_action_oriented: scope bullet does not specify a concrete action.
- scope_not_bounded: scope bullet lacks enforceable boundary.
- draft_integrity_issue: malformed or broken drafting artifacts (for example damaged punctuation/quotes, concatenated fragments, unresolved placeholders, or malformed list items).
- source_overreach: line asserts a locked decision that is not sufficiently supported by evidence pack + synthesis + framing context.
For unresolved_alternative, threshold expressions like "or less"/"or more" are not violations unless they create unresolved choices.
For scope_not_bounded, set boundary_type and evidence_span; use boundary_type=none and evidence_span="" when unbounded.
For all non-scope_not_bounded issues, set boundary_type=none and evidence_span="".
For source_overreach, focus on hard-lock wording like canonical/fixed/formula/channel mandates that are unsupported by context.
Do not flag a line as source_overreach if the same locked decision is explicitly supported by the provided synthesis/framing.
```

## User Prompt
```text
Project brief markdown:
```markdown
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
```

Clarity rules contract:
```text
Clarity rules contract (mandatory):
- Keep the exact 15-section shape and section intent boundaries.
- Keep one decision per bullet.
- Resolve alternatives with one default decision or explicit default wording.
- Avoid soft terms ("should/could/may/simple/lean/scalable") unless concretely bounded in the same line.
- In "Primary Success Criteria", every bullet must include an observable signal (time/count/threshold or binary completion condition).
- In "Core MVP Scope", every bullet must be action-oriented and explicitly bounded.
- Do not output malformed lines (broken quoting/punctuation artifacts, concatenated fragments, or unresolved placeholders).
- Do not hard-lock channel/formula/canonical decisions unless they are explicitly supported by provided evidence/framing.
- Keep output compact; do not increase verbosity to add caveats.
- During retries, fix flagged issues without introducing any new clarity-rule violations.
- Before returning, run a full self-check across all clarity rules, not only flagged items.
```

Evidence pack:
```markdown
# Source Evidence Pack

Treat this as the raw evidence bundle for model-driven intake.

## Source: docs/customer-input/Health_App_Wireframes.pdf

```text
1. Onboarding

Welcome Screen
[Title + Start Button]

Input Screen
[Age | Gender]

Family Option
[Add profiles]

2. Dashboard

Health Score
+ Sections:
Today / Soon / Later

3. Health Plan

List of Health Items
[Status + Frequency]

4. Detail Screen

Description
Why it matters
Actions: Done / Reminder

5. Family Screen

Profiles Overview
Health Score per person

6. Impfpass

Vaccination List
Status + Add Entry

7. Reminder

Set Reminder
[1M / 3M / Custom]

8. Profile

User Settings
Family + Preferences
```

## Source: docs/customer-input/Longevity_Health_OS_MVP_HighEnd.pdf

```text
CONFIDENTIAL – MVP PROJECT DOCUMENT
Longevity Health OS
A preventive health navigation platform.
Purpose: Build a lean but high-impact MVP that guides users on what health actions to take, when,
and why.

1. Vision & Positioning
From data storage to health intelligence.
This product is not a medical record. It is a proactive health operating system focused on
prevention, clarity and execution.
Core promise: Users always know their next health step.

2. Core Problem
Today, users:
- do not know which check-ups are relevant
- miss preventive actions
- have fragmented health data
Existing solutions store data but do not guide behavior.

3. Target Users
- Professionals 30–65
- Parents managing family health
- Health-conscious individuals

4. MVP Objective
- Immediate user value within 60 seconds
- Simple UX
- Lean architecture
- Ready for future expansion

5. Core Features
1. Personal Health Plan
Dynamic checklist based on age & gender.
2. Smart Reminder System

Context-aware reminders.
3. Vaccination Tracker
Manual entry + status guidance.
4. Family Mode
Multiple profiles in one account.
5. Dashboard
Clear prioritisation: Now / Soon / Later.
6. Smart Insights
Rule-based guidance (AI-like).

6. User Experience Flow
1. Onboarding (age, gender)
2. Immediate health plan generated
3. Dashboard shows priorities
4. User sets reminders
5. Ongoing engagement via notifications

7. Design Principles
- Simplicity over completeness
- Clarity over medical complexity
- Mobile-first
- High trust feel

8. Technical Scope
- Web App or cross-platform (React / Flutter)
- Simple backend
- Rule-based logic
- Modular structure

9. Out of Scope (MVP)
- No doctor integration
- No external APIs (mednet etc.)
- No real AI
- No complex analytics

10. Data & Privacy

- Minimal sensitive data
- Secure architecture
- Test data for development

11. Timeline Expectation
Target: 4–8 weeks MVP
Phases:
- Setup
- Core features
- Testing
- Launch

12. Success Criteria
- User understands next health steps instantly
- Engagement via reminders
- Clear perceived value

13. Future Roadmap (Not MVP)
- AI-driven recommendations
- Integration with providers
- Advanced analytics
- Insurance & ecosystem links

14. Expectations to Developer
- Lean mindset
- No overengineering
- Clear cost estimate
- Scalable base
```

## Source: docs/customer-input/UX_Copy_Health_App.pdf

```text
UX Copy – Health App (MVP)
Tonalität: klar, ruhig, vertrauensvoll, leicht motivierend.
Ziel: maximale Klarheit für den Nutzer.

Onboarding
Titel: Dein Gesundheits-Navigator
Subline: Wir zeigen dir, was du wann für deine Gesundheit tun solltest.
Button: Starten
Input:
Titel: Erzähl uns kurz von dir
Helper: Daraus erstellen wir deinen persönlichen Gesundheitsplan.
Button: Weiter
Family:
Titel: Für wen möchtest du planen?
Optionen: Nur für mich / Familie hinzufügen

Dashboard
Header: Hallo – Dein Überblick für heute
Heute wichtig:
Zahnarzttermin vereinbaren
Bluttest überfällig
In nächster Zeit:
Hautcheck in 2 Monaten
Health Score:
Du bist zu 70% auf dem aktuellen Stand

Health Plan
Titel: Dein Gesundheitsplan
Subline: Alle wichtigen Vorsorge- und Gesundheitsschritte auf einen Blick.
Item:
Zahnarzt – empfohlen alle 6 Monate
Status: erledigt / fällig / geplant

Detail Screen
Bluttest
Empfohlen einmal pro Jahr.

Warum: Frühzeitige Erkennung von Risiken.
Status: Letzter Test vor 3 Jahren
Buttons: Erledigt markieren / Erinnerung setzen

Family
Titel: Familie
Subline: Behalte alle im Blick.
Beispiel:
Lucius – 80% up to date, 1 Impfung fällig

Impfpass
Titel: Impfungen
Subline: Dein Impfstatus auf einen Blick.
Tetanus – Auffrischung empfohlen
Letzte Impfung: 2015
Button: Impfung hinzufügen

Reminder
Titel: Erinnerung setzen
Optionen: 1 Monat / 3 Monate / Datum wählen
Bestätigung: Wir erinnern dich rechtzeitig.

Microcopy
Alles im grünen Bereich ■
Das solltest du bald erledigen.
Super – wieder ein Schritt für deine Gesundheit.
Kleine Schritte machen den Unterschied.
```
```

Source synthesis JSON:
```json
{
  "product_name": "Longevity Health OS / Health App MVP",
  "core_promise": "A preventive health navigation product that tells users what health action to take next, when to take it, and why, with immediate clarity rather than medical-record storage.",
  "source_comparison": [
    {
      "source_path": "docs/customer-input/Longevity_Health_OS_MVP_HighEnd.pdf",
      "source_kind": "product/MVP brief",
      "key_points": [
        "Strongest source for vision, scope, constraints, and MVP boundaries.",
        "Explicitly positions product as preventive guidance, not a medical record.",
        "Defines target users: professionals 30–65, parents managing family health, health-conscious individuals.",
        "Defines MVP objective: immediate value within 60 seconds, simple UX, lean architecture, future-ready base.",
        "Enumerates core features: personal health plan, smart reminders, vaccination tracker, family mode, dashboard, rule-based smart insights.",
        "Specifies canonical prioritisation as 'Now / Soon / Later'.",
        "Technical scope is constrained: web app or cross-platform, simple backend, rule-based logic, modular structure.",
        "Contains explicit out-of-scope list: no doctor integration, no external APIs, no real AI, no complex analytics.",
        "Adds privacy and delivery constraints: minimal sensitive data, secure architecture, test data for development, 4–8 week target."
      ]
    },
    {
      "source_path": "docs/customer-input/Health_App_Wireframes.pdf",
      "source_kind": "wireframe/screen structure",
      "key_points": [
        "Strongest source for screen inventory and basic IA.",
        "Confirms onboarding flow with welcome, age/gender input, and optional family profile addition.",
        "Confirms dashboard with health score and three prioritisation buckets, but labels them 'Today / Soon / Later' rather than 'Now / Soon / Later'.",
        "Confirms health plan list with status and frequency per item.",
        "Confirms detail screen includes description, why-it-matters explanation, and actions Done / Reminder.",
        "Confirms dedicated family screen with per-person overview and health score.",
        "Confirms dedicated vaccination area ('Impfpass') with vaccination list, status, and add-entry action.",
        "Confirms reminder setup screen with 1M / 3M / Custom options.",
        "Confirms profile/settings area for family and preferences.",
        "Provides structure but not business rules, scoring logic, or technical constraints."
      ]
    },
    {
      "source_path": "docs/customer-input/UX_Copy_Health_App.pdf",
      "source_kind": "UX copy/content",
      "key_points": [
        "Strongest source for tone and user-facing wording: clear, calm, trustworthy, lightly motivating.",
        "Reinforces onboarding inputs and immediate generation of a personal health plan.",
        "Reinforces dashboard concept with concrete examples and a health score phrasing ('70% up to date').",
        "Reinforces health plan item format with recommendation frequency and statuses: erledigt / fällig / geplant.",
        "Reinforces detail view pattern: recommended cadence, rationale, last action timing, mark done, set reminder.",
        "Reinforces family mode with per-person summary and overdue vaccine example.",
        "Reinforces vaccination tracker with manual add flow and status guidance.",
        "Reinforces reminder options as 1 month / 3 months / choose date.",
        "Adds microcopy direction but does not define additional scope or technical requirements.",
        "Uses German copy and labels, unlike the more English product brief."
      ]
    }
  ],
  "recurring_themes": [
    "Prevention-focused health guidance rather than record storage.",
    "Immediate clarity on next health steps is central.",
    "Lean MVP with simple UX and high-trust presentation.",
    "Core flow repeats across sources: onboarding -> generated plan -> dashboard priorities -> reminders -> ongoing use.",
    "Personalized plan is driven at minimum by age and gender.",
    "Family/multiple profiles are part of MVP.",
    "Vaccination tracking is part of MVP and appears to support manual entry.",
    "Dashboard prioritisation and a health score/status summary recur across sources.",
    "Why-it-matters explanations are part of the user value.",
    "Reminder-setting is a core engagement mechanism."
  ],
  "hard_constraints": [
    "Do not position or build the MVP as a medical record; positioning is preventive guidance.",
    "Onboarding must at minimum collect age and gender.",
    "MVP must provide immediate user value within 60 seconds.",
    "Include these MVP capabilities: personal health plan, reminders, vaccination tracker, family mode, dashboard.",
    "Use rule-based guidance; 'smart insights' must not be implemented as real AI.",
    "No doctor integration in MVP.",
    "No external APIs/integrations in MVP.",
    "No complex analytics in MVP.",
    "Use minimal sensitive data and secure architecture; use test data for development.",
    "Architecture should stay lean/simple/modular; avoid overengineering.",
    "Platform is constrained to web app or cross-platform app approach.",
    "Target timeline expectation is 4–8 weeks."
  ],
  "out_of_scope": [
    "Doctor/provider integration.",
    "External APIs or ecosystem integrations (e.g. mednet).",
    "Real AI / AI-driven recommendations in MVP.",
    "Advanced/complex analytics.",
    "Insurance and broader ecosystem links.",
    "Provider integrations and advanced analytics listed in roadmap are future, not MVP."
  ],
  "ambiguities": [
    "Canonical product name is inconsistent: 'Longevity Health OS' vs generic 'Health App'.",
    "Canonical language is unclear: brief is English, UX copy is German, wireframes mix English and German ('Impfpass').",
    "Dashboard priority labels conflict: 'Now / Soon / Later' vs 'Today / Soon / Later' vs German dashboard copy.",
    "Health score is visible across sources, but scoring method, data basis, and update logic are unspecified.",
    "'Smart reminders' / notifications are referenced, but delivery channel is unspecified (in-app, push, email, SMS not defined).",
    "Vaccination tracker scope is unclear beyond manual entry and status guidance; supported vaccine model and status rules are not defined.",
    "Family mode is confirmed, but profile limits, permissions, and switching behavior are not specified.",
    "Rule set for the personal health plan is not defined beyond age/gender inputs.",
    "Platform choice remains open between web app and cross-platform mobile approach.",
    "Profile/settings scope is vague beyond family and preferences."
  ],
  "structural_corrections": [
    "Normalize terminology for the prioritisation buckets in all downstream artifacts; do not mix 'Now', 'Today', and localized variants without an explicit decision.",
    "Treat 'Smart Insights' as rule-based guidance within the MVP, not as a separate AI capability.",
    "Keep 'Family Option' in onboarding and 'Family Screen/Mode' as parts of one feature, not separate product lines.",
    "Normalize vaccination feature naming across artifacts: 'Impfpass', 'Impfungen', and 'Vaccination Tracker' refer to the same MVP area.",
    "Do not let the visible 'Health Score' drift into a complex analytics requirement; scoring exists in UI evidence, but advanced analytics are explicitly out of scope.",
    "Preserve screen structure from wireframes, but do not infer hidden workflows or data models not present in the sources.",
    "Separate UX copy examples from functional requirements; sample items like dentist or blood test are illustrative, not a full requirements list.",
    "Maintain distinction between explicit MVP scope and roadmap items; later artifacts must not pull future integrations or AI into the MVP."
  ],
  "recommended_briefing_points": [
    "Choose and document the canonical product name and primary launch language.",
    "Decide the canonical dashboard bucket labels and keep them consistent in product, design, and copy.",
    "Define the initial rule-based health plan logic: which preventive items are included and how age/gender map to them.",
    "Decide whether the MVP includes a simple health score and, if yes, define a minimal non-analytic calculation.",
    "Choose platform approach: responsive web vs cross-platform mobile.",
    "Define reminder delivery channels and any notification dependencies while staying within no-external-API constraints.",
    "Specify family mode basics: number of profiles, switching, and whether profiles are adult/child only or mixed.",
    "Define vaccination data model minimally enough to support manual entry, status, and reminders.",
    "Document privacy approach for minimal sensitive data and secure test/development handling.",
    "Keep all downstream solutioning aligned to lean MVP and 4–8 week delivery expectations."
  ]
}
```

Source synthesis markdown context (optional):
```markdown

```

Product system framing JSON:
```json
{
  "product_essence": "A preventive health navigation product that gives users immediate clarity on what health action to take next, when to take it, and why, without acting as a medical record.",
  "target_users": [
    "Professionals aged 30–65",
    "Parents managing health for family members",
    "Health-conscious individuals"
  ],
  "jobs_to_be_done": [
    "Understand the next relevant preventive health action quickly",
    "See which health actions matter now versus later",
    "Follow a personalized health plan based on basic personal attributes",
    "Understand why a recommended action matters",
    "Track completion status of preventive health items",
    "Set reminders so preventive actions are not missed",
    "Manage preventive health for multiple family profiles in one place",
    "Track vaccination status through manual entry and guidance"
  ],
  "core_concepts": [
    {
      "name": "Account",
      "definition": "The primary user relationship with the product that can contain one or more health profiles."
    },
    {
      "name": "Health Profile",
      "definition": "A person-specific preventive health context defined at minimum by age and gender, used to generate guidance."
    },
    {
      "name": "Personal Health Plan",
      "definition": "A rule-based list of recommended preventive health items for a specific profile."
    },
    {
      "name": "Health Item",
      "definition": "A recommended preventive action with status, recommended cadence, and explanatory context."
    },
    {
      "name": "Priority Buckets",
      "definition": "Three time-based groupings used on the dashboard to prioritize health items; exact canonical labels remain to be chosen."
    },
    {
      "name": "Health Score",
      "definition": "A simple up-to-date summary indicator shown per profile to signal overall preventive progress, without implying complex analytics."
    },
    {
      "name": "Detail View",
      "definition": "The item-level view showing what the action is, why it matters, current status context, and available actions."
    },
    {
      "name": "Reminder",
      "definition": "A user-set follow-up prompt tied to a health item using preset or custom timing."
    },
    {
      "name": "Vaccination Tracker",
      "definition": "The product area for manually recording vaccinations and showing status guidance."
    },
    {
      "name": "Family Mode",
      "definition": "The capability to manage multiple health profiles within one account and view each profile’s status."
    },
    {
      "name": "Rule-Based Guidance",
      "definition": "Deterministic recommendation logic that creates plans and guidance from defined rules rather than real AI."
    }
  ],
  "product_rules": [
    "The product must be positioned as preventive guidance, not as a medical record.",
    "The core promise is immediate clarity on the user's next health step.",
    "The MVP must deliver visible user value within 60 seconds of starting onboarding.",
    "Onboarding must collect at minimum age and gender for each profile.",
    "A personal health plan must be generated from rule-based logic using profile attributes.",
    "Guidance labeled as smart or insightful must remain rule-based in the MVP and must not be presented as real AI.",
    "The dashboard must prioritize actions using three temporal buckets and a simple overall progress summary.",
    "Health items must include plain-language explanation of why the action matters.",
    "Users must be able to mark a health item as done and set a reminder from the item context.",
    "Vaccination tracking is part of the MVP and must support manual entry plus status guidance.",
    "Family mode is part of the MVP and must allow multiple profiles under one account.",
    "The MVP should use minimal sensitive data and maintain a high-trust feel.",
    "The MVP must stay lean and simple; complex analytics are not part of the product model.",
    "Doctor or provider integration is excluded from the MVP.",
    "External APIs or ecosystem integrations are excluded from the MVP.",
    "Insurance links and broader health ecosystem connectivity are excluded from the MVP."
  ],
  "primary_workflows": [
    {
      "name": "Onboard and generate plan",
      "steps": [
        "User starts onboarding",
        "User enters minimum profile inputs: age and gender",
        "User chooses whether to plan only for self or add family members",
        "Product generates a personal health plan for the initial profile",
        "User lands on the dashboard with prioritized next steps"
      ]
    },
    {
      "name": "Review priorities from dashboard",
      "steps": [
        "User opens the dashboard overview",
        "User sees health score or up-to-date summary",
        "User reviews prioritized health items grouped into three time buckets",
        "User selects an item to view more detail"
      ]
    },
    {
      "name": "Act on a health item",
      "steps": [
        "User opens an item detail view",
        "User reads description, recommendation cadence, current status, and why it matters",
        "User marks the item done or chooses to set a reminder",
        "Product reflects the updated item state in the plan and dashboard"
      ]
    },
    {
      "name": "Set a reminder",
      "steps": [
        "User initiates reminder setting from an item",
        "User chooses a preset interval or a custom date",
        "Product confirms that the reminder is set",
        "The item remains trackable for later follow-up"
      ]
    },
    {
      "name": "Manage family profiles",
      "steps": [
        "User opens family mode",
        "User views all profiles with per-person status summary",
        "User selects a profile to review its dashboard or plan",
        "User adds or maintains family profiles as needed"
      ]
    },
    {
      "name": "Track vaccinations",
      "steps": [
        "User opens the vaccination tracker",
        "User reviews vaccination entries and status guidance",
        "User manually adds a vaccination entry",
        "Vaccination status contributes to the relevant profile view"
      ]
    },
    {
      "name": "Adjust profile and preferences",
      "steps": [
        "User opens profile or settings",
        "User reviews personal or family-related settings",
        "User updates basic preferences relevant to product use"
      ]
    }
  ],
  "mvp_boundaries": {
    "in_scope": [
      "Welcome and onboarding flow",
      "Minimum profile capture with age and gender",
      "Optional family profile setup during onboarding",
      "Rule-based personal health plan generation",
      "Dashboard with three priority buckets",
      "Simple health score or up-to-date summary",
      "Health plan list with item status and recommendation cadence",
      "Item detail view with why-it-matters explanation",
      "Mark item as done",
      "Set reminders using preset or custom timing",
      "Vaccination tracker with manual entry and status guidance",
      "Family mode with multiple profiles in one account",
      "Basic profile/settings area for family and preferences",
      "Clear, calm, trustworthy product framing and copy"
    ],
    "out_of_scope": [
      "Medical-record positioning or comprehensive record storage",
      "Doctor or provider integration",
      "External APIs or third-party health system integrations",
      "Real AI or AI-driven recommendations",
      "Advanced or complex analytics",
      "Insurance or ecosystem links",
      "Any future-roadmap integrations beyond the lean MVP"
    ]
  },
  "open_decisions": [
    "Canonical product name: 'Longevity Health OS' vs 'Health App'",
    "Primary launch language and localization approach",
    "Canonical labels for the three dashboard priority buckets",
    "Initial rule set for which preventive items are included in the personal health plan",
    "Minimal health score calculation and how it updates without becoming analytics-heavy",
    "Reminder delivery channel definition",
    "Family mode basics such as profile limits and switching behavior",
    "Minimal vaccination data model and status rules",
    "Exact scope of profile/settings beyond family and preferences",
    "Platform choice between responsive web and cross-platform mobile"
  ]
}
```

Product system framing markdown context:
```markdown

```

Product Manager role guidance source: team/product-manager.md
PM role brief-focused guidance:
```markdown
- evidence-based synthesis, not template filling
- ensure outputs are coherent, scoped, and valuable
- You are responsible for product correctness, clarity, value, product-system framing, and customer-facing progress communication.
- **specific** (clear nouns/verbs, no generic filler)
- **structured** (sections, priorities, and next actions are obvious)
- **traceable** (statements grounded in available customer evidence)
- **decision-ready** (customer can approve, revise, or choose with low ambiguity)
- **execution-ready** (downstream roles can act without material guesswork)
- clarity over ambiguity
- the owner of **product-system framing**
- user problems / jobs to be done
- explicit constraints
- likely future expansion paths
- Before creating or materially revising backlog, slices, or briefs, you must construct a **product-system framing**.
```
```
