# CODEX task — audit the Vitalis app against the design system and align it

## Role

You are a senior front-end engineer and design-systems auditor working in this repository. Your job is
to bring the Vitalis app into **full compliance** with the canonical design system, without changing
product scope or inventing new features.

## Source of truth

1. **`design/vitalis-design-system.html`** — the canonical specification. Open and read it in full
   before touching code. Its `:root` CSS block is the authoritative token set; its component,
   pattern, rules and **Compliance checklist** sections are the acceptance criteria. It also contains
   **rendered visual specimens** (buttons, inputs, rows, badges, navigation, sheets, ProgressRing,
   BodyMap with its six positioned status dots, and a full Gantt Zeitstrahl at real app metrics) —
   open it in a browser and compare against the running app, don't audit from the tables alone.
2. **`design/tokens/*.css`** (imported by `design/styles.css`) — the machine-readable token layer.
   These values must match the spec file exactly; if they drift, the spec file wins.
3. Reference implementations, if present in the repo: `components/**` (`.jsx` + `.d.ts` +
   `.prompt.md` per component) and the interactive click-through in `ui_kits/vitalis-app/`. Use these
   to understand intended structure and prop APIs — not as production code to copy verbatim.

If any of these paths differ in this repo, locate the equivalents and state what you used.

## Phase 1 — Audit (do this first, do not refactor yet)

Produce a written audit report at **`design/audit/DESIGN_AUDIT.md`** containing:

### 1. Inventory
A table mapping each app screen/component to its design-system counterpart:

| App file / component | DS counterpart | Status |
|---|---|---|
| … | `ListRow` | matches / deviates / missing / undocumented |

Flag both directions: app code that deviates from the system, **and** app UI that exists in the
system but is unused (or exists in the app but is undocumented in the system).

### 2. Findings
Walk the **19-point Compliance checklist** in the spec file. For each numbered check, report
`PASS` / `FAIL` / `PARTIAL` with concrete evidence: file path, line number, the offending value, and
the token or rule it should use. Be specific — "hard-coded `#2B7FB8` at `src/screens/Home.tsx:142`,
should be `--color-primary`" — not "colors are inconsistent".

Pay particular attention to these known failure modes:
- Raw hex/rgb literals, px radii, or shadow values that duplicate an existing token.
- Spacing values that are not 4px-scale steps; screen padding other than 20px.
- Status colours used decoratively, or status conveyed by colour without a text label.
- Interactive elements under 44×44px, or missing focus rings / `outline: none` without replacement.
- Rows that mutate state on tap instead of navigating to a detail page.
- Circular elements (timeline nodes, avatars, BodyMap dots) rendered as ovals because a flex parent
  stretches them — they need explicit size, `flex: none`, `box-sizing: border-box`.
- Hard-coded user-visible strings; any string present in only one of DE/EN; locale-incorrect date or
  time formats.
- Missing or altered logo variants; the medical disclaimer absent from recommendation screens.
- Alarm-toned or formal ("Sie") German copy; emoji.
- Chart rows with no visible element and no off-range indicator (an item outside the current Gantt
  scope must render the dashed edge pill with its date, not a blank row).
- Text that overflows a fixed-height container because a sub-label has no explicit `line-height`
  (the axis header is 30px and must clip).

**Two rules that are commonly "corrected" by mistake — do not change these:**
- **Type tiers.** Content text is ≥ 11px, but a documented **micro tier of 8.5–10.5px** is correct and
  intentional for chart axis labels, tab-bar labels, chart legends and dense chart row captions. In
  particular the **TabBar is a 23px icon over a 9px label** (600 active / 500 idle) — that is the
  specified value, not a violation. Only flag sub-11px type that carries content, an action or a
  status on its own.
- **Sex is binary** (weiblich / männlich) because vaccination and screening schedules derive from it
  clinically. Do not add options to that control.

### 3. Severity + plan
Group findings as **Blocking** (violates a rule with user-facing impact: contrast, tap targets,
status semantics, data mutation on tap, missing localisation, medical-boundary breaches),
**Major** (token drift, wrong component used, structural pattern deviation), **Minor** (cosmetic
spacing/radius nits). Then propose a migration plan in this order:

1. Token layer — import/port the token set; remove duplicated literals.
2. Shared primitives — Button, IconButton, Input, Card, ListRow, Badge, Avatar, ProgressRing.
3. Navigation shell — TabBar, TopBar, full-screen detail routing, Sheet.
4. Signature UI — BodyMap, ProgressRing medallion, Zeitstrahl (Start-page node rail + full-page
   Gantt: lanes, coverage/interval bars with elapsed shading and recurrence stripes, due rings,
   milestone circles, gradient "Heute" line, 12-month / 5-year scope, off-range edge pills).
5. Screen-by-screen alignment.
6. Cross-cutting rules — localisation, accessibility, motion, voice.

**Stop after Phase 1 and wait for my approval before making changes.**

## Phase 2 — Align (only after I approve)

Work through the approved plan in the order above, in **small reviewable commits, one concern per
commit** (e.g. `refactor(tokens): replace hard-coded blues with semantic aliases`).

Rules while aligning:

- **Adapt, don't transplant.** The reference components are authored for a no-build browser preview
  (plain `React.createElement`, inline styles, Lucide via CDN). Port them idiomatically to this
  repo's stack and styling approach. The **visual result, prop API and token usage must be
  identical**; the delivery mechanism should match local conventions.
- **Preserve the prop contracts** documented in the `.d.ts` files and the spec's component tables.
  Do not rename or drop props; add new ones only if the spec requires them.
- **Never hard-code a value that a token exists for.** If you genuinely need a new value, add a
  properly named token and note it in the report for later addition to the spec.
- **Do not redesign.** Fix compliance only. If you believe the spec itself is wrong or a rule
  conflicts with a platform constraint, record it under "Open questions" and ask — do not silently
  deviate.
- **Don't change product scope.** No new screens, features or content. Sample/mock data may be
  adjusted only where needed to satisfy the localisation rule.
- **Assets:** copy the logo SVGs (`guidelines/logo/`) and the body silhouettes (`assets/`) into this
  repo's asset pipeline rather than referencing them across projects. `assets/body-silhouettes.js`
  provides the silhouettes as data URIs if an external fetch is undesirable.
- **Verify as you go.** After each phase, confirm the app builds, run the test suite and linter, and
  re-check the affected checklist items. Note any check that moved from FAIL to PASS.

## Deliverables

1. `design/audit/DESIGN_AUDIT.md` — the Phase 1 audit (inventory, per-check findings with file:line
   evidence, severity grouping, migration plan, open questions).
2. The Phase 2 commits implementing the approved plan.
3. `design/audit/ALIGNMENT_SUMMARY.md` — what changed, per checklist item: final PASS/FAIL, files
   touched, anything deliberately deferred and why.
4. A short list of **spec gaps**: app UI that has no design-system counterpart and should be
   documented, so the spec file can be updated in the same pull request.

## Constraints

- Do not modify `design/vitalis-design-system.html` as part of aligning the app. If the spec needs a
  correction, propose the exact edit in your summary and let me decide.
- Keep the repository's existing architecture, routing and state management. This is a design
  alignment, not a rewrite.
- Ask before any change that touches more than ~20 files in one commit.
