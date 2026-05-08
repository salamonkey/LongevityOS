# Codex work order: implement SL-005 Family Onboarding and Family Overview

You are acting as the Coder role for this Fabric app factory run.
Implement the active slice incrementally in the current repository.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/architecture/SL-005-baseline.md`
- `docs/ux/SL-005-current-slice-flow.md`
- `docs/ux/SL-005-semantic-ux-contract.json`
- `docs/design-system/tokens.json`
- `docs/design-system/components.json`
- `docs/design-system/component-usage-rules.md`
- `docs/design-system/visual-states.md`
- `docs/ux/SL-005-interaction-model.json`
- `docs/ux/SL-005-screen-contract.json`
- `docs/ux/SL-005-component-contract.json`
- `docs/ux/SL-005-copy-contract.json`
- `docs/implementation/SL-005-implementation-notes.md`
- `docs/product/project-brief.md` if present
- `docs/product/product-system-framing.md` if present
- Existing `src/` and `tests/` files needed to understand the current app and integration points.

## Active slice
```json
{
  "id": "SL-005",
  "title": "Family Onboarding and Family Overview",
  "objective": "Allow one account to manage multiple people with separate preventive plans, summaries, and navigation paths.",
  "in_scope": [
    "Optional family profile creation during onboarding in the same account",
    "Create additional profiles after onboarding, up to a maximum of 5 total profiles per account",
    "Generate a separate rule-based plan, dashboard, and vaccination list for each profile from age and gender",
    "Family overview showing each profile's Health Score and due-item summary",
    "Open each family member's dashboard, checkup plan, and vaccinations from the family overview"
  ],
  "out_of_scope": [
    "Profile editing beyond initial creation",
    "Archive and delete profile actions",
    "Multi-user permissions or shared account roles",
    "Cross-profile combined scoring"
  ],
  "acceptance_criteria": [
    "A family account can create and view at least 2 profiles with separate Health Scores and priority lists",
    "The account cannot exceed 5 profiles",
    "Onboarding offers family profile creation without blocking the self-profile flow",
    "A user can open any family member's dashboard, checkup plan, and vaccinations from the family overview and see person-specific content"
  ],
  "dependencies": [
    "Self onboarding to first dashboard",
    "Health plan browsing and item detail",
    "Item completion and reminder actions",
    "Vaccination tracking area and manual entries"
  ]
}
```

## Implementation contract
- Behave like an incremental developer, not a full-app generator.
- Do not rewrite the application from scratch.
- Preserve existing behavior unless the current slice explicitly requires a change.
- Maintain previously working user-visible actions and flows from earlier slices unless the active slice explicitly redefines them.
- Never remove existing functionality as an unintended side effect of implementation.
- Prefer small, focused edits and new slice-local files.
- Read relevant existing files before editing them.
- Do not modify unrelated onboarding/profile code unless strictly necessary for integration.
- Do not restyle the global app shell, shared visual language, or design-system tokens during slice implementation.
- Reuse existing shared UI shell conventions (`app-shell`, `app-panel`, existing card/action classes) instead of introducing alternate global wrapper conventions.
- Treat global styling (`src/styles.css`) as protected; any cross-slice design refresh belongs in the design-system workflow, not in slice implementation.
- src/App.jsx is protected by default. Integrate new slice behavior through slice-local routes/features and minimal shared integration points instead.
- Do not use `--force` or destructive git commands.

## Carry-forward invariants
These are already approved behaviors from prior passed slices. Preserve them unless the active slice explicitly redefines them.
- [SL-001] Self Onboarding to First Dashboard
  - A new user can complete onboarding and reach a populated dashboard in 60 seconds or less in a standard moderated walkthrough
  - The first health plan is generated within 5 seconds of onboarding completion
  - Every generated item comes from the locked MVP preventive item set and is assigned to checkups or vaccinations
  - The dashboard shows Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage for the self profile
  - Entry: User opens the first-run onboarding screen for the self profile in an unauthenticated or pre-established current-user context; no family, settings, or alternate destinations are shown in this slice.
  - Expected behavior:
  - Onboarding screen purpose: collect the minimum required inputs and set expectation that a personalized preventive plan will be created immediately after submission.
  - Onboarding layout is a single vertical form with two required fields and one primary action. Sections in order: brief value statement, age field, gender field, primary submit button.
- [SL-002] Health Plan Browsing and Item Detail
  - Every generated health item is visible in a plan view and opens into a detail view
  - 100% of generated health items show a recommendation cadence, one current status, and a why-it-matters explanation
  - A user can open any dashboard-highlighted item into detail and return to the prior view without losing context
  - Item detail copy uses plain-language rationale rather than clinical detail
  - Entry: User enters the current slice from the primary application flow.
  - Expected behavior:
  - Complete the slice objective in the smallest coherent flow.
  - Handle one clear recovery path for invalid or incomplete user action.
- [SL-003] Item Completion and Reminder Actions
  - A user can mark an item as done from the detail view and see status change to done across all relevant views in the same session
  - A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion
  - Setting a reminder changes the item status to planned across the applicable views in the same session
  - After a status change, the dashboard updates the highlighted next item based on the approved Today-then-Soon rule
  - Entry: User opens a health item detail view for the active profile from the dashboard or a plan list and sees the item title, why-it-matters content, recommendation cadence, current status, and available primary actions.
  - Expected behavior:
  - On detail load, show the current item status as one of due, planned, or done using the existing product status presentation; do not introduce any new labels or reminder-only status.
  - If the item status is due or planned, show two actions in the detail action area: a primary 'Mark as done' action and a secondary 'Set reminder' action.
- [SL-004] Vaccination Tracking Area and Manual Entries
  - A user can add at least 1 manual vaccination entry to the self profile and see it appear in that profile's vaccination list in the same session
  - The vaccination area shows rule-based due guidance for the self profile without implying provider data sync
  - A vaccination entry captures both a date and status context
  - The vaccination list supports empty and populated states without breaking access to due guidance
  - The dashboard or health-plan view appears when the flow is completed.
  - Entry: User is in the self profile context and opens the Vaccinations area from an existing self-scope entry point such as the dashboard or health plan.
  - Expected behavior:
  - Render a dedicated page titled for the self profile vaccination experience, with a clear primary action to add a vaccination entry and no profile switcher on this slice.

Required regression evidence file: `tests/family-onboarding-and-family-overview/carry-forward-invariants.test.mjs`
- Add or update tests in that file so prior-slice invariant behavior is explicitly covered.

## Preferred implementation targets from Fabric
- src/features/family-onboarding-and-family-overview/
- src/routes/family-onboarding-and-family-overview*
- tests/family-onboarding-and-family-overview/
- supabase/migrations/ (if schema change is required)

## Allowed path policy
You should create files only under:
- src/features/family-onboarding-and-family-overview/**
- src/routes/family-onboarding-and-family-overview.jsx
- src/routes/family-onboarding-and-family-overview.js
- tests/family-onboarding-and-family-overview/**

You may minimally modify only:
- package.json
- package-lock.json

Do not modify unless explicitly unavoidable:
- index.html
- src/main.jsx
- src/styles.css
- src/App.jsx

If the requested slice cannot be implemented within these paths, stop and explain the smallest required exception instead of broadening the edit scope yourself.

## Validation expectations
- Add or update tests for the slice behavior.
- Run the available test command, usually `npm test`, if dependencies are installed.
- Run `npm run build` if available and reasonably possible.
- End with a concise summary of changed files and validation results.

## User-facing semantic UX and design-system contract
- You must satisfy the semantic UX contract and design-system contracts before the slice can close.
- Do not invent generic filler copy for required user-facing content.
- Do not expose internal implementation, workflow, schema, routing, slice, testing, ranking, bucket, acceptance, or process language in visible UI.
- Every visible status, explanation, label, empty state, and fallback must be meaningful to the end user.
- Use approved UI components and semantic tokens before introducing one-off visual structure.
- Do not introduce raw visual values, duplicate component implementations, or new status labels without updating the design-system contract.
- Dates and statuses must be human-readable and safe.
- Never render undefined, null, NaN, Invalid Date, [object Object], malformed years, raw enum values, or raw object/stringified data.

## Important product/UX reminder
The visible implementation should reflect the product, UX, architecture, and semantic UX contract documents. A section existing with bad copy is not acceptable.

Values file for reference: `fabric.values.json`
