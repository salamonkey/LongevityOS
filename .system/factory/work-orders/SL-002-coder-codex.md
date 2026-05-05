# Codex work order: implement SL-002 Health Plan Browsing and Item Detail

You are acting as the Coder role for this Fabric app factory run.
Implement the active slice incrementally in the current repository.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/architecture/SL-002-baseline.md`
- `docs/ux/SL-002-current-slice-flow.md`
- `docs/ux/SL-002-semantic-ux-contract.json`
- `docs/design-system/tokens.json`
- `docs/design-system/components.json`
- `docs/design-system/component-usage-rules.md`
- `docs/design-system/visual-states.md`
- `docs/ux/SL-002-interaction-model.json`
- `docs/ux/SL-002-screen-contract.json`
- `docs/ux/SL-002-component-contract.json`
- `docs/ux/SL-002-copy-contract.json`
- `docs/implementation/SL-002-implementation-notes.md`
- `docs/product/project-brief.md` if present
- `docs/product/product-system-framing.md` if present
- Existing `src/` and `tests/` files needed to understand the current app and integration points.

## Active slice
```json
{
  "id": "SL-002",
  "title": "Health Plan Browsing and Item Detail",
  "objective": "Let users understand each recommended preventive item by viewing complete plan lists and item detail with clear rationale.",
  "in_scope": [
    "Personal health plan views for the self profile separated into checkups and vaccinations",
    "Display each health item with recommendation cadence and one current status",
    "Health item detail view with recommendation text and why-it-matters explanation in plain language",
    "Navigation from dashboard priority item and plan lists into item detail and back",
    "Read-only display of due, planned, and done statuses across dashboard and plan views"
  ],
  "out_of_scope": [
    "Changing item status",
    "Reminder creation",
    "Manual vaccination entry",
    "Family profile views",
    "Profile editing and preferences"
  ],
  "acceptance_criteria": [
    "Every generated health item is visible in a plan view and opens into a detail view",
    "100% of generated health items show a recommendation cadence, one current status, and a why-it-matters explanation",
    "A user can open any dashboard-highlighted item into detail and return to the prior view without losing context",
    "Item detail copy uses plain-language rationale rather than clinical detail"
  ],
  "dependencies": [
    "Self onboarding to first dashboard"
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

Required regression evidence file: `tests/health-plan-browsing-and-item-detail/carry-forward-invariants.test.mjs`
- Add or update tests in that file so prior-slice invariant behavior is explicitly covered.

## Preferred implementation targets from Fabric
- src/features/health-plan-browsing-and-item-detail/
- src/routes/health-plan-browsing-and-item-detail*
- tests/health-plan-browsing-and-item-detail/
- supabase/migrations/ (if schema change is required)

## Allowed path policy
You should create files only under:
- src/features/health-plan-browsing-and-item-detail/**
- src/routes/health-plan-browsing-and-item-detail.jsx
- src/routes/health-plan-browsing-and-item-detail.js
- tests/health-plan-browsing-and-item-detail/**

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
