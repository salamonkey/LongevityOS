import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

const SIZES = { sm: { d: 36, i: 18 }, md: { d: 44, i: 20 }, lg: { d: 52, i: 22 } };
const VARIANTS = {
  soft:    { background: 'var(--color-primary-soft)', color: 'var(--color-primary-ink)' },
  solid:   { background: 'var(--color-primary)', color: '#fff' },
  ghost:   { background: 'transparent', color: 'var(--slate-500)' },
  surface: { background: 'var(--surface-card)', color: 'var(--color-primary)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' },
};

export function IconButton({ icon, variant = 'soft', size = 'md', label, disabled = false, onClick, style = {}, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: s.d, height: s.d, borderRadius: 'var(--radius-full)', border: '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'background .16s, transform .08s',
        ...(VARIANTS[variant] || VARIANTS.soft), ...style,
      }} {...rest}>
      <Icon name={icon} size={s.i} />
    </button>
  );
}
