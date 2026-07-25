import React from 'react';

const MAP = {
  due:      { bg: 'var(--status-due-soft)',      fg: 'var(--color-primary-ink)' },
  done:     { bg: 'var(--status-done-soft)',     fg: '#1d6b48' },
  upcoming: { bg: 'var(--status-upcoming-soft)', fg: '#9a6a1c' },
  overdue:  { bg: 'var(--status-overdue-soft)',  fg: '#b23a2a' },
  neutral:  { bg: 'var(--surface-sunken)',       fg: 'var(--slate-600)' },
};

export function Badge({ status = 'neutral', children, style = {}, ...rest }) {
  const c = MAP[status] || MAP.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-sans)',
      fontSize: 11, fontWeight: 600, lineHeight: 1, padding: '5px 10px',
      borderRadius: 'var(--radius-full)', background: c.bg, color: c.fg, ...style,
    }} {...rest}>{children}</span>
  );
}
