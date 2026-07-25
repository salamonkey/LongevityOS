import React from 'react';
import './Avatar.css';

const SIZE_PX = Object.freeze({ sm: 32, md: 40, lg: 56 });

function getInitials(name) {
  return String(name ?? '')
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ name = '', src, size = 'md', className = '', style, ...rest }) {
  const diameter = typeof size === 'number' ? size : (SIZE_PX[size] ?? SIZE_PX.md);

  return (
    <span
      className={['vds-avatar', className].filter(Boolean).join(' ')}
      style={{ width: diameter, height: diameter, fontSize: diameter * 0.4, ...style }}
      {...rest}
    >
      {src ? <img src={src} alt={name} className="vds-avatar-image" /> : getInitials(name)}
    </span>
  );
}
