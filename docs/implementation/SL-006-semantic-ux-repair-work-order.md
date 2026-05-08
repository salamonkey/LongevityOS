# Semantic UX repair work order: SL-006 Profile Area and Household Preferences

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
- `docs/ux/SL-006-semantic-ux-contract.json`
- `docs/reviews/ux/SL-006-semantic-ux-review.json`
- `docs/reviews/ux/SL-006-semantic-ux-review.md`
- `docs/implementation/SL-006-implementation-notes.md`
- Existing implementation files referenced by the findings.

## Finding selection
- Included blockers: 1
- Included warnings: 1
- Warning repair mode: included by operator flag

## Findings to fix
```json
[
  {
    "index": 1,
    "issue_type": "missing_required_copy",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/features/profile-area-and-household-preferences/ProfileAreaAndHouseholdPreferences.jsx",
    "slot": "explanation_or_rationale",
    "observed": "The provided slice implementation shows task actions, validation, and status state, but no visible plain-language rationale explaining the user value of updating a profile or choosing reminder preferences. The contract requires concise, trust-building rationale copy rather than only mechanics and controls.",
    "required": "true"
  },
  {
    "index": 2,
    "issue_type": "ambiguous_copy",
    "severity": "warning",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/features/profile-area-and-household-preferences/model.js",
    "slot": "status_context",
    "observed": "Default reminder timing labels are defined as '1 month before' and '3 months before'. Without explicit context such as 'before a due item' or similar, the wording is incomplete and may leave users unsure what the timing is relative to.",
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
