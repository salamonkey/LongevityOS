import React from 'react';
import { IconButton } from '../forms/IconButton.jsx';

/** Bottom sheet / modal. Slides up over the screen with a scrim.
    Requires @keyframes v-fade and v-slide on the page (see prompt). */
export function Sheet({ open = false, onClose, title, children, style = {} }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(30,42,54,.4)', animation: 'v-fade .2s ease' }} />
      <div style={{
        position: 'relative', width: '100%', background: 'var(--surface-card)',
        borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0', boxShadow: 'var(--shadow-lg)',
        padding: '10px 20px 24px', animation: 'v-slide .24s ease', ...style,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--slate-200)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{title}</span>
          {onClose && <IconButton icon="x" variant="ghost" size="sm" label="Schließen" onClick={onClose} />}
        </div>
        {children}
      </div>
    </div>
  );
}
