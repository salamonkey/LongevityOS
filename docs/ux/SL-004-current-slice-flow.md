<!-- generated_from: templates/ux-current-slice-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-05-05T11:43:22.093Z -->
# UX Flow - Current Slice

Date: `2026-05-05`
Status: `Ready for implementation`
Scope: `SL-004 Vaccination Tracking Area and Manual Entries`

## 1. Context

SL-004 covers a dedicated Vaccinations area for the self profile only. The UX must let an onboarded user review rule-based vaccination due guidance, add manual vaccination entries with date and status context, and immediately see newly added entries in the same session. The area reuses existing self-profile context and existing health item detail navigation. It must stay clearly framed as preventive guidance plus user-entered tracking, not provider-synced records or a broad medical chart.

## 2. Flow Definition

### Flow A - Primary Path

- Entry: User is in the self profile context and opens the Vaccinations area from an existing self-scope entry point such as the dashboard or health plan.
- Expected behavior:
  - Render a dedicated page titled for the self profile vaccination experience, with a clear primary action to add a vaccination entry and no profile switcher on this slice.
  - Show a read-only Due Guidance section first. This section summarizes rule-based vaccination guidance for the self profile using existing MVP rules and clearly communicates what may need attention without implying provider data, verification, or sync.
  - Keep the manual tracking area as a separate section labeled as user-entered vaccination records. Do not merge due guidance rows and manual entry rows into one mixed list.
  - If the user has no manual vaccination entries yet, show an empty state in the manual tracking section with calm explanatory copy and a visible Add vaccination entry action. Due guidance remains visible above it.
  - When the user chooses Add vaccination entry, open a focused create flow with exactly three required inputs: vaccination item from the known MVP vaccination catalog, status context with allowed values completed or planned, and calendar date.
  - On save, validate inputs inline. If valid, persist the manual entry to the self profile, close the create flow, and immediately show the new record in the manual tracking section without a page reload or profile reload.
  - Display manual entries in descending order by entry date, using newest created item as tie-breaker when dates match. Each row shows vaccination name, status context, and date in a scan-friendly format.
  - Where a related vaccination health item detail exists, the user can open that existing detail view from the guidance item or related manual entry context. Returning from detail preserves the Vaccinations area state in the same session.

### Flow B - Failure and Recovery Paths

- Validation failure in create flow: if vaccination item, status context, or date is missing, block save and show field-level errors. If status is completed and the chosen date is in the future, block save and show a specific date error. Keep all other entered values intact so the user can correct and resubmit.
- Persistence failure on save: if the entry cannot be saved, keep the create flow open, preserve the entered values, show a non-technical error message with a retry action, and do not add any new row to the manual tracking list until save succeeds.
- Empty manual list state: when there are zero manual entries, the page still renders the Due Guidance section and the Add vaccination entry action; the absence of records must never hide or replace due guidance.
- No related detail target: if a manual entry does not expose a navigable related item detail in the current data, the row remains readable and non-broken, with no dead-link affordance.

## 3. Interaction and Validation Rules

- The page is self-profile scoped only for this slice; all labels, reads, and writes must resolve to the self profile context.
- Due guidance and manual entries are two separate UI sections, two separate concepts, and must never be visually or structurally presented as one combined history.
- Manual entry creation supports only known MVP vaccination catalog items already represented in the health plan item set; free-text vaccination names are not allowed.
- Allowed manual status contexts are exactly completed and planned.
- A manual entry always requires one vaccination item, one allowed status context, and one calendar date before save is enabled or accepted.
- Completed entries cannot use a future date. Planned entries may use any valid calendar date.
- Newly saved entries appear in the manual tracking list during the same session immediately after success.
- The manual tracking section supports both empty and populated states without removing access to due guidance or the add-entry action if the user can reach the page and guidance is available by rule output or empty rule result messaging from existing systems contextually displayed as guidance section content rather than

## 4. Implementation Constraints

- Do not introduce family-profile vaccination management, profile switching, or cross-profile actions in this slice.
- Do not imply provider sync, imported records, provider verification, or clinical completeness anywhere in the flow or copy.
- Do not add document upload, notes, lot numbers, provider fields, edit, delete, duplicate detection, reconciliation, or other broad medical-record behaviors.
- Do not update dashboard priority buckets, health score, or plan-item completion automatically from manual vaccination entry creation in this slice.
- Reuse the existing health item detail route for related vaccination item navigation instead of designing a new vaccination detail experience.
- Keep the interaction mobile-first and simple: one clear primary action on the page, short form, explicit validation, and obvious success feedback.

## 5. Acceptance Mapping

- From the self profile context, a user can open the Vaccinations area, add one valid manual vaccination entry, and see it appear in the manual tracking list in the same session.
- The Vaccinations area displays rule-based due guidance in its own section and uses copy that does not suggest provider sync or external data import.
- Each saved manual vaccination entry visibly includes both a status context and a date.
- The page renders correctly when the manual tracking section is empty and when it is populated, while keeping due guidance accessible in both states.
- When a related vaccination item detail exists, selecting it from the Vaccinations area opens the existing health item detail flow without breaking the current session state.
