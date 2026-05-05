# Semantic UX repair work order: SL-003 Item Completion and Reminder Actions

You are acting as the Coder role for a targeted Fabric repair run.
Repair the current implementation so the active slice passes semantic UX review.

## Repair scope
- Do not restart the slice.
- Do not redesign unrelated areas.
- Do not change the Fabric runtime, semantic reviewer, or review artifacts.
- Do not waive findings.
- Do not edit semantic UX review results manually.
- Do not merely edit tests to pass.
- Keep changes limited to files named in findings plus slice-local implementation targets, unless a minimal shared integration edit is explicitly necessary.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/ux/SL-003-semantic-ux-contract.json`
- `docs/reviews/ux/SL-003-semantic-ux-review.json`
- `docs/reviews/ux/SL-003-semantic-ux-review.md`
- `docs/implementation/SL-003-implementation-notes.md`
- Existing implementation files referenced by the findings.

## Finding selection
- Included blockers: 2
- Included warnings: 0
- Warning repair mode: included by operator flag

## Findings to fix
```json
[
  {
    "index": 1,
    "issue_type": "internal_factory_language_in_visible_copy",
    "severity": "blocker",
    "source": "deterministic",
    "confidence": "high",
    "visibility": "likely_visible",
    "file": "src/App.jsx",
    "slot": "jsx_text_node",
    "observed": "Run the current slice workflow to generate product-specific screens and Storybook stories.",
    "required": "Replace visible internal language 'slice' with user-facing wording."
  },
  {
    "index": 2,
    "issue_type": "internal_copy_exposed",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/App.jsx",
    "slot": "primary_heading",
    "observed": "The rendered screen shows 'Fabric app factory' and 'App shell ready', which are internal/generic labels and do not tell the user they can complete a health item or set a reminder.",
    "required": "true"
  }
]
```

## Repair rules
- Fix the implementation, not the review file.
- Preserve previously working user actions from earlier slices unless the active slice explicitly redefines them.
- Do not remove existing user-visible functionality as a side effect of semantic repair.
- User-facing copy must be meaningful to the end user.
- Do not expose internal process, slice, schema, test, route, payload, ranking, bucket, implementation, acceptance-criteria, or factory language in visible UI.
- Do not mention excluded features as internal limitations.
- Do not replace real UX issues with generic filler.
- Do not render malformed dates, raw enum values, undefined, null, NaN, Invalid Date, [object Object], or raw object/stringified data in visible UI.
- Use safe fallbacks for missing state.
- Preserve existing intended behavior and tests unless a test clearly encodes the rejected semantic behavior.

## Post-repair validation to run
```bash
npm test
npm run build
./fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ./fabric.values.json
./fabric/company/v1/fabric doctor --target . --values ./fabric.values.json
```

## Required final response
- Findings fixed
- Files changed
- Semantic review status after repair
- Test/build/doctor status
- Any remaining risks
