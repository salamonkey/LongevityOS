# Semantic UX repair work order: SL-002 Health Plan Browsing and Item Detail

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
- `docs/ux/SL-002-semantic-ux-contract.json`
- `docs/reviews/ux/SL-002-semantic-ux-review.json`
- `docs/reviews/ux/SL-002-semantic-ux-review.md`
- `docs/implementation/SL-002-implementation-notes.md`
- Existing implementation files referenced by the findings.

## Finding selection
- Included blockers: 3
- Included warnings: 2
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
    "observed": "The main rendered screen shows user-visible internal/process language: \"Fabric app factory\", \"App shell ready\", and \"Run the current slice workflow to generate product-specific screens and Storybook stories.\" This violates the contract and does not tell the user anything about browsing checkups, vaccinations, or item details.",
    "required": ">? nope"
  },
  {
    "index": 3,
    "issue_type": "slice_not_surfaced",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/App.jsx",
    "slot": "primary_action",
    "observed": "The only apparent next step is an internal build instruction rather than a user action for the active slice. The health plan list/detail flow is not the surfaced experience, so users cannot understand recommended items, open detail, or navigate back as required.",
    "required": ">? nope"
  },
  {
    "index": 4,
    "issue_type": "generic_product_copy",
    "severity": "warning",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "index.html",
    "slot": "primary_heading",
    "observed": "The browser title is \"Fabric App\", which is generic/internal and not aligned to the preventive health plan experience.",
    "required": ">? nope"
  },
  {
    "index": 5,
    "issue_type": "generic_screen_label",
    "severity": "warning",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/features/health-plan-browsing-and-item-detail/HealthPlanBrowsingAndItemDetail.jsx",
    "slot": "primary_heading",
    "observed": "When detail is shown, the AppShell title is \"Item detail\". That is a generic component-style label rather than a user-task-specific heading; the item name is only secondary on the page.",
    "required": ">? nope"
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
