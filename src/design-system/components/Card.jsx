import React from 'react';
import './Card.css';

export function Card({ children, padding = 16, elevated = true, onClick, className = '', style, ...rest }) {
  const clickable = Boolean(onClick);
  const classes = [
    'vds-card',
    elevated ? 'vds-card--elevated' : '',
    clickable ? 'vds-card--clickable' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={classes}
      style={{ padding, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
