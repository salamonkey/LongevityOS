# Brief Clarity Review

Date: `2026-04-23T08:21:09.924Z`
Reviewed by: `Product Manager Intake Engine`
Gate enabled: `yes`
Retry budget: `1`
Attempts executed: `2`
Verdict: `fail`

## Attempts

### Attempt 1

- Status: `fail`
- Review mode: `pass1_adjudicated_plus_global_semantic`
- Drafting mode: `full_regeneration`
- Issues: `6`
- Deterministic pass-1 findings: `13`
- Semantically dismissed findings: `13`
- Global semantic findings: `6`
- Semantic-only findings (not in pass-1): `6`
- Draft snapshot: `docs/reviews/product-manager/brief-attempt-1.md`
- Pass-1 finding ledger entries: `13`
- Pass-1 findings kept after semantic review: `0`
- Pass-1 findings dismissed after semantic review: `13`
- Pass-1 finding ledger:
  - [dismissed_semantic] [unresolved_alternative] 6. Core MVP Scope: "Let the user mark an action as done or planned from the action flow." — This does not present an unresolved choice. The brief is explicitly allowing two user status options within the action flow: mark as done or mark as planned.
  - [dismissed_semantic] [unresolved_alternative] 6. Core MVP Scope: "Allow reminder setting from a health action using 1 month, 3 months, or a custom date." — These are explicit reminder-setting options, not an undecided alternative that requires a single default. The scope is clear that presets and a custom date are supported.
  - [dismissed_semantic] [ambiguous_term] 9. Technical Direction: "Use a simple backend that stores profiles, health actions, statuses, vaccination entries, and reminder dates." — 'Simple backend' is a soft term, but in this context it is acceptable directional guidance rather than a decision-blocking ambiguity. The line also concretely states what the backend must store.
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Collect age and gender as the required inputs for first-plan generation." — The scope is bounded by explicitly defining the required inputs for first-plan generation. (boundary_type=data_source; evidence="age and gender as the required inputs")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Generate a rule-based preventive health plan immediately after onboarding." — The generation point is bounded to a specific workflow moment, so this is not unbounded scope. (boundary_type=workflow_state; evidence="immediately after onboarding")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "List all recommended health actions with status and recommended cadence." — This is bounded to the set of recommended actions in the generated plan, not an open-ended action universe. (boundary_type=in_out_scope; evidence="all recommended health actions")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Open an action detail view with description, why-it-matters explanation, and current status." — The action detail view is bounded by the specified contents it must include. (boundary_type=cardinality; evidence="description, why-it-matters explanation, and current status")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Let the user mark an action as done or planned from the action flow." — The feature is bounded to two explicit status updates available from the action flow. (boundary_type=cardinality; evidence="mark an action as done or planned")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Exclude multi-channel notification orchestration beyond the app-saved reminder state." — This line explicitly limits reminder scope to app-saved state and excludes broader notification orchestration. (boundary_type=channel; evidence="Exclude multi-channel notification orchestration beyond the app-saved reminder state")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Let the user add vaccination entries manually and review current status guidance." — The vaccination entry method is explicitly bounded to manual entry for MVP. (boundary_type=data_source; evidence="add vaccination entries manually")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Exclude external vaccine data import and provider sync." — This is already explicitly bounded by excluding external imports and provider synchronization. (boundary_type=data_source; evidence="Exclude external vaccine data import and provider sync")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Allow switching between profiles from a family overview." — This is a clear, bounded capability tied to a specific UI context within family mode. (boundary_type=workflow_state; evidence="from a family overview")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Exclude role-based permissions, shared editing workflows, and child-specific clinical logic." — This statement is explicitly bounded by listing clear out-of-scope exclusions for the MVP. (boundary_type=in_out_scope; evidence="Exclude role-based permissions, shared editing workflows, and child-specific clinical logic")
- Findings:
  - [ambiguous_term] 5. MVP Objective: "Prove repeat value through status tracking, reminders, and family visibility."
  - [source_overreach] 6. Core MVP Scope / Dashboard and prioritization: "Display an up-to-date summary percentage based only on health-action statuses."
  - [scope_not_bounded] 6. Core MVP Scope / Family mode: "Let one account manage multiple family profiles with separate plans, summaries, and vaccinations." (boundary_type=cardinality; evidence="multiple family profiles")
  - [ambiguous_term] 7. UX Principles and Tone: "Use clear, calm, trustworthy language with light motivation."
  - [source_overreach] 7. UX Principles and Tone: "Use German as the default MVP product language."
  - [source_overreach] 9. Technical Direction: "Default MVP delivery is a responsive web app optimized for mobile screens."
- Recommended fixes:
  - [ambiguous_term] 5. MVP Objective: Replace soft wording with measurable bounds (time/count/threshold) in the same line.
  - [source_overreach] 6. Core MVP Scope / Dashboard and prioritization: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.
  - [scope_not_bounded] 6. Core MVP Scope / Family mode: Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.
  - [ambiguous_term] 7. UX Principles and Tone: Replace soft wording with measurable bounds (time/count/threshold) in the same line.
  - [source_overreach] 7. UX Principles and Tone: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.
  - [source_overreach] 9. Technical Direction: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.
- Suggestions:
  - [ambiguous_term] 5. MVP Objective: Replace the line with: "Show immediate value within the first 60 seconds and enable at least one clear follow-up use through status tracking, reminders, and family visibility." (confidence=medium)
    rationale: This keeps the MVP objective aligned to the framing's first-60-seconds rule while giving "repeat value" a minimal, testable reuse threshold without adding a broader retention target.
    implementation note: Update the objective sentence directly; use the follow-up-use threshold instead of the phrase "prove repeat value."
  - [source_overreach] 6. Core MVP Scope / Dashboard and prioritization: Reword to: "If included in MVP, display a provisional up-to-date summary based primarily on health-action statuses, with calculation treated as an MVP placeholder until Health Score is defined." (confidence=high)
    rationale: The framing leaves Health Score meaning and calculation open, so the brief should present this as a temporary MVP default rather than a fixed calculation rule.
    implementation note: Keep the dashboard intent, but add placeholder/default language anywhere the score basis is mentioned.
  - [scope_not_bounded] 6. Core MVP Scope / Family mode: Bound the feature in the brief as: "Let one account manage multiple family profiles with separate plans, summaries, and vaccinations, subject to an explicit MVP profile cap; permissions and child/adult handling are out of scope until defined." (confidence=medium)
    rationale: This preserves family mode intent while making scope enforceable and consistent with the framing that profile limits and family rules are still open decisions.
    implementation note: Add a temporary profile-cap field or note in the family-mode scope section rather than leaving profile count unbounded.
  - [ambiguous_term] 7. UX Principles and Tone: Replace the line with: "Use plain language, one primary next-step action per screen, and action descriptions that answer both what it is and why it matters; avoid alarmist wording and unnecessary clinical jargon." (confidence=medium)
    rationale: This converts broad tone adjectives into more testable copy and UX constraints that match the product's clarity and trust goals.
    implementation note: Use these as editorial acceptance criteria in the brief instead of qualitative tone-only descriptors.
  - [source_overreach] 7. UX Principles and Tone: Reword to: "Use German as the current MVP default for product copy and labels, while keeping the final language strategy open pending validation." (confidence=high)
    rationale: This downgrades an unsupported hard lock to a working default, which matches the framing that language choice remains unresolved.
    implementation note: Apply the same "current default" wording anywhere language is referenced in the brief.
  - [source_overreach] 9. Technical Direction: Reword to: "Use a responsive web app optimized for mobile screens as the current MVP working default, pending final platform selection between web and cross-platform." (confidence=high)
    rationale: This keeps implementation direction usable without closing an explicitly open platform decision in the framing.
    implementation note: Frame platform as a provisional delivery assumption, not a final product decision.

### Attempt 2

- Status: `fail`
- Review mode: `pass1_adjudicated_plus_global_semantic`
- Drafting mode: `targeted_patch`
- Targeted editable paths: `6`
- Targeted patched paths: `6`
- Targeted unmapped findings: `0`
- Issues: `7`
- Deterministic pass-1 findings: `15`
- Semantically dismissed findings: `14`
- Global semantic findings: `6`
- Semantic-only findings (not in pass-1): `6`
- Draft snapshot: `docs/reviews/product-manager/brief-attempt-2.md`
- Pass-1 finding ledger entries: `15`
- Pass-1 findings kept after semantic review: `1`
- Pass-1 findings dismissed after semantic review: `14`
- Pass-1 finding ledger:
  - [dismissed_semantic] [unresolved_alternative] 5. MVP Objective: "Enable at least one follow-up action after onboarding through status tracking, reminders, or family profile review." — This is not an unresolved decision. It defines acceptable follow-up outcomes for the MVP objective, and the listed paths are all separately in scope elsewhere in the brief.
  - [dismissed_semantic] [unresolved_alternative] 6. Core MVP Scope: "Let the user mark an action as done or planned from the action flow." — This does not present an unresolved alternative. The product is intended to support both status options, not choose one of them.
  - [dismissed_semantic] [unresolved_alternative] 6. Core MVP Scope: "Allow reminder setting from a health action using 1 month, 3 months, or a custom date." — These are intentionally supported reminder options, not an undecided choice that blocks implementation.
  - [kept_semantic] [unresolved_alternative] 9. Technical Direction: "Default MVP delivery is a mobile-first client, implemented as either a responsive web app or a cross-platform app." — This leaves a material implementation choice unresolved between two platform approaches. That affects delivery planning, architecture, and likely scope within the stated 4–8 week window.
  - [dismissed_semantic] [ambiguous_term] 9. Technical Direction: "Use a simple backend that stores profiles, health actions, statuses, vaccination entries, and reminder dates." — While 'simple' is a soft qualifier, the sentence still gives concrete backend responsibilities. In context this is acceptable guidance rather than a decision-quality ambiguity.
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Collect age and gender as the required inputs for first-plan generation." — The scope is already explicitly bounded to two required inputs for first-plan generation. (boundary_type=in_out_scope; evidence="Collect age and gender as the required inputs for first-plan generation.")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Generate a rule-based preventive health plan immediately after onboarding." — This is bounded by a specific workflow point and timing expectation: generation happens after onboarding, immediately. (boundary_type=workflow_state; evidence="immediately after onboarding")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "List all recommended health actions with status and recommended cadence." — In context, this refers to the full set of actions generated by the rule-based plan for that profile, so it is not an unbounded expansion of scope. (boundary_type=data_source; evidence="Generate a rule-based preventive health plan immediately after onboarding.")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Open an action detail view with description, why-it-matters explanation, and current status." — The detail view contents are explicitly bounded to the listed fields, so this is sufficiently scoped for an MVP brief. (boundary_type=in_out_scope; evidence="with description, why-it-matters explanation, and current status")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Let the user mark an action as done or planned from the action flow." — This is bounded to two specific status changes within a defined interaction context, so it is not unbounded scope. (boundary_type=in_out_scope; evidence="mark an action as done or planned from the action flow")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Exclude multi-channel notification orchestration beyond the app-saved reminder state." — This line already provides a clear channel boundary by excluding multi-channel notifications and limiting reminders to app-saved state. (boundary_type=channel; evidence="Exclude multi-channel notification orchestration beyond the app-saved reminder state.")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Let the user add vaccination entries manually and review current status guidance." — The scope is bounded by manual entry rather than import/sync behavior, so this is not unbounded in context. (boundary_type=data_source; evidence="Let the user add vaccination entries manually")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Exclude external vaccine data import and provider sync." — This is an explicit exclusion of external data sources and provider sync, which is already a clear boundary. (boundary_type=data_source; evidence="Exclude external vaccine data import and provider sync.")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Allow switching between profiles from a family overview." — Profile switching is bounded within family mode, and family mode itself is capped in the brief. (boundary_type=cardinality; evidence="up to 5 profiles total in MVP")
  - [dismissed_semantic] [scope_not_bounded] 6. Core MVP Scope: "Exclude role-based permissions, shared editing workflows, and child-specific clinical logic." — This line is already clearly bounded by explicit exclusions of those capabilities from the MVP. (boundary_type=in_out_scope; evidence="Exclude role-based permissions, shared editing workflows, and child-specific clinical logic.")

- Findings:
  - [unresolved_alternative] 9. Technical Direction: "Default MVP delivery is a mobile-first client, implemented as either a responsive web app or a cross-platform app."
  - [source_overreach] 6. Core MVP Scope / Dashboard and prioritization: "- Show profile-specific health actions in three timing buckets: Today, Soon, Later."
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: "- Surface the most relevant next action without requiring plan browsing." (boundary_type=other; evidence="most relevant next action")
  - [source_overreach] 6. Core MVP Scope / Family mode: "- Let one account manage up to 5 profiles total in MVP, each with separate plans, summaries, and vaccinations."
  - [source_overreach] 7. UX Principles and Tone: "- Use plain-language UI copy with factual claims only, primary headings under 8 words, and no more than one motivational sentence per screen."
  - [unresolved_alternative] 7. UX Principles and Tone: "- Choose one default MVP product language before build; treat German as the current copy draft, not a locked requirement."
  - [unresolved_alternative] 9. Technical Direction: "- Default MVP delivery is a mobile-first client, implemented as either a responsive web app or a cross-platform app."

- Recommended fixes:
  - [unresolved_alternative] 9. Technical Direction: Choose one default decision and rewrite without open alternatives.  
  - [source_overreach] 6. Core MVP Scope / Dashboard and prioritization: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.
  - [source_overreach] 6. Core MVP Scope / Family mode: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.
  - [source_overreach] 7. UX Principles and Tone: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.
  - [unresolved_alternative] 7. UX Principles and Tone: Choose one default decision and rewrite without open alternatives.
  - [unresolved_alternative] 9. Technical Direction: Choose one default decision and rewrite without open alternatives.

- Suggestions:
  - [unresolved_alternative] 9. Technical Direction: Rewrite the MVP platform decision as a mobile-first responsive web app, with other client approaches explicitly deferred beyond the brief. (confidence=medium)
    rationale: This removes the unresolved delivery alternative while staying aligned to mobile-first usage, fast MVP delivery, and the current product-system framing.
    implementation note: Example: "Default MVP delivery is a mobile-first responsive web app. Cross-platform app delivery is not part of the MVP brief."
  - [source_overreach] 6. Core MVP Scope / Dashboard and prioritization: Change the dashboard requirement from fixed "Today, Soon, Later" labels to timing-based priority buckets, and note that final user-facing bucket labels remain to be confirmed. (confidence=high)
    rationale: This preserves prioritised dashboard grouping as a core product concept without hard-locking unsupported taxonomy wording.
    implementation note: Example: "Show profile-specific health actions in timing-based priority buckets for the dashboard; final user-facing bucket labels will be defined in UX copy."
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: Bound the requirement to one pinned next action on the active profile dashboard, selected from the earliest non-empty priority bucket, with the full prioritised list still visible below. (confidence=high)
    rationale: This makes "next action" testable without inventing a broader ranking system or expanding scope beyond the existing prioritisation model.
    implementation note: Example: "On the dashboard, surface one next action for the active profile from the earliest non-empty priority bucket, without requiring plan browsing; the full prioritised list remains available below."
  - [source_overreach] 6. Core MVP Scope / Family mode: Replace the fixed 5-profile limit with a requirement to support multiple profiles in one account, each with separate plans, summaries, and vaccinations, and leave exact profile-limit rules open. (confidence=high)
    rationale: This keeps family mode aligned to framing support while avoiding an unsupported numeric cap.
    implementation note: Example: "Let one account manage multiple family profiles in MVP, each with its own plan, summary, and vaccination context; exact profile-limit rules remain to be defined."
  - [source_overreach] 7. UX Principles and Tone: Replace numeric copy formulas with principle-level guidance focused on plain, factual, low-jargon language and sparing motivational tone. (confidence=high)
    rationale: This keeps the UX brief aligned to trust and clarity goals without introducing unsupported hard constraints on copy structure.
    implementation note: Example: "Use plain-language UI copy with factual claims, clear explanations, and minimal motivational language so the experience feels simple and trustworthy."
  - [unresolved_alternative] 7. UX Principles and Tone: Set German as the single MVP product language in the brief and state that multilingual support is out of scope for MVP. (confidence=medium)
    rationale: This resolves the open language decision using the only concrete signal in the brief context—the existing German draft—while keeping scope contained.
    implementation note: Example: "German is the default MVP product language. Localisation and multilingual support are not part of the MVP brief."
  - [unresolved_alternative] 9. Technical Direction: Rewrite the MVP platform decision as a mobile-first responsive web app, with other client approaches explicitly deferred beyond the brief. (confidence=medium)
    rationale: This resolves the duplicated open platform choice and gives downstream planning a single implementation target.
    implementation note: Example: "Default MVP delivery is a mobile-first responsive web app. Cross-platform app delivery is not part of the MVP brief."


## Post-Edit Semantic Validation Runs

### Run 2026-04-23T09:11:11.418Z

- Input brief path: `docs/reviews/product-manager/project-brief.failed.md`
- Mode: `semantic_only`
- Verdict: `fail`
- Issue count: `6`

- Findings:
  - [unresolved_alternative] 6. Core MVP Scope: "Show profile-specific health actions in timing-based priority buckets for the dashboard; Use Today, Soon (next 14 days), Later (next 6 months) as a..."
  - [scope_not_bounded] 6. Core MVP Scope: "Display an up-to-date summary percentage as an MVP summary indicator for each profile."
  - [scope_not_bounded] 6. Core MVP Scope: "Let one account manage multiple family profiles in MVP, each with its own plan, summary, and vaccination context; exact profile-limit rules remain ..."
  - [draft_integrity_issue] 9. Technical Direction: "Default MVP delivery is a mobile-first a mobile-first responsive web app."

  - [source_overreach] 9. Technical Direction: "Default MVP delivery is a mobile-first a mobile-first responsive web app. Cross-platform app delivery is not part of the MVP brief."
  - [source_overreach] 7. UX Principles and Tone: "English is the default MVP product language. Localisation and multilingual support are not part of the MVP brief, but are planned for the future."

- Recommended fixes:
  - [unresolved_alternative] 6. Core MVP Scope: Choose one default decision and rewrite without open alternatives.  
  - [scope_not_bounded] 6. Core MVP Scope: Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.
  - [scope_not_bounded] 6. Core MVP Scope: Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.
  - [draft_integrity_issue] 9. Technical Direction: Repair malformed text artifacts and ensure line is syntactically complete and structurally valid markdown.

  - [source_overreach] 9. Technical Direction: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.
  - [source_overreach] 7. UX Principles and Tone: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.

- Suggestions:
  - [unresolved_alternative] 6. Core MVP Scope: Rewrite the line to use one MVP working taxonomy without alternatives, e.g. 'Show profile-specific health actions in three timing-based priority buckets on the dashboard: Now, Soon (next 14 days), and Later (next 6 months).' (confidence=high)
    rationale: This makes the scope testable while staying aligned to the framing, which already anchors dashboard priorities around now/soon/later timing.
    implementation note: Present these as MVP working labels in the brief rather than final brand copy.  
  - [scope_not_bounded] 6. Core MVP Scope: Remove the mandatory percentage from Core MVP Scope unless scoring is defined, and rewrite as: 'Display one profile-level health status summary on the dashboard; if a Health Score is included in MVP, treat it as a placeholder summary of how up to date the profile is against its recommended health actions until calculation is separately defined.' (confidence=high)
    rationale: The framing allows a visible summary metric only as a placeholder, so this bounds the requirement without inventing an unsupported scoring formula.
    implementation note: If the brief keeps the score, define its formula in a separate rule before using percentage language.
  - [scope_not_bounded] 6. Core MVP Scope: Replace the open-ended profile statement with a bounded MVP cap, e.g. 'Let one account manage up to five total profiles in MVP, each with its own plan, summary, and vaccination context; profile permissions and child/adult-specific rules are out of scope for MVP.' (confidence=medium)
    rationale: A numeric cap makes family mode testable while keeping the section focused on separate planning contexts per profile.
    implementation note: Use a temporary implementation cap in the brief and leave broader family rules to a later decision section.
  - [draft_integrity_issue] 9. Technical Direction: Repair the malformed sentence to read cleanly, e.g. 'Current MVP default is a mobile-first responsive web experience.' (confidence=high)
    rationale: This removes the drafting artifact and restores a syntactically valid technical-direction statement.
    implementation note: Apply this wording only after aligning the surrounding platform language with the open-decision status.

  - [source_overreach] 9. Technical Direction: Downgrade the platform statement from a hard lock to a default, e.g. 'Current MVP default is a mobile-first responsive web experience, pending final platform confirmation. Cross-platform app delivery is not assumed in this brief unless later selected as the MVP target.' (confidence=high)
    rationale: The framing keeps web vs cross-platform open, so the brief should express a working default rather than a final exclusion.
    implementation note: Keep the final platform choice in the open-decisions or assumption area until evidence closes it.
 
  - [source_overreach] 7. UX Principles and Tone: Rewrite the language line as a working default, e.g. 'English is the current MVP working language for product copy and labels, pending final language-strategy confirmation. Multilingual support is not assumed for MVP unless later scoped.' (confidence=high)
    rationale: This matches the framing, which leaves MVP language strategy unresolved, while still giving implementation teams a usable default.
    implementation note: Avoid phrasing that implies English-only is a final product decision unless the source set later confirms it.


### Run 2026-04-23T09:27:18.676Z

- Input brief path: `docs/reviews/product-manager/project-brief.failed.md`
- Mode: `semantic_only`
- Verdict: `fail`
- Issue count: `5`

- Findings:
  - [ambiguous_term] 5. MVP Objective: "- Deliver a calm, mobile-first experience that explains what to do, when to do it, and why it matters."
  - [scope_not_bounded] 6. Core MVP Scope > Onboarding and plan generation: "- Generate a rule-based preventive health plan immediately after onboarding."
  - [source_overreach] 6. Core MVP Scope > Dashboard and prioritization: "- Show profile-specific health actions in three timing-based priority buckets on the dashboard: Now, Soon (next 14 days), and Later (next 6 months)."
  - [unresolved_alternative] 6. Core MVP Scope > Dashboard and prioritization: "- Display one profile-level health status summary on the dashboard; if a Health Score is included in MVP, treat it as a placeholder summary of how ..."
  - [source_overreach] 6. Core MVP Scope > Family mode: "- Let one account manage up to five total profiles in MVP, each with its own plan, summary, and vaccination context; profile permissions and child/..."



- Recommended fixes:
  - [ambiguous_term] 5. MVP Objective: Replace soft wording with measurable bounds (time/count/threshold) in the same line.
  - [scope_not_bounded] 6. Core MVP Scope > Onboarding and plan generation: Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.
  - [source_overreach] 6. Core MVP Scope > Dashboard and prioritization: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.
  - [unresolved_alternative] 6. Core MVP Scope > Dashboard and prioritization: Choose one default decision and rewrite without open alternatives.
  - [source_overreach] 6. Core MVP Scope > Family mode: Either tie the decision explicitly to evidence/framing support, or downgrade to an MVP default without hard lock.



- Suggestions:
  - [ambiguous_term] 5. MVP Objective: Rewrite the objective to use an evidence-backed clarity standard, e.g. "Deliver a mobile-first experience that shows the next recommended health action, when to do it, and why it matters within roughly the first 60 seconds." (confidence=high)
    rationale: This replaces the subjective term with a concrete user-value bound already supported by the framing and keeps the section focused on MVP intent.
    implementation note: Prefer 'clear' or 'simple' over 'calm' unless the brief also defines measurable UX criteria for that term.
  
  - [scope_not_bounded] 6. Core MVP Scope > Onboarding and plan generation: Bound the timing to the onboarding flow, e.g. "Generate a rule-based preventive health plan as the final step of onboarding, before the user reaches the dashboard in the same first-session flow." (confidence=high)
    rationale: This makes the scope testable without introducing unsupported technical latency targets and aligns to the framing requirement for immediate plan generation.
    implementation note: Anchor timing to a product moment users can verify, not a vague adverb like 'immediately'.
  
  - [source_overreach] 6. Core MVP Scope > Dashboard and prioritization: Downgrade the bucket definition to an MVP default, e.g. "Show profile-specific health actions in priority buckets for now, soon, and later on the dashboard; final user-facing labels and exact time windows remain open." (confidence=high)
    rationale: The framing confirms timing-based prioritisation is core, but it also says the final taxonomy is unresolved, so fixed 14-day and 6-month windows overstate what is decided.
    implementation note: If exact thresholds are needed later, move them to an explicit open decision or evidence-backed downstream artifact.
  
  - [unresolved_alternative] 6. Core MVP Scope > Dashboard and prioritization: Resolve the alternative by excluding Health Score from MVP wording, e.g. "Display one profile-level health status summary on the dashboard; do not include a separate Health Score in MVP." (confidence=medium)
    rationale: This removes the conditional branch while avoiding commitment to an undefined metric whose calculation and meaning are still open.
    implementation note: Keep the dashboard summary language generic so a future score can be added later without rewriting the surrounding model.
  - [source_overreach] 6. Core MVP Scope > Family mode: Replace the fixed limit with framing-safe language, e.g. "Let one account manage multiple profiles in MVP, each with its own plan, summary, and vaccination context; profile limits and permissions remain open." (confidence=high)
    rationale: The framing supports multiple profiles per account but does not support a maximum of five, so the current wording hard-locks an unsupported constraint.
    implementation note: If a temporary implementation cap exists, document it outside the product brief as an engineering constraint, not as product scope.


### Run 2026-04-23T09:37:19.000Z

- Input brief path: `docs/reviews/product-manager/project-brief.failed.md`
- Mode: `semantic_only`
- Verdict: `fail`
- Issue count: `6`

- Findings:
  - [unresolved_alternative] 6. Core MVP Scope / Dashboard and prioritization: "Show profile-specific health actions in priority buckets for now, soon, and later on the dashboard; final user-facing labels and exact time windows..."
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: "Show profile-specific health actions in priority buckets for now, soon, and later on the dashboard; final user-facing labels and exact time windows..."
  - [unresolved_alternative] 6. Core MVP Scope / Dashboard and prioritization: "Display one profile-level health status summary on the dashboard; if a Health Score is included in MVP, treat it as a placeholder summary of how up..."
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: "Display one profile-level health status summary on the dashboard; if a Health Score is included in MVP, treat it as a placeholder summary of how up..."
  - [unresolved_alternative] 6. Core MVP Scope / Family mode: "Let one account manage multiple profiles in MVP, each with its own plan, summary, and vaccination context; profile limits and permissions remain open."
  - [scope_not_bounded] 6. Core MVP Scope / Family mode: "Let one account manage multiple profiles in MVP, each with its own plan, summary, and vaccination context; profile limits and permissions remain open."
- Recommended fixes:
  - [unresolved_alternative] 6. Core MVP Scope / Dashboard and prioritization: Choose one default decision and rewrite without open alternatives.
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.
  - [unresolved_alternative] 6. Core MVP Scope / Dashboard and prioritization: Choose one default decision and rewrite without open alternatives.
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.
  - [unresolved_alternative] 6. Core MVP Scope / Family mode: Choose one default decision and rewrite without open alternatives.
  - [scope_not_bounded] 6. Core MVP Scope / Family mode: Add enforceable boundaries (where/when/how many/in-scope vs out-of-scope) to make the scope testable.
- Suggestions:
  - [unresolved_alternative] 6. Core MVP Scope / Dashboard and prioritization: Set "Now", "Soon", and "Later" as the default user-facing dashboard bucket labels for MVP and remove wording that leaves the labels undecided. (confidence=high)
    rationale: These labels already match the product framing and jobs-to-be-done, so using them as the brief default improves clarity without expanding scope.
    implementation note: Rewrite the scope bullet to state the dashboard groups profile-specific health actions into Now, Soon, and Later buckets in MVP.
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: Define one explicit MVP bucket rule in the brief: each health action appears in exactly one dashboard bucket based on next due date — Now = overdue or currently due, Soon = due within 90 days, Later = due more than 90 days out. (confidence=medium)
    rationale: A single timing rule makes the dashboard behavior testable and bounded while staying aligned to the product’s prioritised-guidance model.
    implementation note: Replace the open-ended timing language with the above rule and note that custom bucket definitions are out of scope for MVP.
  - [unresolved_alternative] 6. Core MVP Scope / Dashboard and prioritization: Default MVP to exclude Health Score and show a non-scored profile health status summary on the dashboard instead. (confidence=high)
    rationale: The framing supports a profile summary without requiring an undefined score, so this removes the optionality while preserving the intended user value.
    implementation note: Rewrite the bullet to say the dashboard displays one profile-level health status summary in MVP; Health Score is not included until its calculation and meaning are defined.
  - [scope_not_bounded] 6. Core MVP Scope / Dashboard and prioritization: Bound the dashboard summary to one summary per active profile showing status counts only, and state that numeric scoring, trends, and comparative metrics are out of scope for MVP. (confidence=high)
    rationale: Using existing status concepts makes the summary concrete and testable without relying on an undefined Health Score.
    implementation note: Add brief wording such as: "Show one profile-level summary with counts of due, completed, and planned actions; no Health Score, trendline, or benchmark comparison in MVP."
  - [unresolved_alternative] 6. Core MVP Scope / Family mode: Set a single MVP family-mode default: one primary account can manage up to 5 profiles, and all profiles are managed by that same account holder. (confidence=medium)
    rationale: This resolves the open profile-count and permission questions with a simple default that fits the multi-profile family framing.
    implementation note: Rewrite the family-mode bullet to specify the 5-profile cap and remove wording that leaves limits and permissions open.
  - [scope_not_bounded] 6. Core MVP Scope / Family mode: Rewrite family mode with explicit MVP bounds: up to 5 profiles per account; each profile has its own plan, summary, and vaccination context; only the primary account holder can view and edit profiles. (confidence=medium)
    rationale: These boundaries make family mode enforceable and keep permissions consistent with the brief’s single-account multi-profile model.
    implementation note: Add an out-of-scope note for secondary users, profile sharing, and role-based or child/adult-specific permission models.
