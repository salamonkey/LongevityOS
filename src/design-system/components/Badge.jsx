import React from 'react';
import './Badge.css';

export function Badge({ status = 'neutral', children, className = '', style, ...rest }) {
  const classes = ['vds-badge', `vds-badge--${status}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} style={style} {...rest}>
      {children}
    </span>
  );
}
