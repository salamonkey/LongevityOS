# Codex work order: implement SL-004 Reminder Scheduling From Health Items

You are acting as the Coder role for this Fabric app factory run.
Implement the active slice incrementally in the current repository.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/architecture/SL-004-baseline.md`
- `docs/ux/SL-004-current-slice-flow.md`
- `docs/ux/SL-004-semantic-ux-contract.json`
- `docs/implementation/SL-004-implementation-notes.md`
- `docs/product/project-brief.md` if present
- `docs/product/product-system-framing.md` if present
- Existing `src/` and `tests/` files needed to understand the current app. Follow imports from `src/App.jsx` before editing.

## Active slice
```json
{
  "id": "SL-004",
  "title": "Reminder Scheduling From Health Items",
  "objective": "Allow users to save a reminder from item detail with preset or custom timing and see that reminder state reflected back in the app.",
  "in_scope": [
    "Show a Reminder action on health items that support reminders",
    "Offer reminder timing options of 1 month, 3 months, and custom date",
    "Save a reminder from item detail",
    "Allow an existing reminder to be updated from item detail",
    "Reflect saved reminder state on the item detail view and prioritized item surfaces"
  ],
  "out_of_scope": [
    "Push, email, or SMS channel selection",
    "Global reminder notifications preference",
    "Family-specific reminder controls",
    "Vaccination tracking"
  ],
  "acceptance_criteria": [
    "A user can save a reminder with 1 month, 3 months, and custom date options for 100% of health items shown with a Reminder action",
    "A saved reminder remains visible on the same item after page reload in the test account",
    "The dashboard and full plan view reflect that the item has a saved reminder state",
    "Updating an existing reminder replaces the previously saved timing",
    "Reminder creation does not change the item's status unless the existing rules for Planned status require it"
  ],
  "dependencies": [
    "Full health plan view"
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
- src/features/reminder-scheduling-from-health-items/
- src/routes/reminder-scheduling-from-health-items*
- tests/reminder-scheduling-from-health-items/

## Allowed path policy
You should create files only under:
- src/features/reminder-scheduling-from-health-items/**
- src/routes/reminder-scheduling-from-health-items.jsx
- src/routes/reminder-scheduling-from-health-items.js
- tests/reminder-scheduling-from-health-items/**

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
