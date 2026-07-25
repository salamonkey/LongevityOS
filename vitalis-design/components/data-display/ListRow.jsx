import React from 'react';
import { Icon } from '../foundation/Icon.jsx';
import { Badge } from './Badge.jsx';

const TONES = {
  primary: { bg: 'var(--color-primary-soft)',   fg: 'var(--color-primary)' },
  teal:    { bg: 'var(--color-secondary-soft)', fg: 'var(--color-secondary)' },
  green:   { bg: 'var(--status-done-soft)',     fg: 'var(--status-done)' },
  amber:   { bg: 'var(--status-upcoming-soft)', fg: 'var(--status-upcoming)' },
  red:     { bg: 'var(--status-overdue-soft)',  fg: 'var(--status-overdue)' },
  neutral: { bg: 'var(--surface-sunken)',       fg: 'var(--slate-500)' },
};

export function ListRow({ icon, tone = 'primary', title, subtitle, badge, badgeStatus = 'due', trailingChevron = true, onClick, style = {}, ...rest }) {
  const t = TONES[tone] || TONES.primary;
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: '13px 14px',
        cursor: onClick ? 'pointer' : 'default', fontFamily: 'var(--font-sans)', ...style,
      }} {...rest}>
      {icon && (
        <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name={icon} size={20} />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {badge && <Badge status={badgeStatus}>{badge}</Badge>}
      {trailingChevron && !badge && <Icon name="chevron-right" size={18} color="var(--text-muted)" />}
    </div>
  );
}
