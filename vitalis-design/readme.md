# Vitalis Design System

**Vitalis** ist der persönliche Gesundheitsbegleiter — a mobile app (React Native / Flutter, iOS + Android) that helps people organize their preventive health care so no vaccination, screening, or routine check-up is forgotten. Vitalis does **not** replace doctors — it *organizes* personal health prevention.

- **Audience:** primarily health-conscious adults ~45+; secondarily families who also manage partners, children, or (later) parents.
- **Language:** product copy is **German**.
- **Tone:** calm, minimal, casual.
- **Chosen visual direction:** "Clinical Calm" — cool blue/teal, generous white space, the highly legible **Public Sans** typeface.

> Sources: built from scratch in conversation. No codebase, Figma, logo, or brand assets were provided. Where a logo would go, the wordmark **Vitalis** is set in type (see `guidelines/brand-logo.html`).

---

## Content fundamentals

How Vitalis writes copy:

- **Language & person:** German, informal **„du"** address ("Schön, dass du da bist"). Warm but not childish.
- **Casing:** sentence case for everything except product/section names. Section labels (overlines) are Title Case, not ALL CAPS shouting; use uppercase sparingly and only tracked-out at small sizes.
- **Tone:** reassuring and low-pressure. Vitalis nudges, it never nags or alarms. Prefer "Heute fällig" / "Demnächst" over urgent red language unless something is genuinely overdue.
- **Clarity over cleverness:** short, plain sentences. A 45+ health audience values being told exactly what to do next.
- **Health, not medicine:** never diagnose or advise clinically. Copy is about *organizing* ("erinnern", "erfassen", "zuordnen"), never about treatment.
- **Emoji:** avoid. The tone comes from color, space, and word choice — not emoji. (Playful exploration variants used them; the chosen Clinical Calm direction does not.)

Example strings:
- Greeting: „Guten Morgen, Anna"
- Empty state: „Noch nichts eingetragen — leg deine erste Impfung an."
- Status chips: „Fällig" · „Demnächst" · „Erledigt" · „Überfällig"
- CTA: „Impfung eintragen", „Termin hinzufügen", „Dokument hochladen"

---

## Visual foundations

**Color.** Cool, clinical-but-warm palette. Brand **blue `#2B7FB8`** is the single primary; **teal `#2FA39C`** is a supporting accent (used sparingly, e.g. secondary categories, screening). Neutrals are a slightly cool **slate** ramp, never pure gray. Backgrounds are a subtly blue-tinted off-white (`--surface-app #F5F8FA`); cards are pure white. Status is encoded with restraint: blue = due, green = done, amber = upcoming/soft-warning, red = overdue only. Max one or two hues on screen at a time.

**Typography.** One family: **Public Sans** (open, neutral, government-grade legibility — ideal for a 45+ health audience). Weights 400/500/600/700. A clear scale from 28px display down to 11px overline (see `tokens/typography.css`). Body text never below 15px on device.

**Spacing & layout.** 4px base grid (`--space-*`). Default screen padding 20px. Comfortable, airy density — lots of breathing room, generous 12–16px gaps between rows. Bottom tab bar is 64px. Minimum tap target 44px. Layouts are single-column, card-and-list based; a fixed bottom tab bar, a scrolling content area, occasional fixed header.

**Shape & radius.** Soft but not bubbly. List rows `14px`, cards `16px`, icon chips `~11px`, bottom sheets `28px` (top corners), pills/chips fully rounded. Consistent, calm curvature.

**Elevation.** Very soft, cool-tinted shadows (`rgba(30,42,54,…)`), low opacity. Cards use `--shadow-sm` (barely-there lift on white-on-tinted-bg); sheets and popovers use `--shadow-lg`. No harsh or colored drop shadows. Hairline borders (`--slate-100`) are the primary separation device, not heavy shadows.

**Icons.** Line icons from **Lucide** (1.75–2px stroke, rounded joins) — calm, medical-adjacent, consistent. Icons usually sit in a soft-tinted rounded chip (`--color-primary-soft` etc.). See `guidelines/iconography.html`. (Lucide is loaded from CDN; substitute your production icon pipeline if you self-host.)

**Motion.** Gentle and quick. Fades and small slides (sheets slide up), ~180–240ms, ease-out. No bounces or springs in the Clinical Calm direction. Progress rings may animate their sweep on appear.

**States.** Buttons darken on press (primary → `--color-primary-hover`) and slightly reduce opacity/scale (0.98) on active. Focus uses a soft blue ring (`--focus-ring`). Hover (where a pointer exists) darkens fills or tints ghost backgrounds. Disabled = reduced opacity, no shadow.

**Imagery.** Minimal. The product is data-forward (plans, dates, documents), so imagery is largely avatars, category icon chips, and a hero progress ring — not photography. Any imagery should read calm and cool-toned.

**Signature moment.** The **Vorsorge-Score** donut ring on the dashboard — a single, friendly progress metric that summarizes how on-track the user is.

---

## Index / manifest

- `styles.css` — global entry (imports the token layers). Consumers link this.
- `vitalis-ui.js` — standalone browser build of all components (plain `React.createElement`, no build step). The specimen cards and UI kit load this so they render anywhere; the `.jsx`/`.d.ts` files remain the source of truth for the compiled design-system bundle.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadows.css`.
- `guidelines/` — foundation specimen cards (Type, Colors, Spacing, Brand, Iconography).
- `components/` — reusable React primitives (see below).
- `assets/` — `body-male.png` / `body-female.png` silhouettes (palette-tinted) and `body-silhouettes.js` (same images embedded as data URIs, `window.VITALIS_BODY`, so BodyMap renders without external image fetches).
- `ui_kits/vitalis-app/` — interactive click-through of the app; `ui_kits/vitalis-app-v1/`, `-v2/` and `-v3/` are self-contained version checkpoints (v3 = current: Gantt Zeitstrahl, Lucide-accurate spec doc).
- `SKILL.md` — Agent-Skill manifest so this system can be used inside Claude Code.
- `design/vitalis-design-system.html` — single-file, self-contained specification for repo inclusion (tokens, components, patterns, rules, 19-point compliance checklist). `design/CODEX_DESIGN_ALIGNMENT_PROMPT.md` is the two-phase audit-and-align prompt that targets it.

### Components
- **forms/** — `Button`, `IconButton`, `Input`
- **data-display/** — `Card`, `ListRow`, `Badge`, `Avatar`, `ProgressRing`
- **navigation/** — `TabBar`
- **feedback/** — `Sheet`
- **health/** — `BodyMap` (schematic Körper-Übersicht with interactive status dots)
- **brand/** — `Logo` (Vitalis shield mark + wordmark)
- **foundation/** — `Icon` (Lucide wrapper — *intentional addition*: gives components a single, consistent glyph API)

### UI kit screens (`ui_kits/vitalis-app/`)
Onboarding · Dashboard (unified hero: score medallion + Körper-Übersicht body map + horizontal Zeitstrahl rail) · Impfplan · Vorsorge · Termine · Dokumentensafe · full-screen Zeitstrahl (Gantt chart of coverage windows, intervals & appointments; 12-month / 5-year scope) · Event detail · Task detail (mark done / snooze) · Region drill-down · Settings · Profile switcher.

**App-level patterns** (composed from the primitives; live in the UI kit, not separate components): full-screen slide-in detail pages (region / event / task / settings), bottom-sheet quick-add, DE/EN in-app language switch, profile switching (self + up to 10 managed), score count-up + dot pop-in entrance animations.

---

## Intentional additions
- **`Icon`** — a thin wrapper over Lucide so every component references glyphs the same way. Not derived from a source design (none was provided); needed because all other components consume it.

## Caveats / open questions
- Real **logo** now integrated (`guidelines/logo/`); the shield mark + wordmark ship as the `Logo` component and the app icon/favicon.
- Fonts are **Google-hosted**; provide self-hosted woff2 if you need offline/production hosting.
- Palette, type, and spacing were designed from scratch for the "Clinical Calm" direction — easy to retune once real brand assets exist.
