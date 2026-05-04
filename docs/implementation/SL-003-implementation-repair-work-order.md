# Implementation repair work order: SL-003 Full Health Plan View

You are acting as the Coder role for a targeted Fabric repair run.
Repair the current implementation based on manual QA findings from the user checklist.

## Repair scope
- Do not restart the slice.
- Do not redesign unrelated areas.
- Do not change the Fabric runtime.
- Do not waive findings.
- Do not mark the checklist Pass yourself.
- Keep changes limited to the active slice and directly affected integration points.

## Required source documents to read first
- `docs/product/current-slice.yaml`
- `docs/testing/SL-003-user-checklist.md`
- `docs/implementation/SL-003-implementation-notes.md`
- `docs/ux/SL-003-current-slice-flow.md`
- `docs/ux/SL-003-semantic-ux-contract.json`
- Existing implementation files needed to understand and repair the finding.

## Manual QA findings to repair
```json
[
  {
    "index": 1,
    "classification": "A",
    "finding": "After entering the user age and gender we land on the page that shows the button 'view full health plan'. when we click on any of the boxes in the 'All recommended preventive care steps' section, we see the details of that step, but no button to get back to anywhere. the only button is the 'Mark as Done' button. THe only way to get back is to use the browser back button.",
    "expected": "Button that allows us to go back from the step details to the full health plan view.",
    "observed": "",
    "required_repair": "Include a button taking us back to the health plan view."
  },
  {
    "index": 2,
    "classification": "B",
    "finding": "from the main page, when we click on an item and get its detailed view, we do get the 'Back to dashboard' button. when we click on it, it takes us back to the dashboard, but then the Health Plan section is missing entirely. If we do a refresh of the browser page, the Health plan section appears again.",
    "expected": "When we come back, the health plan section should be still available.",
    "observed": "",
    "required_repair": "Review and fix the behavior."
  }
]
```

## Classification guidance
- Finding 1: Bug / implementation defect — existing requirement is clear, implementation is wrong. Prefer code/test repair.
- Finding 2: UX/content quality issue — behavior works, but copy/interaction is not good enough. Prefer UX/content/interaction repair plus test updates where useful.

## Repair rules
- Fix the implementation, not the checklist result.
- Do not mark the checklist Pass; the human reviewer owns checklist acceptance.
- Preserve all previously passing acceptance criteria.
- If tests encode rejected behavior, update them narrowly to match the repaired behavior.
- If the finding is a requirement gap, update the relevant product/UX/checklist artifact first or clearly document the requirement clarification.
- Keep user-facing copy meaningful, clear, and free of internal process/factory language.

## Post-repair validation to run
```bash
npm test
npm run build
./fabric/company/v1/fabric uiux:review-current-slice-semantics --target . --values ./fabric.values.json
./fabric/company/v1/fabric doctor --target . --values ./fabric.values.json
```

## Required final response
- Manual QA findings repaired
- Files changed
- Test/build/doctor status
- Semantic review status after repair
- Any remaining risks
