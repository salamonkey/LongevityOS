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
    "issue_type": "slice_not_exposed",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/App.jsx",
    "slot": "primary_heading",
    "observed": "The current app only renders onboarding and plan views. The vaccination tracking area component is not routed or linked from the active user flow, so users cannot reach a dedicated Vaccinations screen with its own due guidance and add-entry action.",
    "required": "/"
  },
  {
    "index": 2,
    "issue_type": "mechanical_record_framing",
    "severity": "warning",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/features/vaccination-tracking-area-and-manual-entries/VaccinationTrackingAreaAndManualEntries.jsx",
    "slot": "status_context",
    "observed": "The confirmation copy 'Vaccination entry saved and added to your records.' emphasizes system storage and broad record-keeping. That wording is less aligned with the slice’s preventive tracking purpose and risks implying a medical-record experience.",
    "required": "/"
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
