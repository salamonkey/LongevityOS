# Virtual Software Company Fabric v1

This is the canonical, portable fabric package.

## Components

- `team/`: role specifications and role contract metadata.
- `method/`: workflow and governance rules, bootstrap runbook, and validation checklist.
- `db/`: database infrastructure templates and DB runtime policy defaults.
- `templates/`: canonical work product templates.
- `runtime/`: instantiate/validate/doctor runtime tools.
- `fabric.json`: canonical package manifest (source-of-truth mappings, required tokens, generated targets).
- `fabric.yaml`: compatibility manifest mirror (optional when using JSON-only flow).

## Portability Model

Copy + initialize + format + scaffold + plan.

- Fabric sources are canonical.
- Project files are generated outputs.
- Manual edits to generated outputs are drift unless explicitly exempted.

## Runtime Commands

Preferred (self-contained, no repo script wiring required):

- `./fabric/company/v1/fabric <command> ...`
- `node fabric/company/v1/runtime/fabric.mjs <command> ...`

Optional wrapper from repository root (only when host repo defines npm scripts as in this repo):

- `npm run fabric -- <command> ...`

- `init-factory --target <project-root> [--values fabric.values.json] [--force] [--init-values] [--force-values]`
  - What it does: generates project-agnostic app-factory operating components (team role specs and factory runbook/checklist outputs).
  - When to use: immediately after copying `fabric/company/v1` into a new repo.
  - Benefit: creates a consistent baseline factory before any project-specific shaping.
  - Safety behavior: refuses to overwrite non-generated files unless `--force`.
  - Values behavior: without `--init-values`, `init-factory` runs in brief-first mode and does not require a values file (if factory-init templates do not require tokens).
  - Values convenience: `--init-values` explicitly opts into early values creation from `fabric.values.example.json`; use `--force-values` to overwrite an existing values file.

- `pm:intake --target <project-root>`
  - What it does: deterministically scans `docs/customer-input/*` for supported sources (`.pdf`, `.md`, `.txt`, `.json`), extracts normalized text, and writes intake artifacts under `docs/pm/intake/` (`sources.json`, `intake-report.md`, and per-source `extracted-text/*.txt`).
  - When to use: first PM lifecycle command after customer input files are placed in `docs/customer-input/`.
  - Benefit: makes source ingestion explicit, validated, and observable before readiness/brief drafting.
  - Failure behavior: exits non-zero when input directory is missing, no supported files are found, or no usable text can be extracted.

- `pm:brief-readiness --target <project-root>`
  - What it does: runs Product Manager brief-readiness content gate, reads every readable file under `docs/customer-input/*` plus `docs/product/intake-note.md` (when present), and writes `docs/reviews/product-manager/brief-readiness-review.md`.
  - When to use: after `pm:intake`.
  - Benefit: makes readiness an explicit, repeatable command with a persisted decision artifact.
  - Gate rule: blocking coverage is required for problem/outcome, target users, and MVP scope, plus no unreadable evidence files and sufficient readable content volume. Missing constraints/non-negotiables is treated as a warning (non-blocking). `docs/customer-input/README.md` does not count as evidence.
  - Failure behavior: on fail, the command now writes `docs/reviews/product-manager/customer-information-request.md` with concrete requested customer inputs, prints those requests in terminal, and points to the full readiness review note.

- `pm:brief-draft --target <project-root>`
  - What it does: runs the deterministic brief drafting pass after readiness checks so the project brief draft is present and up to date.
  - When to use: after `pm:brief-readiness`.
  - Values behavior: does not require an existing `fabric.values.json`.

- `pm:brief-approve --target <project-root>`
  - What it does: applies brief approval workflow for `docs/product/project-brief.md`.
  - When to use: after `pm:brief-draft` and customer sign-off.
  - Values behavior: does not require an existing `fabric.values.json`.

- `pm:derive-values --target <project-root>`
  - What it does: derives/updates `fabric.values.json` from approved brief context.
  - When to use: after `pm:brief-approve`.
  - Values behavior: creates values when missing; no pre-existing values file required.

- `pm:brief-semantic-check --target <project-root> [--values fabric.values.json] [--brief <path>]`
  - What it does: runs a semantic-only clarity recheck against an operator-edited brief (default `docs/reviews/product-manager/project-brief.failed.md`) and appends findings/fixes/suggestions to `docs/reviews/product-manager/brief-clarity-review.md` under `Post-Edit Semantic Validation Runs`.
  - When to use: after manually editing a failed brief draft and before deciding to promote it or re-run intake generation.
  - Exit behavior: returns `0` when semantic findings are clear; returns `1` when findings remain or required inputs are missing.

- `pm:approve-brief --target <project-root> [--values fabric.values.json]`
  - What it does: backward-compatible combined alias for approval + value derivation.
  - When to use: legacy flow only. Preferred sequence is `pm:brief-approve` then `pm:derive-values`.

- `pm:finalize-bootstrap-reviews --target <project-root> [--values fabric.values.json]`
  - What it does: generates finalized PM bootstrap review artifacts for foundation and backlog/current-slice state, removes template placeholders automatically, and sets explicit machine-readable assessments (`approved` or `needs_revision`).
  - When to use: after `scaffold` and `pm:plan-slices`, before `pm:bootstrap-signoff`.
  - Benefit: separates template review scaffolding from final approval artifacts and removes a brittle manual cleanup step.

- `pm:bootstrap-signoff --target <project-root> [--values fabric.values.json]`
  - What it does: validates both finalized bootstrap review docs are present, machine-readable, placeholder-free, and explicitly `Assessment: approved`; then atomically updates manifest bootstrap/delivery state and `status.approved_reviews`.
  - When to use: after `pm:finalize-bootstrap-reviews` returns both artifacts as `approved`.
  - Benefit: prevents silent transition to delivery with draft review artifacts.

- `pm:plan-slices --target <project-root> [--values fabric.values.json] [--model-driven] [--heuristic]`
  - What it does: generates an initial delivery-ready backlog plan (5-8 slices) from the approved project brief and writes a non-placeholder active `current-slice` with `planned` status.
  - Planning mode: model-driven by default (with automatic fallback to heuristic if model invocation is unavailable). Use `--heuristic` to force deterministic planning only.
  - When to use: immediately after `scaffold` and before bootstrap review finalization.
  - Benefit: converts bootstrap scaffolding into execution-ready slice definitions.

- `architect:generate-current-slice-baseline --target <project-root> [--values fabric.values.json]`
  - What it does: generates a slice-specific `docs/architecture/<SLICE_ID>-baseline.md` for the active slice from current slice state, project brief, and product-system framing.
  - When to use: after `pm:plan-slices` and before implementation of the active slice.
  - Benefit: turns the architecture baseline from a generic template into implementation-ready structural guidance.

- `uiux:generate-design-system --target <project-root> [--values fabric.values.json] [--force]`
  - What it does: generates the global UI/UX design-system contract artifacts: `docs/design-system/tokens.json`, `docs/design-system/components.json`, `docs/design-system/component-usage-rules.md`, and `docs/design-system/visual-states.md`.
  - When to use: once after bootstrap signoff / DB readiness and before the first user-facing slice; rerun with `--force` only when product positioning, tone, core visual grammar, or component vocabulary intentionally changes.
  - Benefit: establishes reusable tokens, components, state rules, and usage constraints before slice-level UX and implementation begin.

- `uiux:generate-current-slice-flow --target <project-root> [--values fabric.values.json]`
  - What it does: generates a slice-specific `docs/ux/<SLICE_ID>-current-slice-flow.md`, `docs/ux/<SLICE_ID>-semantic-ux-contract.json`, `docs/ux/<SLICE_ID>-interaction-model.json`, `docs/ux/<SLICE_ID>-screen-contract.json`, `docs/ux/<SLICE_ID>-component-contract.json`, and `docs/ux/<SLICE_ID>-copy-contract.json` for the active slice from current slice state, the current architecture baseline, project brief, product-system framing, and the global design-system contract.
  - When to use: after `architect:generate-current-slice-baseline` and before implementation of user-facing slices. If the global design-system artifacts do not exist, this command creates non-forced defaults automatically.
  - Benefit: turns the UX flow artifact from a generic template into implementation-ready interaction guidance, screen/component/copy contracts, and a reusable semantic acceptance contract.

- `uiux:review-current-slice-semantics --target <project-root> [--values fabric.values.json]`
  - What it does: runs the blocking semantic UX gate for the active slice after implementation. It combines deterministic scans with an LLM-based semantic reviewer.
  - When to use: after `coder:implement-current-slice` and before `coder:close-current-slice`.
  - Benefit: catches user-facing issues that structural tests miss, including generic filler copy, internal implementation language leaks, malformed dates/statuses, raw values, and copy that exists but does not satisfy the user-facing purpose.
  - Output artifacts: `docs/reviews/ux/<SLICE_ID>-semantic-ux-review.json` and `docs/reviews/ux/<SLICE_ID>-semantic-ux-review.md`.
  - Gate rule: `coder:close-current-slice` refuses to close when this review is missing or failed (unless you intentionally pass `--allow-semantic-ux-fail` during manual closeout).
  - On failure, the command prints the next repair command.

- `tester:validate-current-slice --target <project-root> [--values fabric.values.json]`
  - What it does: runs an LLM-based tester against the active slice checklist and implementation evidence, writes `docs/reviews/testing/<SLICE_ID>-validation-report.json` and `.md`, and updates `docs/testing/<SLICE_ID>-user-checklist.md` result/findings.
  - Carry-forward behavior: automatically inherits prior passed-slice capabilities and fails when regression evidence is missing or inherited capabilities appear broken.
  - When to use: after semantic UX review passes and before `coder:close-current-slice`.
  - Gate behavior: exits non-zero on fail findings and points to `coder:repair-implementation-findings`.

- `coder:repair-semantic-ux-findings --target <project-root> [--values fabric.values.json] [--include-warnings]`
  - What it does: reads the active slice's semantic UX review, generates a structured Codex repair work order, and asks Codex to repair selected findings without restarting the slice.
  - Default behavior: selects blocker findings only. Pass `--include-warnings` to include warning findings in the repair work order.
  - Inputs: `docs/reviews/ux/<SLICE_ID>-semantic-ux-review.json`, `docs/reviews/ux/<SLICE_ID>-semantic-ux-review.md`, `docs/ux/<SLICE_ID>-semantic-ux-contract.json`, `docs/product/current-slice.yaml`, and `docs/implementation/<SLICE_ID>-implementation-notes.md`.
  - Output artifact: `docs/implementation/<SLICE_ID>-semantic-ux-repair-work-order.md`.
  - Ledger: records `semantic_ux_repair` start/completion events in `.system/factory/execution-ledger.jsonl`.
  - Path policy: allows slice-local files, dependency slice surfaces (features/routes named in `dependencies`), shared integration wiring when findings require surface exposure (for example `src/App.jsx` and route registration), implementation notes, and files explicitly referenced by findings; review artifacts and Fabric runtime are not repair targets.
  - After use: rerun `uiux:review-current-slice-semantics` and close only after the review passes.

- `coder:repair-implementation-findings --target <project-root> [--values fabric.values.json]`
  - What it does: reads the active slice's user checklist, extracts manual QA findings from `## Manual QA Findings`, generates a structured Codex repair work order, and asks Codex to repair the implementation without restarting the slice.
  - When to use: after tester/manual review marks `docs/testing/<SLICE_ID>-user-checklist.md` as `Status: Fail` and documents one or more manual QA findings.
  - Inputs: `docs/testing/<SLICE_ID>-user-checklist.md`, `docs/product/current-slice.yaml`, `docs/implementation/<SLICE_ID>-implementation-notes.md`, `docs/ux/<SLICE_ID>-current-slice-flow.md`, and `docs/ux/<SLICE_ID>-semantic-ux-contract.json`.
  - Output artifact: `docs/implementation/<SLICE_ID>-implementation-repair-work-order.md`.
  - Ledger: records `implementation_repair` start/completion events in `.system/factory/execution-ledger.jsonl`.
  - Guardrail: refuses to run when the checklist is `Pass` or still `Pending`; the human reviewer owns checklist acceptance.
  - After use: rerun tests/build/doctor, rerun semantic UX review, repeat manual review, and mark checklist `Pass` only after acceptance.

LLM transparency and logging:
- All model-driven commands now print prompt source file paths right after `llm request started`, one source per line under a `prompt content:` header.
- Prompt content lists are strict: only explicitly registered source files are shown (not path-like strings merely mentioned inside prompt text).
- Every model call writes two artifacts under `/.llm-logs/` (project root):
  - `<timestamp>-<caller>-<task>-prompt.md`
  - `<timestamp>-<caller>-<task>-response.json`

- `format-from-brief --target <project-root>`
  - What it does: validates that `docs/product/project-brief.md` exists and is approved (`Brief Approval Status: approved`), and enforces minimum input sufficiency (`docs/product/intake-note.md` or one/more files in `docs/customer-input/*`).
  - When to use: after the Product Manager/customer refine the brief and before execution generation.
  - Benefit: explicit lifecycle gate between factory setup and project execution.

- `scaffold --values fabric.values.json --target <project-root> [--force]`
  - What it does: renders bootstrap/governance project artifacts from fabric sources without touching constitutional customer-derived and planning-owned files (`product-system-framing`, `backlog`, `current-slice`).
  - When to use: after `format-from-brief` succeeds and before `pm:plan-slices`.
  - Benefit: isolates scaffolding from planning and preserves customer-approved product framing artifacts.

- `instantiate --values fabric.values.json --target <project-root> [--force]`
  - What it does: renders fabric sources into project outputs defined in the fabric manifest (`fabric.json` by default), including generated headers (`generated_from`, `fabric_version`, `generated_at`).
  - When to use: full-manifest regeneration when you explicitly want all manifest targets rendered (including framing/backlog/current-slice), or when updating generated artifacts after token/template changes.
  - Benefit: creates consistent artifacts from one canonical source and removes manual copy/paste drift.
  - Safety behavior: refuses to overwrite non-generated files unless `--force`.

- `validate --target <project-root> [--values fabric.values.json]`
  - What it does: verifies required token coverage and checks generated files for drift against fabric sources.
  - When to use: before reviews, before release, and after any changes to templates, method rules, or token values.
  - Benefit: catches silent divergence early and enforces the generated-file contract.

- `doctor --target <project-root>`
  - What it does: runs coherence checks across governance state including semantic bootstrap checks (placeholder detection, delivery-mode review approvals, and scaffold-only slice detection).
  - When to use: after slice transitions, closeout updates, or whenever project state seems inconsistent.
  - Benefit: prevents workflow errors caused by contradictory project state across core artifacts.

- `gate --target <project-root> [--values fabric.values.json]`
  - What it does: runs `validate` then `doctor` as one strict gate command.
  - When to use: before CI merge/release checks or as a single local readiness command.
  - Benefit: one deterministic readiness check for both drift and governance semantics.

- `orchestrator:run-until-blocked --target <project-root> [--values fabric.values.json] [--max-steps <n>]`
  - What it does: repeatedly computes and executes the next canonical Fabric command until a manual checkpoint or failed gate requires human attention.
  - Auto-verification: after Step 20 (`coder:implement-current-slice`), it runs `npm test` and `npm run build` immediately and blocks on failure.
  - Stop conditions: unresolved manual checklist gate, failed command/gate/review, no inferred next command, repeated non-progressing next step, or `--max-steps` reached.
  - When to use: reduce command-by-command execution overhead while preserving canonical gate discipline.
  - Safety behavior: does not auto-complete manual QA checklist decisions; it blocks and tells you what needs human action.

- `db:init --target <project-root> [--values fabric.values.json] [--force]`
  - What it does: provisions DB baseline artifacts (`supabase/config.toml`, `supabase/seed.sql`, `.env.example`) and ensures required DB scripts exist in `package.json`.
  - When to use: immediately after bootstrap or when onboarding DB into an existing project.
  - Benefit: gives every project a working DB baseline with one command.
  - Auto-bootstrap behavior: if `package.json` is missing, a minimal one is created and required DB scripts are injected.

- `db:check --target <project-root>`
  - What it does: verifies DB files, required env keys, required scripts, and Supabase CLI availability.
  - When to use: before running migrations, before review/release gates, or after environment changes.
  - Benefit: catches DB setup issues early with actionable errors.

- `db:reset --target <project-root> --yes`
  - What it does: executes configured DB reset command.
  - When to use: local rebuild/test-data reset workflows.
  - Benefit: deterministic reset path for development environments.

## Inputs

- `fabric.values.json`: token values used during generation (recommended, dependency-free).
- `fabric.values.yaml`: supported when `js-yaml` is available.
- Starter file: `fabric/company/v1/fabric.values.example.json` (use `init-factory --init-values` or copy manually).
- Recommended timing: initialize the values file early, complete/finalize values after project brief approval and before `scaffold`.

Customer entry artifacts (before execution generation):

- `docs/customer-input/`: raw customer source material (notes, docs, specs, link snapshots).
- `docs/product/intake-note.md`: normalized Product Manager intake synthesis.
- `docs/product/project-brief.md`: customer contract artifact used to gate execution.
- Brief gate requirement: `docs/product/project-brief.md` must include `Brief Approval Status: approved`.

## Customer Entry Logic

Workflow:

1. Verbal customer request -> capture into `docs/product/intake-note.md`.
2. Existing customer documentation -> store in `docs/customer-input/`.
3. Product Manager runs `pm:intake` to extract and normalize customer source text into `docs/pm/intake/`.
4. Minimum input gate: at least one source must exist (`docs/product/intake-note.md` or one/more files in `docs/customer-input/*`).
5. Product Manager evaluates whether available input is sufficient to draft a reliable brief.
6. If insufficient, Product Manager requests additional customer information before brief drafting continues.
7. If sufficient, Product Manager synthesizes available inputs into `docs/product/project-brief.md`.
8. Customer and Product Manager refine the brief.
9. Brief approval gates generation flow (`format-from-brief` then `scaffold` + `pm:plan-slices`).
>> Flow now reflects project-brief -> scaffold -> planning -> execution.

After placing customer input files into `docs/customer-input/`, run:

```bash
./fabric/company/v1/fabric pm:intake --target .
./fabric/company/v1/fabric pm:brief-readiness --target .
./fabric/company/v1/fabric pm:brief-draft --target .
./fabric/company/v1/fabric pm:brief-approve --target .
./fabric/company/v1/fabric pm:derive-values --target .
```

Artifact lifecycle policy:

- `docs/customer-input/*`: source evidence. Prefer append/update with traceability; avoid destructive overwrite.
- `docs/product/intake-note.md`: PM synthesis of problem, goals, constraints, and open questions.
- `docs/product/project-brief.md`: living contract during refinement; baseline contract once approved.

## Canonical Flow (Single Source of Truth)

This is the only canonical end-to-end sequence. It matches the current runtime behavior.

### Command sequence from a clean fabric state
 ./fabric/company/v1/fabric orchestrator:run-until-blocked --target . --values ./fabric.values.json


STAGE 1
1. (Optional, repo-specific) reset to fabric-only:
   - `bash scripts/reset-to-fabric-only.sh --yes --also-values`
2. Initialize factory (without or with values):
   - `./fabric/company/v1/fabric init-factory --target . --values ./fabric.values.json`
   - `./fabric/company/v1/fabric init-factory --target . --values ./fabric.values.json --init-values`
3. Run deterministic PM intake normalization:
   - `./fabric/company/v1/fabric pm:intake --target .`
4. Build/review brief readiness:
   - `./fabric/company/v1/fabric pm:brief-readiness --target .`
5. Draft brief (deterministic and LLM modes):
   - `./fabric/company/v1/fabric pm:brief-draft --target .`
   - `BRIEF_DRAFT_LLM_ENABLED=true ./fabric/company/v1/fabric pm:brief-draft --target .`
6. Approve brief:
   - `./fabric/company/v1/fabric pm:brief-approve --target .`
7. Derive values:
   - `./fabric/company/v1/fabric pm:derive-values --target .`
8. Gate before scaffold:
   - `./fabric/company/v1/fabric format-from-brief --target .`
STAGE 2
9. Generate bootstrap/governance artifacts scaffold and frontend runtime baseline:
   - `./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json`
   - This also creates the React/Vite + Storybook baseline files (`package.json`, `index.html`, `src/`, `.storybook/`, `vite.config.js`) so `npm install`, `npm run dev`, and `npm run storybook` work later without manual Storybook initialization.
10. Generate initial backlog of slices:
   - `./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json`
11. Finalize bootstrap reviews:
   - `./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json`
12. Bootstrap signoff into delivery mode:
   - `./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json`
13. Generate global UI/UX design-system contract:
   - `./fabric/company/v1/fabric uiux:generate-design-system --target . --values ./fabric.values.json`
14. Initialize DB baseline:
   - `./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json`
15. Verify DB readiness:
   - `./fabric/company/v1/fabric db:check --target .`
STAGE 3
16. Generate architecture baseline for active slice:
    - `./fabric/company/v1/fabric architect:generate-current-slice-baseline --target . --values ./fabric.values.json`
17. Generate UX flow and slice UI/UX contracts for active slice:
    - `./fabric/company/v1/fabric uiux:generate-current-slice-flow --target . --values ./fabric.values.json`
    - This also creates missing global design-system artifacts as a safety net, but Step 13 is the intended explicit workflow step.
17b. Refresh the Storybook contract map for this active slice:
    - `./fabric/company/v1/fabric uiux:generate-storybook-map --target . --values ./fabric.values.json`
    - This is the canonical handoff from Fabric contracts into required Storybook stories.
18. Run readiness gate (recommended):
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
STAGE 4
19. Start implementation state:
    - `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json`
20. Generate implementation artifacts:
    - `./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json`
    - Orchestrator note: when using `orchestrator:run-until-blocked`, Step 20 now runs `npm install` automatically before `npm test` and `npm run build`.
20a. Generate or update Storybook stories for the implemented slice:
    - `./fabric/company/v1/fabric coder:generate-current-slice-stories --target . --values ./fabric.values.json`
    - This writes `src/stories/slices/<SLICE_ID>/` and ensures Storybook package scripts, dependencies, and `.storybook/` config exist when `package.json` is present.
20b. Validate in app and Storybook manually:
    - `npm install` (manual/direct command flow; orchestrator Step 20 already auto-runs this before verification)
    - `npm run dev`
    - `npm run storybook`
    - Review the slice stories under `src/stories/slices/<SLICE_ID>/` against the screen, component, copy, and visual-state contracts.
20c. Build Storybook before review/closeout:
    - `npm run build-storybook`
21. Run Storybook contract review:
    - `./fabric/company/v1/fabric uiux:review-current-slice-storybook --target . --values ./fabric.values.json`
    - This must pass before semantic UX review and slice closeout.
21a. If Storybook review fails, repair stories/components/contracts and rerun Steps 20a, 20c, and 21.
21b. Run semantic UX review:
    - `./fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ./fabric.values.json`
    - Orchestrator note: when using `orchestrator:run-until-blocked`, a semantic-review `fail` no longer hard-blocks; the flow proceeds to Step 21c automatically.
    - Availability note: if the semantic UX LLM reviewer is unavailable (`llm_review_unavailable`), orchestrator retries Step 21b once with `SEMANTIC_UX_LLM_ENABLED=false` and `SEMANTIC_UX_LLM_REQUIRED=false` for deterministic fallback, then continues based on that result.
21c. If semantic UX review fails, generate and run the Codex repair work order:
    - `./fabric/company/v1/fabric coder:repair-semantic-ux-findings --target . --values ./fabric.values.json --include-warnings`
    - Default recommendation is to include warnings so the remediation pass is comprehensive.
    - Then rerun Step 21b until the review passes.
21d. Run tester checklist validation:
    - `./fabric/company/v1/fabric tester:validate-current-slice --target . --values ./fabric.values.json`
    - This updates `docs/testing/<SLICE_ID>-user-checklist.md` and writes tester review artifacts under `docs/reviews/testing/`.
21e. If manual review fails, generate and run the implementation repair work order:
    - `./fabric/company/v1/fabric coder:repair-implementation-findings --target . --values ./fabric.values.json`
    - Then rerun tests/build/doctor, Storybook build/review, semantic UX review, and manual checklist review.
22. Close current slice:
    - `./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json`
    - `./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json --allow-semantic-ux-fail`

23. Run readiness gate:
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
24. Advance to next slice:
    - `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json`
25. Run gate again:
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
26. For each remaining slice, execute Steps 16-25 in order.
    - Re-run Step 13 (`uiux:generate-design-system`) only when the product-level visual grammar, component vocabulary, UX tone, or status model intentionally changes.
    - Re-run Step 14 (`db:init`) only when DB baseline/scripts require refresh.
    - Re-run Step 15 (`db:check`) after DB/env/script changes and before proceeding.

## Detailed Step logic

### Stage 1: Intake and brief gate

#### Step 1 (optional): `reset-to-fabric-only`

- Command:
  - `bash scripts/reset-to-fabric-only.sh --yes --also-values`
- What it does:
  - Resets the repo to a fabric-only baseline by deleting generated outputs.
  - With `--also-values`, also removes `fabric.values.json` / `fabric.values.yaml`.
  - Keeps `fabric/company/v1` intact and prints recovery next steps.

#### Step 2: `init-factory`

- Command:
  - `./fabric/company/v1/fabric init-factory --target . --values ./fabric.values.json --init-values`
- What it does:
  - Generates factory-init artifacts (`.agents/*`, `docs/factory/*`, and bootstrap customer-input stub).
  - With `--init-values`, initializes `fabric.values.json` from `fabric.values.example.json`.
- Safety behavior:
  - Refuses to overwrite non-generated files unless `--force`.

#### Step 3: `pm:intake`

- Command:
  - `./fabric/company/v1/fabric pm:intake --target .`
- What it does:
  - Scans `docs/customer-input/*` for supported source files (`.pdf`, `.md`, `.txt`, `.json`).
  - Extracts normalized text into `docs/pm/intake/extracted-text/*.txt`.
  - Writes `docs/pm/intake/sources.json` and `docs/pm/intake/intake-report.md`.
- Failure behavior:
  - Exits non-zero if input directory is missing, no supported files are present, or no usable text can be extracted.

#### Step 4: `pm:brief-readiness`

- Command:
  - `./fabric/company/v1/fabric pm:brief-readiness --target .`
- What it does:
  - Reads evidence from `docs/customer-input/*` plus optional `docs/product/intake-note.md`.
  - Writes `docs/reviews/product-manager/brief-readiness-review.md`.
  - Evaluates whether inputs are sufficient to proceed to drafting.
- When to use:
  - Run immediately after `pm:intake`.
- Failure behavior:
  - Writes `docs/reviews/product-manager/customer-information-request.md`.
  - Exits non-zero and prints requested customer inputs.

#### Step 5: `pm:brief-draft`

- Command:
  - `./fabric/company/v1/fabric pm:brief-draft --target .`
- What it does:
  - Performs the explicit draft step after readiness and ensures the project brief draft is in place.

#### Step 6: `pm:brief-approve`

- Command:
  - `./fabric/company/v1/fabric pm:brief-approve --target .`
- What it does:
  - Marks brief approved (`Brief Approval Status: approved`).

#### Step 7: `pm:derive-values`

- Command:
  - `./fabric/company/v1/fabric pm:derive-values --target .`
- What it does:
  - Derives/updates `fabric.values.json` from approved brief content.
  - Creates `fabric.values.json` when it does not already exist.

#### Step 8: `format-from-brief`

- Command:
  - `./fabric/company/v1/fabric format-from-brief --target .`
- What it does:
  - Validates approved brief is present.
  - Validates minimum input sufficiency (`intake-note` or customer-input docs).
  - Does not write generation outputs.

### Stage 2: Bootstrap to delivery mode + environment baseline

#### Step 9: `scaffold`

- Command:
  - `./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json`
- What it does:
  - Renders scaffold entries from manifest source-of-truth.
  - Validates required tokens/template coverage before write.
  - Explicitly excludes planning-owned/customer-derived artifacts:
    - `docs/product/product-system-framing.md`
    - `docs/product/backlog.yaml`
    - `docs/product/current-slice.yaml`
  - Prints generated file count + paths.
  - Does not call an LLM.
- Safety behavior:
  - Refuses to overwrite non-generated files unless `--force`.

#### Step 10: `pm:plan-slices`

- Command:
  - `./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json`
- What it does:
  - Requires `.system/project-manifest.yaml` and approved brief.
  - Generates 5-8 initial slices (model-driven by default, heuristic fallback on failure, `--heuristic` to force deterministic).
  - Includes optional `docs/product/product-system-framing.md` context when present in model-driven mode.
  - Rewrites:
    - `docs/product/backlog.yaml`
    - `docs/product/current-slice.yaml`
  - Updates `.system/project-manifest.yaml` status fields (`active_slice`, `active_slice_state`, `active_milestone`, `last_updated_utc`).
  - Prints planned slice count, active slice, and planning mode (`model_driven|heuristic_fallback|heuristic`).
- Option rule:
  - `--model-driven` and `--heuristic` together is invalid.

#### Step 11: `pm:finalize-bootstrap-reviews`

- Command:
  - `./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json`
- What it does:
  - Deterministically regenerates two review docs:
    - `docs/reviews/product-manager/bootstrap-foundation-review.md`
    - `docs/reviews/product-manager/bootstrap-backlog-slice-review.md`
  - Foundation review checks: `.system/project-manifest.yaml`, `.system/artifact-registry.yaml`, `.system/workflow-rules.yaml`.
  - Backlog/slice review checks:
    - `docs/product/backlog.yaml` exists and has slices.
    - `docs/product/current-slice.yaml` includes id/title/objective.
    - backlog/current-slice are placeholder-free.
    - current slice is present in backlog.
  - Sets each assessment to `approved` or `needs_revision` based on artifact checks.
- Important:
  - Do not manually pre-edit these reviews as the primary workflow; this command is the source of truth for review content.

#### Step 12: `pm:bootstrap-signoff`

- Command:
  - `./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json`
- What it does:
  - Requires `.system/project-manifest.yaml` and `docs/product/current-slice.yaml`.
  - Validates finalized bootstrap review docs are present, placeholder-free, and `Assessment: approved`.
  - Fails with recovery guidance when either review is still draft/needs revision.
  - Requires current slice to have `id`, `status`, and `milestone`.
  - Transitions manifest to delivery mode:
    - `operating_model.bootstrap_status = completed`
    - `operating_model.bootstrap_completed_at_utc = now`
    - `operating_model.current_mode = delivery`
    - `status.active_slice`, `status.active_slice_state`, `status.active_milestone`
    - `status.approved_reviews` (merged unique review paths)
    - top-level `last_updated_utc`

#### Step 13: `uiux:generate-design-system`

- Command:
  - `./fabric/company/v1/fabric uiux:generate-design-system --target . --values ./fabric.values.json`
- What it does:
  - Generates the global UI/UX design-system contract after bootstrap signoff and before slice delivery.
  - Writes product-level design-system artifacts:
    - `docs/design-system/tokens.json`
    - `docs/design-system/components.json`
    - `docs/design-system/component-usage-rules.md`
    - `docs/design-system/visual-states.md`
  - Preserves existing artifacts by default. Use `--force` only when intentionally regenerating the product-level visual grammar, component vocabulary, UX tone, or status model.
- Why it is in the canonical flow:
  - Establishes the product interaction/visual baseline before DB readiness and before active-slice UX/coding work.

#### Step 14: `db:init`

- Command:
  - `./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json`
- What it does:
  - Validates tokens against manifest/template usage.
  - Validation scope is manifest-wide token coverage, not only DB-target files.
  - Renders DB/env artifacts:
    - `supabase/config.toml`
    - `supabase/seed.sql`
    - `.env.example`
  - Ensures `package.json` exists (creates minimal one when missing).
  - Upserts required DB scripts in `package.json`.
- Operator follow-up:
  - Run `./fabric/company/v1/fabric db:check --target .` immediately after this step before Stage 3 commands.

#### Step 15: `db:check`

- Command:
  - `./fabric/company/v1/fabric db:check --target .`
- What it does:
  - Verifies DB required files, required env keys in `.env.example`, required package scripts, and Supabase CLI availability.
- Why it is in the canonical flow:
  - Confirms DB baseline readiness deterministically before moving into Stage 3 delivery-prep commands.

### Stage 3: Delivery preparation

#### Step 16: `architect:generate-current-slice-baseline`

- Command:
  - `./fabric/company/v1/fabric architect:generate-current-slice-baseline --target . --values ./fabric.values.json`
- What it does:
  - Requires `docs/product/current-slice.yaml`.
  - Reads active slice + optional brief/framing context.
  - Generates `docs/architecture/<SLICE_ID>-baseline.md` (model-driven when available, heuristic fallback otherwise).
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Prints baseline mode (`model_driven|heuristic_fallback`) and written paths.
  - Does not mutate backlog/current-slice/manifest.

#### Step 17: `uiux:generate-current-slice-flow`

- Command:
  - `./fabric/company/v1/fabric uiux:generate-current-slice-flow --target . --values ./fabric.values.json`
- What it does:
  - Requires `docs/product/current-slice.yaml`.
  - Requires `docs/architecture/<SLICE_ID>-baseline.md`; run `architect:generate-current-slice-baseline` first.
  - Reads active slice + architecture baseline + optional brief/framing context.
  - Writes `docs/ux/<SLICE_ID>-current-slice-flow.md` (model-driven with fallback).
  - Writes `docs/ux/<SLICE_ID>-semantic-ux-contract.json`.
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Prints UX mode (`model_driven|heuristic_fallback`) and written paths.
  - Does not mutate backlog/current-slice/manifest.

#### Step 17b: `uiux:generate-storybook-map`

- Command:
  - `./fabric/company/v1/fabric uiux:generate-storybook-map --target . --values ./fabric.values.json`
- What it does:
  - Requires the global design-system artifacts from Step 13 and the active-slice UX contracts from Step 17.
  - Writes `docs/design-system/storybook-map.md`.
  - Writes `docs/storybook/<SLICE_ID>-story-requirements.json`.
  - Converts Fabric screen, component, copy, and visual-state contracts into required Storybook paths/states.
- Why it is in the canonical flow:
  - This is the formal handoff from Fabric contracts into executable Storybook validation.
  - Run it after every slice UX-contract change and before story generation.

#### Step 18: `gate` (required before implementation)

- Command:
  - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
- What it does:
  - Runs `validate` then `doctor`.
  - `validate` checks token completeness + generated artifact drift.
  - `doctor` checks governance coherence (manifest/backlog/current-slice alignment), placeholder integrity, delivery review state, and DB readiness requirements.
  - Fails on drift, placeholder/governance inconsistencies, or DB readiness issues.
- Next-step guidance behavior:
  - CLI suggestions after `gate` are context-aware (active slice status + artifact presence).
  - For a planned slice, once baseline/UX/Storybook prerequisites are present, `gate` must pass before `coder:prepare-current-slice` is suggested.

### Stage 4: Per-slice implementation loop

Before each slice implementation loop, ensure the active slice baseline + UX are refreshed (step 16 and step 17).

#### Step 19: `coder:prepare-current-slice`

- Command:
  - `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires active `current-slice`, baseline, slice UX flow (with legacy migration fallback for `docs/ux/current-slice-flow.md`), and semantic UX contract.
  - Verifies placeholder-free baseline + UX.
  - Derives implementation target patterns from slice scope/title.
  - Writes `docs/implementation/<SLICE_ID>-implementation-notes.md`.
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Transitions active slice to implementation (`status: in_progress`, milestone `<SLICE_ID>_implementation`) in backlog/current-slice/manifest.

#### Step 20: `coder:implement-current-slice`

- Command:
  - `./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires current slice, baseline, UX flow, semantic UX contract, and implementation notes (legacy fallback for `docs/implementation/current-slice-notes.md`).
  - Supports two model output modes:
    - `source_files`: model returns concrete file outputs (`path + content`) and fabric writes them directly.
    - `playbook`: model returns implementation guidance and fabric fills deterministic source templates.
  - Default output mode behavior:
    - default is `source_files` (Codex-compatible authoring path).
    - set `coder_llm_output_mode: playbook` only when you explicitly want template-fill behavior.
  - You can override with `coder_llm_output_mode` (`source_files|playbook`) in `fabric.values.json`.
  - App-shell overwrite guard is strict by default: `src/App.jsx` is protected unless you intentionally set `coder_allow_app_shell_mutation: true` (or `CODER_ALLOW_APP_SHELL_MUTATION=true`) for a specific run.
  - On model failure, uses deterministic fallback.
  - Writes app artifacts under `index.html`, `src/*`, and `tests/*` (including slug bridge files for non-onboarding slices in deterministic fallback mode).
  - Ensures React/Vite and Storybook package scripts/dependencies/config baseline.
  - Enforces incremental behavior: implementation should extend the existing app and preserve previously working user-visible actions unless the active slice explicitly redefines them.
  - Preserves existing shared global styling during scaffold reinforcement; slice implementation must reuse existing shell/class conventions rather than replace them.
  - Injects carry-forward invariants from previously passed slice checklists into the implementation work order.
  - Requires a slice-local carry-forward regression test file under `tests/<slice-slug>/carry-forward-invariants.test.mjs` when prior passed-slice invariants exist.
  - Rewrites implementation notes with changed files and execution summary.
- What it does not do:
  - Does not transition slice status to completed.
  - Does not run `npm install`, `npm run dev`, or tests automatically.

#### Step 20a: `coder:generate-current-slice-stories`

- Command:
  - `./fabric/company/v1/fabric coder:generate-current-slice-stories --target . --values ./fabric.values.json`
- What it does:
  - Requires `docs/storybook/<SLICE_ID>-story-requirements.json`; run Step 17b first.
  - Writes/updates `src/stories/slices/<SLICE_ID>/fixtures.ts`.
  - Writes/updates `src/stories/slices/<SLICE_ID>/<SLICE_ID>.stories.tsx`.
  - Writes/updates `src/stories/slices/<SLICE_ID>/README.md`.
  - Ensures Storybook package scripts, dependencies, and `.storybook/` config exist when `package.json` is present.
  - Fails the command when required `Product/*` or `Screens/*` stories still resolve to placeholder surfaces (`ComponentFallback` / `ContractSurface`).
- Why it is in the canonical flow:
  - Every user-facing slice must have executable Storybook coverage before UX review and closeout.

#### Step 20b: Test in UI and Storybook manually

- Commands:
  - `npm install`
  - `npm run dev`
  - `npm run storybook`
- Goal:
  - Validate active slice behavior from a customer perspective in the app and validate component/screen states against Fabric contracts in Storybook.
  - You should not need to run `npx storybook init`; Fabric creates the Storybook framework config and dependencies.

#### Step 20c: Build Storybook

- Command:
  - `npm run build-storybook`
- Goal:
  - Ensure Storybook compiles before the Fabric Storybook review and closeout gates.

#### Step 21: `uiux:review-current-slice-storybook`

- Command:
  - `./fabric/company/v1/fabric uiux:review-current-slice-storybook --target . --values ./fabric.values.json`
- What it does:
  - Requires `docs/design-system/storybook-map.md`.
  - Requires `docs/storybook/<SLICE_ID>-story-requirements.json`.
  - Checks required Storybook files, package scripts, required states, statuses, priorities, components, and screens.
  - Fails if component stories collapse into one identical render mapping (for example, every `Product/*` story rendering the same route surface).
  - Writes `docs/reviews/storybook/<SLICE_ID>-storybook-review.json`.
  - Writes `docs/reviews/storybook/<SLICE_ID>-storybook-review.md`.
- Gate behavior:
  - Exits non-zero on blocker findings.
  - `coder:close-current-slice` refuses to close if this review is missing or failed.

#### Step 21b: `uiux:review-current-slice-semantics`

- Command:
  - `./fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ./fabric.values.json`
- What it does:
  - Requires active `current-slice` and `docs/ux/<SLICE_ID>-semantic-ux-contract.json`.
  - Runs a deterministic scan over likely user-visible strings only (for example JSX text nodes and visible props like `aria-label`, `title`, `alt`, and `placeholder`), not arbitrary raw source code.
  - Runs an LLM-based semantic UX reviewer against the contract, UX flow, brief/framing context, and implementation source context.
  - Writes machine-readable and human-readable review artifacts under `docs/reviews/ux/`.
- What it catches:
  - User-visible placeholder/filler copy.
  - Internal workflow, schema, routing, testing, slice, ranking, bucket, or implementation language in visible UI.
  - Malformed dates/statuses, raw enum values, `undefined`, `null`, `NaN`, `Invalid Date`, and `[object Object]`.
  - Sections that exist structurally but fail their user-facing semantic purpose.
- Configuration:
  - LLM review is required by default. Set `SEMANTIC_UX_LLM_REQUIRED=false` or `semantic_ux_llm_required: false` only as an explicit local fallback.
  - To disable the LLM reviewer entirely, set `SEMANTIC_UX_LLM_ENABLED=false` or `semantic_ux_llm_enabled: false`; if required remains true, the gate fails.
- Gate behavior:
  - Exits non-zero on blocker findings.
  - For deterministic findings, only high-confidence likely-visible issues block closeout; uncertain source-only heuristics are warnings.
  - `coder:close-current-slice` refuses to close if this review is missing or failed.
  - On failure, print `coder:repair-semantic-ux-findings` as the next repair command.

#### Step 21c: `coder:repair-semantic-ux-findings`

- Command:
  - `./fabric/company/v1/fabric coder:repair-semantic-ux-findings --target . --values ./fabric.values.json`
  - Optional: `--include-warnings` to include warning findings in the repair work order.
- What it does:
  - Requires active `current-slice`, semantic UX review JSON/Markdown, semantic UX contract, and implementation notes.
  - Refuses to run when the semantic UX review already passes.
  - Selects blocker findings by default; warning findings are selected only with `--include-warnings`.
  - Writes `docs/implementation/<SLICE_ID>-semantic-ux-repair-work-order.md`.
  - Runs Codex with a targeted repair brief generated from the review findings.
  - Updates `.system/factory/execution-ledger.jsonl` with `semantic_ux_repair` events.
  - Updates `docs/implementation/<SLICE_ID>-implementation-notes.md` with repair evidence and changed files.
- Guardrails:
  - Does not edit or waive semantic review files.
  - Does not change Fabric runtime files.
  - Uses a repair path policy: slice-local files, dependency slice surfaces, standard shared integration files, implementation notes, and files explicitly referenced by findings.
- After running:
  - Inspect the diff.
  - Rerun `uiux:review-current-slice-semantics`.
  - Repeat repair/review until semantic UX review passes.

#### Step 21d: `tester:validate-current-slice`

- Command:
  - `./fabric/company/v1/fabric tester:validate-current-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires active `current-slice`, semantic UX review `pass`, checklist, semantic contract, and implementation notes.
  - Runs an LLM tester over checklist expectations and implementation evidence.
  - Inherits prior passed-slice capabilities from earlier checklists and enforces preservation.
  - Requires carry-forward regression evidence in `tests/<current-slice-slug>/carry-forward-invariants.test.mjs` when prior passed slices exist.
  - Writes `docs/reviews/testing/<SLICE_ID>-validation-report.json`.
  - Writes `docs/reviews/testing/<SLICE_ID>-validation-report.md`.
  - Updates `docs/testing/<SLICE_ID>-user-checklist.md`:
    - `Status: Pass` when no findings remain.
    - `Status: Fail` plus structured `## Manual QA Findings` when repair is needed.
- Gate behavior:
  - Exits non-zero on findings and prints `coder:repair-implementation-findings` as next step.
  - `coder:close-current-slice` still requires checklist `Pass`.

#### Step 21e: `coder:repair-implementation-findings`

- Command:
  - `./fabric/company/v1/fabric coder:repair-implementation-findings --target . --values ./fabric.values.json`
- What it does:
  - Requires active `current-slice`, user checklist, UX flow, semantic UX contract, and implementation notes.
  - Refuses to run when the checklist is Pass.
  - Refuses to run when the checklist is Pending/unresolved.
  - Requires `Status: Fail` plus at least one populated manual QA finding.
  - Writes `docs/implementation/<SLICE_ID>-implementation-repair-work-order.md`.
  - Runs Codex with a targeted repair brief generated from the manual QA finding(s).
  - Updates `.system/factory/execution-ledger.jsonl` with `implementation_repair` events.
  - Updates `docs/implementation/<SLICE_ID>-implementation-notes.md` with repair evidence and changed files.
- Guardrails:
  - Does not mark the checklist Pass; the human reviewer owns acceptance.
  - Does not change Fabric runtime files.
  - Uses a repair path policy for active-slice files, tests, shared integration points, implementation notes, and relevant product/UX/checklist artifacts.
- After running:
  - Inspect the diff.
  - Run `npm test`, `npm run build`, `doctor`, and `uiux:review-current-slice-semantics`.
  - Repeat manual checklist review.
  - Mark `Status: Pass` only after acceptance.

#### Step 22: `coder:close-current-slice`

- Command:
  - `./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json`
  - Manual override (semantic UX gate only): `./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json --allow-semantic-ux-fail`
- What it checks:
  - Required artifacts exist (slice/backlog/baseline/UX/semantic UX contract/Storybook review/semantic UX review/notes/checklist/package scripts).
  - Current slice contains acceptance criteria.
  - Checklist exists for current slice and reports pass.
  - Storybook review exists and reports pass.
  - Semantic UX review exists and reports pass (or you intentionally use `--allow-semantic-ux-fail` for manual override).
  - Placeholder-free closeout docs.
  - Implementation artifacts exist under expected source/test locations for every required target path.
  - Carry-forward regression evidence exists for prior passed-slice invariants (`tests/<slice-slug>/carry-forward-invariants.test.mjs`) and references the relevant prior slice IDs.
  - When prior passed slices require onboarding entry visibility, default runtime entry (`src/main.*` mount path) must still route to an onboarding-capable surface unless explicitly overridden in the current slice checklist with: `Carry-forward override: onboarding default entry`.
  - If implementation notes have stale or incomplete changed-file evidence but required artifacts exist on disk, closeout reconciles the notes automatically instead of failing on documentation drift.
- On success:
  - Marks implementation notes `Completed` and refreshes changed-file evidence from the verified filesystem artifacts.
  - Marks slice `completed` in backlog/current-slice.
  - Updates manifest active slice state/milestone and timestamp.

#### Step 23: `gate` (pre-advance)

- Command:
  - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
- Purpose:
  - Catch drift/coherence regressions before advancing the pointer.

#### Step 24: `orchestrator:advance-slice`

- Command:
  - `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires current slice status `completed`.
  - Activates next non-completed slice as `planned`.
  - Rewrites backlog/current-slice and updates manifest active pointers.
  - If no actionable next slice exists, exits OK with no file changes.

#### Step 25: `gate` (post-transition)

- Command:
  - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
- Purpose:
  - Validate post-transition state before starting next slice.

## Model invocation layer

This bundle supports provider-agnostic model invocation for intake, planning, architecture, UX, and coder implementation.

### Supported providers

- `openai` via direct HTTPS to the OpenAI Responses API (no SDK install required)
- `stdio_json` for a local wrapper process that accepts JSON on stdin and returns JSON on stdout

### Setup

0. (Optional, recommended for factory-global defaults) create `fabric/company/v1/.factory.env`.
   - This file is auto-loaded by fabric runtime on each command.
   - It only sets env vars that are not already defined in your shell.
   - `fabric.values.json` still overrides env values when both exist.
1. Export API key:
   - `export OPENAI_API_KEY=...`
2. Enable the desired model profile(s) in `fabric.values.json`:
   - global toggle: `llm_enabled: true`
   - per-purpose toggles (optional override): `brief_draft_llm_enabled`, `pm_llm_enabled`, `planning_llm_enabled`, `architect_llm_enabled`, `uiux_llm_enabled`, `coder_llm_enabled`
   - tester profile toggles (optional override): `tester_llm_enabled`, `tester_llm_provider`, `tester_llm_model`, `tester_llm_api_key_env`
   - semantic UX gate controls (optional): `semantic_ux_llm_enabled`, `semantic_ux_llm_required`
   - coder output mode (optional override): `coder_llm_output_mode: source_files|playbook`
   - coder app-shell mutation guard (optional): `coder_allow_app_shell_mutation: false` (recommended default)
3. (Optional) configure quality gates/retries:
   - `brief_draft_llm_brief_quality_gate: true`
   - `brief_draft_llm_brief_retry_count: 1`
   - `brief_draft_llm_semantic_clarity_gate: true` (alias: `brief_draft_llm_semantic_scope_gate`)
4. Validate config:
   - `./fabric/company/v1/fabric llm:check --target . --values ./fabric.values.json`

Coder source-file authoring via local Codex-compatible stdio bridge:
- Set coder profile to `stdio_json`.
- Set `coder_llm_output_mode` to `source_files`.
- Provide bridge command fields:
  - `coder_llm_stdio_command`
  - `coder_llm_stdio_args`
- Factory-global alternative (recommended):
  - Put env keys in `fabric/company/v1/.factory.env` instead of each project `fabric.values.json`.
  - Default bridge script provided: `fabric/company/v1/runtime/lib/llm/codex-stdio-bridge.mjs`.
  - Recommended env pair:
    - `CODER_LLM_STDIO_COMMAND=node`
    - `CODER_LLM_STDIO_ARGS=fabric/company/v1/runtime/lib/llm/codex-stdio-bridge.mjs`
  - Recommended timeout override for source-file generation:
    - `CODER_LLM_TIMEOUT_MS=600000`
  - Optional CLI live trace (shows raw Codex progress/error stream):
    - `CODER_LLM_STDIO_TRACE=true`
  - If `codex` is not on PATH, set `CODEX_BIN=/absolute/path/to/codex`.
  - Ensure Codex CLI is authenticated once (`codex login`).


### Semantic UX review model behavior

The semantic UX gate uses two layers:

1. A deterministic scanner for obvious user-visible failures such as placeholders, raw values, malformed dates/statuses, and internal/factory language leaks.
2. An LLM reviewer that evaluates whether implemented user-facing behavior and copy satisfy the slice's semantic UX contract.

The reviewer first tries the `uiux` model profile, then `review`, `coder`, `planning`, and `intake` profiles. If no valid model profile is available and semantic review is required, the gate fails rather than silently allowing a slice to close.

Relevant configuration options:

- `semantic_ux_llm_enabled: true|false` or `SEMANTIC_UX_LLM_ENABLED=true|false`
- `semantic_ux_llm_required: true|false` or `SEMANTIC_UX_LLM_REQUIRED=true|false`
- `uiux_llm_enabled`, `uiux_llm_provider`, `uiux_llm_model`, `uiux_llm_api_key_env` for the preferred reviewer profile

Default behavior: LLM semantic review is enabled and required. Use `semantic_ux_llm_required: false` only for intentional local fallback, not as the normal delivery standard.

When semantic review fails, use `coder:repair-semantic-ux-findings` rather than hand-writing ad hoc Codex prompts. The repair command turns review findings into a consistent work order, keeps blockers/warnings explicit, and records the repair cycle in the execution ledger.

### Brief drafting model outputs (`pm:brief-draft`)

With brief drafting model invocation enabled, `pm:brief-draft` writes:

- `docs/product/source-evidence-pack.md`
- `docs/product/source-synthesis.md`
- `docs/product/product-system-framing.md`
- `docs/product/project-brief.md`
- `docs/reviews/product-manager/brief-clarity-review.md`
- `docs/reviews/product-manager/brief-clarity-ledger.md`
- `docs/reviews/product-manager/brief-attempt-<n>.md`

The brief drafting flow runs in constrained model passes: source synthesis, product framing, then brief authoring.

## UI/UX design-system maturity upgrade

This fabric version includes a model-based UI/UX upgrade. The UI/UX agent now owns both current-slice interaction contracts and a reusable design-system contract.

New command:

```bash
./fabric/company/v1/fabric uiux:generate-design-system --target . --values ./fabric.values.json
```

This creates or preserves:

- `docs/design-system/tokens.json`
- `docs/design-system/components.json`
- `docs/design-system/component-usage-rules.md`
- `docs/design-system/visual-states.md`

`uiux:generate-current-slice-flow` now also writes:

- `docs/ux/<SLICE_ID>-interaction-model.json`
- `docs/ux/<SLICE_ID>-screen-contract.json`
- `docs/ux/<SLICE_ID>-component-contract.json`
- `docs/ux/<SLICE_ID>-copy-contract.json`

The coder preparation and implementation steps now require these artifacts for user-facing slices. The semantic UX review also checks for design-system contract presence and warns about likely drift such as ad-hoc visual values, missing required component usage, and raw colors/styles.

Recommended user-facing slice sequence:

```bash
./fabric/company/v1/fabric uiux:generate-design-system --target . --values ./fabric.values.json
./fabric/company/v1/fabric architect:generate-current-slice-baseline --target . --values ./fabric.values.json
./fabric/company/v1/fabric uiux:generate-current-slice-flow --target . --values ./fabric.values.json
./fabric/company/v1/fabric gate --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ./fabric.values.json
./fabric/company/v1/fabric tester:validate-current-slice --target . --values ./fabric.values.json
```

## Storybook integration for UI/UX contract validation

Storybook is now integrated as the executable validation surface for Fabric design-system and slice UX contracts. Fabric remains the source of truth; Storybook stories make the contracts visible, reviewable, and testable.

### New commands

- `uiux:generate-storybook-map --target <project-root> [--values fabric.values.json]`
  - Generates `docs/design-system/storybook-map.md` and `docs/storybook/{slice_id}-story-requirements.json` from the current slice design-system, screen, component, and copy contracts.
- `coder:generate-current-slice-stories --target <project-root> [--values fabric.values.json]`
  - Generates or refreshes `src/stories/slices/{slice_id}/fixtures.ts`, `{slice_id}.stories.tsx`, and `README.md`.
  - Uses real component and route modules when discovered.
  - Fails when required paths still bind to placeholder surfaces; implement/export the missing surfaces (or update contracts) before proceeding.
  - Adds `dev`, `storybook`, `build-storybook`, and `test:storybook` scripts plus React/Vite/Storybook dependencies and `.storybook/` config when `package.json` exists.
- `uiux:review-current-slice-storybook --target <project-root> [--values fabric.values.json]`
  - Writes `docs/reviews/storybook/{slice_id}-storybook-review.json` and `.md`.
  - Fails when stories, map, scripts, required components, screens, states, statuses, or priorities are missing.

### Updated slice workflow

After implementation, run:

```bash
./fabric/company/v1/fabric coder:generate-current-slice-stories --target . --values ./fabric.values.json
./fabric/company/v1/fabric uiux:review-current-slice-storybook --target . --values ./fabric.values.json
./fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ./fabric.values.json
./fabric/company/v1/fabric tester:validate-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json
```

`coder:close-current-slice` now requires the Storybook review artifact to exist and have `status: pass` before the slice can close.

### CI expectation

At minimum, app repos should run:

```bash
npm run build
npm run build-storybook
npm run test
npm run test:storybook
```

The deterministic Fabric review checks contract coverage. It does not replace visual review or a real Storybook build.


## Troubleshooting


### Brief generation timeout tuning

`product:format-from-brief` uses an LLM call to normalize customer input into `docs/product/project-brief.md`.
The default idle timeout is 300 seconds. For slower local providers or larger inputs, override it in `fabric.values.json`:

```json
{
  "brief_draft_llm_timeout_ms": 300000,
  "brief_draft_llm_max_context_chars": 30000,
  "brief_draft_llm_max_sources": 6
}
```

You can also set `BRIEF_DRAFT_LLM_TIMEOUT_MS` in the shell. If a timeout happens, inspect `.llm-logs/*-project_brief-*.md` and `.llm-logs/*-project_brief-*.json`, then rerun `product:format-from-brief`.
