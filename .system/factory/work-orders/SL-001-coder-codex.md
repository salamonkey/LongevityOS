# Codex work order: implement SL-001 Self Onboarding to First Dashboard

You are acting as the Coder role for this Fabric app factory run.
Implement the active slice incrementally in the current repository.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/architecture/SL-001-baseline.md`
- `docs/ux/SL-001-current-slice-flow.md`
- `docs/ux/SL-001-semantic-ux-contract.json`
- `docs/design-system/tokens.json`
- `docs/design-system/components.json`
- `docs/design-system/component-usage-rules.md`
- `docs/design-system/visual-states.md`
- `docs/ux/SL-001-interaction-model.json`
- `docs/ux/SL-001-screen-contract.json`
- `docs/ux/SL-001-component-contract.json`
- `docs/ux/SL-001-copy-contract.json`
- `docs/implementation/SL-001-implementation-notes.md`
- `docs/product/project-brief.md` if present
- `docs/product/product-system-framing.md` if present
- Existing `src/` and `tests/` files needed to understand the current app and integration points.

## Active slice
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
  ],
  "dependencies": [
    "data లేదా"
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
No prior passed-slice invariants were detected.

## Preferred implementation targets from Fabric
- src/features/self-onboarding-to-first-dashboard/
- src/routes/self-onboarding-to-first-dashboard*
- tests/self-onboarding-to-first-dashboard/
- supabase/migrations/ (if schema change is required)

## Allowed path policy
You should create files only under:
- src/features/self-onboarding-to-first-dashboard/**
- src/routes/self-onboarding-to-first-dashboard.jsx
- src/routes/self-onboarding-to-first-dashboard.js
- tests/self-onboarding-to-first-dashboard/**

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
