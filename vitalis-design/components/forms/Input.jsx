import React, { useState } from 'react';
import { Icon } from '../foundation/Icon.jsx';

export function Input({ label, value, onChange, placeholder, hint, error, icon, type = 'text', disabled = false, style = {}, ...rest }) {
  const [focus, setFocus] = useState(false);
  const hasError = Boolean(error);
  const borderColor = hasError ? 'var(--status-overdue)' : focus ? 'var(--color-primary)' : 'var(--border-strong)';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', ...style }}>
      {label && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>}
      <span style={{
        display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 14px',
        background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
        border: '1.5px solid ' + borderColor, borderRadius: 'var(--radius-md)',
        boxShadow: focus && !hasError ? '0 0 0 4px var(--focus-ring)' : 'none',
        transition: 'border-color .16s, box-shadow .16s',
      }}>
        {icon && <Icon name={icon} size={18} color="var(--text-muted)" />}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-primary)', minWidth: 0 }}
          {...rest} />
      </span>
      {(hint || error) && <span style={{ fontSize: 12, color: hasError ? 'var(--status-overdue)' : 'var(--text-secondary)' }}>{error || hint}</span>}
    </label>
  );
}
