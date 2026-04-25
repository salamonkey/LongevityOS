<!-- generated_from: method/bootstrap-runbook.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-25T05:05:32.044Z -->
# Bootstrap Runbook (New Project)

Use this runbook to initialize a new project using only `fabric/company/v1/*`.

## Lifecycle

Use a strict four-phase lifecycle:

1. `init-factory`: instantiate project-agnostic factory operating components.
2. `format-from-brief`: require approved customer project brief.
3. `scaffold` (or `instantiate`): generate execution/governance scaffolding artifacts.
4. `pm:plan-slices` + `pm:bootstrap-signoff`: create delivery-ready slice plan and transition to delivery mode.

## 1. Prepare Inputs

Collect values for all required tokens listed in `README.md` under "Token Conventions".

Minimum required inputs:

- `project_id`, `project_name`, `project_summary`, `generated_at_utc`
- Product inputs: `product_type`, `primary_goal`, users, workflow steps, concepts
- Scope inputs: v1 priorities and out-of-scope items
- Stack inputs: backend/frontend/database/orm, architecture preference
- Command/path inputs: migration and release commands, review/checkpoint template paths

## 2. Initialize Factory

Run:

`./fabric/company/v1/fabric init-factory --values <project-root>/fabric.values.json --target <project-root>`

## 3. Run PM Bootstrap Sequence

After placing customer files in `docs/customer-input/`, run:

1. `./fabric/company/v1/fabric pm:intake --target <project-root>`
2. `./fabric/company/v1/fabric pm:brief-readiness --target <project-root>`
3. `./fabric/company/v1/fabric pm:brief-draft --target <project-root>`
4. `./fabric/company/v1/fabric pm:brief-approve --target <project-root>`
5. `./fabric/company/v1/fabric pm:derive-values --target <project-root>`

Then validate the brief gate:

`./fabric/company/v1/fabric format-from-brief --target <project-root>`

## 4. Generate Execution Artifacts

Run:

`./fabric/company/v1/fabric scaffold --values <project-root>/fabric.values.json --target <project-root>`

This generates the execution/governance foundation files:

1. `.system/project-description.yaml`
2. `.system/project-manifest.yaml`
3. `.system/artifact-registry.yaml`
4. `.system/workflow-rules.yaml`

## 5. Create Core Product Artifacts

Generate delivery-ready product planning artifacts:

`./fabric/company/v1/fabric pm:plan-slices --target <project-root> --values <project-root>/fabric.values.json`

This creates:

1. `docs/product/backlog.yaml`
2. `docs/product/current-slice.yaml`

## 6. Create Review and Delivery Templates

Create project copies from fabric templates:

- `docs/templates/customer-checkpoint-template.md`
- `docs/templates/slice-closeout-review-template.md`
- `docs/reviews/product-manager/bootstrap-foundation-review.md`
- `docs/reviews/product-manager/bootstrap-backlog-slice-review.md`
- `docs/architecture/baseline.md` (if structural slice or invariants require it)
- `docs/ux/{slice_id}-current-slice-flow.md` (if slice has meaningful user-facing flow)
- `docs/implementation/{slice_id}-implementation-notes.md` (when implementation starts)
- `docs/operations/deployment-flow.md` (before first release process)

## 7. Run Bootstrap Reviews

Run Product Manager bootstrap reviews in order:

1. Foundation review for `.system` artifacts
2. Backlog/current-slice review

Record outcomes in:

- `docs/reviews/product-manager/bootstrap-foundation-review.md`
- `docs/reviews/product-manager/bootstrap-backlog-slice-review.md`

## 8. Transition to Delivery (Strict Gate)

After both bootstrap reviews are approved:

Run:

`./fabric/company/v1/fabric pm:bootstrap-signoff --target <project-root> --values <project-root>/fabric.values.json`

This command enforces:

- both bootstrap reviews exist and are `Assessment: approved`
- no unresolved template placeholders in required review artifacts
- atomic manifest transition (`bootstrap_status`, `current_mode`, `approved_reviews`)

## 9. Generate Delivery-Ready Initial Slice Plan

Run:

`./fabric/company/v1/fabric pm:plan-slices --target <project-root> --values <project-root>/fabric.values.json`

This command:

- generates an initial 5-8 slice backlog from the approved brief
- sets a non-placeholder active current slice (`planned`)
- synchronizes manifest active slice fields

## 10. Validate Fabric Conformance

Run through `fabric-validation-checklist.md` and confirm all sections pass.

Pay special attention to:

- drift between `.system/*` and fabric template contracts
- token substitutions and removal of project-specific placeholders
- manifest/backlog/current-slice state consistency
- strict gate result (`./fabric/company/v1/fabric gate --target <project-root> --values <project-root>/fabric.values.json`)

## 11. Ready Signal

Project bootstrap is complete only when all conditions are true:

- foundation artifacts exist and are coherent
- initial backlog/current slice exist and are reviewed
- bootstrap reviews are approved
- `pm:bootstrap-signoff` has succeeded
- `pm:plan-slices` has produced delivery-ready slices
- manifest mode is `delivery`
- `fabric gate` passes
