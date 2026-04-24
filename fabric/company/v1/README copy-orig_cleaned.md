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

## Quick Start (New Repo)

1. Copy `fabric/company/v1/` into the new repository.
2. Run `./fabric/company/v1/fabric init-factory --target <project-root>`.
3. Place any raw customer material under `docs/customer-input/`.
4. Create `docs/product/intake-note.md` from `templates/intake-note.template.md` when request starts verbally.
5. Ensure there is at least one usable input source:
   - `docs/product/intake-note.md`, or
   - one/more documents in `docs/customer-input/*`.
6. Run `./fabric/company/v1/fabric pm:brief-readiness --target <project-root>` (reads all customer-input documents and evaluates content coverage).
7. If `pm:brief-readiness` fails, send the generated request in `docs/reviews/product-manager/customer-information-request.md` to the customer, capture the response in `docs/customer-input/*` and/or `docs/product/intake-note.md`, then return to step 5.
8. After `pm:brief-readiness` succeeds, Product Manager reviews and refines the synthesized first draft in `docs/product/project-brief.md` (if missing, the command generates it from customer input using the template structure).
9. Finalize `docs/product/project-brief.md` with customer and run `./fabric/company/v1/fabric pm:approve-brief --target <project-root> --values <project-root>/fabric.values.json` (creates values file if missing).
10. Run `./fabric/company/v1/fabric format-from-brief --target <project-root>`.
11. Run `./fabric/company/v1/fabric scaffold --values <project-root>/fabric.values.json --target <project-root>` (scaffolds governance/bootstrap artifacts only).
12. Run `./fabric/company/v1/fabric pm:plan-slices --target <project-root> --values <project-root>/fabric.values.json` (model-driven by default; add `--heuristic` for deterministic-only planning).
13. Complete `docs/reviews/product-manager/bootstrap-foundation-review.md` and `docs/reviews/product-manager/bootstrap-backlog-slice-review.md` with `Assessment: approved`.
14. Run `./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target <project-root> --values <project-root>/fabric.values.json`.
15. Run `./fabric/company/v1/fabric pm:bootstrap-signoff --target <project-root> --values <project-root>/fabric.values.json`.
16. Run `./fabric/company/v1/fabric architect:finalize-baseline --target <project-root> --values <project-root>/fabric.values.json`.
17. Run `./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target <project-root> --values <project-root>/fabric.values.json`.
18. Run `./fabric/company/v1/fabric db:init --values <project-root>/fabric.values.json --target <project-root>`.
19. Run `./fabric/company/v1/fabric coder:prepare-current-slice --target <project-root> --values <project-root>/fabric.values.json`.
20. Run `./fabric/company/v1/fabric coder:implement-current-slice --target <project-root> --values <project-root>/fabric.values.json`.
21. Run `npm install` then `npm run dev` to test the generated slice as a customer.
22. Run `./fabric/company/v1/fabric coder:close-current-slice --target <project-root> --values <project-root>/fabric.values.json`.
23. Run `./fabric/company/v1/fabric orchestrator:advance-slice --target <project-root> --values <project-root>/fabric.values.json`.
24. Run `./fabric/company/v1/fabric gate --target <project-root> --values <project-root>/fabric.values.json`.




## REVISED FLOW FROM CLEAN FABRIC STATE


### BLOCK 1. PREPARE FACTORY

1. Backtrack to fabric-only:
   `bash scripts/reset-to-fabric-only.sh --yes --also-values`
2. Initialize factory and values:
   `./fabric/company/v1/fabric init-factory --target . --values ./fabric.values.json --init-values`
3. Build/review brief readiness:
   `./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json`
4. Inspect outputs:
   - `docs/product/project-brief.md`
   - `docs/reviews/product-manager/brief-readiness-review.md`
5. Approve brief:
   `./fabric/company/v1/fabric pm:approve-brief --target . --values ./fabric.values.json`
6. Gate before scaffold:
   `./fabric/company/v1/fabric format-from-brief --target .`

Notes:
- `pm:brief-readiness` in `openai` mode uses direct HTTPS to the Responses API; no `npm install openai` step is required.
- `format-from-brief` only validates approved brief + minimum customer input presence; it does not write files.


### BLOCK 2. BOOTSTRAP AND INSTANTIATE FACTORY
./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json

#### 2.1 Build scaffold
`./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json`
  1. Loads manifest + values and validates tokens (required_tokens and template tokens for scaffold entries).
  2. Takes source_of_truth entries and excludes:
    - docs/product/product-system-framing.md
    - docs/product/backlog.yaml
    - docs/product/current-slice.yaml
  3. Renders the remaining templates with fabric.values.json and writes them with generated metadata headers.
  4. Refuses to overwrite non-generated existing files unless you pass --force.
  5. Prints generated file count + paths.
  No LLM call happens in scaffold.

#### 2.2 Create delivery slice plan from approved project-brief.
`./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json`
  1. Prechecks
    - Requires .system/project-manifest.yaml to exist.
    - Requires docs/product/project-brief.md to exist and be Brief Approval Status: approved.
    - If both --model-driven and --heuristic are passed together, it fails.
  2. Builds a slice plan (now 5–8 slices) - Derives 5–8 MVP slice titles/objectives.
    - Default behavior: tries LLM planning first (using your LLM settings from ./fabric.values.json/env) and includes optional context from docs/product/product-system-framing.md.
    - If LLM planning fails/unavailable, it logs a warning and falls back to deterministic heuristic planning.
    - --heuristic skips LLM and uses deterministic planning directly.
  3. Rewrites planning artifacts
    - docs/product/backlog.yaml - rewrites docs/product/backlog.yaml with planned slices
    - docs/product/current-slice.yaml - rewrites docs/product/current-slice.yaml with the first active slice, 
    - First slice becomes the active current slice (status: planned), with IDs like SL-001, SL-002, etc.
  4. Updates manifest state 
    - In .system/project-manifest.yaml, updates status fields to align with that active slice:
      - status.active_slice
      - status.active_slice_state
      - status.active_milestone
      - last_updated_utc
    - Sets slice contracts (scope, acceptance criteria, dependencies, done definition) so delivery commands can run.
  5. Console output
    - Prints planned slice count, active slice, and planning mode (model_driven, heuristic_fallback, or heuristic).

#### 2.3 Auto-generates the two bootstrap Product Manager review artifacts and assigns machine-readable assessments. 
`./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json`
  Turns review templates/scaffolds into final review decisions.
  Is currently a deterministic review-writer, not a model call and not the final gate.
  - It loads fabric.values.json only to resolve where to write the two review files (bootstrap_foundation_review_path, bootstrap_backlog_slice_review_path), otherwise uses defaults in docs/reviews/product-manager/*.
  - It generates Foundation Review by checking only existence/readability of:
    - .system/project-manifest.yaml
    - .system/artifact-registry.yaml
    - .system/workflow-rules.yaml
  - It generates Backlog/Slice Review by checking:
    - docs/product/backlog.yaml exists and has slices
    - docs/product/current-slice.yaml exists and has id/title/objective
    - no unresolved placeholders in backlog/current-slice
    - current slice id is present in backlog
  - It writes/overwrites those two review markdown files with Assessment: approved|needs_revision, findings, and required actions.
  - It prints OK plus both assessments. It does not fail the command just because assessment is needs_revision.
  - The actual hard gate is pm:bootstrap-signoff, which fails if review artifacts are missing, not approved, or still contain placeholders.


#### 2.4 Completes bootstrap and switches the project into delivery mode. Validates both bootstrap PM review files are present, approved, and placeholder-free. Hard bootstrap gate and mode switch.
`./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json`
  1. Prechecks required files exist:
    - .system/project-manifest.yaml
    - docs/product/current-slice.yaml
  2. Validates both bootstrap review artifacts (paths resolved from fabric.values.json if provided):
    - file exists
    - no unresolved placeholders
    - Assessment parses to approved
  3. If any review check fails:
    - prints FAILED + issue list + recovery command
    - exits with code 1 (process.exit(1))
  4. Parses current slice and requires id, status, milestone.
  5. On success, updates .system/project-manifest.yaml:
    - operating_model.bootstrap_status = "completed"
    - operating_model.bootstrap_completed_at_utc = now
    - operating_model.current_mode = "delivery"
    - status.active_slice = current slice id
    - status.active_slice_state = current slice status
    - status.active_milestone = current slice milestone
    - status.approved_reviews merged/unique with both review file paths
    - top-level last_updated_utc = now
  6. Writes manifest atomically and prints OK summary.
  It does not call an LLM, and it does not rewrite brief/backlog/current-slice artifacts.


### BLOCK 3. DELIVERY MODE --> Delivery prep + implementation stage
./fabric/company/v1/fabric architect:finalize-baseline --target . --values ./fabric.values.json
./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target . --values ./fabric.values.json
./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json
npm install
npm run dev

#### 3.1 Generates the active slice’s architecture contract and refreshes the slice checklist.
`./fabric/company/v1/fabric architect:finalize-baseline --target . --values ./fabric.values.json`
  1. Reads docs/product/current-slice.yaml (required), plus docs/product/project-brief.md and docs/product/product-system-framing.md if present.
  2. Tries model-driven architecture baseline generation using your existing shared LLM stack from --values (profile fallback: architect -> planning -> intake), with 10s progress heartbeats.
  3. If LLM is unavailable/fails, it falls back automatically to the deterministic baseline playbook.
  4. Renders and writes docs/architecture/baseline.md (overwrites with fresh generated content + metadata header).
  5. Regenerates docs/testing/<SLICE_ID>-user-checklist.md.
  6. Prints scope, written files, and baseline mode (model_driven or heuristic_fallback).
  It does not modify backlog/current-slice/manifest/brief artifacts.
  It fails if docs/product/current-slice.yaml is missing (or on unexpected runtime errors).

#### 3.2 Generates the active slice’s UX flow spec and refreshes that slice’s checklist. Reads the active slice (docs/product/current-slice.yaml) plus brief/framing context. By default it attempts model-driven UX flow generation using the shared Fabric LLM settings stack, and falls back to deterministic heuristics when model calls are unavailable. Writes a slice-specific UX flow file at: docs/ux/<SLICE_ID>-current-slice-flow.md
`./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target . --values ./fabric.values.json`

    Rewrites the active slice testing checklist: docs/testing/<SLICE_ID>-user-checklist.md
    Marks the slice UX artifact as ready for implementation.

    Reads the active slice from docs/product/current-slice.yaml (required), plus optional context from docs/product/project-brief.md and docs/product/product-system-framing.md.
    Implementation: product.mjs (line 2714)

    Tries model-driven UX generation first via shared LLM infra:

    resolves first valid profile in order architect -> planning -> intake
    uses existing providers (openai or stdio_json)
    emits 10s progress heartbeats during LLM call
    Implementation: uiux-flow.mjs (line 146)
    If model generation fails/unavailable, falls back to existing deterministic UX heuristics.
    Implementation: product.mjs (line 2748)

    Renders and writes slice UX spec to:

    docs/ux/<SLICE_ID>-current-slice-flow.md
    Implementation: product.mjs (line 2709), product.mjs (line 2762)
    Regenerates:

    docs/testing/<SLICE_ID>-user-checklist.md (derived from slice + rendered UX flow)
    Implementation: product.mjs (line 2764)
    Prints scope, written files, and mode (model_driven or heuristic_fallback).

#### 3.3 Initializes the project’s DB baseline artifacts and DB-related scripts.
`./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json`
  1. Loads Fabric manifest + values file, then validates tokens.
    - It checks required tokens from manifest.
    - It checks template tokens too.
    - Important: token check is against full source_of_truth, not only DB files.
  2. Renders and writes these files from templates:
    - supabase/config.toml from db/supabase-config.template.toml
    - supabase/seed.sql from db/supabase-seed.template.sql
    - .env.example from templates/env-example.template
  3. Overwrite rule:
    - If target file exists and is not Fabric-generated, it refuses unless --force.
    - Generated detection = contains generated_from: and fabric_version: metadata markers.
  4. Ensures package.json exists (creates minimal one if missing), then upserts required DB/fabric scripts from manifest db.required_package_scripts.
  5. Prints:
    - optional created minimal package.json
    - fabric db:init: OK

#### 3.4 Gate is a thin deterministic wrapper: it runs validate first, then doctor, and only if both pass prints fabric gate: OK.
`./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
  1. What validate checks:
    - values token completeness (required_tokens + template token coverage)
    - each non-exempt source_of_truth artifact exists
    - artifact has generated header marker
    - artifact content matches expected rendered template (ignoring generated_at)
  2. What doctor checks:
    - required governance artifacts exist (.system/project-manifest.yaml, docs/product/current-slice.yaml, docs/product/backlog.yaml)
    - manifest/current-slice/backlog consistency (active slice id/state/status alignment)
    - bootstrap semantic integrity (placeholder detection, scaffold-only pattern detection, delivery-mode review presence)
    - DB readiness from manifest (db.required_files, required env keys in .env.example)
  3. Exit behavior:
    - Any failure in validate or doctor prints FAILED and exits 1.
    - If both pass: fabric validate: OK, fabric doctor: OK, then fabric gate: OK.
  It does not call an LLM and does not write/modify project files.


### BLOCK 4. IMPLEMENT AND TEST

#### 4.1 Prepare code implementation: Prepares governance + execution artifacts and officially starts implementation for the active slice.
`./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json`
  1. Requires and reads:
    - current-slice.yaml
    - baseline.md
    - slice UX flow file docs/ux/<SLICE_ID>-current-slice-flow.md (or migrates from legacy docs/ux/current-slice-flow.md if slice id matches)
  2. Verifies baseline + UX flow are placeholder-free (__REQUIRED_*, SL-XXX, etc.).
  3. Derives implementation targets from slice title/scope:
    - onboarding slices -> onboarding/profile paths
    - otherwise slug-based feature/route/test paths
    - adds supabase/migrations/ hint if scope implies persistence/data
  4. Writes implementation notes:
    - docs/implementation/<SLICE_ID>-implementation-notes.md
    - includes objective, targets, verification summary, next steps
    - metadata header is stamped
  5. Regenerates checklist:
    - docs/testing/<SLICE_ID>-user-checklist.md
    - now based on current UX flow + implementation notes context
  6. Transitions slice to active implementation state:
    - rewrites backlog.yaml with active slice status in_progress
    - rewrites current-slice.yaml with status in_progress and milestone <SLICE_ID>_implementation
    - updates .system/project-manifest.yaml (active_slice, active_slice_state, active_milestone, current_mode=delivery, last_updated_utc)
  7. Prints OK plus scope, written files, target count, and current slice status: in_progress.

#### 4.2 Implement the code: Creates the concrete code artifacts for the current slice (not just planning docs). By default it attempts model-driven implementation generation using the shared Fabric LLM settings stack, and falls back to deterministic generation when model calls are unavailable.
`./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json`
  1. Prechecks required artifacts
    - docs/product/current-slice.yaml
    - docs/architecture/baseline.md
    - slice UX flow (docs/ux/<SLICE_ID>-current-slice-flow.md, with legacy fallback from docs/ux/current-slice-flow.md)
    - slice implementation notes (docs/implementation/<SLICE_ID>-implementation-notes.md, with legacy fallback from docs/implementation/current-slice-notes.md)
  2. LLM-first playbook generation
    - Tries model-driven generation using shared LLM infra/profile fallback: architect -> planning -> intake
    - Inputs include current slice + baseline + UX flow + optional brief/framing
    - Emits 10s progress heartbeats
    - If successful, logs LLM profile/model and uses playbook values
  3. Deterministic fallback
    - If LLM fails/unavailable, it logs warnings and falls back to deterministic generator (same behavior as before, now explicitly heuristic_fallback mode).
  4. Generates app files (React + Vite scaffold)
    - Writes deterministic file set under index.html, src/*, tests/*
    - For non-onboarding slice slugs, also writes bridge files for that slug
    - LLM playbook currently influences content fields (title/objective/acceptance/today-soon-later), not file topology.
  5. Safe overwrite behavior
    - Uses managed-write rule: refuses to overwrite non-generated files unless --force.
  6. Ensures package.json baseline
    - Creates minimal package.json if missing
    - Enforces scripts (dev/build/preview/test) and React/Vite deps.
  7. Rewrites slice implementation notes
    - Updates docs/implementation/<SLICE_ID>-implementation-notes.md
    - Marks status Implemented
    - Records changed files, verification summary, execution notes, next steps.
  8. Console output
    - implemented: <SLICE_ID> <title>
    - changed files: <n>
    - app scaffold: React + Vite
    - implementation mode: model_driven | heuristic_fallback
    - package scripts: dev, build, preview, test
  What it does not do:
  - No slice status transition (that happens in coder:close-current-slice)
  - No manifest/backlog/current-slice mutation
  - No npm install, no dev server, no tests run automatically


#### 4.3 Test the implementation in the UI
  1. npm install
  2. npm run dev


#### 4.4 Close current slice (strict closeout gate): Performs strict closeout checks and marks the active slice completed if all pass. Formal quality gate that closes the slice.
`./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json`
  In this repo version, that command is a strict “closeout gate” for the active slice.
  1. What it checks before allowing closeout:
    - Required artifacts exist: docs/product/current-slice.yaml, docs/product/backlog.yaml, baseline, UX flow, implementation notes, checklist, package.json + scripts.dev.
    - Current slice has acceptance criteria.
    - Implementation notes contain a real “Changed Files” list.
    - Checklist for that slice exists, matches slice ID, and Result is Pass (not unresolved/fail).
    - Baseline/UX/notes have no unresolved placeholder tokens.
    - Expected implementation target paths (derived from slice scope) have actual files under src/tests (and related targets), and changed files align with required targets.
    - If any check fails, it prints fabric coder:close-current-slice: FAILED with issue bullets and exits non-zero (runtime/commands/runtime.mjs (line 1380)).
  2. If all checks pass, it:
    - Rewrites docs/implementation/<slice>-implementation-notes.md with status Completed.
    - Marks the slice completed in docs/product/backlog.yaml.
    - Rewrites docs/product/current-slice.yaml to the completed slice state.
    - Updates .system/project-manifest.yaml (active_slice, active_slice_state, active_milestone, last_updated_utc).
    - Prints fabric coder:close-current-slice: OK and exits 0 (runtime/commands/runtime.mjs (line 1422)).


#### 4.5 Pre-advance stability check (optional but recommended) 
`./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`

#### 4.6 Advance to next slice
`./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.jso`
Activates the next slice in the backlog. Moves the workflow pointer from finished slice N to slice N+1.
It advances the workflow pointer from the currently completed slice to the next not-completed slice in your backlog.
Precisely what it does:
1. Dispatches orchestrator:advance-slice from CLI to orchestratorAdvanceSlice(...) (fabric.mjs (line 157)).
2. Requires both docs/product/current-slice.yaml and docs/product/backlog.yaml; otherwise it errors (runtime.mjs (line 1429)).
3. Requires current-slice.status == completed; otherwise it errors and tells you to run coder:close-current-slice first (runtime.mjs (line 1435)).
4. Finds current slice in backlog, then picks the next slice after it whose status is not completed (runtime.mjs (line 1438)).
5. If no next actionable slice exists, it exits successfully with a “no remaining slices” message (no file changes) (runtime.mjs (line 1445)).
6. If a next slice exists, it:
  - sets that slice to planned (and ensures milestone exists),
  - rewrites docs/product/backlog.yaml,
  - rewrites docs/product/current-slice.yaml,
  - updates .system/project-manifest.yaml fields: active_slice, active_slice_state, active_milestone, operating_model.current_mode (delivery), last_updated_utc

#### 4.7) Post-transition stability check (recommended)
`./fabric/company/v1/fabric gate --target . --values ./fabric.values.json`
Runs the full readiness gate: validate then doctor. If either fails, gate fails with detailed issues. Validates the post-transition state (including that advance didn’t introduce inconsistency).


##### Then repeat this block for each next active slice:
./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json

##### Test here

./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric gate --target . --values ./fabric.values.json
./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric gate --target . --values ./fabric.values.json






# NEW-NEW

# 1) Factory bootstrap (brief-first mode, no early values file)
./fabric/company/v1/fabric init-factory --target .

# 2) Add customer inputs (files in docs/customer-input/, optional intake note)
#    then run readiness gate
./fabric/company/v1/fabric pm:brief-readiness --target .

# 3) Refine docs/product/project-brief.md with customer, then approve
#    (creates/updates fabric.values.json from brief context)
./fabric/company/v1/fabric pm:approve-brief --target . --values ./fabric.values.json

# 4) Brief gate before execution
./fabric/company/v1/fabric format-from-brief --target .

# 5) Generate governed project artifacts
./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json

# 6) Build initial delivery backlog/current slice
./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json

# 7) Finalize bootstrap reviews and sign off into delivery mode
./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json

### 8-10 is a loop - per slice
# 8) Prepare slice contracts (Per slice)
./fabric/company/v1/fabric architect:finalize-baseline --target . --values ./fabric.values.json
./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target . --values ./fabric.values.json
./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json

# 9) Start implementing active slice
./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json

## (test in app)

# 10) Per-slice loop after testing:
./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric gate --target . --values ./fabric.values.json
./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric gate --target . --values ./fabric.values.json



## Model invocation layer

This bundle adds a provider-agnostic model invocation layer for intake.

### Supported providers
- `openai` via direct HTTPS calls to the OpenAI Responses API (no SDK install required)
- `stdio_json` for a local wrapper process that accepts JSON on stdin and returns JSON on stdout

### Setup
1. Export your API key: `export OPENAI_API_KEY=...`
2. Set `intake_llm_enabled` to `true` in `fabric.values.json`
   - Optional (defaults shown):
   - `intake_llm_brief_quality_gate: true`
   - `intake_llm_brief_retry_count: 1`
   - `intake_llm_semantic_clarity_gate: true` (alias: `intake_llm_semantic_scope_gate`)
3. Run `./fabric/company/v1/fabric llm:check --target . --values ./fabric.values.json`
4. Run `./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json`

### What happens
With intake LLM invocation enabled, `pm:brief-readiness` writes:
- `docs/product/source-evidence-pack.md`
- `docs/product/source-synthesis.md`
- `docs/product/product-system-framing.md`
- `docs/product/project-brief.md`
- `docs/reviews/product-manager/brief-clarity-review.md`
- `docs/reviews/product-manager/brief-clarity-ledger.md`
- `docs/reviews/product-manager/brief-attempt-<n>.md`

The intake now runs in three constrained model passes: source synthesis, product-system framing, then brief authoring.

For brief authoring, the runtime injects the Product Manager role contract from `team/roles.yaml -> product_manager.spec_path` (normally `team/product-manager.md`) as the prompt source of truth.
