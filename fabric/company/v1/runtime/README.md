
# Refactor strategy
Do this in 3 passes.

## Pass 1 — Extract without changing behavior
- Create modules and move code out, but keep command behavior identical.

For Pass 1, I would do a behavior-preserving extraction only. No logic redesign, no new abstractions beyond what is needed to move code into files, and no command-surface changes. Your current fabric.mjs already has fairly clear internal clusters: parsing and YAML loading, low-level FS helpers, brief-readiness analysis, brief approval, bootstrap signoff, slice planning, generation, validation, doctor checks, DB commands, and CLI dispatch.

### Recommended directory after Pass 1
runtime/
  fabric.mjs
  lib/
    cli.mjs
    constants.mjs
    io.mjs
    yaml-json.mjs
    text-parse.mjs
    manifest-values.mjs
    metadata.mjs
  commands/
    init-factory.mjs
    brief-readiness.mjs
    approve-brief.mjs
    bootstrap-signoff.mjs
    plan-slices.mjs
    format-from-brief.mjs
    instantiate.mjs
    validate.mjs
    doctor.mjs
    gate.mjs
    db.mjs

### What’s inside:
- runtime/fabric.mjs — same CLI entrypoint
- runtime/lib/constants.mjs
- runtime/lib/core.mjs
- runtime/commands/product.mjs
- runtime/commands/runtime.mjs

This is a Pass 1 extraction, so it is intentionally conservative:
- command names stay the same
- CLI usage stays the same
- behavior is intended to stay the same
- the code is split into modules, but not redesigned

How it’s split:
- lib/constants.mjs → paths and shared constants
- lib/core.mjs → file IO, parsing, manifest/values loading, rendering, generic helpers
- commands/product.mjs → brief readiness, brief approval, bootstrap signoff, slice planning
- commands/runtime.mjs → init, scaffold/instantiate, validate/doctor/gate, DB commands
- fabric.mjs → thin command dispatcher

One important note: this is a structure-first extraction, not a deep cleanup. It improves transparency immediately, but it does not yet normalize helper boundaries or reduce coupling between some product/runtime helpers. That is exactly what I’d leave for Pass 2.


## Pass 2 — Normalize shared utilities
Extract common logic:
- file IO
- YAML/JSON loading
- path resolution
- artifact writing
- status/error handling

## Pass 3 — Strengthen contracts
Introduce clearer interfaces:
- command context
- project root resolver
- artifact read/write helpers
- review/check result objects



Additional delivery preparation commands:
- `architect:generate-current-slice-baseline`
- `uiux:generate-current-slice-flow`
- `pm:finalize-bootstrap-reviews`
