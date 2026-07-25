import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

const SIZES = {
  sm: { h: 36, px: 14, fs: 13, gap: 6, icon: 16 },
  md: { h: 48, px: 18, fs: 15, gap: 8, icon: 18 },
  lg: { h: 56, px: 22, fs: 16, gap: 8, icon: 20 },
};
const VARIANTS = {
  primary:   { background: 'var(--color-primary)', color: 'var(--text-on-primary)' },
  secondary: { background: 'var(--color-primary-soft)', color: 'var(--color-primary-ink)' },
  ghost:     { background: 'transparent', color: 'var(--color-primary-ink)' },
  danger:    { background: 'var(--status-overdue)', color: '#fff' },
};

export function Button({ variant = 'primary', size = 'md', fullWidth = false, iconLeft, iconRight, disabled = false, onClick, children, style = {}, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <button
      type="button" disabled={disabled} onClick={onClick}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.98)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: s.gap,
        height: s.h, padding: '0 ' + s.px + 'px', fontFamily: 'var(--font-sans)', fontSize: s.fs,
        fontWeight: 600, lineHeight: 1, borderRadius: 'var(--radius-full)', border: '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer', width: fullWidth ? '100%' : 'auto',
        transition: 'background .16s ease, opacity .16s ease, transform .08s ease',
        opacity: disabled ? 0.45 : 1, WebkitTapHighlightColor: 'transparent',
        ...(VARIANTS[variant] || VARIANTS.primary), ...style,
      }}
      {...rest}>
      {iconLeft && <Icon name={iconLeft} size={s.icon} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}
