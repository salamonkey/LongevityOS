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

cp "$ROOT/fabric.values.json" "$TMP_DIR/fabric.values.json"
mkdir -p "$TMP_DIR/docs/product"

cat > "$TMP_DIR/docs/product/intake-note.md" <<'EOF'
# Intake Note

Problem: Care teams cannot reliably track asset risk posture and control status across environments.
Outcome: Establish a single system that improves visibility, decision quality, and audit readiness.
Users: Security operators, compliance managers, and engineering leads are the primary audience.
MVP scope: Capture assets, register risks, track mitigations, and ship milestone-based reporting with clear acceptance criteria.
Constraints and non-negotiables: Existing deployment process, compliance obligations, and a fixed delivery timeline for launch readiness.
EOF

run "$FABRIC" init-factory --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"
run "$FABRIC" pm:brief-readiness --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"
run "$FABRIC" pm:approve-brief --target "$TMP_DIR" --values "$TMP_DIR/fabric.values.json"
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
