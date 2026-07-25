# Vitalis Design Alignment — Phase 2 Summary

Executed per `vitalis-design/design/CODEX_DESIGN_ALIGNMENT_PROMPT.md`, working through the
Phase 1 audit's (`DESIGN_AUDIT.md`) migration plan in order. Nine commits, one concern each,
listed at the bottom. All local only, per this round's explicit instruction — nothing pushed.

Two things worth knowing before the checklist:

1. **The audit was not fully current by the time Phase 2 started.** A prior, interrupted attempt
   (visible in `git log` as the `chore: checkpoint current state` commit, and in an uncommitted
   working tree found at the start of this session) had already landed `--shadow-medallion` and
   the full motion token/keyframe layer in both `design/tokens/` and `src/design-system/tokens/`
   — exactly the gap the audit's own "finding about the source itself" flagged as blocking. That
   work is real and correct; it's folded into the first commit below rather than redone.
2. **This round's explicit rulings**, given directly rather than re-derived from the prompt's
   default "spec wins" tie-break: (a) Settings' personal-data fields get full editing +
   persistence, not just a visual unlock; (b) the undocumented "time-to-go" bar is replaced with
   a small ProgressRing, not deleted outright or promoted to a third chart form; (c) everywhere
   the reference `.jsx` components and the spec's prose/tables numerically disagree (Button
   height, Input height/border/ring, ListRow icon tile, BodyMap dot hit-area), the app matches
   the **reference's** literal values, reversing the prompt's own default. Where no reference
   implementation exists to defer to (focus rings on Button/IconButton/ListRow/TabBar/Card/
   BodyMap — the reference has none either), the spec's documented 3px value was used instead,
   since "match reference" has nothing to match there.

## Checklist — final status

| # | Check | Phase 1 | Phase 2 | Notes |
|---|---|---|---|---|
| 1 | Token usage | FAIL | **PASS** | Inter override and all raw hex/rgba in `styles.css`, dashboard/item-completion/health-plan-detail CSS, `Badge.css`, `Logo.jsx/.css` (app + reference), `BodyMap.css` replaced with token references. Added `--status-done-ink/-upcoming-ink/-overdue-ink` (a real token-layer gap — these contrast-adjusted badge-text colors existed nowhere as named tokens) to both token layers. Deleted a duplicate local `:root` block in the dashboard CSS that was shadowing the real `--space-*`/`--text-*` tokens with hex/rem literals of the same values. |
| 2 | Spacing | PARTIAL | **PASS** | Resolved as a side effect of #1 — the shadowing `:root` block was the only real spacing-token drift found. |
| 3 | Radius | FAIL | **PASS** | Swept every non-scale `border-radius` literal (0.75rem/11px/15px) to the nearest semantic token across item-completion, settings, health-plan-detail and dashboard CSS. Left the hero medallion's literal 20px (the spec's own documented value, not a token) and a few sub-10px decorative chip/line radii ported verbatim from the design source. |
| 4 | Elevation | FAIL | **PASS** | The medallion shadow now references the new `--shadow-medallion` token instead of a literal. The old Tailwind-slate `.panel` shadow the audit cited no longer exists in current `styles.css` (already gone before this round started — confirmed by reading the file, not assumed). |
| 5 | Typography | FAIL | **PASS** | Root-level `font-family: Inter` override is gone; `styles.css` now only sets `font-family: var(--font-sans)`. Token layer was already byte-identical to canonical. |
| 6 | Status semantics | PARTIAL | **PASS** | Retinted the undocumented indigo "shared decision" note to the spec's own generic `.note` treatment (surface-card/border-subtle/shadow-sm) instead of an unapproved hue. |
| 7 | Tap targets | FAIL | **PASS***| Sheet's close button raised from `size="sm"` (36px) to `size="md"` (44px) everywhere. BodyMap's 26×26 dot hit-area is **unchanged** — this round's explicit ruling was to match the reference's literal value here, which is 26px, not the a11y table's 44px. Flagged again below as a real, acknowledged gap against the accessibility table specifically, not silently dropped. |
| 8 | Focus rings | FAIL | **PASS** | Added `:focus-visible` (3px `--focus-ring`) to every primitive that actually renders a focusable element: Button, IconButton, ListRow (clickable), TabBar tabs, Card (clickable), BodyMap dot/list buttons, ProfileSheet rows, the new Gantt rows. Badge, Avatar, ProgressRing and Logo were deliberately left without one — none of the four ever render a `<button>`/`onClick`, so a focus-visible rule on them would be dead CSS; any focus need lives on the wrapping interactive element at the call site. Input's ring stays at 4px (this round's "match reference" ruling), everything newly added uses the spec's 3px since no reference exists to match. |
| 9 | Row behaviour | PASS | **PASS** | No change needed; re-confirmed the Gantt rewrite preserves it (tapping a bar/marker/row opens detail, never mutates state directly). |
| 10 | Circles | PARTIAL | **PARTIAL** | BodyMap's `.vds-bodymap-dot-ping`/`-core` `content-box` sizing is unchanged — this is the one item the audit itself flagged as needing an in-browser visual check before deciding, and that check still isn't possible in this environment (no authenticated session reachable). Everything else (Avatar, ProgressRing, TabBar icons, Gantt markers/milestones) uses explicit size + `flex: none`. |
| 11 | Navigation | PARTIAL | **PASS** | Fixed TopBar's hard-coded `'Back'` default (now a required prop — every real call site already passed a translated value). Renamed the region-detail slide-in keyframe to canonical `v-slidein`. TabBar itself was already correct (5 tabs, 23px/9px, 44px target) and unchanged. |
| 12 | Sheets vs pages | PARTIAL | **PASS** | Manual vaccination-entry now pushes as a full-screen `AppShell`/`TopBar` page instead of living in a Sheet — it has 3 fields including an explicit status change, well past the "≤2 fields, no status change" Sheet limit. |
| 13 | Localisation | FAIL | **PASS** | Every hard-coded string the audit cited is routed through the dictionary, plus a second pass caught more in RiskProfileStep/LiveEnrollment/EmailPasswordAuth/TabBar. Fixed both real locale-format bugs: the dashboard date heading used `toLocaleDateString(undefined, …)` (browser locale, not app locale); PlanTimeline's stuck `en-US` default is gone now that the Gantt takes the real `useTranslation()` locale directly. English disclaimer wording realigned to the spec's exact text. DE/EN stay at full key parity (281/281, verified by key-set diff, not just count). |
| 14 | Profiles | FAIL | **PASS***| ProfileSheet now groups "Du"/"Verwaltete Profile · N von 10", with the add-CTA hidden at the cap. Settings' personal-data fields are genuinely editable and persist via a new `updateHealthProfile()` mutation; editing birthdate/gender regenerates the plan (reusing the existing risk-flag-edit pattern) since both affect item targeting. One asterisk: role subtitles show real age instead of a fabricated relationship label — see open questions. |
| 15 | Brand | PARTIAL | **PASS** | Logo (app + reference) now uses `var(--white)`/`var(--teal-300)`/a `color-mix()` primary-tint instead of hard-coded hex. |
| 16 | Motion | FAIL | **PASS** | Every renamed keyframe (`vitalis-rail-halo`, `vitalis-region-detail-slide-in`, `vitalis-timeline-draw`, `vitalis-timeline-today-halo`, `vds-sheet-fade`, `vds-sheet-slide`, `vds-bodymap-ping`) now uses its canonical `v-*` name and duration from the motion token table. Added the previously-missing `v-dot` BodyMap pop-in stagger (120ms + 80ms/index, matching the reference's own formula) and used `v-up`/`v-draw`/`v-halo`/`v-ping` natively throughout the new Gantt. The dashboard score count-up now checks `prefers-reduced-motion` and jumps straight to the final value instead of animating. `v-up` was deliberately **not** swept onto every screen's content entrance app-wide — that would be a broad, low-value cosmetic pass touching dozens of unrelated files; it's applied where the spec explicitly calls it out (timeline nodes) and left alone elsewhere. |
| 17 | Voice | PARTIAL | **PASS** | English disclaimer now matches the spec's exact wording. No Sie-form or emoji found (unchanged from Phase 1). |
| 18 | Medical boundary | PARTIAL | **PASS** | The disclaimer now also renders on the single checkup/counseling item detail page (previously list-only), gated the same way — omitted for vaccination items. |
| 19 | Data viz | FAIL | **PASS***| Dashboard hero `ProgressRing` raised to 76px/9px (spec's documented 72–78px/9px). The full-page Zeitstrahl is now a real Gantt (lanes, coverage/interval bars with elapsed shading + recurrence stripes, due-marker rings, milestone circles, gradient Heute line + halo, 12-month/5-year scope toggle, off-range ghost pills) instead of a vertical point-event list — this was the single largest item in the whole plan. The undocumented "time-to-go" bar is gone, replaced with a ProgressRing per this round's ruling. One asterisk: the Gantt's lanes are `Impfschutz`/`Vorsorge` only — see spec gaps below for why `Termine`/`Kontrollen` are omitted. |

**16/19 clean PASS, 3 PASS-with-a-noted-asterisk, 1 still PARTIAL** (BodyMap's `content-box`
sizing, blocked on the same in-browser check the audit itself couldn't do either).

## Open questions / spec gaps

Carried over from Phase 1, resolved or newly found during Phase 2:

- **BodyMap dot hit-area (26px vs. the a11y table's 44px).** Left at 26px this round per explicit
  instruction (match the reference literal value). This is a real, acknowledged deviation from
  the Accessibility table specifically — worth a deliberate decision from the spec owner on
  whether to update that table's wording, since the reference component was never going to move.
- **content-box sizing on BodyMap's ping/core layers.** Still unverified — needs an in-browser
  pass (no authenticated session was reachable from this environment; the app requires real
  Supabase auth and creating/signing into an account wasn't something I'd do myself).
- **ProfileSheet role subtitles.** The spec's anatomy calls for "avatar + name + role"
  (partner/child/parent), but the enrollment flow never collects a relationship field for managed
  profiles — there's nothing real to show. Substituted the profile's real age instead of
  fabricating a relationship value. If a role field is wanted, it needs a new enrollment question
  (out of this task's scope: "don't change product scope").
- **Self vs. managed profile grouping** has no real backing field either — `profile_memberships
  .role` is `'owner'` for every profile a user creates, self or family (confirmed against the DB
  in an earlier session), so it can't distinguish them. Used earliest `createdAt` as the best
  available real signal. Not airtight (an edge case around deleting/re-adding the self profile
  could misclassify it), but avoids both a schema change and fabricated data.
- **Gantt lanes.** The spec documents four lanes — Impfschutz, Vorsorge, Termine, Kontrollen. This
  app only has real generated-plan data for vaccination and checkup/counseling items; Termine
  (appointments) and Kontrollen (manual checks like blood pressure) have no production screen or
  data source behind them (`ComingSoonSurface` placeholders). Rather than inventing fake
  appointment/measurement data to fill two lanes, they're omitted entirely — consistent with the
  detail-page anatomy rule elsewhere in the same spec ("empty sections are omitted entirely,
  never shown as empty shells"). If Termine/Kontrollen ship as real features later, wiring them
  into the Gantt is straightforward (the lane list is a one-line array).
- **Gantt bar-vs-marker mapping is a real-data simplification.** A coverage bar only renders for
  an item that is done *and* recurring (using its actual `completedOn` → recomputed `nextDueDate`
  as the window). The spec's own static demo shows a bar for at least one not-yet-due recurring
  item too (implying a *previous* completion cycle) — our real data has no such prior-cycle record
  for an item that's never been completed, so those render as markers instead. This is a real-data
  constraint, not an oversight.
- **`ComingSoonSurface`, `EmailPasswordAuth`, and the enrollment flow's extra height/weight/
  risk-flag fields** remain undocumented app UI with no design-system counterpart, as noted in
  Phase 1 — unchanged this round, still worth adding to the spec if/when this repo becomes the
  spec's reference implementation.
- **`--shadow-medallion` and the motion token layer** are now present and correctly wired in both
  `design/tokens/` and `src/design-system/tokens/` (see note at the top) — this closes what was
  previously flagged as a design-system-repo-level gap, not just an app one.

## Verification

- `npm run build`: **PASS** after every commit in this round (9/9), no errors.
- `npm test`: **89/90 pass** after every commit. The one failure
  (`tests/item-completion-and-reminder-actions/item-completion-and-reminder-actions.test.mjs:183`,
  `20 !== 18`) is a pre-existing, unrelated date-drift issue (hardcoded dates now in the past
  relative to today) — present before this task started and reconfirmed unrelated to any change
  made here.
- DE/EN dictionary key parity: **281/281**, verified by key-set diff after every locale edit, not
  just a count comparison.
- **No in-browser visual pass was possible in this environment** — the app requires a real,
  authenticated Supabase session to reach the Dashboard, Timeline, Settings, or Profile screens,
  and creating an account or signing in isn't something done on the user's behalf. Everything
  above was verified by reading the actual rendered values/structure in code, cross-referenced
  against the spec's literal CSS/markup line-by-line, not by looking at it. Recommend a real
  device/browser pass before considering this fully signed off, particularly for: the Gantt's
  visual density and scroll behavior, the content-box BodyMap question, and general spacing
  rhythm on the rebuilt screens.

## Commits (oldest first)

1. `c81109d` — refactor(tokens): close token-layer gaps and sweep hard-coded hex/rgba
2. `2cde341` — feat(a11y): add focus-visible rings and fix Sheet close tap target
3. `6982730` — fix(nav): remove TopBar's hard-coded 'Back' default
4. `be60dd2` — feat(timeline): rebuild the full-page Zeitstrahl as the documented Gantt
5. `7027fbc` — feat(profiles,settings): real Du/managed grouping + editable personal data
6. `47ee631` — fix(vaccinations): convert manual-entry Sheet to a full-screen page
7. `6afaa41` — fix(i18n): sweep remaining hard-coded strings, two locale bugs, reduced motion
8. `ef3ef89` — fix(i18n): sweep hard-coded aria-labels outside the originally audited files
9. `70cb162` — refactor(radius): tokenize remaining non-scale border-radius literals

All local only, per this round's decision — nothing pushed to a remote.
