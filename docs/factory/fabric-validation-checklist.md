<!-- generated_from: method/fabric-validation-checklist.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-25T05:05:32.044Z -->
# Fabric Validation Checklist

Use this checklist when extracting or updating fabric to ensure it remains reusable, self-contained, and cleanly separated from project content.

## 1. Foundation Coverage

- [ ] Fabric includes templates for bootstrap foundation artifacts:
- [ ] `project-description.template.yaml`
- [ ] `project-manifest.template.yaml`
- [ ] `artifact-registry.template.yaml`
- [ ] `workflow-rules.template.yaml`

## 2. Governance Coverage

- [ ] Artifact registry template includes all reusable artifact types used in project governance.
- [ ] Workflow rules template includes bootstrap, delivery, release, checkpoint, escalation, and transition rules.
- [ ] Customer communication and review templates exist for readiness and closeout gates.

## 3. Token Contract

- [ ] Every `{{token}}` used in any template is documented in `fabric/company/v1/fabric.yaml` or package docs.
- [ ] No template uses hardcoded project-specific names, IDs, URLs, or commands that should be tokenized.

## 4. Separation Rules

- [ ] Fabric files are domain-neutral.
- [ ] Product-domain specifics remain in project artifacts under `.system/`, `docs/`, `src/`, `tests/`, `supabase/`.
- [ ] Project `docs/templates/*` do not diverge from canonical fabric sources in `fabric/company/v1/templates/*`.

## 5. Drift Checks

- [ ] `.system/workflow-rules.yaml` materially matches `fabric/company/v1/method/workflow-rules.template.yaml` after token substitution.
- [ ] `.system/artifact-registry.yaml` materially matches `fabric/company/v1/method/artifact-registry.template.yaml` after token substitution.
- [ ] `project-manifest` status fields are synchronized with `docs/product/current-slice.yaml` and backlog state.
- [ ] Bootstrap review artifacts are machine-readable (`Assessment: approved|revisions_required`) and free of unresolved placeholders before delivery mode.
- [ ] `fabric doctor` semantic checks pass (no scaffold-only slices and no delivery-mode-without-approved-reviews state).

## 6. Reuse Readiness Gate

- [ ] A new project can bootstrap using only `fabric/company/v1/*` plus project-specific values.
- [ ] No required governance artifact needs to be copied from prior project `docs/` files.
- [ ] Validation checklist passes before declaring fabric reusable for next project.
