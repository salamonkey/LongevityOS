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

- `uiux:generate-current-slice-flow --target <project-root> [--values fabric.values.json]`
  - What it does: generates a slice-specific `docs/ux/<SLICE_ID>-current-slice-flow.md` for the active slice from current slice state, project brief, and product-system framing.
  - When to use: after `pm:plan-slices` and before implementation of user-facing slices.
  - Benefit: turns the UX flow artifact from a generic template into implementation-ready interaction guidance.

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
9. Generate bootstrap/governance artifacts scaffold:
   - `./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json`
10. Generate initial backlog of slices:
   - `./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json`
11. Finalize bootstrap reviews:
   - `./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json`
12. Bootstrap signoff into delivery mode:
   - `./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json`
13. Initialize DB baseline:
    - `./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json`
13b. Verify DB readiness:
    - `./fabric/company/v1/fabric db:check --target .`
STAGE 3
14. Generate architecture baseline for active slice:
    - `./fabric/company/v1/fabric architect:generate-current-slice-baseline --target . --values ./fabric.values.json`
15. Generate UX flow for active slice:
    - `./fabric/company/v1/fabric uiux:generate-current-slice-flow --target . --values ./fabric.values.json`
16. Run readiness gate (recommended):
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
STAGE 4
17. Start implementation state:
    - `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json`
18. Generate implementation artifacts:
    - `./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json`
19. Validate in app:
    - `npm install`
    - `npm run dev`
20. Close current slice:
    - `./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json`
21. Run readiness gate:
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
22. Advance to next slice:
    - `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json`
23. Run gate again:
    - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
24. For each remaining slice, execute Steps 14-23 in order.
    - Re-run Step 13 (`db:init`) only when DB baseline/scripts require refresh.
    - Re-run Step 13b (`db:check`) after DB/env/script changes and before proceeding.

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

#### Step 13: `db:init`

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

#### Step 13b: `db:check`

- Command:
  - `./fabric/company/v1/fabric db:check --target .`
- What it does:
  - Verifies DB required files, required env keys in `.env.example`, required package scripts, and Supabase CLI availability.
- Why it is in the canonical flow:
  - Confirms DB baseline readiness deterministically before moving into Stage 3 delivery-prep commands.

### Stage 3: Delivery preparation

#### Step 14: `architect:generate-current-slice-baseline`

- Command:
  - `./fabric/company/v1/fabric architect:generate-current-slice-baseline --target . --values ./fabric.values.json`
- What it does:
  - Requires `docs/product/current-slice.yaml`.
  - Reads active slice + optional brief/framing context.
  - Generates `docs/architecture/<SLICE_ID>-baseline.md` (model-driven when available, heuristic fallback otherwise).
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Prints baseline mode (`model_driven|heuristic_fallback`) and written paths.
  - Does not mutate backlog/current-slice/manifest.

#### Step 15: `uiux:generate-current-slice-flow`

- Command:
  - `./fabric/company/v1/fabric uiux:generate-current-slice-flow --target . --values ./fabric.values.json`
- What it does:
  - Requires `docs/product/current-slice.yaml`.
  - Reads active slice + optional brief/framing context.
  - Writes `docs/ux/<SLICE_ID>-current-slice-flow.md` (model-driven with fallback).
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Prints UX mode (`model_driven|heuristic_fallback`) and written paths.
  - Does not mutate backlog/current-slice/manifest.

#### Step 16: `gate` (recommended before implementation)

- Command:
  - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
- What it does:
  - Runs `validate` then `doctor`.
  - `validate` checks token completeness + generated artifact drift.
  - `doctor` checks governance coherence (manifest/backlog/current-slice alignment), placeholder integrity, delivery review state, and DB readiness requirements.
  - Fails on drift, placeholder/governance inconsistencies, or DB readiness issues.
- Next-step guidance behavior:
  - CLI suggestions after `gate` are now context-aware (active slice status + artifact presence).
  - In the Step 16 state (slice `planned` and baseline/UX present), the first suggested next step is `coder:prepare-current-slice`.

### Stage 4: Per-slice implementation loop

Before each slice implementation loop, ensure the active slice baseline + UX are refreshed (step 14 and step 15).

#### Step 17: `coder:prepare-current-slice`

- Command:
  - `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires active `current-slice`, baseline, and slice UX flow (with legacy migration fallback for `docs/ux/current-slice-flow.md`).
  - Verifies placeholder-free baseline + UX.
  - Derives implementation target patterns from slice scope/title.
  - Writes `docs/implementation/<SLICE_ID>-implementation-notes.md`.
  - Regenerates `docs/testing/<SLICE_ID>-user-checklist.md`.
  - Transitions active slice to implementation (`status: in_progress`, milestone `<SLICE_ID>_implementation`) in backlog/current-slice/manifest.

#### Step 18: `coder:implement-current-slice`

- Command:
  - `./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires current slice, baseline, UX flow, and implementation notes (legacy fallback for `docs/implementation/current-slice-notes.md`).
  - Supports two model output modes:
    - `source_files`: model returns concrete file outputs (`path + content`) and fabric writes them directly.
    - `playbook`: model returns implementation guidance and fabric fills deterministic source templates.
  - Default output mode behavior:
    - default is `source_files` (Codex-compatible authoring path).
    - set `coder_llm_output_mode: playbook` only when you explicitly want template-fill behavior.
  - You can override with `coder_llm_output_mode` (`source_files|playbook`) in `fabric.values.json`.
  - On model failure, uses deterministic fallback.
  - Writes app artifacts under `index.html`, `src/*`, and `tests/*` (including slug bridge files for non-onboarding slices in deterministic fallback mode).
  - Ensures package scripts/deps baseline.
  - Rewrites implementation notes with changed files and execution summary.
- What it does not do:
  - Does not transition slice status to completed.
  - Does not run `npm install`, `npm run dev`, or tests automatically.

#### Step 19: Test in UI

- Commands:
  - `npm install`
  - `npm run dev`
- Goal:
  - Validate active slice behavior from a customer perspective before closeout.

#### Step 20: `coder:close-current-slice`

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

#### Step 21: `gate` (pre-advance)

- Command:
  - `./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
- Purpose:
  - Catch drift/coherence regressions before advancing the pointer.

#### Step 22: `orchestrator:advance-slice`

- Command:
  - `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json`
- What it does:
  - Requires current slice status `completed`.
  - Activates next non-completed slice as `planned`.
  - Rewrites backlog/current-slice and updates manifest active pointers.
  - If no actionable next slice exists, exits OK with no file changes.

#### Step 23: `gate` (post-transition)

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
   - per-purpose toggles (optional override): `brief_draft_llm_enabled`, `pm_llm_enabled`, `planning_llm_enabled`, `architect_llm_enabled`, `coder_llm_enabled`
   - coder output mode (optional override): `coder_llm_output_mode: source_files|playbook`
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
