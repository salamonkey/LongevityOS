import React, { useState } from 'react';

const STATUS = { action: 'var(--status-overdue)', soon: 'var(--status-upcoming)', ok: 'var(--status-done)' };
const DEFAULT_POINTS = [
  { id: 'kopf', label: 'Kopf & Sinne', x: 50.6, y: 5.7, status: 'ok', note: 'Augenarzt-Kontrolle erledigt' },
  { id: 'impf', label: 'Impfschutz', x: 11.5, y: 21.8, status: 'action', note: 'Grippeimpfung fällig' },
  { id: 'herz', label: 'Herz & Kreislauf', x: 58.9, y: 23.8, status: 'action', note: 'Blutdruck heute notieren' },
  { id: 'haut', label: 'Haut', x: 71.4, y: 34.8, status: 'soon', note: 'Hautkrebs-Screening in 2 Wochen' },
  { id: 'bauch', label: 'Verdauung', x: 51.1, y: 41.6, status: 'soon', note: 'Darmkrebs-Vorsorge ab 50' },
  { id: 'beine', label: 'Bewegung', x: 38.3, y: 76.7, status: 'ok', note: 'Aktiv – alles gut' },
];

/** Body overview with tappable status dots overlaid on a real human silhouette
    (male/female PNG chosen by `sex`). Dots pop in on mount; "action" dots pulse.
    Requires @keyframes v-dot and v-ping on the page:
      @keyframes v-dot { from { transform: translate(-50%,-50%) scale(0); opacity: 0 } to { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
      @keyframes v-ping { 0% { transform: scale(1); opacity: .55 } 70%,100% { transform: scale(2.3); opacity: 0 } } */
export function BodyMap({ points = DEFAULT_POINTS, sex = 'w', showList = true, showLegend = true, figWidth = 118, imgBase = '../../assets/', onOpen, style = {} }) {
  const first = points.find(p => p.status === 'action') || points[0];
  const [sel, setSel] = useState(first ? first.id : null);
  const embedded = typeof window !== 'undefined' && window.VITALIS_BODY ? (sex === 'm' ? window.VITALIS_BODY.male : window.VITALIS_BODY.female) : null;
  const src = embedded || imgBase + (sex === 'm' ? 'body-male.png' : 'body-female.png');
  const leg = (c, t) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: c }} />{t}</span>;
  const Dot = (p, i) => {
    const col = STATUS[p.status] || STATUS.ok, on = p.id === sel;
    const anim = { animation: 'v-dot .5s cubic-bezier(.34,1.56,.64,1) both', animationDelay: (120 + i * 80) + 'ms' };
    return (
      <button key={p.id} type="button" aria-label={p.label} onClick={() => { setSel(p.id); if (onOpen) onOpen(p.id); }}
        style={{ position: 'absolute', left: p.x + '%', top: p.y + '%', transform: 'translate(-50%,-50%)', width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', ...anim }}>
        {p.status === 'action' && <span style={{ gridArea: '1/1', width: 22, height: 22, borderRadius: '50%', border: '2px solid ' + col, opacity: 0.5, animation: 'v-ping 1.9s ease-out infinite' }} />}
        <span style={{ gridArea: '1/1', width: on ? 20 : 16, height: on ? 20 : 16, borderRadius: '50%', background: col, opacity: 0.22 }} />
        <span style={{ gridArea: '1/1', width: on ? 13 : 11, height: on ? 13 : 11, borderRadius: '50%', background: col, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(30,42,54,.35)' }} />
      </button>
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: figWidth, flex: 'none' }}>
          <img src={src} alt={sex === 'm' ? 'Männliche Silhouette' : 'Weibliche Silhouette'} draggable={false} style={{ display: 'block', width: '100%', height: 'auto' }} />
          {points.map(Dot)}
        </div>
        {showList !== false && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {points.map(p => {
            const col = STATUS[p.status] || STATUS.ok, on = p.id === sel;
            return (
              <button key={p.id} type="button" onClick={() => { setSel(p.id); if (onOpen) onOpen(p.id); }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%', textAlign: 'left', border: 'none', background: on ? 'var(--surface-sunken)' : 'transparent', borderRadius: 'var(--radius-sm)', padding: '7px 9px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: col, flex: 'none', marginTop: 4 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</span>
                  {on && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1, lineHeight: 1.35 }}>{p.note}</span>}
                </span>
              </button>
            );
          })}
        </div>
        )}
      </div>
      {showLegend !== false && (
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-secondary)', paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
        {leg(STATUS.action, 'Handeln')}{leg(STATUS.soon, 'Bald dran')}{leg(STATUS.ok, 'Erledigt')}
      </div>
      )}
    </div>
  );
}
