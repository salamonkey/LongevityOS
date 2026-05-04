# Codex work order: implement SL-004B Design System Component Foundation

You are acting as the Coder role for this Fabric app factory run.
Implement the active slice incrementally in the current repository.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/architecture/SL-004B-baseline.md`
- `docs/ux/SL-004B-current-slice-flow.md`
- `docs/ux/SL-004B-semantic-ux-contract.json`
- `docs/design-system/tokens.json`
- `docs/design-system/components.json`
- `docs/design-system/component-usage-rules.md`
- `docs/design-system/visual-states.md`
- `docs/ux/SL-004B-interaction-model.json`
- `docs/ux/SL-004B-screen-contract.json`
- `docs/ux/SL-004B-component-contract.json`
- `docs/ux/SL-004B-copy-contract.json`
- `docs/implementation/SL-004B-implementation-notes.md`
- `docs/product/project-brief.md` if present
- `docs/product/product-system-framing.md` if present
- Existing `src/` and `tests/` files needed to understand the current app. Follow imports from `src/App.jsx` before editing.

## Active slice
```json
{
  "id": "SL-004B",
  "title": "Design System Component Foundation",
  "objective": "Materialize the approved design-system contract into reusable UI components and migrate existing MVP screens to use them before continuing with family profile management.",
  "in_scope": [
    "Create reusable UI component primitives from docs/design-system/components.json, including StatusPill, HealthPlanItem, PrioritySection, HealthScoreCard, and ReminderSelector where applicable.",
    "Create semantic status and priority helpers from docs/design-system/tokens.json so status and priority styling is not hardcoded per screen.",
    "Migrate existing onboarding, dashboard, health plan, detail, and reminder UI paths to use approved design-system components where those patterns exist.",
    "Preserve all completed SL-001 through SL-004 behavior while reducing ad-hoc UI duplication.",
    "Add lightweight verification that the approved components are present and used by relevant screens."
  ],
  "out_of_scope": [
    "No new product features beyond UI component foundation and migration.",
    "No redesign of product scope, navigation model, or MVP slice plan.",
    "No external notification integrations, provider integrations, external APIs, real AI, or complex analytics.",
    "No expansion of family profile or vaccination functionality; those remain in later slices."
  ],
  "acceptance_criteria": [
    "Reusable source components exist for the core design-system components required by completed slices: StatusPill, HealthPlanItem, PrioritySection, HealthScoreCard, and ReminderSelector, or documented equivalents when the implementation architecture uses different names.",
    "Dashboard, full health plan, item detail, and reminder scheduling screens import and use the approved shared component layer instead of duplicating ad-hoc status, card, priority-section, or reminder-selector UI patterns.",
    "Local duplicate PrioritySection/status/card/list/reminder-selector implementations are removed unless explicitly justified in implementation notes.",
    "Status and priority display values are driven by semantic helpers or tokens rather than raw colors, raw enum labels, or screen-specific string mappings.",
    "No new ad-hoc status pill, priority section, health score card, or reminder selector implementations are introduced.",
    "A design-system usage audit shows no newly introduced raw hex/rgb/hsl colors or inline visual styles in migrated user-facing UI paths unless explicitly justified in implementation notes.",
    "Existing SL-001 through SL-004 regression paths still pass after the migration."
  ],
  "dependencies": [
    "SL-001 through SL-004 completed or functionally implemented.",
    "docs/design-system/tokens.json exists.",
    "docs/design-system/components.json exists.",
    "docs/design-system/component-usage-rules.md exists.",
    "docs/design-system/visual-states.md exists.",
    "docs/ux/SL-004-semantic-ux-contract.json exists from the UI/UX maturity catch-up."
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
- src/features/onboarding/
- src/features/profile/
- src/routes/onboarding*
- tests/onboarding/
- supabase/migrations/ (if schema change is required)

## Allowed path policy
You should create files only under:
- src/features/design-system-component-foundation/**
- src/routes/design-system-component-foundation.jsx
- src/routes/design-system-component-foundation.js
- tests/design-system-component-foundation/**

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
