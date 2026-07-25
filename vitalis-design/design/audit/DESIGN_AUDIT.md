# Vitalis Design Alignment Audit

Phase 1 only, per `vitalis-design/design/CODEX_DESIGN_ALIGNMENT_PROMPT.md`. This is an
**independent** audit — it does not reuse or assume the conclusions of any prior audit run in this
repo. Every finding below was re-derived directly from the current source files. **No app changes
were made.** Stop and wait for approval before Phase 2.

## Source paths used

The prompt's paths are one level up from where this file actually lives (the design-system package
is nested under `vitalis-design/` in this repo, not at the repo root). Equivalents used:

| Prompt path | Actual path used |
|---|---|
| `design/vitalis-design-system.html` | `vitalis-design/design/vitalis-design-system.html` |
| `design/tokens/*.css` | `vitalis-design/design/tokens/*.css` |
| `components/**` | `vitalis-design/components/**` |
| `ui_kits/vitalis-app/` | `vitalis-design/ui_kits/vitalis-app/` |
| (app code) | `src/**` (the running app, per `CLAUDE.md`) |

The canonical spec (1332 lines) was read in full, including every component/pattern section and the
Compliance checklist. All six `design/tokens/*.css` files, all reference `components/**` (`.jsx` +
`.d.ts`), and the full interactive prototype (`ui_kits/vitalis-app/index.html`, 818 lines, plus
`vitalis-ui.js`) were read directly — not sampled from the spec's tables alone.

**No in-browser visual comparison was performed** (no browser tool was used in this session);
findings are code-backed, cross-referenced against the spec's literal CSS/JS values line-by-line.
Where a finding depends on rendered layout rather than a literal value, that is called out explicitly
below with lower confidence, and a visual pass is recommended before Phase 2 sign-off.

### A finding about the source itself

The **reference implementation deviates from its own canonical spec** in several places, and the
**machine-readable token layer (`design/tokens/*.css`) is incomplete relative to the spec's `:root`
block**. Both are noted throughout (they matter for Phase 2: per the prompt, "if these values differ,
the spec file wins," so the app should target the spec text/table values, not the reference
component's literal values, where the two disagree):

- `components/forms/Button.jsx` and `ui_kits/vitalis-app/vitalis-ui.js` use button heights
  `sm=36/md=48/lg=56`, but the spec's own rendered `.v-btn` demo (`vitalis-design-system.html:181-189`)
  and prose ("Minimum height is always `--tap-min`" = 44px) specify `sm=36/default=44/lg=52`. The
  reference component itself is off-spec for `md` and `lg`.
- `components/forms/Input.jsx` uses `height:52`, `1.5px` border, and a **4px** focus ring
  (`0 0 0 4px var(--focus-ring)`), but the spec's `.v-input` demo and Inputs table both specify 44px
  min-height, 1px `--border-strong`, and a **3px** focus ring.
- `components/data-display/ListRow.jsx` uses a 44×44 icon tile (`var(--radius-sm)`, 11px radius), but
  the spec's Cards & list rows table says "Sits in a 40×40 / `12px` radius tile" (and the `.v-row
  .lead-ico` demo class is literally 40×40/12px).
  `components/data-display/Badge.jsx` hard-codes `#1d6b48` / `#9a6a1c` / `#b23a2a` as status-badge text
  colors — these aren't defined as tokens anywhere, in the spec or the token layer.
  `components/brand/Logo.jsx` hard-codes `#fff` / `#FFFFFF` / `#8FCFC9` / `rgba(43,127,184,.4)` instead
  of `var(--teal-300)` etc.
  None of `Button.jsx`, `IconButton.jsx`, `ListRow.jsx`, `TabBar.jsx`, `Card.jsx`, `Badge.jsx`,
  `Avatar.jsx`, `BodyMap.jsx` implement any `:focus-visible` treatment at all, despite the spec's
  Accessibility rule requiring one on every focusable control.
- `components/health/BodyMap.jsx`'s dot `<button>` is a flat 26×26px hit area, but the spec's own
  Accessibility table requires "BodyMap dots (26px visual **in a 44px hit area**)" — the reference
  component does not implement the larger hit area its own spec text demands. This is a genuine
  internal inconsistency in the design source, not just an app gap (see Open Questions).
- `design/tokens/shadows.css` and the other five token files have **no `--shadow-medallion` token**
  and **no motion tokens at all** (`--ease-standard`, `--ease-spring`, `--dur-fast/base/slow`) and
  **none of the 8 required `@keyframes`** (`v-fade`, `v-up`, `v-slide`, `v-slidein`, `v-ping`, `v-dot`,
  `v-halo`, `v-draw`) that the canonical `:root` block in `vitalis-design-system.html:58,91,93-107`
  defines and that components explicitly depend on (`Sheet.jsx` and `BodyMap.jsx` docblocks say
  "Requires @keyframes v-fade and v-slide/v-dot and v-ping on the page"). There is currently no
  complete, importable machine-readable motion/medallion layer for the app to adopt even if it wanted
  to — this needs to be added to `design/tokens/` (e.g. a new `motion.css`) as part of, or before,
  Phase 2.

## 1. Inventory

| App file / component | DS counterpart | Status |
|---|---|---|
| `src/design-system/tokens/*.css` | Token layer (`design/tokens/*.css`) | matches values verbatim (colors/radius/spacing/typography diff byte-identical); shadows.css matches the 5 named shadows but, like the source, has no `--shadow-medallion`/motion layer |
| `src/styles.css` (`:root`) | Foundations / global reset | deviates: hard-codes `font-family: Inter…` and legacy Tailwind-slate hex/rgba (`#0f172a`, `#e2e8f0`, `rgba(15,23,42,…)`) instead of the token layer |
| `src/design-system/components/Button.jsx/.css` | `Button` | deviates from spec text (44/52px) but matches the reference's own off-spec 48/56px; no focus ring |
| `src/design-system/components/IconButton.jsx/.css` | `IconButton` | partial: `sm`=36px (below `--tap-min`); no focus ring |
| `src/design-system/components/Input.jsx/.css` | `Input` | partial: 52px height / 1.5px border / 4px ring — matches the (off-spec) reference, not the spec text |
| `src/design-system/components/Card.jsx/.css` | `Card` | matches; no focus ring needed unless `onClick` is set (not verified visually) |
| `src/design-system/components/ListRow.jsx/.css` | `ListRow` | partial: 44×44 icon tile / `--radius-sm` (matches reference, not spec's documented 40×40/12px); no focus ring |
| `src/design-system/components/Badge.jsx/.css` | `Badge` | partial: status mapping correct; text colors are new undocumented hex (inherited from reference, not tokenized) |
| `src/design-system/components/Avatar.jsx/.css` | `Avatar` | matches structurally |
| `src/design-system/components/ProgressRing.jsx/.css` | `ProgressRing` | matches structurally; dashboard usage is 60px/6px vs spec's 72–78px/9px hero medallion |
| `src/design-system/components/Logo.jsx/.css` | `Logo` | matches structurally; hard-codes hex/rgba instead of tokens (inherited from reference) |
| `src/design-system/components/TabBar.jsx/.css`, `src/components/PrimaryNav.jsx` | `TabBar` | matches spec closely: 5 fixed tabs, 23px icon / 9px label, 44px min tap target; no focus ring |
| `src/design-system/components/TopBar.jsx/.css` | `TopBar` | matches structurally; hard-coded English `backLabel` default (currently unreachable — all call sites override it) |
| `src/design-system/components/Sheet.jsx/.css` | `Sheet` | deviates: close button is `size="sm"` (36px, below tap-min) with a hard-coded English `"Close"` label |
| `src/design-system/components/BodyMap.jsx/.css` | `BodyMap` | partial: dots are 26×26 flat hit area (shared gap with the reference itself, see above); `content-box` used on the ring/core (see Findings #10) |
| `src/features/self-onboarding-to-first-dashboard/*` | Dashboard hero + BodyMap + ProgressRing + start rail | partial: pattern present, but token drift, undersized ProgressRing, one hard-coded `'N/A'` fallback, unlocalized `toLocaleDateString(undefined,…)` date, count-up ignores reduced motion |
| `src/features/plan-timeline/PlanTimeline.jsx` | Full-page Zeitstrahl (Gantt) | **deviates significantly**: renders a vertical point-event list (past/today/upcoming), not a Gantt — no lanes, no bars, no scope toggle, no off-range pills |
| `src/features/item-completion-and-reminder-actions/*` | Detail pages + explicit actions + quick-add Sheet | partial: row-tap-navigates behaviour is correct; hard-coded English strings; a third, undocumented "time-to-go" linear progress bar; manual-entry Sheet exceeds the ≤2-field / no-status-change sheet rule |
| `src/components/ProfileSheet.jsx/.css` | Profile-switch Sheet | **deviates significantly**: flat list, no "Du"/"Verwaltete Profile · n von 10" grouping, no role subtitle per row, no cap display or enforcement |
| `src/components/SettingsScreen.jsx/.css` | Settings anatomy | partial: anatomy present; all "Persönliche Daten" fields rendered `disabled` though the spec table documents them as "all correctable"; language toggle correct but literal `"Deutsch"/"English"` bypass `t()` |
| `src/features/live-enrollment/LiveEnrollment.jsx/.css`, `RiskProfileStep.jsx` | Onboarding controls | binary sex control preserved; additional height/weight/risk-flag fields are app scope with no DS counterpart (see Open Questions) |
| `src/features/auth/EmailPasswordAuth.jsx` | — | no Designer source; reuses Card/Input/Button vocabulary (per project history) — undocumented in the spec |
| `src/components/ComingSoonSurface.jsx` | — | undocumented app UI (placeholder for Termine/Safe) |
| `src/design-system/layout.css` `.vitalis-seg` | `Segmented` control | matches spec's `.v-seg` pattern |
| DS `Chip` pattern | — | not found in current app code (no chip filter UI reachable — Safe/document filters are `ComingSoonSurface` now) |
| DS full Gantt (lanes, bars, due rings, milestones, off-range pills) | — | **no production counterpart at all** |
| `src/features/health-plan-browsing-and-item-detail/HealthPlanBrowsingAndItemDetail.jsx` | — | file deleted; dead route already removed (confirmed via `git status`/`find` — not part of current inventory) |
| `src/features/vaccination-tracking-area-and-manual-entries/*` | — | only `model.js`/`service.js` remain (logic reused elsewhere); no `.jsx`/route — dead screen, already inert |

## 2. Compliance checklist findings

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Token usage | **FAIL** | `src/styles.css:7` — `:root{font-family:Inter,ui-sans-serif,…}` — never references `var(--font-sans)`, so any element that doesn't explicitly set `font-family: var(--font-sans)` inherits Inter, not Public Sans. `src/styles.css:8,35,36,39,42-44` — raw hex/rgba (`#0f172a`, `#fff`, `#e2e8f0`, `rgba(15,23,42,.06)`, `#ecfeff`, `#eff6ff`, `#0f766e`, `#334155`) — an old Tailwind-slate palette, not a single Vitalis token. `src/features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css:2-6` — same pattern (`#ffffff,#f8fafc,#0f172a,#334155,#64748b`). `src/features/item-completion-and-reminder-actions/item-completion-and-reminder-actions.css:210,212,213,225,227,244,250,257,264` — raw hex/rgba (`#4338ca`, `rgba(67,56,202,.08)`, `#dbe3ef`, `#f2f7ff`/`#f8fbff`, `#0f5a94`, `#b23b2a`, `#dce7f6`, `#0c4a6e`/`#1f5c8d`) building an undocumented indigo "shared decision" note and a "time-to-go" bar (also see #19) that use colors outside the entire Vitalis palette, not just untokenized ones. `src/design-system/components/Badge.css:16-18` — `#1d6b48/#9a6a1c/#b23a2a` (see note above: a real, documented a11y-contrast need, but not promoted to a named token). |
| 2 | Spacing | PARTIAL | `src/styles.css:31` — `.app-shell{padding:12px 20px 64px}`: horizontal 20px matches `--screen-pad`; 12px/64px are literals, not references (64 happens to equal `--space-16`). List/row gap is correct: `src/design-system/layout.css` `.rows{gap:10px}` matches spec exactly. Several feature CSS paddings (`13px 14px` row padding, matching the off-spec reference rather than the spec's 12px 14px demo) aren't on the 4px scale, but this traces back to the reference implementation itself (see "A finding about the source itself"), not an app-introduced regression. |
| 3 | Radius | **FAIL** | `src/styles.css:37` — `.panel{border-radius:20px}` — not a radius token (nearest named steps are `--radius-lg` 16px / `--radius-xl` 22px). `src/features/health-plan-browsing-and-item-detail/health-plan-browsing-and-item-detail.css:10` — `border-radius:15px`. `src/features/item-completion-and-reminder-actions/item-completion-and-reminder-actions.css:226` — `border-radius:0.9rem` (~14.4px, close to but not `--radius-md`). `src/components/settings-screen.css:26` — `border-radius:11px` literal (equals `--radius-sm`'s value by coincidence, not a reference). Note: the dashboard's `20px` medallion radius (`self-onboarding-to-first-dashboard.css:185`) is **not** a violation — the spec itself documents the hero medallion as a literal `20px`, not a token (`.v-medallion{border-radius:20px}` in the spec's own CSS, and the Dashboard hero table: "Score medallion: White, 20px radius…"). |
| 4 | Elevation | **FAIL** | `src/styles.css:39` — `.panel{box-shadow:0 12px 30px rgba(15,23,42,.06)}` — uses the old Tailwind slate-900 RGB, not the Vitalis cool-tint `rgba(30,42,54,…)`, and doesn't match any of the 5 named shadow tokens. `src/features/plan-timeline/plan-timeline.css:142` — `rgba(31,94,138,.3)` in a custom box-shadow, not a token. The dashboard's medallion shadow (`self-onboarding-to-first-dashboard.css:187`, `0 12px 26px -12px rgba(31,94,138,.30), 0 2px 6px rgba(30,42,54,.05)`) is pixel-identical to the spec's `--shadow-medallion` value — good fidelity — but is necessarily written as a literal because **no `--shadow-medallion` token exists in either token layer** (see "A finding about the source itself"); this is a token-layer gap to close before the app can reference it. |
| 5 | Typography | **FAIL** | Confirmed by diff: `src/design-system/tokens/typography.css` is byte-identical to the canonical `design/tokens/typography.css` (all size/lh/weight steps match). The defect is `src/styles.css:7`'s root-level `font-family: Inter,…` override (see #1), which means the *rendered* typeface is not guaranteed to be Public Sans anywhere that doesn't explicitly opt back in with `var(--font-sans)`. Micro-tier usage (TabBar 23px icon / 9px label) is correct and intentional per the spec's documented exception — not a violation. |
| 6 | Status semantics | PARTIAL | The status→hue mapping is preserved correctly everywhere sampled (`ListRow`'s `TONES` table, `Badge`'s `MAP`, `statusVisuals.js`-driven usage in `ItemCompletionAndReminderActions.jsx`): red=overdue, amber=upcoming, green=done, blue=due, and every badge/row pairs the color with a text label (no color-only status found). The one real gap is the undocumented indigo "shared decision" note (`item-completion-and-reminder-actions.css:210-214`, `#4338ca`/`rgba(67,56,202,.08)`) — a **new decorative hue outside the entire Vitalis palette** (not a status hue repurposed, but not an approved brand/status color either); flag this specifically for a design decision in Phase 2 (drop it, or formalize it as a token). |
| 7 | Tap targets | **FAIL** | `src/design-system/components/IconButton.css:20` — `.vds-icon-button--sm{width:36px;height:36px}`, below `--tap-min` (44px). This is used concretely at `src/design-system/components/Sheet.jsx:77` (`<IconButton icon="x" variant="ghost" size="sm" … />`) — every Sheet's close button in the app (including the profile switcher and both quick-add sheets) has a 36px hit target. `src/design-system/components/BodyMap.css:26-30` — the BodyMap dot's hit area is exactly 26×26px, not the 44×44px the spec's Accessibility table requires (this gap is shared with the reference `BodyMap.jsx` itself — see Open Questions). |
| 8 | Focus rings | **FAIL** | Zero `:focus-visible` rules exist in `src/design-system/components/Button.css`, `IconButton.css`, `ListRow.css`, `TabBar.css`, `BodyMap.css`, `Badge.css`, `Card.css`, `Avatar.css`, `ProgressRing.css`, `Logo.css`, or `Sheet.css`. `src/design-system/components/Input.css:26-28` has a focus treatment (`:focus-within{border-color:var(--color-primary);box-shadow:0 0 0 4px var(--focus-ring)}`) but at **4px**, not the spec's 3px. Across the entire app, exactly one bespoke `:focus-visible` rule exists: `src/features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css:395` (`.vitalis-dash-section-toggle:focus-visible`). Every primary interactive surface — buttons, icon buttons, list rows, tab bar, body-map dots — has no visible keyboard-focus indicator at all. |
| 9 | Row behaviour | **PASS** | Every list-row `onClick` found (`ItemCompletionAndReminderActions.jsx:129,1228`, `PlanTimeline.jsx` node taps, dashboard rows) navigates to a detail view or opens a form; state mutation (`onOpenDone`/`onOpenReminder`, `handleManualSubmit`) happens only from explicit buttons on a subsequent screen/sheet, never from the row tap itself. |
| 10 | Circles | PARTIAL | Avatar, ProgressRing, TabBar icons and most BodyMap layers use explicit fixed size + `flex:none` correctly. `src/design-system/components/BodyMap.css:41,61` (`.vds-bodymap-dot-ping`, `.vds-bodymap-dot-core`) explicitly set `box-sizing: content-box`, which does not meet checklist #10's literal `box-sizing:border-box` pass condition. In practice this doesn't turn the circle into an oval (a `border-radius:50%` circle with equal width/height stays circular under either box-sizing model) — it makes the *rendered* diameter slightly larger than the stated px (an 11px core with a 2px border renders at 15px total, not 11px, under content-box). This looks like a deliberate compensation for the app's own app-wide `border-box` reset (`src/styles.css:12`) to preserve a specific rendered pixel size — worth a visual check before deciding whether to keep or convert to `border-box` with an adjusted width. |
| 11 | Navigation | PARTIAL | `src/design-system/components/TabBar.jsx/.css` + `src/components/PrimaryNav.jsx` — exactly 5 fixed tabs in the fixed order (`start, vaccinations, checkups, termine, safe`), 23px icon over a 9px label (600 active / 500 idle), 44px min tap target — matches the spec precisely. Full-screen detail routing exists (`AppShell`/`TopBar`), but reuses a custom `vitalis-region-detail-slide-in` keyframe instead of the canonical `v-slidein` (cross-ref #16), and `src/design-system/components/TopBar.jsx:6` has a hard-coded English default `backLabel = 'Back'` (currently unreachable — every call site passes `t('common.back')` — but it's still a latent violation of "no hard-coded copy," and would surface English text the moment any new call site omits the prop). No `:focus-visible` on TabBar buttons (cross-ref #8). |
| 12 | Sheets vs pages | PARTIAL | The profile-switcher Sheet (`ProfileSheet.jsx`) is correctly a sheet. The manual vaccination-entry Sheet (`ItemCompletionAndReminderActions.jsx:1242` → `ManualEntryForm` at line 336) has a vaccination-select field, a completed/planned status toggle, and a date field — both more than the spec's "≤2-field quick input" limit and explicitly a **status change**, which the spec says must be a full-screen page ("Anything with history, status changes or more than two fields is a full-screen page instead"). |
| 13 | Localisation | **FAIL** | Dictionaries themselves are solid: `src/lib/i18n/locales/de.json`/`en.json` have exactly 240/240 matching keys, verified with a key-set diff (no keys only in one locale). The problem is scattered hard-coded strings around the dictionary: `src/design-system/components/Sheet.jsx:77` — `label="Close"`; `ItemCompletionAndReminderActions.jsx:1213,1218` — `aria-label="Manual vaccination records"` / `"Manual vaccination entries"`; `ItemCompletionAndReminderActions.jsx:1225` — `` subtitle={`Date: ${row.entryDateLabel}`} ``; `ItemCompletionAndReminderActions.jsx:605,607` — `aria-label="Time until next due checkup"` and the literal text `` `Next due by {doneTimeToGo.nextDueLabel}` ``; `PlanTimeline.jsx:228` — `aria-label="Plan timeline"`; `PlanTimeline.jsx:108,111` — hard-coded English fallback strings `'Preventive item'`/`'By recommendation'`; `SelfOnboardingToFirstDashboard.jsx:464` — hard-coded `'N/A'` fallback; `SettingsScreen.jsx:76,79` — literal `Deutsch`/`English` bypassing `t()` (Minor — these are locale-invariant endonyms in the reference dictionary too, so the *output* is correct either way, but the rule "every string resolves through the dictionary" is not met by the letter). Two locale-correctness bugs, found independently of the string-literal sweep: `SelfOnboardingToFirstDashboard.jsx:427` — `now.toLocaleDateString(undefined, {…})` uses the **browser/OS locale**, not the app's selected locale; and `PlanTimeline.jsx:203` — the component's own `locale = 'en-US'` prop default is shadowed against the real app locale (destructured separately as `uiLocale` at line 206) and is **never overridden by any caller** (`src/routes/plan-timeline.jsx` forwards props verbatim; `App.jsx`'s `<PlanTimelineRoute>` call does not pass `locale`) — so every timeline item's date label is always formatted `en-US`, regardless of the user's chosen app language, while the "Heute" label right next to it correctly uses `uiLocale`. |
| 14 | Profiles | **FAIL** | Switching does work correctly: `App.jsx`'s `handleLiveProfileSwitch` updates the active profile/plan, and the dashboard derives the BodyMap silhouette from the profile's sex. But `src/components/ProfileSheet.jsx` renders one flat, `createdAt`-sorted list with **no** "Du" / "Verwaltete Profile · n von 10 Profilen" grouping, **no** per-row role subtitle (the spec shows avatar + name + role; the app's row only shows avatar + name), and **no** 10-profile cap messaging anywhere. `App.jsx:1026-1029` — `onAddProfile` unconditionally opens the add-family-member enrollment flow with no check against a profile-count cap. Related pattern gap: `SettingsScreen.jsx:50-52` renders all four "Persönliche Daten" fields (name/birthdate/country) as `disabled`, and the sex toggle (`:56-61`) as `disabled` buttons, while the spec's Profiles & settings table documents these fields as "all correctable." |
| 15 | Brand | PARTIAL | Logo appears in the documented places structurally: `LandingSplash.jsx`, the dashboard header (`SelfOnboardingToFirstDashboard.jsx`), and every `TopBar` (default right slot renders `<Logo size={24} word={false}/>`). `src/design-system/components/Logo.jsx:9,13,19` hard-codes `#fff`/`#FFFFFF`/`#8FCFC9` and `rgba(43,127,184,.4)` instead of token references — inherited unchanged from the reference `Logo.jsx` (see "A finding about the source itself"), not an app-introduced regression, but still needs fixing to meet checklist #1. |
| 16 | Motion | **FAIL** | Every keyframe defined in the app is renamed from the canonical set — `vitalis-rail-halo`, `vitalis-region-detail-slide-in`, `vitalis-timeline-draw`, `vitalis-timeline-today-halo` (`self-onboarding-to-first-dashboard.css:361,493`, `plan-timeline.css:155,160`), `vds-sheet-fade`, `vds-sheet-slide` (`Sheet.css:52,57`), `vds-bodymap-ping` (`BodyMap.css:84`). A repo-wide search for the 8 canonical names (`v-fade`, `v-up`, `v-slide`, `v-slidein`, `v-ping`, `v-dot`, `v-halo`, `v-draw`) found **zero matches anywhere in `src/`** — confirming this is a full, consistent rename rather than a partial gap, but also meaning there is no staggered-entrance (`v-up`) or BodyMap-dot-pop-in (`v-dot`) equivalent found in the app at all; worth a visual check to see whether that motion exists under a different mechanism or is simply missing. The dashboard score count-up (`SelfOnboardingToFirstDashboard.jsx:307-328`, the `setInterval` effect) never checks `prefers-reduced-motion` and will always animate. Several other animations *do* correctly gate on `@media (prefers-reduced-motion: reduce)` (`plan-timeline.css:165`, `self-onboarding-to-first-dashboard.css:366,498`, `BodyMap.css:166`, `Sheet.css:62`). |
| 17 | Voice | PARTIAL | No formal "Sie"-form or alarm/warning language found in `de.json` (grepped for `Ihre/Ihr/Ihnen/Sie haben/Sie können` — no matches). No emoji found anywhere in `src/`. The German mandatory disclaimer matches the spec's exact wording: `de.json:88` = `"Empfehlungen ersetzen kein ärztliches Gespräch. Vitalis erinnert dich nur rechtzeitig."`, identical to the spec. The English disclaimer diverges: `en.json:88` = *"Recommendations don't replace medical advice. Vitalis only helps you keep track of what may be due, in good time."* vs. the spec's exact *"Recommendations do not replace medical advice. Vitalis just reminds you in time."* — different contraction and a materially rewritten second sentence. |
| 18 | Medical boundary | PARTIAL | No diagnosis, dosage, or result-interpretation language found in the sampled copy (locale files, detail-page render code). The disclaimer is confirmed present on the checkups/screenings list page (`ItemCompletionAndReminderActions.jsx:1206-1209`, gated on `activeCategory !== vaccination`). Whether it also appears on the **individual** item detail page (as opposed to only the list) was not independently confirmed with full certainty in this pass — recommend a targeted check of the single-item detail render path before Phase 2, since the spec implies the disclaimer belongs on any screen that recommends a screening, which could include the per-item page. |
| 19 | Data viz | **FAIL** | `ProgressRing` is used correctly for the score (`SelfOnboardingToFirstDashboard.jsx:458-467`), but at `size={60} stroke={6}`, below the spec's documented 72–78px/9px hero medallion metric. `PlanTimeline.jsx:224-253` (the full "Zeitstrahl" page) renders a vertical list of `TimelineNode`s grouped into "Completed and past" / "Today" / "Upcoming" sections with a single vertical spine (`vitalis-timeline-line`) — confirmed by reading the full render tree: there are no lanes, no coverage/interval bars, no due rings, no milestone circles, no 12-months/5-years scope segmented control, and no off-range edge pills anywhere in this file. This is a full point-event list, not the specified Gantt — the single largest structural gap in the app relative to the spec. Separately, `ItemCompletionAndReminderActions.jsx:605-613` (`.sl003-time-to-go-track`/`-fill`) renders a **third, undocumented chart form**: a horizontal linear countdown/progress bar with a gradient fill, shown on the completion confirmation for recurring items — the spec permits only ProgressRing and Zeitstrahl. |

## 3. Severity

### Blocking

- **No Gantt Zeitstrahl** — `PlanTimeline.jsx` is a vertical point-event list; the entire lanes/bars/due-rings/milestones/scope-toggle/off-range-pill anatomy is unbuilt (#19).
- **Timeline dates ignore the app's language** — `PlanTimeline.jsx:203` defaults `locale='en-US'` and is never passed the real `uiLocale`, so every timeline item's date is stuck in English/US formatting regardless of the selected app language (#13).
- **Focus rings are effectively absent** — zero `:focus-visible` treatment on Button, IconButton, ListRow, TabBar, BodyMap, Card, Badge, Avatar, ProgressRing, Logo, Sheet (#8).
- **Sub-44px tap targets** — every Sheet close button (`IconButton size="sm"` = 36px, `Sheet.jsx:77`) and the BodyMap dot hit area (26×26px) (#7).
- **Hard-coded English strings visible in the German locale** — `Sheet.jsx:77` ("Close"), `ItemCompletionAndReminderActions.jsx:605,607,1213,1218,1225` ("Time until next due checkup", "Next due by …", "Manual vaccination records/entries", "Date: …"), `PlanTimeline.jsx:228,108,111` ("Plan timeline", "Preventive item", "By recommendation"), `SelfOnboardingToFirstDashboard.jsx:427,464` (browser-locale date, "N/A") (#13).
- **Profile switcher is missing the required structure** — no "Du"/"Verwaltete Profile · n von 10" grouping, no role subtitle, no cap enforcement (#14).
- **Settings personal-data fields are all non-editable**, contradicting the spec's documented "all correctable" anatomy (related to #14).
- **Manual vaccination-entry Sheet violates the sheets-vs-pages rule** — 3 fields including a status-context change, inside a Sheet (#12).

### Major

- Root-level `font-family: Inter` override (`src/styles.css:7`) undermines Public Sans everywhere that doesn't explicitly opt back in (#1, #5).
- Widespread raw hex/rgba literals across `styles.css`, dashboard CSS, and item-completion CSS, including an undocumented indigo (`#4338ca`) with no relation to the palette at all (#1, #6).
- Non-token radii/shadows in `styles.css` (`.panel`) and feature CSS (#3, #4).
- `--shadow-medallion` and the entire motion token/keyframe layer are missing from **both** token layers (`design/tokens/` and `src/design-system/tokens/`) — a design-system-level gap, not purely an app one (#4, #16).
- All app keyframes are renamed from the canonical `v-*` set; no `v-up`/`v-dot` equivalent was found at all (#16).
- Dashboard score count-up never checks `prefers-reduced-motion` (#16).
- Input focus ring is 4px, not 3px (#8).
- ProgressRing hero usage is 60px/6px vs. the documented 72–78px/9px (#19).
- Undocumented third chart form: the "time-to-go" linear progress bar (#19).
- English disclaimer text materially diverges from the spec's exact wording (#17).

### Minor

- Token layer values (color/radius/spacing/typography) match the canonical spec byte-for-byte where ported — only comments/whitespace differ.
- TabBar structure, order, icon size and micro-tier label sizing are fully correct (#11).
- Binary sex control is correctly preserved everywhere it appears (do/don't rule).
- No emoji, no "Sie"-form found anywhere sampled (#17).
- DE/EN dictionaries have full 240/240 key parity (#13, infrastructure only — the leaks are around it).
- `TopBar`'s hard-coded `'Back'` default and the literal `"Deutsch"/"English"` in `SettingsScreen.jsx` are rule-letter violations with no current user-visible impact (dead/invariant in practice).
- `ComingSoonSurface`, `EmailPasswordAuth` and the extra onboarding fields (height/weight/risk flags) have no design-system counterpart to compare against (see Open Questions).

## 4. Migration plan

1. **Token layer.** Add `--shadow-medallion` and a full motion sub-layer (`--ease-standard`,
   `--ease-spring`, `--dur-fast/base/slow`, and the 8 canonical `@keyframes`) to
   `vitalis-design/design/tokens/` first, since neither exists yet even in the canonical
   machine-readable layer — the app has nothing correct to import today. Then, in the app: remove
   `src/styles.css`'s `Inter` override and all raw hex/rgba/radius/shadow literals, replacing them with
   semantic aliases; rename every app keyframe to its canonical `v-*` name.
2. **Shared primitives.** Add `:focus-visible` (3px `--focus-ring`) to Button, IconButton, ListRow,
   TabBar, Card, Badge, Avatar, ProgressRing, Logo, Sheet. Fix Input's ring to 3px. Raise `IconButton
   size="sm"` (or stop using `sm` for the Sheet close button) to meet 44px. Decide Button/Input/ListRow
   target metrics against the **spec text**, not the off-spec reference component (44/52px buttons,
   44px/1px-border inputs, 40×40/12px row icon tiles) — flag this choice explicitly since it means
   diverging from the literal reference `.jsx` files, per the prompt's "spec wins" rule.
3. **Navigation shell.** Fix `TopBar`'s hard-coded `'Back'` default; keep the already-correct 5-tab
   TabBar; rename the region-detail slide-in keyframe; enlarge the BodyMap dot hit area to 44px (also
   requires a decision on the reference `BodyMap.jsx`'s own shortfall here — see Open Questions).
4. **Signature UI.** Raise the dashboard `ProgressRing` to 72–78px/9px; rebuild `PlanTimeline` as the
   documented Gantt (lanes, coverage/interval bars with elapsed shading + recurrence stripes, due
   rings, milestone circles, gradient "Heute" line + halo dot, 12-month/5-year scope toggle, off-range
   edge pills) — this is the largest single piece of work in this plan; remove the undocumented
   "time-to-go" bar or fold its information into the Gantt/detail page instead.
5. **Screen-by-screen alignment.** Rebuild `ProfileSheet` with the "Du"/"Verwaltete Profile · n von 10"
   grouping, role subtitles, and cap enforcement; make Settings' personal-data fields editable (or
   confirm with the user this is an intentional scope reduction); convert the manual vaccination-entry
   Sheet to a full-screen page (it has a status change + 3 fields); remove the undocumented indigo
   "shared decision" note or give it a real token.
6. **Cross-cutting rules.** Sweep every hard-coded string found above into the dictionary (and repeat
   the sweep for any others not caught in this pass — this file cites concrete examples, not
   necessarily every instance); fix the two locale-format bugs (`PlanTimeline`'s stuck `en-US`,
   dashboard's `toLocaleDateString(undefined,…)`); gate the score count-up on
   `prefers-reduced-motion`; align the English disclaimer wording to the spec; re-check the medical
   disclaimer's presence on the single-item detail page.

## 5. Open questions / spec gaps

- **The reference `BodyMap.jsx` itself doesn't meet the spec's own accessibility rule** (26×26 hit
  area vs. the documented 44×44 requirement). Phase 2 needs a decision: enlarge the app's hit area to
  44px (diverging from the literal reference component, per "spec wins"), or treat the accessibility
  table's wording as aspirational and flag it back to the spec owner. Recommend the former, and
  suggest correcting the reference `components/health/BodyMap.jsx` to match in the same PR.
- **`design/tokens/*.css` needs a motion + medallion addition** (`--shadow-medallion` and the full
  motion token/keyframe set) before the app can be brought into full token compliance — this is a
  design-system-repo change, not an app change, and should probably land first or alongside Phase 2.
- **`ComingSoonSurface`** (Termine/Safe placeholders) has no design-system counterpart to compare
  against.
- **The add-family-member enrollment flow reuses the full onboarding form**, including height/weight
  and risk-flag fields with no Designer/spec source — confirm this is intentional app scope, not
  something the spec should also document.
- **`EmailPasswordAuth`** has no Designer source (confirmed via project history); it currently reuses
  the Card/Input/Button vocabulary. Confirm this ad hoc approach is acceptable or should get a
  documented pattern.
- **The manual vaccination-entry Sheet** currently needs a vaccination pick, a completed/planned
  toggle, and a date — genuinely more than a "quick add." Confirm converting it to a full-screen page
  (as the sheets-vs-pages rule requires) rather than trying to fit it under 2 fields.
- **The "time-to-go" linear progress bar** — confirm whether to delete it, or add a third documented
  chart form to the spec (the current rule is explicit that only two forms exist).
- **BodyMap's `.vds-bodymap-dot-ping`/`-core`'s `content-box`** sizing choice should get a visual
  double-check (not done in this pass, no browser tool available) before deciding whether to keep it
  as-is or convert to `border-box` with adjusted widths.

## Verification baseline

- `npm run build`: **PASS** (`vite build`, 1922 modules, no errors; only an expected "chunk >500kB"
  advisory).
- `npm test` (`node --test`): **could not run** in this environment — failed immediately with
  `Could not find '/Users/.../.codex-home/tmp/arg0/codex-arg0.../apply_patch'`. This is a stray,
  unrelated environment/tooling artifact (a leftover path reference from a prior Codex CLI session in
  this repo, unrelated to this audit or to any code under `src/`), not a code defect — `npm run build`
  succeeding rules out a project-wide breakage. Re-run `npm test` in a clean shell to get a real
  pass/fail baseline before Phase 2.
- No browser tool was available in this session, so no rendered-screenshot comparison against the
  spec's visual specimens was performed. Recommend doing that pass before signing off on Phase 2 scope,
  particularly for the `content-box` BodyMap question and the Settings/ProfileSheet layout claims.
