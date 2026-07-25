import React from 'react';
import { Icon } from './Icon.jsx';
import './IconButton.css';

const ICON_SIZE_BY_SIZE = Object.freeze({ sm: 18, md: 20, lg: 22 });

export function IconButton({
  icon,
  variant = 'soft',
  size = 'md',
  label,
  disabled = false,
  onClick,
  className = '',
  style,
  ...rest
}) {
  const classes = [
    'vds-icon-button',
    `vds-icon-button--${variant}`,
    `vds-icon-button--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      aria-label={label}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      style={style}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE_BY_SIZE[size] ?? ICON_SIZE_BY_SIZE.md} />
    </button>
  );
}
