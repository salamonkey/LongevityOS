#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FABRIC="$ROOT/fabric/company/v1/fabric"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/fabric-runtime-smoke.XXXXXX")"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

run() {
  echo "+ $*"
  "$@"
}

run_expect_semantic_failure() {
  local status=0
  local output=''
  echo "+ $* (expecting semantic failure allowed)"
  set +e
  output="$("$@" 2>&1)"
  status=$?
  set -e
  echo "$output"
  if [[ $status -eq 0 ]]; then
    echo "Expected command to fail semantically, but it succeeded: $*" >&2
    exit 1
  fi
  if grep -Eq 'ReferenceError|TypeError|SyntaxError' <<<"$output"; then
    echo "Command failed with runtime exception instead of semantic gate failure: $*" >&2
    exit 1
  fi
}

assert_contains() {
  local file="$1"
  local expected="$2"
  if ! grep -Fq "$expected" "$file"; then
    echo "Expected '$expected' in $file" >&2
    exit 1
  fi
}

if [[ -f "$ROOT/fabric.values.json" ]]; then
  cp "$ROOT/fabric.values.json" "$TMP_DIR/fabric.values.json"
else
  cp "$ROOT/fabric/company/v1/fabric.values.example.json" "$TMP_DIR/fabric.values.json"
fi
node --input-type=module -e "import fs from 'node:fs'; const p=process.argv[1]; const v=JSON.parse(fs.readFileSync(p,'utf8')); v.llm_enabled=false; v.brief_draft_llm_enabled=false; v.pm_llm_enabled=false; v.planning_llm_enabled=false; v.architect_llm_enabled=false; v.coder_llm_enabled=false; fs.writeFileSync(p, JSON.stringify(v, null, 2)+'\\n', 'utf8');" "$TMP_DIR/fabric.values.json"
mkdir -p "$TMP_DIR/docs/product"
mkdir -p "$TMP_DIR/docs/customer-input"

cat > "$TMP_DIR/docs/customer-input/customer-request.md" <<'EOF'
# Customer Input

Need a coordinated workflow to track risk posture across teams.
Primary users are security operators and engineering leads.
MVP scope includes asset intake, risk registration, mitigation tracking, and milestone reporting.
EOF

cat > "$TMP_DIR/docs/product/intake-note.md" <<'EOF'
# Intake Note

Problem: Care teams cannot reliably track asset risk posture and control status across environments.
Outcome: Establish a single system that improves visibility, decision quality, and audit readiness.
Users: Security operators, compliance managers, and engineering leads are the primary audience.
MVP scope: Capture assets, register risks, track mitigations, and ship milestone-based reporting with clear acceptance criteria.
Constraints and non-negotiables: Existing deployment process, compliance obligations, and a fixed delivery timeline for launch readiness.
EOF

run "$FABRIC" init-factory --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"
run "$FABRIC" pm:intake --target "$TMP_DIR"
run "$FABRIC" pm:brief-readiness --target "$TMP_DIR"
run "$FABRIC" pm:brief-draft --target "$TMP_DIR"
run "$FABRIC" pm:brief-approve --target "$TMP_DIR"
run "$FABRIC" pm:derive-values --target "$TMP_DIR"
run "$FABRIC" format-from-brief --target "$TMP_DIR"
run "$FABRIC" execute --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"
run "$FABRIC" db:init --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json" --force
run "$FABRIC" coder:implement-current-slice --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"
assert_contains "$TMP_DIR/src/App.jsx" "import React, { useMemo, useState } from 'react';"
assert_contains "$TMP_DIR/src/features/onboarding/OnboardingPage.jsx" "import React, { useState } from 'react';"
assert_contains "$TMP_DIR/src/features/profile/ProfileForm.jsx" "import React, { useState } from 'react';"
assert_contains "$TMP_DIR/src/routes/onboarding.jsx" "import React from 'react';"
run "$FABRIC" validate --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"
run_expect_semantic_failure "$FABRIC" doctor --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"
run_expect_semantic_failure "$FABRIC" gate --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"

echo "runtime smoke: OK"
