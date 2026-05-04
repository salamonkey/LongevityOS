# Codex work order: implement SL-003 Full Health Plan View

You are acting as the Coder role for this Fabric app factory run.
Implement the active slice incrementally in the current repository.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/architecture/SL-003-baseline.md`
- `docs/ux/SL-003-current-slice-flow.md`
- `docs/ux/SL-003-semantic-ux-contract.json`
- `docs/implementation/SL-003-implementation-notes.md`
- `docs/product/project-brief.md` if present
- `docs/product/product-system-framing.md` if present
- Existing `src/` and `tests/` files needed to understand the current app. Follow imports from `src/App.jsx` before editing.

## Active slice
```json
{
  "id": "SL-003",
  "title": "Full Health Plan View",
  "objective": "Provide a complete per-profile plan view so users can review all generated preventive items and their current status beyond the prioritized dashboard.",
  "in_scope": [
    "Add a health plan screen for the active profile",
    "List all generated preventive health items for the active profile",
    "Show recommendation frequency for each listed item",
    "Show the unified status of Due, Planned, or Done for each item",
    "Allow users to open the existing item detail view from the plan list"
  ],
  "out_of_scope": [
    "Reminder creation or editing",
    "Family profile management",
    "Vaccination tracking",
    "Advanced filtering, sorting, or analytics"
  ],
  "acceptance_criteria": [
    "All generated health items for the active profile appear exactly once in the health plan view",
    "Each plan item shows recommendation frequency and one unified status value: Due, Planned, or Done",
    "Opening an item from the plan view shows the same detail content as opening that item from the dashboard",
    "A status change made in detail view is reflected when the user returns to the plan view",
    "Plan totals remain consistent with dashboard items for the same active profile"
  ],
  "dependencies": [
    "Health item detail and completion"
  ]
}
```

## Implementation contract
- Behave like an incremental developer, not a full-app generator.
- Do not rewrite the application from scratch.
- Preserve existing behavior unless the current slice explicitly requires a change.
- Prefer small, focused edits and new slice-local files.
- Read relevant existing files before editing them.
- Do not modify unrelated onboarding/profile code unless strictly necessary for integration.
- Do not use `--force` or destructive git commands.

## Preferred implementation targets from Fabric
- src/features/full-health-plan-view/
- src/routes/full-health-plan-view*
- tests/full-health-plan-view/
- supabase/migrations/ (if schema change is required)

## Allowed path policy
You should create files only under:
- src/features/full-health-plan-view/**
- src/routes/full-health-plan-view.jsx
- src/routes/full-health-plan-view.js
- tests/full-health-plan-view/**

You may minimally modify only:
- src/App.jsx
- src/styles.css
- package.json
- package-lock.json

Do not modify unless explicitly unavoidable:
- index.html
- src/main.jsx

If the requested slice cannot be implemented within these paths, stop and explain the smallest required exception instead of broadening the edit scope yourself.

## Validation expectations
- Add or update tests for the slice behavior.
- Run the available test command, usually `npm test`, if dependencies are installed.
- Run `npm run build` if available and reasonably possible.
- End with a concise summary of changed files and validation results.

## User-facing semantic UX contract
- You must satisfy the semantic UX contract before the slice can close.
- Do not invent generic filler copy for required user-facing content.
- Do not expose internal implementation, workflow, schema, routing, slice, testing, ranking, bucket, acceptance, or process language in visible UI.
- Every visible status, explanation, label, empty state, and fallback must be meaningful to the end user.
- Dates and statuses must be human-readable and safe.
- Never render undefined, null, NaN, Invalid Date, [object Object], malformed years, raw enum values, or raw object/stringified data.

## Important product/UX reminder
The visible implementation should reflect the product, UX, architecture, and semantic UX contract documents. A section existing with bad copy is not acceptable.

Values file for reference: `fabric.values.json`
