# Semantic UX repair work order: SL-005 Family Onboarding and Family Overview

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
- `docs/ux/SL-005-semantic-ux-contract.json`
- `docs/reviews/ux/SL-005-semantic-ux-review.json`
- `docs/reviews/ux/SL-005-semantic-ux-review.md`
- `docs/implementation/SL-005-implementation-notes.md`
- Existing implementation files referenced by the findings.

## Finding selection
- Included blockers: 3
- Included warnings: 0
- Warning repair mode: included by operator flag

## Findings to fix
```json
[
  {
    "index": 1,
    "issue_type": "forbidden_visible_fragment",
    "severity": "blocker",
    "source": "deterministic",
    "confidence": "high",
    "visibility": "likely_visible",
    "file": "src/features/family-onboarding-and-family-overview/FamilyOnboardingAndFamilyOverview.jsx",
    "slot": "jsx_text_node",
    "observed": "profile.profileId === overview.profileId) ?? null; return (",
    "required": "Remove or replace forbidden visible fragment: null"
  },
  {
    "index": 2,
    "issue_type": "raw_error_or_debug_copy",
    "severity": "blocker",
    "source": "deterministic",
    "confidence": "high",
    "visibility": "likely_visible",
    "file": "src/features/family-onboarding-and-family-overview/FamilyOnboardingAndFamilyOverview.jsx",
    "slot": "jsx_text_node",
    "observed": "profile.profileId === overview.profileId) ?? null; return (",
    "required": "Replace raw debug/nullish values with safe user-facing fallback copy."
  },
  {
    "index": 3,
    "issue_type": "slice_surface_not_exposed",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/App.jsx",
    "slot": "primary_heading",
    "observed": "The app only switches between onboarding, plan, and vaccinations views and never renders the FamilyOnboardingAndFamilyOverview surface. Users therefore do not see any family-specific screen heading or family overview entry point for this slice.",
    "required": "must be valid JSON? no extra props not allowed"
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
