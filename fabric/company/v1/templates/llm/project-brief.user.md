Use the evidence pack, source synthesis, and product-system framing below to draft the project brief.
The brief should be specific enough to guide downstream roles, but should not contain slice-level implementation detail.
Keep text compact and decision-useful.

Project name: {{project_name}}

Decision-quality rules:
- Resolve alternatives by choosing one default; do not leave open "X or Y" wording.
- Keep one decision per bullet.
- Avoid soft terms ("should", "could", "may", "simple", "lean", "scalable") unless explicitly bounded in the same line.
- In "Primary Success Criteria", every bullet must include an observable signal (time/count/threshold or binary completion condition).
- In "Core MVP Scope", every bullet should be action-oriented and explicitly bounded.
- Do not change the 15-section shape.
- Prefer evidence-grounded specifics from the provided sources over generic product language.
- Avoid repeating the same claim across multiple sections unless the section intent explicitly requires it.
- Each bullet should add one concrete behavior, boundary, or measurable condition.
- Do not output malformed lines (broken quotes, stray punctuation, concatenated fragments, unresolved placeholders).
- Do not lock channel/formula/canonical decisions unless the provided evidence or framing explicitly supports that lock.

## Clarity Rules Contract (always apply)
{{clarity_rules_contract}}

Rewrite behavior requirements:
- If Clarity Gate Feedback is present, treat it as required fixes.
- Keep all previously compliant lines compliant.
- Do not introduce new clarity-rule violations while fixing old ones.
- Before returning, self-check the full draft against the full clarity rules contract and revise once more if needed.

## Clarity Gate Feedback (may be empty)
{{clarity_gate_feedback}}

## Previous Brief Draft (may be empty)
{{previous_brief_markdown}}

## Evidence Pack
{{evidence_pack}}

## Source Synthesis JSON
```json
{{source_synthesis_json}}
```

## Product System Framing JSON
```json
{{framing_json}}
```
