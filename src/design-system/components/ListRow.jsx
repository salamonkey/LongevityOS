import React from 'react';
import { Icon } from './Icon.jsx';
import { Badge } from './Badge.jsx';
import './ListRow.css';

export function ListRow({
  icon,
  tone = 'primary',
  title,
  subtitle,
  badge,
  badgeStatus = 'due',
  beforeBadge,
  trailingChevron = true,
  selected = false,
  onClick,
  className = '',
  style,
  ...rest
}) {
  const classes = [
    'vds-list-row',
    `vds-list-row--tone-${tone}`,
    onClick ? 'vds-list-row--clickable' : '',
    selected ? 'vds-list-row--selected' : '',
    className,
  ].filter(Boolean).join(' ');

  const interactiveProps = onClick ? {
    role: 'button',
    tabIndex: 0,
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(event);
      }
    },
  } : {};

  return (
    <div onClick={onClick} className={classes} style={style} {...interactiveProps} {...rest}>
      {icon ? (
        <span className="vds-list-row-icon">
          <Icon name={icon} size={20} />
        </span>
      ) : null}
      <div className="vds-list-row-copy">
        <div className="vds-list-row-title">{title}</div>
        {subtitle ? <div className="vds-list-row-subtitle">{subtitle}</div> : null}
      </div>
      {beforeBadge}
      {badge ? <Badge status={badgeStatus}>{badge}</Badge> : null}
      {!badge && selected ? <Icon name="check" size={18} color="var(--color-primary)" /> : null}
      {!badge && !selected && trailingChevron ? <Icon name="chevron-right" size={18} color="var(--text-muted)" /> : null}
    </div>
  );
}
