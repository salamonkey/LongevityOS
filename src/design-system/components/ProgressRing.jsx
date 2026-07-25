import React from 'react';
import './ProgressRing.css';

export function ProgressRing({
  value = 0,
  size = 72,
  stroke = 8,
  color = 'var(--color-primary)',
  track = 'var(--slate-100)',
  label,
  sublabel,
  style,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="vds-progress-ring" style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} className="vds-progress-ring-svg">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="vds-progress-ring-value"
        />
      </svg>
      <div className="vds-progress-ring-center">
        <span className="vds-progress-ring-label" style={{ fontSize: size * 0.24 }}>
          {label !== undefined ? label : `${Math.round(percent)}%`}
        </span>
        {sublabel ? (
          <span className="vds-progress-ring-sublabel" style={{ fontSize: size * 0.13 }}>{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}
