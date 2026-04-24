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

- `pm:brief-readiness --target <project-root> [--values fabric.values.json]`
  - What it does: runs Product Manager brief-readiness content gate, reads every readable file under `docs/customer-input/*` plus `docs/product/intake-note.md` (when present), writes `docs/reviews/product-manager/brief-readiness-review.md`, and generates a synthesized first draft `docs/product/project-brief.md` from the template structure when input coverage is sufficient and brief does not already exist.
  - When to use: after customer input is placed and before brief refinement/approval.
  - Benefit: turns step 6 into an explicit, repeatable command with a persisted decision artifact.
  - Gate rule: blocking coverage is required for problem/outcome, target users, and MVP scope, plus no unreadable evidence files and sufficient readable content volume. Missing constraints/non-negotiables is treated as a warning (non-blocking). `docs/customer-input/README.md` does not count as evidence.
  - Failure behavior: on fail, the command now writes `docs/reviews/product-manager/customer-information-request.md` with concrete requested customer inputs, prints those requests in terminal, and points to the full readiness review note.

- `pm:brief-semantic-check --target <project-root> [--values fabric.values.json] [--brief <path>]`
  - What it does: runs a semantic-only clarity recheck against an operator-edited brief (default `docs/reviews/product-manager/project-brief.failed.md`) and appends findings/fixes/suggestions to `docs/reviews/product-manager/brief-clarity-review.md` under `Post-Edit Semantic Validation Runs`.
  - When to use: after manually editing a failed brief draft and before deciding to promote it or re-run intake generation.
  - Exit behavior: returns `0` when semantic findings are clear; returns `1` when findings remain or required inputs are missing.

- `pm:approve-brief --target <project-root> [--values fabric.values.json]`
  - What it does: sets `Brief Approval Status: approved` in `docs/product/project-brief.md`, derives/updates `fabric.values.json` from the approved brief content, and attempts Architect LLM consultation to fill unresolved default planning/architecture values (using `team/architect.md` + `docs/product/product-system-framing.md` when available).
  - When to use: immediately after customer approval of the project brief.
  - Benefit: combines brief approval and value-token derivation into one explicit transition command.
  - Creation behavior: if `fabric.values.json` does not exist, this command now creates it with neutral defaults + machine-readable `defaulted_fields`, then overlays brief-derived values.

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

- `architect:finalize-baseline --target <project-root> [--values fabric.values.json]`
  - What it does: generates a slice-specific `docs/architecture/baseline.md` for the active slice from current slice state, project brief, and product-system framing.
  - When to use: after `pm:plan-slices` and before implementation of the active slice.
  - Benefit: turns the architecture baseline from a generic template into implementation-ready structural guidance.

- `uiux:finalize-current-slice-flow --target <project-root> [--values fabric.values.json]`
  - What it does: generates a slice-specific `docs/ux/<SLICE_ID>-current-slice-flow.md` for the active slice from current slice state, project brief, and product-system framing.
  - When to use: after `pm:plan-slices` and before implementation of user-facing slices.
  - Benefit: turns the UX flow artifact from a generic template into implementation-ready interaction guidance.

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

- `db:seed --target <project-root>`
  - What it does: executes configured seed command after validating seed artifact presence.
  - When to use: after schema apply/reset when baseline data is needed for smoke/review flows.
  - Benefit: consistent seed workflow across projects.

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
3. Minimum input gate: at least one source must exist (`docs/product/intake-note.md` or one/more files in `docs/customer-input/*`).
4. Product Manager evaluates whether available input is sufficient to draft a reliable brief.
5. If insufficient, Product Manager requests additional customer information before brief drafting continues.
6. If sufficient, Product Manager synthesizes available inputs into `docs/product/project-brief.md`.
7. Customer and Product Manager refine the brief.
8. Brief approval gates generation flow (`format-from-brief` then `scaffold` + `pm:plan-slices`).
>> Flow now reflects project-brief -> scaffold -> planning -> execution.

Artifact lifecycle policy:

- `docs/customer-input/*`: source evidence. Prefer append/update with traceability; avoid destructive overwrite.
- `docs/product/intake-note.md`: PM synthesis of problem, goals, constraints, and open questions.
- `docs/product/project-brief.md`: living contract during refinement; baseline contract once approved.

## Canonical Flow (Single Source of Truth)

This is the only canonical end-to-end sequence. It matches the current runtime behavior.

### Command sequence from a clean fabric state

STAGE 1
1. (Optional, repo-specific) reset to fabric-only:
   - `bash scripts/reset-to-fabric-only.sh --yes --also-values`
2. Initialize factory:
   - `./fabric/company/v1/fabric init-factory --target . --values ./fabric.values.json --init-values`
3. Build/review brief readiness:
   - `./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json`
4. Approve brief and derive values:
   - `./fabric/company/v1/fabric pm:approve-brief --target . --values ./fabric.values.json`
5. Gate before scaffold:
   - `./fabric/company/v1/fabric format-from-brief --target .`
STAGE 2
6. Generate bootstrap/governance artifacts:
   - `./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json`
7. Generate initial backlog/current-slice:
   - `./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json`
8. Finalize bootstrap reviews:
   - `./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json`
9. Bootstrap signoff into delivery mode:
   - `./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json`
10. Initialize DB baseline:
    - `./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json`
STAGE 3
11. Generate architecture baseline for active slice:
    - `./fabric/company/v1/fabric architect:finalize-baseline --target . --values ./fabric.values.json`
12. Generate UX flow for active slice:
    - `./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target . --values ./fabric.values.json`
13. Run readiness gate (recommended):
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
STAGE 4
14. Start implementation state:
    - `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json`
15. Generate implementation artifacts:
    - `./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json`
16. Validate in app:
    - `npm install`
    - `npm run dev`
17. Close current slice:
    - `./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json`
18. Run readiness gate:
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
19. Advance to next slice:
    - `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json`
20. Run gate again:
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
21. For each remaining slice, execute Steps 11-20 in order.
    - Re-run Step 10 (`db:init`) only when DB baseline/scripts require refresh.

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

#### Step 3: `pm:brief-readiness`

- Command:
  - `./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json`
- What it does:
  - Reads evidence from `docs/customer-input/*` plus optional `docs/product/intake-note.md`.
  - Writes `docs/reviews/product-manager/brief-readiness-review.md`.
  - On sufficient coverage, creates/updates synthesized brief artifacts (model-driven when configured, deterministic otherwise).
- Failure behavior:
  - Writes `docs/reviews/product-manager/customer-information-request.md`.
  - Exits non-zero and prints requested customer inputs.

#### Step 4: `pm:approve-brief`

- Command:
  - `./fabric/company/v1/fabric pm:approve-brief --target . --values ./fabric.values.json`
- What it does:
  - Marks brief approved (`Brief Approval Status: approved`).
  - Derives/updates `fabric.values.json` from approved brief content.
  - May consult model-driven value assistance when configured.

#### Step 5: `format-from-brief`

- Command:
  - `./fabric/company/v1/fabric format-from-brief --target .`
- What it does:
  - Validates approved brief is present.
  - Validates minimum input sufficiency (`intake-note` or customer-input docs).
  - Does not write generation outputs.

### Stage 2: Bootstrap to delivery mode + environment baseline

#### Step 6: `scaffold`

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

#### Step 7: `pm:plan-slices`

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

#### Step 8: `pm:finalize-bootstrap-reviews`

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

#### Step 9: `pm:bootstrap-signoff`

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

#### Step 10: `db:init`

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

### Stage 3: Delivery preparation

#### Step 11: `architect:finalize-baseline`

- Command:
  - `./fabric/company/v1/fabric architect:finalize-baseline --target . --values ./fabric.values.json`
- What it does:
  - Requires `docs/product/current-slice.yaml`.
  - Reads active slice + optional brief/framing context.
  - Generates `docs/architecture/baseline.md` (model-driven when available, heuristic fallback otherwise).
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Prints baseline mode (`model_driven|heuristic_fallback`) and written paths.
  - Does not mutate backlog/current-slice/manifest.

#### Step 12: `uiux:finalize-current-slice-flow`

- Command:
  - `./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target . --values ./fabric.values.json`
- What it does:
  - Requires `docs/product/current-slice.yaml`.
  - Reads active slice + optional brief/framing context.
  - Writes `docs/ux/<SLICE_ID>-current-slice-flow.md` (model-driven with fallback).
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Prints UX mode (`model_driven|heuristic_fallback`) and written paths.
  - Does not mutate backlog/current-slice/manifest.

#### Step 13: `gate` (recommended before implementation)

- Command:
  - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
- What it does:
  - Runs `validate` then `doctor`.
  - `validate` checks token completeness + generated artifact drift.
  - `doctor` checks governance coherence (manifest/backlog/current-slice alignment), placeholder integrity, delivery review state, and DB readiness requirements.
  - Fails on drift, placeholder/governance inconsistencies, or DB readiness issues.

### Stage 4: Per-slice implementation loop

Before each slice implementation loop, ensure the active slice baseline + UX are refreshed (step 11 and step 12).

#### Step 14: `coder:prepare-current-slice`

- Command:
  - `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires active `current-slice`, baseline, and slice UX flow (with legacy migration fallback for `docs/ux/current-slice-flow.md`).
  - Verifies placeholder-free baseline + UX.
  - Derives implementation target patterns from slice scope/title.
  - Writes `docs/implementation/<SLICE_ID>-implementation-notes.md`.
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Transitions active slice to implementation (`status: in_progress`, milestone `<SLICE_ID>_implementation`) in backlog/current-slice/manifest.

#### Step 15: `coder:implement-current-slice`

- Command:
  - `./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires current slice, baseline, UX flow, and implementation notes (legacy fallback for `docs/implementation/current-slice-notes.md`).
  - Tries model-driven playbook generation first; on failure uses deterministic fallback.
  - Writes app artifacts (managed files under `index.html`, `src/*`, `tests/*`; slug bridge files for non-onboarding slices).
  - Ensures package scripts/deps baseline.
  - Rewrites implementation notes with changed files and execution summary.
- What it does not do:
  - Does not transition slice status to completed.
  - Does not run `npm install`, `npm run dev`, or tests automatically.

#### Step 16: Test in UI

- Commands:
  - `npm install`
  - `npm run dev`
- Goal:
  - Validate active slice behavior from a customer perspective before closeout.

#### Step 17: `coder:close-current-slice`

- Command:
  - `./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json`
- What it checks:
  - Required artifacts exist (slice/backlog/baseline/UX/notes/checklist/package scripts).
  - Current slice contains acceptance criteria.
  - Checklist exists for current slice and reports pass.
  - Placeholder-free closeout docs.
  - Changed files align to required target patterns.
  - Implementation artifacts exist under expected source/test locations.
- On success:
  - Marks implementation notes `Completed`.
  - Marks slice `completed` in backlog/current-slice.
  - Updates manifest active slice state/milestone and timestamp.

#### Step 18: `gate` (pre-advance)

- Command:
  - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
- Purpose:
  - Catch drift/coherence regressions before advancing the pointer.

#### Step 19: `orchestrator:advance-slice`

- Command:
  - `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires current slice status `completed`.
  - Activates next non-completed slice as `planned`.
  - Rewrites backlog/current-slice and updates manifest active pointers.
  - If no actionable next slice exists, exits OK with no file changes.

#### Step 20: `gate` (post-transition)

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

1. Export API key:
   - `export OPENAI_API_KEY=...`
2. Enable the desired model profile(s) in `fabric.values.json`:
   - global toggle: `llm_enabled: true`
   - per-purpose toggles (optional override): `intake_llm_enabled`, `planning_llm_enabled`, `architect_llm_enabled`, `coder_llm_enabled`
3. (Optional) configure quality gates/retries:
   - `intake_llm_brief_quality_gate: true`
   - `intake_llm_brief_retry_count: 1`
   - `intake_llm_semantic_clarity_gate: true` (alias: `intake_llm_semantic_scope_gate`)
4. Validate config:
   - `./fabric/company/v1/fabric llm:check --target . --values ./fabric.values.json`

### Intake model outputs (`pm:brief-readiness`)

With intake model invocation enabled, `pm:brief-readiness` writes:

- `docs/product/source-evidence-pack.md`
- `docs/product/source-synthesis.md`
- `docs/product/product-system-framing.md`
- `docs/product/project-brief.md`
- `docs/reviews/product-manager/brief-clarity-review.md`
- `docs/reviews/product-manager/brief-clarity-ledger.md`
- `docs/reviews/product-manager/brief-attempt-<n>.md`

The intake flow runs in constrained model passes: source synthesis, product framing, then brief authoring.
