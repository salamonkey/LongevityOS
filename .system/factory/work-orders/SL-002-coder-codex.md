# Codex work order: implement SL-002 Health Item Detail and Completion

You are acting as the Coder role for this Fabric app factory run.
Implement the active slice incrementally in the current repository.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/architecture/SL-002-baseline.md`
- `docs/ux/SL-002-current-slice-flow.md`
- `docs/ux/SL-002-semantic-ux-contract.json`
- `docs/implementation/SL-002-implementation-notes.md`
- `docs/product/project-brief.md` if present
- `docs/product/product-system-framing.md` if present
- Existing `src/` and `tests/` files needed to understand the current app. Follow imports from `src/App.jsx` before editing.

## Active slice
```json
{
  "id": "SL-002",
  "title": "Health Item Detail and Completion",
  "objective": "Let users open any prioritized item, understand what to do and why, and mark the item Done with immediate reflected progress.",
  "in_scope": [
    "Open any dashboard item into a detail view",
    "Show the item action, recommendation frequency, why it matters, and last-known status context",
    "Use the unified status model of Due, Planned, and Done on the detail view",
    "Allow the user to mark a health item as Done from detail view",
    "Update the item state, dashboard placement, and displayed health score after completion"
  ],
  "out_of_scope": [
    "Full health plan list screen",
    "Reminder scheduling",
    "Family profile management",
    "Vaccination tracking"
  ],
  "acceptance_criteria": [
    "Every health item shown on the dashboard opens to a detail view",
    "100% of health item detail views show action, why it matters, and status context",
    "A user can mark an eligible item as Done from detail view and see the updated Done status after returning to the item",
    "After an item is marked Done, the dashboard refreshes without showing the item in more than one priority group",
    "The displayed health score updates consistently after an item is marked Done"
  ],
  "dependencies": [
    "First-profile onboarding to generated dashboard"
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
- src/features/health-item-detail-and-completion/
- src/routes/health-item-detail-and-completion*
- tests/health-item-detail-and-completion/

## Allowed path policy
You should create files only under:
- src/features/health-item-detail-and-completion/**
- src/routes/health-item-detail-and-completion.jsx
- src/routes/health-item-detail-and-completion.js
- tests/health-item-detail-and-completion/**

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
