import React from 'react';

export function Card({ children, padding = 16, elevated = true, onClick, style = {}, ...rest }) {
  const clickable = Boolean(onClick);
  return (
    <div onClick={onClick} role={clickable ? 'button' : undefined}
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', boxShadow: elevated ? 'var(--shadow-sm)' : 'none',
        padding, cursor: clickable ? 'pointer' : 'default',
        transition: 'box-shadow .16s, transform .08s', ...style,
      }} {...rest}>{children}</div>
  );
}
