BodyMap — the signature "Körper-Übersicht": a real human silhouette (male/female PNG chosen by `sex`) with interactive status dots showing, per region, where to act (red, pulsing), what's coming up (amber), and what's done (green). Selecting a dot or a list row reveals its note; `onOpen` fires the region id for a drill-down. Dots pop in with a staggered spring on mount.

<BodyMap sex="w" onOpen={(id) => openRegion(id)}
  points={[{ id: 'herz', label: 'Herz & Kreislauf', x: 58.9, y: 23.8, status: 'action', note: 'Blutdruck heute notieren' }]} />

Positions are percentages of the silhouette image box ({ x, y } in 0–100). Props: `showList` (region list beside figure), `showLegend`, `figWidth` (px), `imgBase`. In the app hero it's used with `showLegend={false}` and a floating score medallion.

Requires these keyframes on the page:
@keyframes v-dot { from { transform: translate(-50%,-50%) scale(0); opacity: 0 } to { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
@keyframes v-ping { 0% { transform: scale(1); opacity: .55 } 70%, 100% { transform: scale(2.3); opacity: 0 } }

The silhouettes live in `assets/body-male.png` / `assets/body-female.png` (tinted to the palette) and are also embedded as data URIs in `assets/body-silhouettes.js` (window.VITALIS_BODY) so the map renders without external image fetches.
