import React, { useId } from 'react';
import { Icon } from './Icon.jsx';
import './Input.css';

export function Input({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  icon,
  type = 'text',
  disabled = false,
  className = '',
  style,
  id,
  ...rest
}) {
  const hasError = Boolean(error);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const fieldClasses = [
    'vds-input-field',
    hasError ? 'vds-input-field--error' : '',
    disabled ? 'vds-input-field--disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <label className={['vds-input', className].filter(Boolean).join(' ')} style={style} htmlFor={inputId}>
      {label ? <span className="vds-input-label">{label}</span> : null}
      <span className={fieldClasses}>
        {icon ? <Icon name={icon} size={18} color="var(--text-muted)" /> : null}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          {...rest}
        />
      </span>
      {hint || error ? (
        <span className={`vds-input-note${hasError ? ' vds-input-note--error' : ''}`}>{error || hint}</span>
      ) : null}
    </label>
  );
}
