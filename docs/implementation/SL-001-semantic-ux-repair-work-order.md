# Semantic UX repair work order: SL-001 Self Onboarding to First Dashboard

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
- `docs/ux/SL-001-semantic-ux-contract.json`
- `docs/reviews/ux/SL-001-semantic-ux-review.json`
- `docs/reviews/ux/SL-001-semantic-ux-review.md`
- `docs/implementation/SL-001-implementation-notes.md`
- Existing implementation files referenced by the findings.

## Finding selection
- Included blockers: 4
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
    "issue_type": "internal_placeholder_copy",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/App.jsx",
    "slot": "primary_heading",
    "observed": "The live app entry shows 'Fabric app factory' and 'App shell ready', which are generic internal labels and do not tell a user they can set up a preventive plan or reach a dashboard.",
    "required": "no"
  },
  {
    "index": 3,
    "issue_type": "internal_workflow_exposure",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/App.jsx",
    "slot": "explanation_or_rationale",
    "observed": "Visible copy says 'Run the current slice workflow to generate product-specific screens and Storybook stories.', exposing internal workflow and test language that the contract explicitly forbids in user UI.",
    "required": "no"
  },
  {
    "index": 4,
    "issue_type": "missing_user_action",
    "severity": "blocker",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/App.jsx",
    "slot": "primary_action",
    "observed": "The rendered entry screen provides no user-facing primary action such as starting onboarding or generating a plan, so the next step is not clear for a new user.",
    "required": "no"
  },
  {
    "index": 5,
    "issue_type": "generic_internal_title",
    "severity": "warning",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "index.html",
    "slot": "primary_heading",
    "observed": "The document title is 'Fabric App', which is generic and internally framed rather than aligned to the preventive health onboarding experience.",
    "required": "no"
  },
  {
    "index": 6,
    "issue_type": "system_mechanics_copy",
    "severity": "warning",
    "source": "llm",
    "confidence": "",
    "visibility": "",
    "file": "src/features/self-onboarding-to-first-dashboard/components.jsx",
    "slot": "explanation_or_rationale",
    "observed": "The Health Score card says 'Your score reflects how many upcoming items are already planned.' This explains internal scoring mechanics more than user value or practical meaning.",
    "required": "no"
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
