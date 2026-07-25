import React from 'react';
import { Icon } from './Icon.jsx';
import './Button.css';

const ICON_SIZE_BY_BUTTON_SIZE = Object.freeze({ sm: 16, md: 18, lg: 20 });

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconLeft,
  iconRight,
  disabled = false,
  onClick,
  children,
  className = '',
  style,
  ...rest
}) {
  const iconSize = ICON_SIZE_BY_BUTTON_SIZE[size] ?? ICON_SIZE_BY_BUTTON_SIZE.md;
  const classes = [
    'vds-button',
    `vds-button--${variant}`,
    `vds-button--${size}`,
    fullWidth ? 'vds-button--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {iconLeft ? <Icon name={iconLeft} size={iconSize} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
}
