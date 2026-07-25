import React from 'react';

const SIZES = { sm: 32, md: 40, lg: 56 };

export function Avatar({ name = '', src, size = 'md', style = {}, ...rest }) {
  const d = typeof size === 'number' ? size : (SIZES[size] || 40);
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <span style={{
      width: d, height: d, borderRadius: 'var(--radius-full)',
      background: 'var(--color-primary-soft)', color: 'var(--color-primary-ink)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: d * 0.4,
      overflow: 'hidden', flex: 'none', ...style,
    }} {...rest}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  );
}
