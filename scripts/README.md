Created and tested: scripts/reset-to-fabric-only.sh

Use it like this:

# Dry run (safe, no deletion)
bash scripts/reset-to-fabric-only.sh

# Apply reset of generated fabric outputs
bash scripts/reset-to-fabric-only.sh --yes

# Also remove fabric values files
bash scripts/reset-to-fabric-only.sh --yes --also-values

# Full wipe back to fabric-only (including raw customer input docs)
bash scripts/reset-to-fabric-only.sh --yes --also-values --nuke-inputs

Notes:
- It deletes targets from fabric/company/v1/fabric.json (factory_init_source_of_truth + source_of_truth), plus quick-start review extras.
- Default is dry-run so you can inspect exactly what will be removed first.

Runtime quality checks:

- `bash scripts/runtime-smoke.sh` runs a temp-project smoke flow across runtime commands.
- `bash scripts/pm-semantics-smoke.sh` verifies PM lifecycle semantics:
  - `pm:brief-readiness` does not generate `docs/product/project-brief.md`
  - `pm:brief-draft` is the generator
  - `pm:brief-approve` fails when draft is missing
  - `pm:derive-values` fails when approved brief is missing
