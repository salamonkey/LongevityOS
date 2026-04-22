#!/usr/bin/env bash
set -eo pipefail

usage() {
  cat <<'EOF'
Reset this repo back to a "fabric-only" baseline by deleting generated outputs.

Default mode is DRY RUN (no files are deleted).

Usage:
  scripts/reset-to-fabric-only.sh [options]

Options:
  --yes                Execute deletion (required to actually delete)
  --also-values        Also remove fabric.values.json / fabric.values.yaml
  --nuke-inputs        Also remove docs/customer-input/ (raw customer files)
  --root <path>        Repo root (default: current directory)
  --manifest <path>    Fabric manifest path (default: fabric/company/v1/fabric.json)
  -h, --help           Show this help

Examples:
  scripts/reset-to-fabric-only.sh
  scripts/reset-to-fabric-only.sh --yes
  scripts/reset-to-fabric-only.sh --yes --also-values --nuke-inputs
EOF
}

ROOT="."
MANIFEST_REL="fabric/company/v1/fabric.json"
APPLY=0
ALSO_VALUES=0
NUKE_INPUTS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      APPLY=1
      shift
      ;;
    --also-values)
      ALSO_VALUES=1
      shift
      ;;
    --nuke-inputs)
      NUKE_INPUTS=1
      shift
      ;;
    --root)
      ROOT="${2:-}"
      shift 2
      ;;
    --manifest)
      MANIFEST_REL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

ROOT="$(cd "$ROOT" && pwd)"
MANIFEST_PATH="$ROOT/$MANIFEST_REL"

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "Manifest not found: $MANIFEST_PATH" >&2
  exit 1
fi

if [[ ! -d "$ROOT/fabric/company/v1" ]]; then
  echo "Expected fabric package missing at: $ROOT/fabric/company/v1" >&2
  exit 1
fi

TARGETS="$(
  node - "$MANIFEST_PATH" <<'NODE'
const fs = require('fs');
const manifestPath = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entries = [
  ...(manifest.factory_init_source_of_truth || []),
  ...(manifest.source_of_truth || []),
];
const uniqueTargets = [...new Set(entries.map((e) => e.target).filter(Boolean))].sort();
for (const target of uniqueTargets) {
  process.stdout.write(`${target}\n`);
}
NODE
)"

declare -a DELETE_PATHS=()

has_path() {
  local needle="$1"
  local item
  for item in "${DELETE_PATHS[@]-}"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

add_path() {
  local abs="$1"
  if has_path "$abs"; then
    return
  fi
  if [[ -e "$abs" || -L "$abs" ]]; then
    DELETE_PATHS+=("$abs")
  fi
}

add_rel_path() {
  local rel="$1"
  [[ -z "$rel" ]] && return
  if [[ "$rel" = /* || "$rel" == *".."* ]]; then
    echo "Unsafe target path, aborting: $rel" >&2
    exit 1
  fi
  add_path "$ROOT/$rel"
}

while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  add_rel_path "$rel"
done <<< "$TARGETS"

# Common generated artifacts that may not be explicitly listed in the manifest
# but should still be removed for a true fabric-only reset.
declare -a EXTRA_GENERATED_REL_PATHS=(
  "docs/product"
  "docs/architecture"
  "docs/ux"
  "docs/implementation"
  "docs/testing"
  "docs/reviews/product-manager"
  "docs/reviews/architect"
  "docs/reviews/uiux"
  "docs/reviews/coder"
  ".system"
  "src"
  "tests"
  "supabase"
  "dist"
  "coverage"
  "node_modules"
  "index.html"
  "package.json"
  "package-lock.json"
  "pnpm-lock.yaml"
  "yarn.lock"
  "vite.config.js"
  "vite.config.mjs"
  "vite.config.ts"
  ".env"
  ".env.local"
  ".env.example"
)

for rel in "${EXTRA_GENERATED_REL_PATHS[@]}"; do
  add_rel_path "$rel"
done

if [[ "$ALSO_VALUES" -eq 1 ]]; then
  add_path "$ROOT/fabric.values.json"
  add_path "$ROOT/fabric.values.yaml"
fi

if [[ "$NUKE_INPUTS" -eq 1 ]]; then
  add_path "$ROOT/docs/customer-input"
fi

if [[ ${#DELETE_PATHS[@]:-0} -eq 0 ]]; then
  echo "Nothing to delete. Repo is already clean for the selected options."
  exit 0
fi

printf "\nPaths selected for deletion (%d):\n" "${#DELETE_PATHS[@]}"
for abs in "${DELETE_PATHS[@]-}"; do
  rel="${abs#$ROOT/}"
  if [[ "$abs" == "$ROOT" ]]; then
    rel="."
  fi
  printf " - %s\n" "$rel"
done
echo

if [[ "$APPLY" -ne 1 ]]; then
  echo "Dry run only. Re-run with --yes to apply."
  exit 0
fi

for abs in "${DELETE_PATHS[@]-}"; do
  rm -rf "$abs"
done

prune_empty_upwards() {
  local dir="$1"
  while [[ "$dir" != "$ROOT" && "$dir" != "/" ]]; do
    if rmdir "$dir" 2>/dev/null; then
      dir="$(dirname "$dir")"
    else
      break
    fi
  done
}

for abs in "${DELETE_PATHS[@]}"; do
  prune_empty_upwards "$(dirname "$abs")"
done

mkdir -p "$ROOT/docs/reviews"
if [[ "$NUKE_INPUTS" -ne 1 ]]; then
  mkdir -p "$ROOT/docs/customer-input"
fi

echo "Reset complete."