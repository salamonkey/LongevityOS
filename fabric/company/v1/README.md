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
  - What it does: generates an initial delivery-ready backlog plan (3-6 slices) from the approved project brief and writes a non-placeholder active `current-slice` with `planned` status.
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

## Migration Path

1. Generate side-by-side and validate parity.
2. Switch ownership to fabric-generated outputs.
3. Remove hand-maintained duplicates.


## v2.1 Alignment Update

This starter kit includes a required `product-system-framing` artifact at `docs/product/product-system-framing.md`.
It is created during bootstrap before backlog approval and before architecture formalization for behavior-heavy products.












# 🧠 Virtual Software Company Fabric

> You describe what you want → we turn it into a product → you approve → we build it.

---

## 🚀 Quick Start (Customer Flow)

This system works in **4 simple phases**:

1. **Set up your software company**
2. **Tell us what you want to build**
3. **Align on the product**
4. **Start building**

---

# 🏗️ Phase 1 — Set Up Your Software Company
**Goal:** Initialize your virtual development team.

### You do:
```bash
./fabric/company/v1/fabric init-factory --target .
```

### What happens:
- Your “software company” is created
- Roles (PM, Architect, UI/UX, Coder) are installed
- Workflows and templates are ready

👉 This is a one-time setup per project.

---

# 🧾 Phase 2 — Tell Us What You Want to Build
**Goal:** Provide customer input in any format.

### You can:
- Write notes → `docs/product/intake-note.md`
- Upload documents → `docs/customer-input/`

Examples:
- idea notes
- product specs
- slides
- transcripts
- screenshots

### Minimum requirement:
You must provide **at least one input source**:
- `docs/product/intake-note.md`, OR
- one or more files in `docs/customer-input/`

---

### What happens next:
The Product Manager:
- reads your input
- identifies gaps
- prepares to draft a product definition

---

# 🧭 Phase 3 — Align on the Product (Project Brief)
**Goal:** Turn your input into a clear product definition.
Ask the Product Manager to assess readiness and draft the brief

---

## Step 1 — Generate first draft
```bash
./fabric/company/v1/fabric pm:brief-readiness --target . --values fabric.values.json
```

### What happens:
- your input is analyzed
- completeness is checked
- a first draft is created:
  - `docs/product/project-brief.md`

If something is missing:
- the system generates a request for more input

---

## Step 2 — Refine together
You and the Product Manager:
- review the brief
- clarify scope
- align expectations

---

## Step 3 — Approve the brief
```bash
./fabric/company/v1/fabric pm:approve-brief --target . --values fabric.values.json
```

### What happens:
- scope is locked
- success criteria are defined
- system is ready to build

---

# ⚙️ Phase 4 — Start Building
**Goal:** Turn the approved brief into execution-ready work.

## Step 1 - Validate and lock the approved brief
```bash
./fabric/company/v1/fabric format-from-brief --target .
```
What this does:
- Checks that docs/product/project-brief.md exists and is approved
- Verifies that sufficient customer input exists
- Acts as the official gate between planning and execution
👉 If this fails, you must fix or approve the brief before continuing.


## Step 2 - Generate the project structure
```bash
./fabric/company/v1/fabric scaffold --values fabric.values.json --target .
```
What this does:
- Generates all core project artifacts from Fabric:
  - governance files
- Preserves customer-derived constitutional artifacts (`docs/product/product-system-framing.md`) and planning outputs (`backlog/current-slice`)
- Prepares the repository for explicit planning as a separate step


## Step 3 — Generate the initial work plan (slices)
```bash
./fabric/company/v1/fabric pm:plan-slices --target . --values fabric.values.json
```
What this does:
- Creates a real backlog of 3–6 slices
- Defines the first executable slice
- Uses model-driven planning by default (falls back to heuristic if model invocation is unavailable)
👉 Add `--heuristic` to force deterministic planning only.


## Step 4 - Confirm bootstrap is complete
```bash
./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values fabric.values.json
```
What this does:
- Verifies that required bootstrap reviews exist and are approved
- Ensures no placeholder or incomplete artifacts remain
- Officially transitions the project from bootstrap → delivery mode
👉 This prevents starting development on an incomplete setup.



---

## OPTIONAL - Database Setup
## Step 1 — Initialize the database environment
```bash
./fabric/company/v1/fabric db:init --target .
```
What this does:
- Sets up the database layer required by your application
- Creates or validates:
  - environment configuration (.env)
  - database connection settings
  - initial schema or migration baseline
- Prepares the system to store and retrieve real data
👉 Use this if your product includes persistent data (e.g. users, records, plans).


## OPTIONAL - Database Setup
## Step 2 — Verify database setup (optional but recommended)
```bash
./fabric/company/v1/fabric db:check --target .
```
What this does:
- Confirms the database is reachable
- Verifies configuration is valid
- Detects missing or broken setup
👉 This helps catch environment issues early before development starts.

---

## Final Check
## Step 3 — Validate full system readiness
```bash
./fabric/company/v1/fabric gate --target .
```
What this does:
- Runs a full system validation combining:
  - structural checks (validate)
  - semantic/coherence checks (doctor)
- Ensures:
  - all required artifacts exist
  - no placeholders remain
  - the current slice is executable
  - bootstrap is complete and consistent
👉 This is the final “ready to build” gate.

---

# 🔁 What Happens After This?
## Step 4 — Enter delivery mode
(No command required — this is a state transition)

What happens:
- The project is now in delivery mode
- Work is driven by:
- docs/product/backlog.yaml
- docs/product/current-slice.yaml


Once Phase 4 is complete:
- the system starts executing slices
- you receive regular progress updates
- you only step in when decisions are needed

👉 You do **not** need to manage the team manually.

---

## Step 5 — Execute slices
Typical execution loop:
```bash
./fabric/company/v1/fabric scaffold --target .
./fabric/company/v1/fabric validate --target .
./fabric/company/v1/fabric doctor --target .
./fabric/company/v1/fabric gate --target .
```

What this does:
- scaffold → refreshes governed bootstrap artifacts
- validate → checks structure
- doctor → checks coherence and completeness
- gate → confirms readiness to continue
👉 This loop runs for each slice until the backlog is complete.




# 🧩 How the System Works (Simple View)

### You:
- provide input
- review and approve the brief
- give feedback when needed

### The system:
- interprets your request
- structures the product
- plans execution
- builds iteratively

---

# 📁 Key Files You’ll See

| File | Purpose |
|------|--------|
| `docs/product/intake-note.md` | Your initial idea / notes |
| `docs/customer-input/` | Supporting documents |
| `docs/product/project-brief.md` | Final agreed product definition |
| `docs/product/product-system-framing.md` | Internal product logic (system view) |
| `docs/product/backlog.yaml` | Planned work |
| `docs/product/current-slice.yaml` | What’s being built now |

---

# 🧠 Important Principles

- You don’t need perfect input — start with what you have  
- The system will ask for missing information  
- The brief is the **contract** — everything builds from it  
- Simplicity is intentional — complexity is added only when needed  

---

# 🧰 Full Command Reference

(Advanced users only — optional)

All commands are still available exactly as before:

```bash
./fabric/company/v1/fabric <command>
```

Examples:
- `pm:brief-readiness`
- `pm:brief-semantic-check`
- `pm:approve-brief`
- `scaffold`
- `validate`
- `doctor`
- `gate`
- `db:init`

---

# 🎯 Summary

You only need to remember this:

1. Set up the system  
2. Provide input  
3. Approve the brief  
4. Let the system build  


## Delivery Loop (Autonomous Slice Progression)

After bootstrap is complete and the first slice is active, use this sequence for each slice:

1. Prepare the current slice for implementation:
   - `./fabric/company/v1/fabric coder:prepare-current-slice --target . --values fabric.values.json`
   - What it does: writes `docs/implementation/<SLICE_ID>-implementation-notes.md`, derives file/module targets, and marks the active slice `in_progress`.

2. Close the current slice when implementation is complete:
   - `./fabric/company/v1/fabric coder:close-current-slice --target . --values fabric.values.json`
   - What it does: validates the slice contract is placeholder-free, updates implementation notes for closeout, and marks the active slice `completed`.

3. Advance to the next slice:
   - `./fabric/company/v1/fabric orchestrator:advance-slice --target . --values fabric.values.json`
   - What it does: activates the next planned slice from backlog and updates manifest/current-slice cleanly.

Recommended per-slice rhythm:
- `coder:prepare-current-slice`
- implement the slice in code
- `coder:close-current-slice`
- `orchestrator:advance-slice`
- `gate`












--------------------
# Recommended retry flow now
Since you want to backtrack to just Fabric and retry production cleanly, after replacing your Fabric package with the patched one, I recommend this sequence:

bash scripts/reset-to-fabric-only.sh --yes --also-values

./fabric/company/v1/fabric init-factory --values ./fabric.values.json --target . --init-values
./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:approve-brief --target . --values ./fabric.values.json
./fabric/company/v1/fabric format-from-brief --target .
./fabric/company/v1/fabric scaffold --values ./fabric.values.json --target .
./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json
./fabric/company/v1/fabric db:init --target .
./fabric/company/v1/fabric gate --target .



# REVISED FLOW
The new clean restart flow
Since you said you will backtrack and restart from a clean Fabric state, the intended sequence is now:

bash scripts/reset-to-fabric-only.sh --yes --also-values

## FABRIC SETUP
1)
./fabric/company/v1/fabric init-factory --values ./fabric.values.json --target . --init-values

2)
./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json

3)
./fabric/company/v1/fabric pm:approve-brief --target . --values ./fabric.values.json

4)
./fabric/company/v1/fabric format-from-brief --target .
./fabric/company/v1/fabric scaffold --values ./fabric.values.json --target .

5)
./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json

6)
./fabric/company/v1/fabric architect:finalize-baseline --target . --values ./fabric.values.json
./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target . --values ./fabric.values.json

7)
./fabric/company/v1/fabric db:init --target .
./fabric/company/v1/fabric gate --target . --values ./fabric.values.json


## PRODUCT DELIVERY








# What just happened
### pm:plan-slices
Worked correctly:
- created 6 real slices
- set SL-001 as the active slice
- replaced scaffold backlog/current-slice with delivery-ready planning

### pm:finalize-bootstrap-reviews
Worked correctly:
- both review artifacts became approved
- placeholder/draft review state was resolved

### pm:bootstrap-signoff
Worked correctly:
- bootstrap is now officially complete
- manifest transitioned into delivery mode

That means the sustainable fix is functioning.
What this confirms
  - The real issue was:
    - pm:plan-slices had to run before bootstrap signoff
    - bootstrap reviews had to be finalized from real slice state, not draft scaffolding
Now that sequence works.

# What to do next
Run:
./fabric/company/v1/fabric db:init --target .
./fabric/company/v1/fabric gate --target . --values ./fabric.values.json
Why
- db:init prepares the database/runtime baseline
- gate runs the final combined readiness check
If both pass, your project is cleanly bootstrapped and ready to continue in delivery mode. The Fabric runtime defines db:init and gate exactly for that purpose.


## What to do after that:
Open and read:
- docs/product/current-slice.yaml
- docs/product/backlog.yaml
## Customer testing

After `coder:implement-current-slice`, open `docs/testing/current-slice-user-checklist.md`.
This is the single customer-facing validation checklist for the active slice.







# NEW ONE
## Exact command sequence from fabric-only
// Backtrack to fabric only
bash scripts/reset-to-fabric-only.sh --yes --also-values

### BLOCK 1. Factory + brief stage
./fabric/company/v1/fabric init-factory --values ./fabric.values.json --target .
./fabric/company/v1/fabric init-factory --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:approve-brief --target . --values ./fabric.values.json
./fabric/company/v1/fabric format-from-brief --target .


// create the fabric init values first
> ./fabric/company/v1/fabric init-factory --values ./fabric.values.json --target .

// recreate the factory structure from the values file.
> ./fabric/company/v1/fabric init-factory --values ./fabric.values.json --target .

// comes before approval, because it checks or synthesizes the brief readiness state.
> ./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json

Then inspect:
- docs/product/project-brief.md
- docs/reviews/product-manager/brief-readiness-review.md
If that looks good:

// approve the project brief
Behavior now (pm:approve-brief)

1. Approves brief.
2. Creates/updates fabric.values.json.
3. Derives values from brief as before.
4. If unresolved consultable defaults remain:
  - If framing or architect role file is missing: warns and skips consult.
  - Else attempts architect LLM consult and applies safe recommendations.
5. Writes updated values and prints:
  - architect consult profile/model (if called),
  - architect-applied fields count,
  - remaining defaulted fields count.
> ./fabric/company/v1/fabric pm:approve-brief --target . --values ./fabric.values.json

// Gate check before scaffold:
// confirms docs/product/project-brief.md exists and has Brief Approval Status: approved. Confirms minimum input evidence exists: docs/product/intake-note.md with content, or at least one non-README file in docs/customer-input/.

Current behavior of ./fabric/company/v1/fabric format-from-brief --target .:
1. Dispatches to formatFromBrief with targetRoot=. (resolved absolute path) in fabric.mjs (line 163) and runtime.mjs (line 73).
2. Runs two gates only:
  - assertApprovedBrief(targetRoot) runtime.mjs (line 74), implemented in core.mjs (line 860)
  - assertMinimumCustomerInput(targetRoot) runtime.mjs (line 75), implemented in core.mjs (line 886)
3. “Approved brief” means:
  - docs/product/project-brief.md must exist.
  - Approval field must parse to approved via patterns in core.mjs (line 547):
    . Brief Approval Status: ... or
    . brief_approval_status: ...
4. “Minimum customer input” means:
  - non-empty docs/product/intake-note.md, or
  - at least one file under docs/customer-input/**, excluding README* (logic in core.mjs (line 877)).
5. On success: prints fabric format-from-brief: brief is approved, execution can proceed.
6. On failure: throws, CLI catches and exits 1 with fabric: <error> in fabric.mjs (line 211).
It does not write files, does not call LLM, and does not use fabric.values.json.
> ./fabric/company/v1/fabric format-from-brief --target .

### BLOCK 2. Bootstrap execution stage
./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json
./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json



// The main bootstrap/instantiation phase. Runs full artifact generation from Fabric templates using our values file. Materializes/refreshes the governed project state from Fabric.

1. Loads manifest + values and validates tokens (required_tokens and template tokens for scaffold entries).
2. Takes source_of_truth entries and excludes:
  - docs/product/product-system-framing.md
  - docs/product/backlog.yaml
  - docs/product/current-slice.yaml
3. Renders the remaining templates with fabric.values.json and writes them with generated metadata headers.
4. Refuses to overwrite non-generated existing files unless you pass --force.
5. Prints generated file count + paths.
No LLM call happens in scaffold.
> ./fabric/company/v1/fabric scaffold --target . --values ./fabric.values.json

// Create the initial delivery slice plan from the approved brief. Must happen before the coder flow, because coder:prepare-current-slice needs a current slice. Reads docs/product/project-brief.md (must be approved).
Derives 3–6 MVP slice titles/objectives.
- rewrites docs/product/backlog.yaml with planned slices, 
- rewrites docs/product/current-slice.yaml with the first active slice, 
- updates .system/project-manifest.yaml status fields to align with that active slice.
- Sets slice contracts (scope, acceptance criteria, dependencies, done definition) so delivery commands can run.
> ./fabric/company/v1/fabric pm:plan-slices --target . --values ./fabric.values.json

// Auto-generates the two bootstrap PM review artifacts and assigns machine-readable assessments. Turns review templates/scaffolds into final review decisions.
> ./fabric/company/v1/fabric pm:finalize-bootstrap-reviews --target . --values ./fabric.values.json

// officially ends bootstrap and switches the project into delivery mode. Validates both bootstrap PM review files are present, approved, and placeholder-free.
> ./fabric/company/v1/fabric pm:bootstrap-signoff --target . --values ./fabric.values.json


### BLOCK 3. Delivery prep + implementation stage
./fabric/company/v1/fabric architect:finalize-baseline --target . --values ./fabric.values.json
./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target . --values ./fabric.values.json
./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json
npm install
npm run dev


# 3.1
// Generates the active slice’s architecture contract and refreshes the slice checklist. Reads docs/product/current-slice.yaml (active slice), plus brief/framing context if present. Writes docs/architecture/baseline.md with slice-specific architecture guidance. Rewrites the active slice testing checklist at docs/testing/<SLICE_ID>-user-checklist.md. Marks the output as ready for implementation (via command output and artifact content).
> ./fabric/company/v1/fabric architect:finalize-baseline --target . --values ./fabric.values.json

# 3.2
// Generates the active slice’s UX flow spec and refreshes that slice’s checklist. Reads the active slice (docs/product/current-slice.yaml) plus brief/framing context. Writes a slice-specific UX flow file at: docs/ux/<SLICE_ID>-current-slice-flow.md
Rewrites the active slice testing checklist: docs/testing/<SLICE_ID>-user-checklist.md
Marks the slice UX artifact as ready for implementation.
> ./fabric/company/v1/fabric uiux:finalize-current-slice-flow --target . --values ./fabric.values.json

# 3.3
// Initializes your project’s DB baseline artifacts and DB-related scripts.
> ./fabric/company/v1/fabric db:init --target . --values ./fabric.values.json


### BLOCK 4. Implement, test, close
# 4.1 Prepare code implementation
// Prepares governance + execution artifacts and officially starts implementation for the active slice.
> ./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json

# 4.2 Implement the code
// Creates the concrete code artifacts for the current slice (not just planning docs).
> ./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json

# 4.3 Test the implementation in the UI
- npm install
- npm run dev

# 4.4) Close current slice (strict closeout gate)
// Performs strict closeout checks and marks the active slice completed if all pass. Formal quality gate that closes the slice.
> ./fabric/company/v1/fabric coder:close-current-slice --target . --values ./fabric.values.json

# 4.5) Pre-advance stability check (optional but recommended) 
> ./fabric/company/v1/fabric gate --target . --values ./fabric.values.json

# 4.6) Advance to next slice
// Activates the next slice in the backlog. Moves the workflow pointer from finished slice N to slice N+1.
> ./fabric/company/v1/fabric orchestrator:advance-slice --target . --values ./fabric.values.json

# 4.7) Post-transition stability check (recommended)
// Runs the full readiness gate: validate then doctor. If either fails, gate fails with detailed issues. Validates the post-transition state (including that advance didn’t introduce inconsistency).
> ./fabric/company/v1/fabric gate --target . --values ./fabric.values.json



### Then repeat this block for each next active slice:
./fabric/company/v1/fabric coder:prepare-current-slice --target . --values ./fabric.values.json
./fabric/company/v1/fabric coder:implement-current-slice --target . --values ./fabric.values.json

// Test here

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
- `openai` via the official `openai` JavaScript SDK and the Responses API
- `stdio_json` for a local wrapper process that accepts JSON on stdin and returns JSON on stdout

### Setup
1. Install the OpenAI SDK in the target repo: `npm install openai`
2. Export your API key: `export OPENAI_API_KEY=...`
3. Set `intake_llm_enabled` to `true` in `fabric.values.json`
   - Optional (defaults shown):
   - `intake_llm_brief_quality_gate: true`
   - `intake_llm_brief_retry_count: 1`
   - `intake_llm_semantic_clarity_gate: true` (alias: `intake_llm_semantic_scope_gate`)
4. Run `./fabric/company/v1/fabric llm:check --target . --values ./fabric.values.json`
5. Run `./fabric/company/v1/fabric pm:brief-readiness --target . --values ./fabric.values.json`

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
