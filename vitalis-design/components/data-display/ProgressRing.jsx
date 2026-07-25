import React from 'react';

/** Circular progress indicator — the Vitalis "Vorsorge-Score" hero metric. */
export function ProgressRing({ value = 0, size = 72, stroke = 8, color = 'var(--color-primary)', track = 'var(--slate-100)', label, sublabel, style = {} }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const off = c * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {label !== undefined ? label : Math.round(pct) + '%'}
        </span>
        {sublabel && <span style={{ fontSize: size * 0.13, color: 'var(--text-secondary)', marginTop: 2 }}>{sublabel}</span>}
      </div>
    </div>
  );
}
