# LLM Prompt Log

- task: semantic_ux_review_current_slice
- caller: semantic-ux-validation.runLlmSemanticReview
- provider: openai
- model: gpt-5.4
- started_utc: 2026-05-05T08:18:27.138Z
- prompt_chars: 57800
- prompt_estimated_tokens: 14450
- prompt_sources:
  - docs/product/current-slice.yaml
  - docs/ux/SL-001-semantic-ux-contract.json
  - docs/ux/SL-001-current-slice-flow.md
  - docs/product/project-brief.md
  - docs/product/product-system-framing.md
  - src/App.jsx
  - src/features/self-onboarding-to-first-dashboard/SelfOnboardingToFirstDashboard.jsx
  - src/features/self-onboarding-to-first-dashboard/catalog.js
  - src/features/self-onboarding-to-first-dashboard/components.jsx
  - src/features/self-onboarding-to-first-dashboard/dashboard.js
  - src/features/self-onboarding-to-first-dashboard/index.js
  - src/features/self-onboarding-to-first-dashboard/plan.js
  - src/features/self-onboarding-to-first-dashboard/validation.js
  - src/main.jsx
  - src/routes/self-onboarding-to-first-dashboard.jsx
  - src/stories/slices/SL-001/SL-001.stories.tsx
  - src/stories/slices/SL-001/fixtures.ts
  - index.html

## System Prompt
```text
You are a strict Semantic UX Reviewer in a virtual software company.
Your task is to decide whether implemented user-facing UI semantics satisfy the UX contract.
Review meaning and user fitness, not only whether components or sections exist.
A required section that exists with generic, internal, malformed, or useless copy is a failure.
Return JSON only according to the schema.
```

## User Prompt
```text
Active slice:
```json
{
  "id": "SL-001",
  "title": "Self Onboarding to First Dashboard",
  "objective": "Enable a new user to enter the minimum required profile inputs, generate a rule-based preventive plan, and land on a populated personal dashboard in one session.",
  "in_scope": [
    "Self profile onboarding with age and gender as the only required inputs",
    "Locked named MVP preventive item set covering checkups and vaccinations for plan generation",
    "Rule-based plan generation from age and gender only",
    "Initial personal dashboard for one profile with Today, Soon, and Later buckets",
    "Display one highest-priority item from Today, or the earliest Soon item when Today is empty, on the dashboard summary card\\\\\\\",\\\\\\\"Show one Health Score percentage for the self profile on the dashboard\\\\\\\",\\\\\\\"Generate the firstplan"
  ],
  "out_of_scope": [
    "Family profile creation",
    "Health item detail screens",
    "Mark-as-done and reminder actions",
    "Manual vaccination entry",
    "Profile editing and preferences"
  ],
  "acceptance_criteria": [
    "A new user can complete onboarding and reach a populated dashboard in 60 seconds or less in a standard moderated walkthrough",
    "The first health plan is generated within 5 seconds of onboarding completion",
    "Every generated item comes from the locked MVP preventive item set and is assigned to checkups or vaccinations",
    "The dashboard shows Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage for the self profile"
  ]
}
```

Semantic UX contract:
```json
{
  "schema_version": 1,
  "generated_at_utc": "2026-05-05T08:01:05.524Z",
  "slice_id": "SL-001",
  "slice_title": "Self Onboarding to First Dashboard",
  "surface_type": "user_facing",
  "global_rules": {
    "must": [
      "Use user-facing language that makes sense without internal project context.",
      "Explain user value rather than system mechanics where explanatory copy is required.",
      "Keep wording concise, concrete, and aligned to the active slice.",
      "Use safe fallback copy when data is missing or unknown.",
      "Render dates, times, counts, and statuses in valid human-readable form."
    ],
    "must_not": [
      "Expose internal workflow, slice, acceptance, schema, payload, routing, component, ranking, bucket, test, or implementation language in visible UI.",
      "Use placeholder, TODO, TBD, lorem ipsum, generic filler, or template copy as final visible UI.",
      "Render undefined, null, NaN, Invalid Date, [object Object], raw enum values, raw calculation output, or malformed years.",
      "Satisfy acceptance criteria only structurally while failing the user-facing purpose."
    ]
  },
  "visible_content_slots": [
    {
      "slot": "primary_heading",
      "purpose": "Tell the user what this screen, flow, or section is for.",
      "required": true,
      "quality_bar": [
        "Specific to the user task.",
        "Readable without internal project context.",
        "Not a generic system or component label."
      ]
    },
    {
      "slot": "primary_action",
      "purpose": "Make the next user action clear.",
      "required": true,
      "quality_bar": [
        "Uses direct, user-facing wording.",
        "Does not expose implementation, routing, schema, or test language."
      ]
    },
    {
      "slot": "empty_or_error_state",
      "purpose": "Help the user recover from missing, invalid, or unavailable state.",
      "required": false,
      "quality_bar": [
        "Explains what happened in plain language.",
        "Gives a safe next step where possible.",
        "Does not render raw undefined/null/error payloads."
      ]
    },
    {
      "slot": "status_context",
      "purpose": "Explain current state, progress, timing, or result in human-readable language when shown.",
      "required": true,
      "quality_bar": [
        "Dates, times, counts, and states are valid and human-readable.",
        "Unknown data uses safe fallback copy.",
        "Raw enum values, malformed dates, and raw calculations are never visible."
      ]
    },
    {
      "slot": "explanation_or_rationale",
      "purpose": "Explain why the user should care or what value the action creates when a rationale is shown.",
      "required": true,
      "quality_bar": [
        "Explains user value rather than app mechanics.",
        "Uses concise, concrete, trust-building wording.",
        "Does not overclaim, alarm, or invent unsupported facts."
      ]
    }
  ],
  "acceptance_criteria": [
    "A new user can complete onboarding and reach a populated dashboard in 60 seconds or less in a standard moderated walkthrough",
    "The first health plan is generated within 5 seconds of onboarding completion",
    "Every generated item comes from the locked MVP preventive item set and is assigned to checkups or vaccinations",
    "The dashboard shows Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage for the self profile"
  ],
  "deterministic_scan": {
    "forbidden_visible_fragments": [
      "TODO",
      "TBD",
      "lorem ipsum",
      "placeholder",
      "undefined",
      "null",
      "NaN",
      "Invalid Date",
      "[object Object]",
      "acceptance criteria",
      "schema",
      "payload",
      "bucket rules",
      "generated action",
      "slice id",
      "implementation detail"
    ],
    "suspicious_patterns": [
      "five_or_more_digit_year_or_numeric_state",
      "raw_error_or_debug_copy",
      "internal_factory_language_in_visible_copy"
    ]
  },
  "llm_review": {
    "required": true,
    "instruction": "Review semantic fitness of the implemented user-facing UI against this contract. A section existing with bad or generic copy is a failure."
  }
}
```

Current slice UX flow:
```markdown
<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-05T08:01:05.524Z -->
# UX Flow - Current Slice

Date: `2026-05-05`
Status: `Ready for implementation`
Scope: `SL-001 Self Onboarding to First Dashboard`

## 1. Context

Slice SL-001 — Self Onboarding to First Dashboard. User goal: in a single session, a new user enters only age and gender, submits once, the system generates a deterministic preventive plan from the locked MVP catalog, and the user lands on a populated self dashboard that makes the next health action obvious. Scope is limited to one self profile, one generated plan snapshot, and one dashboard view with Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User opens the first-run onboarding screen for the self profile in an unauthenticated or pre-established current-user context; no family, settings, or alternate destinations are shown in this slice.
- Expected behavior:
  - Onboarding screen purpose: collect the minimum required inputs and set expectation that a personalized preventive plan will be created immediately after submission.
  - Onboarding layout is a single vertical form with two required fields and one primary action. Sections in order: brief value statement, age field, gender field, primary submit button.
  - Age input uses a numeric text field optimized for mobile number entry. Label: Age. Helper copy clarifies that age is used to generate the first plan. Field accepts whole numbers only.
  - Gender input uses a required segmented control or radio group with exactly two visible options: Female and Male. No additional options, free text, or preference controls are shown in this slice.
  - Primary action label is Generate my plan. The button remains disabled until age is present and one gender option is selected.
  - Inline validation behavior on age: if empty after attempted submit, show Age is required. If non-integer, show Enter a whole number. If outside 0 to 120, show Enter an age from 0 to 120. Validation appears at the field and focus moves to the first invalid field on submit.
  - Inline validation behavior on gender: if missing after attempted submit, show Select a gender to continue.
  - When the user taps Generate my plan with valid inputs, the form enters a submitting state: all inputs become read-only, the primary button shows a loading label, and duplicate submits are blocked until completion or failure response resolves the state.

### Flow B - Failure and Recovery Paths

- Validation failure path: user attempts submit with missing or invalid input; the screen does not navigate; invalid fields show explicit inline messages; the first invalid field receives focus; previously valid input stays intact; the primary action remains available after correction.
- Generation failure path: onboarding submission succeeds client-side but plan generation or persistence fails or exceeds expected response window; stay on the onboarding screen and show a non-alarmist inline error banner above the form: We couldn’t create your plan right now. Please try again.; preserve entered age and,
- data remains on the screen; restore inputs and primary action so the user can resubmit once; do not navigate to an empty or partial dashboard.
- Dashboard data integrity failure path: if navigation to dashboard occurs but the projection lacks bucketed items or summary data, do not render blank sections as success; instead show a blocking full-page error state with one recovery action Return to onboarding; no item-level placeholders or fake content are shown in.
- age and gender are the only required, collected, validated, and persisted onboarding inputs for this slice.
- Only one self profile exists in the flow. The user never sees profile switching, family creation, profile editing, or preferences.
- After successful submit, the next screen is always the self dashboard. There is no intermediate plan review screen, detail screen, or optional branch.
- Plan generation must read only from the locked local preventive catalog and the age/gender rule bands. UX must not imply clinician review, AI generation, external enrichment, or medical-record syncing. The copy should describe the output as a personalized preventive plan, not medical advice or diagnosis. The summary or

## 3. Interaction and Validation Rules

- Dashboard screen purpose: show the first generated plan in a scannable priority structure and make the next step obvious on first load.
- Dashboard top section contains a single summary card for the self profile. It must show one Health Score percentage and one highlighted next item. The highlighted item selection rule is fixed and visible in implementation logic: choose the highest-priority Today item; if Today is empty, choose the earliest Soon item;if

## 4. Implementation Constraints

- Do not introduce additional onboarding questions, account steps, consent flows, education carousels, or optional profile enrichment in SL-001.
- Do not provide navigation to health item detail screens, mark-as-done actions, reminder actions, vaccination manual entry, family mode, settings, or profile editing.
- Do not expose raw rule metadata, target-age calculations, catalog version labels, or internal status names beyond user-facing bucket labels and plain-language item info.
- Do not render empty-state marketing content on a successful first dashboard; the dashboard must be populated from the generated snapshot.
- Do not recalculate the plan in the UI during dashboard render. The UX assumes a persisted generated snapshot is the source for displayed items.
- Do not use alarming, shaming, or overly clinical copy. Use calm, clear, plain language about recommended preventive actions and why they matter.
- Do not use more than one primary action per screen in this slice: onboarding has Generate my plan; dashboard is informational only for SL-001.

## 5. Acceptance Mapping

- A first-time user can complete the onboarding form by entering only age and gender and reach the dashboard without encountering any additional required step.
- The onboarding screen prevents invalid submission with observable inline validation for empty age, non-integer age, out-of-range age, and missing gender.
- After valid submission, the UI shows a clear in-progress state, prevents duplicate submits, and either lands on the dashboard or returns to an actionable retry state without losing entered values.
- The first dashboard render shows a visible summary card with exactly one Health Score percentage and exactly one highlighted next item selected from Today first, otherwise Soon, otherwise Later.
- The dashboard displays three labeled sections: Today, Soon, and Later. Each generated item appears in exactly one of these sections and shows its name, category, cadence label, and why-it-matters text.
- The dashboard content is visibly populated from the generated plan within 5 seconds of onboarding completion under normal conditions.
- No screen in this slice exposes family profiles, item detail navigation, completion actions, reminder controls, manual vaccination entry, or profile editing.
- In moderated walkthrough testing, a new user can move from first onboarding view to populated dashboard in 60 seconds or less and can identify the next recommended health step from the summary card on first dashboard load.

```

Project brief context:
```markdown
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

```

Product framing context:
```markdown
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

```

Implementation source context to review:
## src/App.jsx
```text
import React from 'react';
import SelfOnboardingToFirstDashboardRoute from './routes/self-onboarding-to-first-dashboard.jsx';

export default function App() {
  return <SelfOnboardingToFirstDashboardRoute />;
}
```
## src/features/self-onboarding-to-first-dashboard/SelfOnboardingToFirstDashboard.jsx
```text
import React, { useMemo, useRef, useState } from 'react';
import {
  AppShell,
  FamilyProfileCard,
  HealthScoreCard,
  PrioritySection,
} from './components';
import { buildDashboardProjection, hasPopulatedDashboard } from './dashboard';
import { generateInitialPlanSnapshotAsync } from './plan';
import { normalizeSelfProfileInput, validateSelfProfileInput } from './validation';

function formatGeneratedAt(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function SelfOnboardingToFirstDashboard({ planGenerator = generateInitialPlanSnapshotAsync }) {
  const ageRef = useRef(null);
  const genderRef = useRef(null);

  const [form, setForm] = useState({ age: '', gender: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const [profile, setProfile] = useState(null);
  const [planSnapshot, setPlanSnapshot] = useState(null);
  const [fatalIntegrityError, setFatalIntegrityError] = useState(false);

  const projection = useMemo(() => {
    if (!planSnapshot || !profile) {
      return null;
    }

    return buildDashboardProjection(planSnapshot, profile);
  }, [planSnapshot, profile]);

  const isDashboardReady = Boolean(projection && hasPopulatedDashboard(projection));

  const handleFieldChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      return {
        ...previous,
        [field]: undefined,
      };
    });
  };

  const focusFirstInvalidField = (fieldErrors) => {
    if (fieldErrors.age) {
      ageRef.current?.focus();
      return;
    }

    if (fieldErrors.gender) {
      genderRef.current?.focus();
    }
  };

  const canSubmit = form.age.toString().trim().length > 0 && (form.gender === 'female' || form.gender === 'male') && !isSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmissionError('');

    const validation = validateSelfProfileInput(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      focusFirstInvalidField(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    const normalized = normalizeSelfProfileInput(form);
    const profileData = {
      profileId: 'self',
      name: 'You',
      age: normalized.age,
      gender: normalized.gender,
      createdAt: new Date().toISOString(),
      onboardingCompletedAt: new Date().toISOString(),
    };

    try {
      const generatedPlan = await planGenerator(profileData);
      const generatedProjection = buildDashboardProjection(generatedPlan, profileData);

      if (!hasPopulatedDashboard(generatedProjection)) {
        setFatalIntegrityError(true);
        return;
      }

      setProfile(profileData);
      setPlanSnapshot(generatedPlan);
    } catch {
      setSubmissionError("We couldn't create your plan right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetToOnboarding = () => {
    setFatalIntegrityError(false);
    setPlanSnapshot(null);
    setProfile(null);
  };

  if (fatalIntegrityError) {
    return (
      <AppShell title="Let's set up your first plan">
        <div className="sl001-blocking-error" role="alert">
          <h2>We couldn't load your dashboard.</h2>
          <p>Please return to onboarding and try again.</p>
          <button type="button" className="sl001-primary-action" onClick={resetToOnboarding}>
            Return to onboarding
          </button>
        </div>
      </AppShell>
    );
  }

  if (isDashboardReady && projection) {
    const dueTodayCount = projection.sections.find((section) => section.priority === 'today')?.items.length ?? 0;

    return (
      <AppShell title="Your preventive dashboard">
        <p className="sl001-support-copy">Plan updated {formatGeneratedAt(planSnapshot.generatedAt)}</p>
        <FamilyProfileCard name={projection.profileName} score={projection.healthScore} dueCount={dueTodayCount} />
        <HealthScoreCard score={projection.healthScore} highlightedItem={projection.highlightedItem} />
        <div className="sl001-dashboard-sections">
          {projection.sections.map((section) => (
            <PrioritySection
              key={section.priority}
              priority={section.priority}
              title={section.title}
              items={section.items}
            />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Build your first preventive plan">
      <p className="sl001-support-copy">
        Share your age and gender so we can create a personalized plan with clear next steps.
      </p>
      <form className="sl001-form" onSubmit={handleSubmit} noValidate>
        {submissionError ? (
          <p className="sl001-error-banner" role="alert">{submissionError}</p>
        ) : null}

        <label htmlFor="sl001-age">Age</label>
        <input
          ref={ageRef}
          id="sl001-age"
          name="age"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={form.age}
          onChange={(event) => handleFieldChange('age', event.target.value)}
          readOnly={isSubmitting}
          aria-invalid={Boolean(errors.age)}
          aria-describedby="sl001-age-help sl001-age-error"
        />
        <p className="sl001-helper" id="sl001-age-help">We use your age to generate your first plan.</p>
        {errors.age ? (
          <p className="sl001-field-error" id="sl001-age-error" role="alert">{errors.age}</p>
        ) : null}

        <fieldset ref={genderRef} aria-describedby="sl001-gender-error" className="sl
[truncated]
```
## src/features/self-onboarding-to-first-dashboard/catalog.js
```text
export const MVP_CATALOG_VERSION = 'sl001-mvp-v1';

export const MVP_PREVENTIVE_CATALOG = Object.freeze([
  {
    itemId: 'annual-wellness-visit',
    name: 'Annual wellness visit',
    category: 'checkup',
    cadenceLabel: 'Every year',
    whyItMatters: 'Regular checkups help catch changes early and keep your prevention plan current.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 1 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'blood-pressure-check',
    name: 'Blood pressure check',
    category: 'checkup',
    cadenceLabel: 'At least every year',
    whyItMatters: 'Blood pressure checks can identify heart risk factors before symptoms appear.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 2 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'cholesterol-screening',
    name: 'Cholesterol screening',
    category: 'checkup',
    cadenceLabel: 'Every 4 to 6 years',
    whyItMatters: 'This screening helps track cardiovascular risk and guide timely prevention.',
    ruleBands: [
      { gender: 'female', minAge: 20, maxAge: 120, targetAge: 20, dashboardBucket: 'soon', priorityOrder: 1 },
      { gender: 'male', minAge: 20, maxAge: 120, targetAge: 20, dashboardBucket: 'soon', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'diabetes-screening',
    name: 'Diabetes screening',
    category: 'checkup',
    cadenceLabel: 'Every 3 years',
    whyItMatters: 'Screening can catch blood sugar changes early and support prevention decisions.',
    ruleBands: [
      { gender: 'female', minAge: 35, maxAge: 120, targetAge: 35, dashboardBucket: 'soon', priorityOrder: 2 },
      { gender: 'male', minAge: 35, maxAge: 120, targetAge: 35, dashboardBucket: 'soon', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'cervical-cancer-screening',
    name: 'Cervical cancer screening',
    category: 'checkup',
    cadenceLabel: 'Every 3 to 5 years',
    whyItMatters: 'Routine screening can detect cell changes early and support effective follow-up.',
    ruleBands: [
      { gender: 'female', minAge: 25, maxAge: 65, targetAge: 25, dashboardBucket: 'later', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'prostate-health-discussion',
    name: 'Prostate health discussion',
    category: 'checkup',
    cadenceLabel: 'Discuss around age 50',
    whyItMatters: 'A timely discussion helps you decide with your clinician which screening path fits you.',
    ruleBands: [
      { gender: 'male', minAge: 45, maxAge: 120, targetAge: 50, dashboardBucket: 'later', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'influenza-vaccine',
    name: 'Flu vaccine',
    category: 'vaccination',
    cadenceLabel: 'Every year',
    whyItMatters: 'Yearly vaccination lowers the risk of severe seasonal illness.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 3 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 3 },
    ],
  },
  {
    itemId: 'tdap-booster',
    name: 'Tetanus, diphtheria, and pertussis booster',
    category: 'vaccination',
    cadenceLabel: 'Every 10 years',
    whyItMatters: 'Boosters help maintain protection against serious bacterial infections.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'later', priorityOrder: 2 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'later', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'shingles-vaccine',
    name: 'Shingles vaccine',
    category: 'vaccination',
    cadenceLabel: '2-dose series after age 50',
    whyItMatters: 'Vaccination reduces the chance of shingles and long-lasting nerve pain.',
    ruleBands: [
      { gender: 'female', minAge: 50, maxAge: 120, targetAge: 50, dashboardBucket: 'soon', priorityOrder: 3 },
      { gender: 'male', minAge: 50, maxAge: 120, targetAge: 50, dashboardBucket: 'soon', priorityOrder: 3 },
    ],
  },
]);
```
## src/features/self-onboarding-to-first-dashboard/components.jsx
```text
import React from 'react';

const STATUS_CLASS_MAP = {
  done: 'status-done',
  due: 'status-due',
  soon: 'status-soon',
  planned: 'status-planned',
  overdue: 'status-overdue',
};

const PRIORITY_CLASS_MAP = {
  today: 'priority-today',
  soon: 'priority-soon',
  later: 'priority-later',
};

export function AppShell({ title, children }) {
  return (
    <main className="app-shell">
      <section className="app-panel sl001-shell">
        <header className="sl001-header">
          <p className="sl001-kicker">Longevity Health OS</p>
          <h1>{title}</h1>
        </header>
        {children}
      </section>
    </main>
  );
}

export function StatusPill({ status, label }) {
  const className = STATUS_CLASS_MAP[status] ?? 'status-planned';

  return (
    <span className={`sl001-status-pill ${className}`} aria-label={`Status: ${label}`}>
      {label}
    </span>
  );
}

export function HealthPlanItem({ item }) {
  return (
    <article className="sl001-plan-item">
      <div className="sl001-plan-topline">
        <h3>{item.name}</h3>
        <StatusPill status={item.status} label={item.statusLabel} />
      </div>
      <p className="sl001-plan-meta">{item.categoryLabel} - {item.cadenceLabel}</p>
      <p className="sl001-plan-why">{item.whyItMatters}</p>
      {item.category === 'vaccination' ? (
        <VaccinationStatusRow
          vaccine={item.name}
          status={item.status}
          statusLabel={item.statusLabel}
          lastDate={null}
        />
      ) : null}
    </article>
  );
}

export function PrioritySection({ priority, title, items }) {
  const sectionClass = PRIORITY_CLASS_MAP[priority] ?? 'priority-later';

  return (
    <section className={`sl001-priority-section ${sectionClass}`} aria-labelledby={`priority-${priority}`}>
      <h2 id={`priority-${priority}`}>{title}</h2>
      {items.length === 0 ? (
        <p className="sl001-empty">No items in this section right now.</p>
      ) : (
        <div className="sl001-priority-list">
          {items.map((item) => (
            <HealthPlanItem item={item} key={item.catalogItemId} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HealthScoreCard({ score, highlightedItem }) {
  const scoreText = Number.isFinite(score) ? `${score}%` : '0%';

  return (
    <section className="sl001-score-card" aria-label="Health summary">
      <div>
        <p className="sl001-label">Health Score</p>
        <p className="sl001-score">{scoreText}</p>
        <p className="sl001-score-summary">
          Use this score to track your progress as you complete today&apos;s and upcoming preventive care.
        </p>
      </div>
      <div className="sl001-next-item">
        <p className="sl001-label">Next recommended step</p>
        <h2>{highlightedItem?.name ?? 'No next step available'}</h2>
        <p>
          {highlightedItem ? `${highlightedItem.categoryLabel} - ${highlightedItem.cadenceLabel}` : 'Please return to onboarding and try again.'}
        </p>
      </div>
    </section>
  );
}

export function FamilyProfileCard({ name, score, dueCount }) {
  return (
    <section className="sl001-profile-card" aria-label="Profile summary">
      <p className="sl001-label">Profile</p>
      <h2>{name}</h2>
      <p>{score}% Health Score - {dueCount} due today</p>
    </section>
  );
}

export function VaccinationStatusRow({ vaccine, status, statusLabel, lastDate }) {
  return (
    <div className="sl001-vaccine-row" aria-label={`${vaccine} status`}>
      <span>{vaccine}</span>
      <span>
        <StatusPill status={status} label={statusLabel} />
        <span className="sl001-vaccine-date">Last dose: {lastDate || 'Not recorded yet'}</span>
      </span>
    </div>
  );
}
```
## src/features/self-onboarding-to-first-dashboard/dashboard.js
```text
const BUCKET_ORDER = ['today', 'soon', 'later'];

const BUCKET_LABELS = {
  today: 'Today',
  soon: 'Soon',
  later: 'Later',
};

const CATEGORY_LABELS = {
  checkup: 'Checkup',
  vaccination: 'Vaccination',
};

const STATUS_LABELS = {
  done: 'Done',
  due: 'Due now',
  soon: 'Coming up',
  planned: 'Planned',
  overdue: 'Overdue',
};

const HEALTH_SCORE_BUCKET_WEIGHTS = {
  today: 50,
  soon: 30,
  later: 20,
};

function sortWithinBucket(a, b) {
  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
}

function mapDisplayItem(item) {
  return {
    ...item,
    categoryLabel: CATEGORY_LABELS[item.category] ?? 'Preventive item',
    statusLabel: STATUS_LABELS[item.status] ?? 'Planned',
  };
}

export function groupItemsByPriority(items) {
  const buckets = {
    today: [],
    soon: [],
    later: [],
  };

  for (const item of items) {
    if (!buckets[item.dashboardBucket]) {
      continue;
    }

    buckets[item.dashboardBucket].push(mapDisplayItem(item));
  }

  for (const bucket of BUCKET_ORDER) {
    buckets[bucket].sort(sortWithinBucket);
  }

  return buckets;
}

export function selectHighlightedItem(bucketed) {
  if (bucketed.today.length > 0) {
    return bucketed.today[0];
  }

  if (bucketed.soon.length > 0) {
    return bucketed.soon[0];
  }

  if (bucketed.later.length > 0) {
    return bucketed.later[0];
  }

  return null;
}

export function calculateHealthScore(items) {
  const totalWeight = items.reduce((sum, item) => (
    sum + (HEALTH_SCORE_BUCKET_WEIGHTS[item.dashboardBucket] ?? 0)
  ), 0);

  if (totalWeight === 0) {
    return 0;
  }

  const creditedWeight = items.reduce((sum, item) => {
    const bucketWeight = HEALTH_SCORE_BUCKET_WEIGHTS[item.dashboardBucket] ?? 0;
    const itemValue = item.status === 'due' || item.status === 'overdue' ? 0 : bucketWeight;
    return sum + itemValue;
  }, 0);

  return Math.round((creditedWeight / totalWeight) * 100);
}

export function buildDashboardProjection(planSnapshot, profile) {
  const items = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];
  const bucketed = groupItemsByPriority(items);
  const highlightedItem = selectHighlightedItem(bucketed);
  const healthScore = calculateHealthScore(items);
  const profileName = profile?.name?.trim() || 'You';

  return {
    profileName,
    healthScore,
    highlightedItem,
    sections: BUCKET_ORDER.map((priority) => ({
      priority,
      title: BUCKET_LABELS[priority],
      items: bucketed[priority],
    })),
  };
}

export function hasPopulatedDashboard(projection) {
  const sectionItemCount = projection.sections.reduce((sum, section) => sum + section.items.length, 0);
  return sectionItemCount > 0 && Boolean(projection.highlightedItem);
}

export const dashboardLabels = {
  BUCKET_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
};
```
## src/features/self-onboarding-to-first-dashboard/index.js
```text
export { default as SelfOnboardingToFirstDashboard } from './SelfOnboardingToFirstDashboard';
export { MVP_CATALOG_VERSION, MVP_PREVENTIVE_CATALOG } from './catalog';
export { buildDashboardProjection, calculateHealthScore, groupItemsByPriority, hasPopulatedDashboard, selectHighlightedItem } from './dashboard';
export { generateInitialPlanSnapshot, generateInitialPlanSnapshotAsync } from './plan';
export { normalizeSelfProfileInput, validateSelfProfileInput, validationMessages } from './validation';
```
## src/features/self-onboarding-to-first-dashboard/plan.js
```text
import { MVP_CATALOG_VERSION, MVP_PREVENTIVE_CATALOG } from './catalog.js';

const ALLOWED_CATEGORIES = new Set(['checkup', 'vaccination']);

function findMatchingRuleBand(ruleBands, profile) {
  return ruleBands.find((band) => (
    band.gender === profile.gender
    && profile.age >= band.minAge
    && profile.age <= band.maxAge
  ));
}

function comparePlanItems(a, b) {
  if (a.dashboardBucket !== b.dashboardBucket) {
    const bucketOrder = { today: 0, soon: 1, later: 2 };
    return bucketOrder[a.dashboardBucket] - bucketOrder[b.dashboardBucket];
  }

  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
}

export function generateInitialPlanSnapshot(profile, options = {}) {
  const nowIso = (options.now ?? new Date()).toISOString();
  const catalog = options.catalog ?? MVP_PREVENTIVE_CATALOG;
  const catalogVersion = options.catalogVersion ?? MVP_CATALOG_VERSION;

  const items = [];

  for (const catalogItem of catalog) {
    const matchedBand = findMatchingRuleBand(catalogItem.ruleBands, profile);

    if (!matchedBand) {
      continue;
    }

    if (!ALLOWED_CATEGORIES.has(catalogItem.category)) {
      throw new Error(`Unsupported category in catalog: ${catalogItem.category}`);
    }

    items.push({
      catalogItemId: catalogItem.itemId,
      name: catalogItem.name,
      category: catalogItem.category,
      cadenceLabel: catalogItem.cadenceLabel,
      whyItMatters: catalogItem.whyItMatters,
      dashboardBucket: matchedBand.dashboardBucket,
      targetAge: matchedBand.targetAge,
      priorityOrder: matchedBand.priorityOrder,
      status: matchedBand.dashboardBucket === 'today' ? 'due' : 'planned',
    });
  }

  items.sort(comparePlanItems);

  return {
    planId: `plan-${profile.profileId}`,
    profileId: profile.profileId,
    catalogVersion,
    generatedAt: nowIso,
    items,
  };
}

export async function generateInitialPlanSnapshotAsync(profile, options = {}) {
  const delayMs = options.delayMs ?? 250;
  const timeoutDelay = Math.max(0, Number(delayMs));

  await new Promise((resolve) => {
    setTimeout(resolve, timeoutDelay);
  });

  return generateInitialPlanSnapshot(profile, options);
}
```
## src/features/self-onboarding-to-first-dashboard/validation.js
```text
const AGE_REQUIRED = 'Age is required.';
const AGE_WHOLE_NUMBER = 'Enter a whole number.';
const AGE_RANGE = 'Enter an age from 0 to 120.';
const GENDER_REQUIRED = 'Select a gender to continue.';

export function validateSelfProfileInput(input) {
  const errors = {};
  const ageValue = (input?.age ?? '').toString().trim();
  const genderValue = input?.gender;

  if (!ageValue) {
    errors.age = AGE_REQUIRED;
  } else if (!/^\d+$/.test(ageValue)) {
    errors.age = AGE_WHOLE_NUMBER;
  } else {
    const age = Number(ageValue);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.age = AGE_RANGE;
    }
  }

  if (genderValue !== 'female' && genderValue !== 'male') {
    errors.gender = GENDER_REQUIRED;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeSelfProfileInput(input) {
  return {
    age: Number((input?.age ?? '').toString().trim()),
    gender: input?.gender,
  };
}

export const validationMessages = {
  AGE_REQUIRED,
  AGE_WHOLE_NUMBER,
  AGE_RANGE,
  GENDER_REQUIRED,
};
```
## src/main.jsx
```text
/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/main.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-05-05T08:01:37.411Z
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```
## src/routes/self-onboarding-to-first-dashboard.jsx
```text
import React from 'react';
import { SelfOnboardingToFirstDashboard } from '../features/self-onboarding-to-first-dashboard';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';

export default function SelfOnboardingToFirstDashboardRoute() {
  return <SelfOnboardingToFirstDashboard />;
}
```
## src/stories/slices/SL-001/SL-001.stories.tsx
```text
import React from 'react';
import { storybookContract } from './fixtures';
import RouteSurface1 from '../../../routes/self-onboarding-to-first-dashboard.jsx';
import { AppShell as ComponentSurface2 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { HealthScoreCard as ComponentSurface3 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { PrioritySection as ComponentSurface4 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { HealthPlanItem as ComponentSurface5 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { StatusPill as ComponentSurface6 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { FamilyProfileCard as ComponentSurface7 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { VaccinationStatusRow as ComponentSurface8 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';

const meta = {
  title: 'Slices/SL-001',
  parameters: {
    layout: 'centered',
    fabric: storybookContract,
  },
};

export default meta;

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <section className="app-panel">{children}</section>
    </main>
  );
}

function ContractSurface({ title, type }: { title: string; type: 'component' | 'screen' }) {
  return (
    <StoryFrame>
      <p className="kicker">{type} contract story</p>
      <h1>{title}</h1>
      <p className="subtle">{storybookContract.slice_title}</p>
      <section>
        <strong>Required states</strong>
        <ul>{storybookContract.required_states.map((state) => <li key={state}>{state}</li>)}</ul>
      </section>
      <section>
        <strong>Semantic statuses</strong>
        <ul>{storybookContract.required_statuses.map((status) => <li key={status}>{status}</li>)}</ul>
      </section>
      <section>
        <strong>Priority groups</strong>
        <ul>{storybookContract.required_priorities.map((priority) => <li key={priority}>{priority}</li>)}</ul>
      </section>
    </StoryFrame>
  );
}

function ComponentFallback({ component }: { component: string }) {
  const token = component.toLowerCase();
  if (token.includes('status')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <div>
          <span className="status-pill status-pill-due">Due</span>{' '}
          <span className="status-pill status-pill-soon">Upcoming</span>
        </div>
      </StoryFrame>
    );
  }
  if (token.includes('item')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <article className="health-plan-item">
          <button type="button" className="health-plan-item-button">
            <div>
              <h4>Annual blood panel</h4>
              <p className="subtle">Due in 1 month</p>
            </div>
            <span className="status-pill status-pill-due">Due</span>
          </button>
        </article>
      </StoryFrame>
    );
  }
  if (token.includes('section')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="priority-section priority-today">
          <h3>Today</h3>
        </section>
        <section className="priority-section priority-soon">
          <h3>Soon</h3>
        </section>
        <section className="priority-section priority-later">
          <h3>Later</h3>
        </section>
      </StoryFrame>
    );
  }
  if (token.includes('score')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="health-score-card">
          <p className="kicker">Health Score</p>
          <p className="health-score-value">78</p>
          <p className="subtle">4 due now, 2 due soon.</p>
        </section>
      </StoryFrame>
    );
  }
  if (token.includes('profile')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="family-profile-card">
          <p className="kicker">Active profile</p>
          <h2>Alex, age 42</h2>
          <p className="subtle">3 actions need attention soon.</p>
        </section>
      </StoryFrame>
    );
  }
  return <ContractSurface title={component} type="component" />;
}

export const AppShellVisual = {
  render: () => <ComponentSurface2 />,
  name: 'Product/AppShell',
};

export const HealthScoreCardVisual = {
  render: () => <ComponentSurface3 />,
  name: 'Product/HealthScoreCard',
};

export const PrioritySectionVisual = {
  render: () => <ComponentSurface4 />,
  name: 'Product/PrioritySection',
};

export const HealthPlanItemVisual = {
  render: () => <ComponentSurface5 />,
  name: 'Product/HealthPlanItem',
};

export const StatusPillVisual = {
  render: () => <ComponentSurface6 />,
  name: 'Product/StatusPill',
};

export const FamilyProfileCardVisual = {
  render: () => <ComponentSurface7 />,
  name: 'Product/FamilyProfileCard',
};

export const VaccinationStatusRowVisual = {
  render: () => <ComponentSurface8 />,
  name: 'Product/VaccinationStatusRow',
};

export const OnboardingVisual = {
  render: () => <RouteSurface1 />,
  name: 'Screens/onboarding',
};
```
## src/stories/slices/SL-001/fixtures.ts
```text
export const storybookContract = {
  "slice_id": "SL-001",
  "slice_title": "Self Onboarding to First Dashboard",
  "required_components": [
    "AppShell",
    "HealthScoreCard",
    "PrioritySection",
    "HealthPlanItem",
    "StatusPill",
    "FamilyProfileCard",
    "VaccinationStatusRow"
  ],
  "required_screens": [
    "onboarding"
  ],
  "required_states": [
    "default",
    "loading",
    "empty",
    "error",
    "success"
  ],
  "required_statuses": [
    "done",
    "due",
    "soon",
    "planned",
    "overdue"
  ],
  "required_priorities": [
    "today",
    "soon",
    "later"
  ]
} as const;
```
## index.html
```text
<!-- generated_from: fabric/company/v1/runtime/commands/runtime.mjs | target: index.html | fabric_version: v1 | generated_at_utc: 2026-05-05T08:01:37.411Z -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Korum Health - Preventive Plan Onboarding</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Review rules:
- Mark fail for user-visible copy that exposes internal implementation, workflow, schema, routing, slice, testing, ranking, or process language.
- Mark fail for malformed user-visible dates, raw enum values, undefined/null/NaN, Invalid Date, [object Object], or raw calculation output.
- Mark fail when user-facing copy only satisfies structure but not the semantic purpose in the contract.
- Mark fail when required visible content is generic filler or not meaningful to an end user.
- Mark pass only if the implemented UI appears semantically fit for the active slice based on available source context.
```
