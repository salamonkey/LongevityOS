# Brief Clarity Ledger

Date: `2026-04-25T05:21:50.277Z`
Attempts analyzed: `2`
Unique issues tracked: `17`

| Issue ID | Rule | Section | Flagged Line | First Seen | Boundary Type | Evidence Span | Status | Resolved Line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISS-001 | scope_not_bounded | 6. Core MVP Scope | Provide a profile/settings area for family access and user preferences. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | none | - | resolved | Provide a profile/settings area with two MVP functions only: view saved family profiles and turn reminder notifications on or off. |
| ISS-002 | unresolved_alternative | 9. Technical Direction | - Build a mobile-first app experience backed by a simple modular backend. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | - | - | resolved | Build a mobile-first responsive web app backed by 1 backend service and 1 primary database. |
| ISS-003 | ambiguous_term | 9. Technical Direction | - Build a mobile-first app experience backed by a simple modular backend. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | - | - | resolved | Build a mobile-first responsive web app backed by 1 backend service and 1 primary database. |
| ISS-004 | ambiguous_term | 9. Technical Direction | - Keep the architecture modular enough to add future integrations without including them in MVP. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | - | - | resolved | - |
| ISS-005 | ambiguous_term | 10. Data and Privacy Constraints | - Use secure architecture and secure handling for all stored profile and health-status data. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | - | - | resolved | Encrypt stored profile and health-status data at rest and in transit, and restrict production access to named team accounts only. |
| ISS-006 | scope_not_action_oriented | 6. Core MVP Scope / Family and settings | - Support multiple managed profiles within one account. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | - | - | resolved | - |
| ISS-007 | scope_not_bounded | 6. Core MVP Scope / Family and settings | - Support multiple managed profiles within one account. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | cardinality | multiple managed profiles | resolved | - |
| ISS-008 | scope_not_bounded | 6. Core MVP Scope / Family and settings | - Provide a profile/settings area for family access and user preferences. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | in_out_scope | family access and user preferences | resolved | - |
| ISS-009 | ambiguous_term | 13. Primary Success Criteria | - A user can save a reminder with 1 month, 3 months, and custom date options for 100% of eligible health items. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | - | - | resolved | A user can save a reminder with 1 month, 3 months, and custom date options for 100% of health items shown with a Reminder action. |
| ISS-010 | source_overreach | 13. Primary Success Criteria | - A user can add at least 2 additional family profiles under one account and open each profile’s overview. | A1 (docs/reviews/product-manager/brief-attempt-1.md) | - | - | resolved | A user can add 1 additional family profile under one account and open both saved profiles’ overviews. |
| ISS-011 | ambiguous_term | 5. MVP Objective | - Turn minimal input into clear preventive guidance with action, timing, and rationale. | A2 (docs/reviews/product-manager/brief-attempt-2.md) | - | - | persisting | - |
| ISS-012 | scope_not_bounded | 6. Core MVP Scope | - Generate the initial health plan from deterministic age-and-gender rules immediately after onboarding. | A2 (docs/reviews/product-manager/brief-attempt-2.md) | temporal | immediately after onboarding | persisting | - |
| ISS-013 | ambiguous_term | 6. Core MVP Scope | - Display a health score for the active profile as a progress indicator only. | A2 (docs/reviews/product-manager/brief-attempt-2.md) | - | - | persisting | - |
| ISS-014 | ambiguous_term | 6. Core MVP Scope | - Provide a profile/settings area with two MVP functions only: view saved family profiles and turn reminder notifications on or off. | A2 (docs/reviews/product-manager/brief-attempt-2.md) | - | - | persisting | - |
| ISS-015 | source_overreach | 9. Technical Direction | - Build a mobile-first responsive web app backed by 1 backend service and 1 primary database. | A2 (docs/reviews/product-manager/brief-attempt-2.md) | - | - | persisting | - |
| ISS-016 | source_overreach | 9. Technical Direction | - Separate the MVP into 3 internal modules—rule engine, application API, and data model—and include no integration adapters in MVP. | A2 (docs/reviews/product-manager/brief-attempt-2.md) | - | - | persisting | - |
| ISS-017 | ambiguous_term | 12. Delivery Expectations | - Keep implementation sized to the evidenced MVP feature set without overengineering. | A2 (docs/reviews/product-manager/brief-attempt-2.md) | - | - | persisting | - |
