---
name: vitalis-design
description: Use this skill to generate well-branded interfaces and assets for Vitalis, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference
- **Brand:** Vitalis — calm, minimal, casual personal health-prevention companion (German, informal "du"). Not a medical/diagnostic tool — it *organizes* prevention.
- **Direction:** "Clinical Calm" — cool blue `#2B7FB8` primary, teal `#2FA39C` accent, cool slate neutrals, blue-tinted off-white backgrounds.
- **Type:** Public Sans (400–700). Body ≥ 15px on device.
- **Shape:** rows 14px, cards 16px, sheets 28px; soft cool-tinted shadows; hairline borders.
- **Icons:** Lucide line icons (1.75px stroke) in soft-tinted chips.
- **Entry CSS:** link `styles.css` (imports the token layers).
- **Runtime lib:** `vitalis-ui.js` — no-build `React.createElement` build of every component, sets `window.VitalisUI` (needs React + Lucide UMD loaded first). Cards & UI kit use it; `.jsx`/`.d.ts` remain the source of truth.
- **Components:** `components/` — forms (`Button`, `IconButton`, `Input`), data-display (`Card`, `ListRow`, `Badge`, `Avatar`, `ProgressRing`), navigation (`TabBar`), feedback (`Sheet`), health (`BodyMap`), brand (`Logo`), foundation (`Icon`).
- **Signature UI:** `BodyMap` — human silhouette (male/female by `sex`) with tappable status dots (red=handeln/pulsing, amber=bald dran, green=erledigt); dots pop in on mount; `onOpen(id)` drills into a region. Silhouettes in `assets/` + embedded `assets/body-silhouettes.js` (`window.VITALIS_BODY`). `Logo` = shield mark + wordmark (`word`, `reversed`, `size`); app icon at `guidelines/logo/vitalis-appicon.svg`.
- **App patterns (in the UI kit):** unified dashboard hero (score medallion over body map + horizontal Zeitstrahl rail); full-page Zeitstrahl as a **Gantt** — lanes (Impfschutz/Vorsorge/Termine/Kontrollen), bars for coverage & recurrence windows with elapsed shading and stripes, due rings, milestone circles, gradient "Heute" line, 12-month / 5-year scope, dashed edge pills for off-range items; full-screen slide-in detail pages (region / event / task / settings) with a back `TopBar`; bottom-sheet quick-add; DE/EN in-app language switch (`t()` dictionary + bilingual `{de,en}` data); profile switching (self + up to 10 managed); entrance animations (score count-up, dot pop-in). Keyframes the components expect: `v-dot`, `v-ping`, `v-halo`, `v-slidein`, `v-fade`, `v-slide`.
- **UI kit:** `ui_kits/vitalis-app/` (current); `-v1/` and `-v2/` are self-contained checkpoints.

- **Type tiers:** content text ≥ 11px; a micro tier of 8.5–10.5px (600–700 weight) is allowed only for chart axes, tab labels, legends and dense chart captions — never as the sole carrier of an action or status. TabBar is a 23px icon over a 9px label.
- **Spec doc:** `design/vitalis-design-system.html` is the canonical single-file spec for handoff; keep it in sync with any visual change.

## Caveats
- Logo integrated (`guidelines/logo/`). Fonts are Google-hosted (swap to self-hosted woff2 for production).
- In-browser Babel is blocked in preview, so cards/UI kit run plain `React.createElement` via `vitalis-ui.js`; author new UI the same way (no JSX `text/babel`).
