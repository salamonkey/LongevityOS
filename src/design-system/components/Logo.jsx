import React from 'react';
import './Logo.css';

export function Logo({ size = 34, word = true, reversed = false, gap = 10, wordSize, style }) {
  const shield = (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="vds-logo-shield">
      <path
        d="M50 11 L79 22 Q84 24 84 40 C84 63 70 82 50 90 C30 82 16 63 16 40 Q16 24 21 22 Z"
        fill={reversed ? '#fff' : 'var(--color-primary)'}
      />
      <circle
        cx="50" cy="48" r="17"
        stroke={reversed ? 'rgba(43,127,184,.4)' : '#FFFFFF'}
        strokeOpacity={reversed ? 1 : 0.34}
        strokeWidth={6.5}
      />
      <path
        d="M50 31a17 17 0 1 1 -14.2 7.6"
        stroke={reversed ? 'var(--color-primary)' : '#8FCFC9'}
        strokeWidth={6.5}
        strokeLinecap="round"
      />
    </svg>
  );

  if (!word) {
    return shield;
  }

  return (
    <span className="vds-logo" style={{ gap, ...style }}>
      {shield}
      <span
        className={`vds-logo-word${reversed ? ' vds-logo-word--reversed' : ''}`}
        style={{ fontSize: wordSize || size * 0.82 }}
      >
        Vitalis
      </span>
    </span>
  );
}
