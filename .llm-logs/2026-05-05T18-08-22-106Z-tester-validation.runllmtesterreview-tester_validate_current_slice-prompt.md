# LLM Prompt Log

- task: tester_validate_current_slice
- caller: tester-validation.runLlmTesterReview
- provider: openai
- model: gpt-5.4
- started_utc: 2026-05-05T18:08:22.106Z
- prompt_chars: 37738
- prompt_estimated_tokens: 9435
- prompt_sources:
  - docs/product/current-slice.yaml
  - docs/testing/SL-005-user-checklist.md
  - docs/implementation/SL-005-implementation-notes.md
  - docs/reviews/ux/SL-005-semantic-ux-review.json
  - docs/ux/SL-005-semantic-ux-contract.json
  - .system/factory/execution-ledger.jsonl
  - .system/factory/work-orders/SL-005-coder-codex.md
  - src/routes/family-onboarding-and-family-overview.jsx
  - src/main.jsx
  - src/App.jsx
  - team/tester.md

## System Prompt
```text
You are the Tester role in a virtual software company.
Validate whether the current implementation satisfies the checklist items.
Enforce carry-forward behavior from previously passed slices unless explicitly redefined by the current slice.
Return JSON only according to the schema.
Do not invent scope outside the checklist and slice objective.
If something is clearly missing or regressed, produce a finding.
Use classification A for defects, B for UX/content quality issues, C for requirement-gap-like ambiguity.
```

## User Prompt
```text
Slice ID: SL-005
Slice Title: Family Onboarding and Family Overview

Tester role contract (source: team/tester.md):


Checklist (docs/testing/SL-005-user-checklist.md):
# Current Slice User Checklist

## Slice
- ID: SL-005
- Title: Family Onboarding and Family Overview

## Goal
Allow one account to manage multiple people with separate preventive plans, summaries, and navigation paths.

## Preconditions
- App is running locally.
- User starts from a fresh session unless noted otherwise.
- Required demo or seed data is available if needed.

## What to test
1. Entry: Primary entry starts in onboarding immediately after the self-profile age and gender step. Secondary entry for existing users starts from the main navigation item labeled Family.
2. Expected behavior:
3. After the self profile is captured, onboarding shows a dedicated optional step titled for adding family profiles. The screen explains that the account can manage multiple people in one place and that this step can be skipped.
4. The onboarding family step presents two clear actions: a primary action to continue without adding anyone else, and a secondary action to add a family profile. Skipping must not block reaching the first dashboard.
5. Choosing to add a family profile opens the same create-profile form used elsewhere in this slice. The form contains only three fields: display label, age, and gender.
6. Submitting a valid family profile creates the profile, generates that profile's plan immediately, and returns the user to the onboarding family step with the new profile shown in a simple list of added profiles and a visible profile count such as 2 of 5.
7. From the onboarding family step, the user can add another profile, remove nothing, edit nothing, and finish onboarding at any time. When the account reaches 5 total profiles, the add action becomes unavailable and the limit message is shown in place.
8. If the user finishes onboarding with only the self profile, the product follows the existing dependency flow and lands on that profile's dashboard.

## Expected results
- App loads without blank screen or runtime error.
- A family account can create and view at least 2 profiles with separate Health Scores and priority lists
- The account cannot exceed 5 profiles
- Onboarding offers family profile creation without blocking the self-profile flow
- A user can open any family member's dashboard, checkup plan, and vaccinations from the family overview and see person-specific content

## Carry-forward capabilities to preserve (auto-inherited)
- [SL-001] Self Onboarding to First Dashboard
  - A new user can complete onboarding and reach a populated dashboard in 60 seconds or less in a standard moderated walkthrough
  - The first health plan is generated within 5 seconds of onboarding completion
  - Every generated item comes from the locked MVP preventive item set and is assigned to checkups or vaccinations
  - The dashboard shows Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage for the self profile
  - Entry: User opens the first-run onboarding screen for the self profile in an unauthenticated or pre-established current-user context; no family, settings, or alternate destinations are shown in this slice.
  - Expected behavior:
  - Onboarding screen purpose: collect the minimum required inputs and set expectation that a personalized preventive plan will be created immediately after submission.
  - Onboarding layout is a single vertical form with two required fields and one primary action. Sections in order: brief value statement, age field, gender field, primary submit button.
- [SL-002] Health Plan Browsing and Item Detail
  - Every generated health item is visible in a plan view and opens into a detail view
  - 100% of generated health items show a recommendation cadence, one current status, and a why-it-matters explanation
  - A user can open any dashboard-highlighted item into detail and return to the prior view without losing context
  - Item detail copy uses plain-language rationale rather than clinical detail
  - Entry: User enters the current slice from the primary application flow.
  - Expected behavior:
  - Complete the slice objective in the smallest coherent flow.
  - Handle one clear recovery path for invalid or incomplete user action.
- [SL-003] Item Completion and Reminder Actions
  - A user can mark an item as done from the detail view and see status change to done across all relevant views in the same session
  - A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion
  - Setting a reminder changes the item status to planned across the applicable views in the same session
  - After a status change, the dashboard updates the highlighted next item based on the approved Today-then-Soon rule
  - Entry: User opens a health item detail view for the active profile from the dashboard or a plan list and sees the item title, why-it-matters content, recommendation cadence, current status, and available primary actions.
  - Expected behavior:
  - On detail load, show the current item status as one of due, planned, or done using the existing product status presentation; do not introduce any new labels or reminder-only status.
  - If the item status is due or planned, show two actions in the detail action area: a primary 'Mark as done' action and a secondary 'Set reminder' action.
- [SL-004] Vaccination Tracking Area and Manual Entries
  - A user can add at least 1 manual vaccination entry to the self profile and see it appear in that profile's vaccination list in the same session
  - The vaccination area shows rule-based due guidance for the self profile without implying provider data sync
  - A vaccination entry captures both a date and status context
  - The vaccination list supports empty and populated states without breaking access to due guidance
  - The dashboard or health-plan view appears when the flow is completed.
  - Entry: User is in the self profile context and opens the Vaccinations area from an existing self-scope entry point such as the dashboard or health plan.
  - Expected behavior:
  - Render a dedicated page titled for the self profile vaccination experience, with a clear primary action to add a vaccination entry and no profile switcher on this slice.

## Fail conditions
- Blank page or broken layout.
- Required input cannot be completed.
- Primary action does nothing or leads to an error.
- App crashes during the flow.
- Expected next state for Family Onboarding and Family Overview does not appear.

## Out of scope for this slice
- Profile editing beyond initial creation
- Archive and delete profile actions
- Multi-user permissions or shared account roles
- Cross-profile combined scoring

## Result
Status: Pending

Use one of:
- Pending
- Pass
- Fail

## Manual QA Findings

Use this section when manual review finds something that should be repaired before closeout.
If the checklist passes, leave this section as `None.`

None.

### Finding 1

Classification:
- [ ] A. Bug / implementation defect — existing requirement is clear, implementation is wrong.
- [ ] B. UX/content quality issue — behavior works, but copy/interaction is not good enough.
- [ ] C. Requirement gap — expectation is valid, but current slice artifacts do not state it clearly.

Finding:
-

Expected:
-

Observed:
-

Required repair:
-

Checklist What-to-test items (8):
1. Entry: Primary entry starts in onboarding immediately after the self-profile age and gender step. Secondary entry for existing users starts from the main navigation item labeled Family.
2. Expected behavior:
3. After the self profile is captured, onboarding shows a dedicated optional step titled for adding family profiles. The screen explains that the account can manage multiple people in one place and that this step can be skipped.
4. The onboarding family step presents two clear actions: a primary action to continue without adding anyone else, and a secondary action to add a family profile. Skipping must not block reaching the first dashboard.
5. Choosing to add a family profile opens the same create-profile form used elsewhere in this slice. The form contains only three fields: display label, age, and gender.
6. Submitting a valid family profile creates the profile, generates that profile's plan immediately, and returns the user to the onboarding family step with the new profile shown in a simple list of added profiles and a visible profile count such as 2 of 5.
7. From the onboarding family step, the user can add another profile, remove nothing, edit nothing, and finish onboarding at any time. When the account reaches 5 total profiles, the add action becomes unavailable and the limit message is shown in place.
8. If the user finishes onboarding with only the self profile, the product follows the existing dependency flow and lands on that profile's dashboard.

Implementation notes (docs/implementation/SL-005-implementation-notes.md):
<!-- generated_from: templates/implementation-notes-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-05T17:57:44.470Z -->
# Current Slice Implementation Notes

Date: `2026-05-05`
Slice: `SL-005 - Family Onboarding and Family Overview`
Status: `Implemented`

## 1. Handoff Context
- Self onboarding to first dashboard
- Health plan browsing and item detail
- Item completion and reminder actions
- Vaccination tracking area and manual entries
- In scope: Optional family profile creation during onboarding in the same account
- In scope: Create additional profiles after onboarding, up to a maximum of 5 total profiles per account
- In scope: Generate a separate rule-based plan, dashboard, and vaccination list for each profile from age and gender
- In scope: Family overview showing each profile's Health Score and due-item summary
- In scope: Open each family member's dashboard, checkup plan, and vaccinations from the family overview

## 2. Slice Objective

Allow one account to manage multiple people with separate preventive plans, summaries, and navigation paths.

## 3. File and Module Targets
- src/features/family-onboarding-and-family-overview/
- src/routes/family-onboarding-and-family-overview*
- tests/family-onboarding-and-family-overview/
- supabase/migrations/ (if schema change is required)

## 4. Completed Scope
- Not closed yet. Use this section to track completed items during implementation.

## 5. Changed Files
- .system/factory/execution-ledger.jsonl
- .system/factory/work-orders/SL-005-coder-codex.md
- src/routes/family-onboarding-and-family-overview.jsx
- tests/family-onboarding-and-family-overview/

## 6. Verification Evidence Summary
- Delegated implementation to Codex CLI using a Fabric-generated work order.
- Captured Codex result and changed files in the execution ledger.
- Changed files passed the Fabric allowed-path policy.

## 7. Execution Notes
- This command used Codex as the implementation worker and Fabric as the orchestrator/validator.
- Work order: .system/factory/work-orders/SL-005-coder-codex.md
- Codex exit status: 0

## 8. Next Execution Steps
1. Inspect the git diff created by Codex.
2. Run npm test and npm run build if Codex did not already run them successfully.
3. Run uiux:review-current-slice-semantics after verifying the slice locally.
4. Run coder:close-current-slice only after semantic UX review passes.

Semantic UX review (docs/reviews/ux/SL-005-semantic-ux-review.json):
{
  "schema_version": 1,
  "generated_at_utc": "2026-05-05T18:07:31.543Z",
  "slice_id": "SL-005",
  "slice_title": "Family Onboarding and Family Overview",
  "status": "pass",
  "summary": "Available user-facing copy for the family onboarding and family overview slice appears semantically fit: it uses plain language for adding profiles, profile limits, per-person context, and recovery states, while avoiding internal implementation terms and unsafe raw data output.",
  "contract": "docs/ux/SL-005-semantic-ux-contract.json",
  "deterministic_findings_count": 0,
  "llm_enabled": true,
  "llm_required": true,
  "llm_status": "pass",
  "llm_reviewer": "openai/gpt-5.4",
  "findings": []
}

Semantic UX contract (docs/ux/SL-005-semantic-ux-contract.json):
{
  "schema_version": 1,
  "generated_at_utc": "2026-05-05T15:31:06.802Z",
  "slice_id": "SL-005",
  "slice_title": "Family Onboarding and Family Overview",
  "surface_type": "user_facing",
  "global_rules": {
    "must": [
      "Use user-facing language that makes sense without internal project context.",
      "Explain user value rather than system mechanics where explanatory copy is required.",
      "Keep wording concise, concrete, and aligned to the active slice.",
      "Use safe fallback copy when data is missing or unknown.",
      "Render dates, times, counts, and statuses in valid human-readable form."
    ],
    "must_not": [
      "Expose internal workflow, slice, acceptance, schema, payload, routing, component, ranking, bucket, test, or implementation language in visible UI.",
      "Use placeholder, TODO, TBD, lorem ipsum, generic filler, or template copy as final visible UI.",
      "Render undefined, null, NaN, Invalid Date, [object Object], raw enum values, raw calculation output, or malformed years.",
      "Satisfy acceptance criteria only structurally while failing the user-facing purpose."
    ]
  },
  "visible_content_slots": [
    {
      "slot": "primary_heading",
      "purpose": "Tell the user what this screen, flow, or section is for.",
      "required": true,
      "quality_bar": [
        "Specific to the user task.",
        "Readable without internal project context.",
        "Not a generic system or component label."
      ]
    },
    {
      "slot": "primary_action",
      "purpose": "Make the next user action clear.",
      "required": true,
      "quality_bar": [
        "Uses direct, user-facing wording.",
        "Does not expose implementation, routing, schema, or test language."
      ]
    },
    {
      "slot": "empty_or_error_state",
      "purpose": "Help the user recover from missing, invalid, or unavailable state.",
      "required": false,
      "quality_bar": [
        "Explains what happened in plain language.",
        "Gives a safe next step where possible.",
        "Does not render raw undefined/null/error payloads."
      ]
    },
    {
      "slot": "status_context",
      "purpose": "Explain current state, progress, timing, or result in human-readable language when shown.",
      "required": true,
      "quality_bar": [
        "Dates, times, counts, and states are valid and human-readable.",
        "Unknown data uses safe fallback copy.",
        "Raw enum values, malformed dates, and raw calculations are never visible."
      ]
    },
    {
      "slot": "explanation_or_rationale",
      "purpose": "Explain why the user should care or what value the action creates when a rationale is shown.",
      "required": true,
      "quality_bar": [
        "Explains user value rather than app mechanics.",
        "Uses concise, concrete, trust-building wording.",
        "Does not overclaim, alarm, or invent unsupported facts."
      ]
    }
  ],
  "acceptance_criteria": [
    "A family account can create and view at least 2 profiles with separate Health Scores and priority lists",
    "The account cannot exceed 5 profiles",
    "Onboarding offers family profile creation without blocking the self-profile flow",
    "A user can open any family member's dashboard, checkup plan, and vaccinations from the family overview and see person-specific content"
  ],
  "deterministic_scan": {
    "forbidden_visible_fragments": [
      "TODO",
      "TBD",
      "lorem ipsum",
      "placeholder",
      "undefined",
      "null",
      "NaN",
      "Invalid Date",
      "[object Object]",
      "acceptance criteria",
      "schema",
      "payload",
      "bucket rules",
      "generated action",
      "slice id",
      "implementation detail"
    ],
    "suspicious_patterns": [
      "five_or_more_digit_year_or_numeric_state",
      "raw_error_or_debug_copy",
      "internal_factory_language_in_visible_copy"
    ]
  },
  "llm_review": {
    "required": true,
    "instruction": "Review semantic fitness of the implemented user-facing UI against this contract. A section existing with bad or generic copy is a failure."
  }
}

Auto-inherited carry-forward capabilities to preserve:
- [SL-001] Self Onboarding to First Dashboard
  - A new user can complete onboarding and reach a populated dashboard in 60 seconds or less in a standard moderated walkthrough
  - The first health plan is generated within 5 seconds of onboarding completion
  - Every generated item comes from the locked MVP preventive item set and is assigned to checkups or vaccinations
  - The dashboard shows Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage for the self profile
  - Entry: User opens the first-run onboarding screen for the self profile in an unauthenticated or pre-established current-user context; no family, settings, or alternate destinations are shown in this slice.
  - Expected behavior:
  - Onboarding screen purpose: collect the minimum required inputs and set expectation that a personalized preventive plan will be created immediately after submission.
  - Onboarding layout is a single vertical form with two required fields and one primary action. Sections in order: brief value statement, age field, gender field, primary submit button.
- [SL-002] Health Plan Browsing and Item Detail
  - Every generated health item is visible in a plan view and opens into a detail view
  - 100% of generated health items show a recommendation cadence, one current status, and a why-it-matters explanation
  - A user can open any dashboard-highlighted item into detail and return to the prior view without losing context
  - Item detail copy uses plain-language rationale rather than clinical detail
  - Entry: User enters the current slice from the primary application flow.
  - Expected behavior:
  - Complete the slice objective in the smallest coherent flow.
  - Handle one clear recovery path for invalid or incomplete user action.
- [SL-003] Item Completion and Reminder Actions
  - A user can mark an item as done from the detail view and see status change to done across all relevant views in the same session
  - A user can create a reminder with 1 month, 3 months, or chosen date timing and receive a confirmation state on completion
  - Setting a reminder changes the item status to planned across the applicable views in the same session
  - After a status change, the dashboard updates the highlighted next item based on the approved Today-then-Soon rule
  - Entry: User opens a health item detail view for the active profile from the dashboard or a plan list and sees the item title, why-it-matters content, recommendation cadence, current status, and available primary actions.
  - Expected behavior:
  - On detail load, show the current item status as one of due, planned, or done using the existing product status presentation; do not introduce any new labels or reminder-only status.
  - If the item status is due or planned, show two actions in the detail action area: a primary 'Mark as done' action and a secondary 'Set reminder' action.
- [SL-004] Vaccination Tracking Area and Manual Entries
  - A user can add at least 1 manual vaccination entry to the self profile and see it appear in that profile's vaccination list in the same session
  - The vaccination area shows rule-based due guidance for the self profile without implying provider data sync
  - A vaccination entry captures both a date and status context
  - The vaccination list supports empty and populated states without breaking access to due guidance
  - The dashboard or health-plan view appears when the flow is completed.
  - Entry: User is in the self profile context and opens the Vaccinations area from an existing self-scope entry point such as the dashboard or health plan.
  - Expected behavior:
  - Render a dedicated page titled for the self profile vaccination experience, with a clear primary action to add a vaccination entry and no profile switcher on this slice.

Carry-forward regression evidence file: tests/family-onboarding-and-family-overview/carry-forward-invariants.test.mjs
- Evidence appears present for prior passed slices.

Relevant source snippets:
### .system/factory/execution-ledger.jsonl
```text
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.688Z","event_id":"evt-d9e0fed049867c3a","run_id":"run-20260505073647-1944a4f8","command":"orchestrator:run-until-blocked","event_type":"command_started","status":"running","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json"}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.745Z","event_id":"evt-18fd3a66bdd450ce","run_id":"run-20260505073647-1944a4f8","command":"pm:status","event_type":"command_started","status":"running","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json"}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.749Z","event_id":"evt-e1f5306ec6eb7d4b","run_id":"run-20260505073647-1944a4f8","command":"pm:status","event_type":"command_succeeded","status":"success","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json","duration_ms":4}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.809Z","event_id":"evt-b1077b1870ab9e73","run_id":"run-20260505073647-1944a4f8","command":"init-factory","event_type":"command_started","status":"running","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json"}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.817Z","event_id":"evt-41a2a361c58ec14a","run_id":"run-20260505073647-1944a4f8","command":"init-factory","event_type":"command_succeeded","status":"success","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json","duration_ms":8}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.877Z","event_id":"evt-41bd170b6e40bd6d","run_id":"run-20260505073647-1944a4f8","command":"pm:status","event_type":"command_started","status":"running","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json"}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.880Z","event_id":"evt-35cc337340c0e3a2","run_id":"run-20260505073647-1944a4f8","command":"pm:status","event_type":"command_succeeded","status":"success","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json","duration_ms":2}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.939Z","event_id":"evt-20e021fc3fdca861","run_id":"run-20260505073647-1944a4f8","command":"pm:status","event_type":"command_started","status":"running","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json"}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:47.941Z","event_id":"evt-32708a2935e66110","run_id":"run-20260505073647-1944a4f8","command":"pm:status","event_type":"command_succeeded","status":"success","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json","duration_ms":2}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:48.002Z","event_id":"evt-6ce47b4d22cf9282","run_id":"run-20260505073647-1944a4f8","command":"pm:intake","event_type":"command_started","status":"running","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json"}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:48.149Z","event_id":"evt-759fa5263c512393","run_id":"run-20260505073647-1944a4f8","command":"pm:intake","event_type":"command_succeeded","status":"success","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json","duration_ms":147}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:48.206Z","event_id":"evt-b4415dbf8acfec84","run_id":"run-20260505073647-1944a4f8","command":"pm:status","event_type":"command_started","status":"running","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json"}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:36:48.209Z","event_id":"evt-4bb847df5fc99e6f","run_id":"run-20260505073647-1944a4f8","command":"pm:status","event_type":"command_succeeded","status":"success","target_root":"/Users/gseher/_devProjects/korum-health","values_path":"/Users/gseher/_devProjects/korum-health/fabric.values.json","duration_ms":3}
{"schema_version":"factory.execution-ledger.v1","timestamp_utc":"2026-05-05T07:
```
### .system/factory/work-orders/SL-005-coder-codex.md
```text
# Codex work order: implement SL-005 Family Onboarding and Family Overview

You are acting as the Coder role for this Fabric app factory run.
Implement the active slice incrementally in the current repository.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/architecture/SL-005-baseline.md`
- `docs/ux/SL-005-current-slice-flow.md`
- `docs/ux/SL-005-semantic-ux-contract.json`
- `docs/design-system/tokens.json`
- `docs/design-system/components.json`
- `docs/design-system/component-usage-rules.md`
- `docs/design-system/visual-states.md`
- `docs/ux/SL-005-interaction-model.json`
- `docs/ux/SL-005-screen-contract.json`
- `docs/ux/SL-005-component-contract.json`
- `docs/ux/SL-005-copy-contract.json`
- `docs/implementation/SL-005-implementation-notes.md`
- `docs/product/project-brief.md` if present
- `docs/product/product-system-framing.md` if present
- Existing `src/` and `tests/` files needed to understand the current app and integration points.

## Active slice
```json
{
  "id": "SL-005",
  "title": "Family Onboarding and Family Overview",
  "objective": "Allow one account to manage multiple people with separate preventive plans, summaries, and navigation paths.",
  "in_scope": [
    "Optional family profile creation during onboarding in the same account",
    "Create additional profiles after onboarding, up to a maximum of 5 total profiles per account",
    "Generate a separate rule-based plan, dashboard, and vaccination list for each profile from age and gender",
    "Family overview showing each profile's Health Score and due-item summary",
    "Open each family member's dashboard, checkup plan, and vaccinations from the family overview"
  ],
  "out_of_scope": [
    "Profile editing beyond initial creation",
    "Archive and delete profile actions",
    "Multi-user permissions or shared account roles",
    "Cross-profile combined scoring"
  ],
  "acceptance_criteria": [
    "A family account can create and view at least 2 profiles with separate Health Scores and priority lists",
    "The account cannot exceed 5 profiles",
    "Onboarding offers family profile creation without blocking the self-profile flow",
    "A user can open any family member's dashboard, checkup plan, and vaccinations from the family overview and see person-specific content"
  ],
  "dependencies": [
    "Self onboarding to first dashboard",
    "Health plan browsing and item detail",
    "Item completion and reminder actions",
    "Vaccination tracking area and manual entries"
  ]
}
```

## Implementation contract
- Behave like an incremental developer, not a full-app generator.
- Do not rewrite the application from scratch.
- Preserve existing behavior unless the current slice explicitly requires a change.
- Maintain previously working user-visible actions and flows from earlier slices unless the active slice explicitly redefines them.
- Never remove existing functionality as an unintended side effect of implementation.
- Prefer small, focused edits and new slice-local files.
- Read relevant existing files before editing them.
- Do not modify unrelated onboarding/profile code unless strictly necessary for integration.
- Do not restyle the global app shell, shared visual language, or design-system tokens during slice implementation.
- Reuse existing shared UI shell conventions (`app-shell`, `app-panel`, existing card/action classes) instead of introducing alternate global wrapper conventions.
- Treat global styling (`src/styles.css`) as protected; any cross-slice design refresh belongs in the design-system workflow, not in slice implementation.
- src/App.jsx is protected by default. Integrate new slice behavior through slice-local routes/features and minimal shared integration points instead.
- Do not use `--force` or destructive git commands.

## Carry-forward invariants
These are already approved behaviors from prior passed slices. Preserve them unless the active slice explicitly redefines them.
- [SL-001] Self Onboarding to First Dashboard
  - A new user can complete onboarding and reach a populated dashboard in 60 seconds or less in a standard moderated walkthrough
  - The first health plan is generated within 5 seconds of onboarding completion
  - Every generated item comes from the locked MVP preventive item set and is assigned to checkups or vaccinations
  - The dashboard shows Today, Soon, and Later buckets, one highlighted next item, and one Health Score percentage for the self profile
  - Entry: User opens the first-run onboarding screen for the self profile in an unauthenticated or pre-established current-user context; no family, settings, or alternate destinations are shown in this slice.
  - Expected behavior:
  - Onboarding screen purpose: collect the minimum required inputs and set expectation that a personalized preventive plan will be created immediately after submission.
  - Onboarding layout is a single vertical form with two required fields and one primary action. Sections in or
```
### src/routes/family-onboarding-and-family-overview.jsx
```text
import React from 'react';
import { FamilyOnboardingAndFamilyOverview } from '../features/family-onboarding-and-family-overview/index.js';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';
import '../features/health-plan-browsing-and-item-detail/health-plan-browsing-and-item-detail.css';
import '../features/item-completion-and-reminder-actions/item-completion-and-reminder-actions.css';
import '../features/vaccination-tracking-area-and-manual-entries/vaccination-tracking-area-and-manual-entries.css';
import '../features/family-onboarding-and-family-overview/family-onboarding-and-family-overview.css';

export default function FamilyOnboardingAndFamilyOverviewRoute(props) {
  return <FamilyOnboardingAndFamilyOverview {...props} />;
}
```
### src/main.jsx
```text
/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/main.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-05-05T17:50:25.482Z
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```
### src/App.jsx
```text
import React, { useEffect, useState } from 'react';
import FamilyOnboardingAndFamilyOverviewRoute from './routes/family-onboarding-and-family-overview.jsx';
import ItemCompletionAndReminderActionsRoute from './routes/item-completion-and-reminder-actions.jsx';
import SelfOnboardingToFirstDashboardRoute from './routes/self-onboarding-to-first-dashboard.jsx';
import VaccinationTrackingAreaAndManualEntriesRoute from './routes/vaccination-tracking-area-and-manual-entries.jsx';
import { generateInitialPlanSnapshot } from './features/self-onboarding-to-first-dashboard/plan.js';
import { DETAIL_ORIGIN, PLAN_CATEGORIES } from './features/health-plan-browsing-and-item-detail/model.js';

const DEMO_PROFILE = Object.freeze({
  profileId: 'self',
  name: 'You',
  age: 45,
  gender: 'female',
});

const demoPlanSnapshot = generateInitialPlanSnapshot(DEMO_PROFILE, { now: new Date() });

function normalizeView(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'family') return 'family';
  if (normalized === 'plan') return 'plan';
  if (normalized === 'vaccinations') return 'vaccinations';
  if (normalized === 'actions') return 'plan';
  return 'onboarding';
}

function currentViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeView(params.get('view'));
}

function replaceViewInUrl(view) {
  const url = new URL(window.location.href);
  if (view === 'family') url.searchParams.set('view', 'family');
  else if (view === 'plan') url.searchParams.set('view', 'plan');
  else if (view === 'vaccinations') url.searchParams.set('view', 'vaccinations');
  else url.searchParams.delete('view');
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(null, '', next);
  }
}

export default function App() {
  const [activeView, setActiveView] = useState(() => currentViewFromUrl());
  const [runtimeProfile, setRuntimeProfile] = useState(null);
  const [runtimePlanSnapshot, setRuntimePlanSnapshot] = useState(null);
  const [runtimePlanEntry, setRuntimePlanEntry] = useState({
    initialItemKey: undefined,
    initialOrigin: undefined,
    initialCategory: undefined,
    initialReturnToVaccinationTracker: false,
  });
  const [runtimeVaccinationEntry, setRuntimeVaccinationEntry] = useState({
    openAddEntry: false,
  });

  useEffect(() => {
    replaceViewInUrl(activeView);
  }, [activeView]);

  const openHealthPlan = ({
    planSnapshot,
    profile,
    initialItemKey,
    initialOrigin,
    initialCategory,
  } = {}) => {
    if (planSnapshot) setRuntimePlanSnapshot(planSnapshot);
    if (profile) setRuntimeProfile(profile);
    setRuntimePlanEntry({
      initialItemKey,
      initialOrigin,
      initialCategory,
      initialReturnToVaccinationTracker: false,
    });
    setActiveView('plan');
  };

  const handlePlanNavigate = (target) => {
    if (target?.destination === DETAIL_ORIGIN.dashboard) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('onboarding');
      return;
    }

    if (target?.destination === DETAIL_ORIGIN.vaccinations) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.vaccination,
        initialReturnToVaccinationTracker: false,
      });
      setRuntimeVaccinationEntry({
        openAddEntry: Boolean(target?.openAddEntry),
      });
      setActiveView('vaccinations');
    }
  };

  const handlePlanSnapshotChange = (nextPlanSnapshot) => {
    if (nextPlanSnapshot) {
      setRuntimePlanSnapshot(nextPlanSnapshot);
    }
  };

  const openVaccinations = ({ planSnapshot, profile } = {}) => {
    if (planSnapshot) setRuntimePlanSnapshot(planSnapshot);
    if (profile) setRuntimeProfile(profile);
    setRuntimeVaccinationEntry({ openAddEntry: false });
    setActiveView('vaccinations');
  };

  const openVaccinationDetail = ({ itemKey, origin } = {}) => {
    if (!itemKey) return;

    setRuntimePlanEntry({
      initialItemKey: itemKey,
      initialOrigin: origin || DETAIL_ORIGIN.vaccinations,
      initialCategory: PLAN_CATEGORIES.vaccination,
      initialReturnToVaccinationTracker: true,
    });
    setActiveView('plan');
  };

  const openFamilyOverview = () => {
    setActiveView('family');
  };

  if (activeView === 'family') {
    return <FamilyOnboardingAndFamilyOverviewRoute />;
  }

  if (activeView === 'plan') {
    return (
      <ItemCompletionAndReminderActionsRoute
        profile={runtimeProfile || DEMO_PROFILE}
        initialPlanSnapshot={runtimePlanSnapshot || demoPlanSnapshot}
        initialItemKey={runtimePlanEntry.initialItemKey}
        initialOrigin={runtimePlanEntry.initialOrigin}
        in
```

Decision policy:
- status=pass only when checklist appears satisfied and no clear gaps remain.
- status=fail when any inherited carry-forward capability appears missing or regressed.
- status=fail when one or more checklist expectations are missing, broken, or clearly regressed.
- Keep findings concrete and repair-oriented.
```
