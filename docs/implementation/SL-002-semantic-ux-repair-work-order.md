# Semantic UX repair work order: SL-002 Health Item Detail and Completion

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
- Included blockers: 1
- Included warnings: 0
- Warning repair mode: not included unless needed to fix blockers

## Findings to fix
```json
[
  {
    "index": 1,
    "issue_type": "mechanistic_rationale_copy",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/features/profile/profilePlan.js",
    "slot": "explanation_or_rationale",
    "observed": "Several generated 'Why it matters' strings are not semantically fit for end users because they explain prioritization/planning mechanics rather than why the health action matters. Examples include 'A quick check helps keep the highest-priority items visible.' and 'A simple lab review keeps next steps easy to prioritize.' These strings appear in item detail views, so the required rationale content fails for some items instead of 100% of items.",
    "required": "visible"
  }
]
```

## Repair rules
- Fix the implementation, not the review file.
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
