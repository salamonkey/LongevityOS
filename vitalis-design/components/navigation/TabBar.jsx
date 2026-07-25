import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

export function TabBar({ items = [], active, onChange, style = {} }) {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      height: 'var(--tabbar-h)', background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-nav)',
      fontFamily: 'var(--font-sans)', ...style,
    }}>
      {items.map(it => {
        const on = it.key === active;
        return (
          <button key={it.key} type="button" onClick={() => onChange && onChange(it.key)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', padding: '6px 10px', color: on ? 'var(--color-primary)' : 'var(--text-muted)', WebkitTapHighlightColor: 'transparent' }}>
            <Icon name={it.icon} size={23} strokeWidth={on ? 2 : 1.75} />
            <span style={{ fontSize: 9, fontWeight: on ? 600 : 500 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
