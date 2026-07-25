import React from 'react';
import { Icon } from './Icon.jsx';
import './TabBar.css';

export function TabBar({ items = [], active, onChange, className = '', style, ...rest }) {
  return (
    <nav
      className={['vds-tabbar', className].filter(Boolean).join(' ')}
      style={style}
      aria-label="Primary navigation"
      {...rest}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            className={`vds-tabbar-button${isActive ? ' vds-tabbar-button--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange?.(item.key)}
          >
            <Icon name={item.icon} size={23} strokeWidth={isActive ? 2 : 1.75} />
            <span className="vds-tabbar-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
