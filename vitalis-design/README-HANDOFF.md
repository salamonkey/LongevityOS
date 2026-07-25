# Vitalis Design System — repository handoff

Unpack this folder's **contents** into your repository root (or keep the folder and prefix the paths
in the Codex prompt accordingly). Every path referenced by
`design/CODEX_DESIGN_ALIGNMENT_PROMPT.md` resolves inside this tree as-is.

## Tree

```
design/
  vitalis-design-system.html        <- CANONICAL SPEC. Open in a browser.
  CODEX_DESIGN_ALIGNMENT_PROMPT.md  <- Paste this to Codex to audit + align the app.
  styles.css                        <- imports the token layer
  tokens/
    fonts.css colors.css typography.css spacing.css radius.css shadows.css
components/                         <- reference implementations, one folder per group
  brand/          Logo
  data-display/   Card ListRow Badge Avatar ProgressRing
  feedback/       Sheet
  forms/          Button IconButton Input
  foundation/     Icon
  health/         BodyMap
  navigation/     TabBar
  (each has .jsx source, .d.ts prop contract, .prompt.md usage, + a *.card.html specimen)
guidelines/                         <- brand & foundation reference pages
  logo/           vitalis-mark.svg  vitalis-mark-mono.svg
                  vitalis-mark-reversed.svg  vitalis-appicon.svg
assets/
  body-male.png  body-female.png    <- BodyMap silhouettes (palette-tinted, alpha)
  body-silhouettes.js               <- same images as data URIs (window.VITALIS_BODY)
ui_kits/vitalis-app/index.html      <- interactive reference app (open in a browser)
vitalis-ui.js                       <- no-build runtime build of all components
styles.css                          <- root entry, re-exports design/styles.css
readme.md  SKILL.md                 <- system overview + agent-skill manifest
```

## How to use

1. Open `design/vitalis-design-system.html` in a browser — this is the specification, including
   rendered specimens of every component, the BodyMap and the full Gantt Zeitstrahl.
2. Open `ui_kits/vitalis-app/index.html` to click through the reference app (onboarding, dashboard
   hero, Gantt timeline, detail pages, settings, profile switching, DE/EN).
3. Paste the contents of `design/CODEX_DESIGN_ALIGNMENT_PROMPT.md` into Codex from your repo root.
   Fill in your stack where the prompt asks. It runs a Phase 1 audit and **stops for your approval**
   before changing any code.

## Notes

- Both HTML files need no build step and no server — open them directly. They load React, Lucide and
  Public Sans from CDNs; everything else is local.
- `.jsx` / `.d.ts` files are the source of truth for structure and prop APIs. They are authored for a
  no-build preview — port them idiomatically to your stack, keeping the visual result, prop names and
  token usage identical.
- Fonts are Google-hosted. Swap to self-hosted woff2 if you need offline or locked-down hosting.
