# Semantic UX repair work order: SL-004 Vaccination Tracking Area and Manual Entries

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
- `docs/ux/SL-004-semantic-ux-contract.json`
- `docs/reviews/ux/SL-004-semantic-ux-review.json`
- `docs/reviews/ux/SL-004-semantic-ux-review.md`
- `docs/implementation/SL-004-implementation-notes.md`
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
    "issue_type": "context_loss_navigation",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/features/health-plan-browsing-and-item-detail/HealthPlanBrowsingAndItemDetail.jsx",
    "slot": "related_detail_return",
    "observed": "When a user opens a vaccination item detail from the Vaccinations area, the Back action resolves to the generic plan's Vaccinations tab instead of returning to the dedicated Vaccinations tracker. This loses the original vaccination-area context rather than preserving it in-session as the slice requires.",
    "required": "No"
  },
  {
    "index": 2,
    "issue_type": "ambiguous_field_copy",
    "severity": "warning",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/features/vaccination-tracking-area-and-manual-entries/VaccinationTrackingAreaAndManualEntries.jsx",
    "slot": "status_context",
    "observed": "The manual-entry form labels the required date field only as 'Date'. Because the same field is used for both completed and planned statuses, the copy does not clearly tell the user whether they should enter the date received or the planned date.",
    "required": "No"
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
