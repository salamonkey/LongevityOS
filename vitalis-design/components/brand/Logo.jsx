import React from 'react';

/** Vitalis logo — the Schutzschild mark (shield holding the Vorsorge-Ring), optionally
    with the wordmark. Use word={false} for the icon-only mark, reversed on dark. */
export function Logo({ size = 34, word = true, reversed = false, gap = 10, wordSize, style = {} }) {
  const shield = (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ flex: 'none' }}>
      <path d="M50 11 L79 22 Q84 24 84 40 C84 63 70 82 50 90 C30 82 16 63 16 40 Q16 24 21 22 Z" fill={reversed ? 'var(--white)' : 'var(--color-primary)'} />
      <circle cx="50" cy="48" r="17" stroke={reversed ? 'color-mix(in srgb, var(--color-primary) 40%, transparent)' : 'var(--white)'} strokeOpacity={reversed ? 1 : 0.34} strokeWidth={6.5} />
      <path d="M50 31a17 17 0 1 1 -14.2 7.6" stroke={reversed ? 'var(--color-primary)' : 'var(--teal-300)'} strokeWidth={6.5} strokeLinecap="round" />
    </svg>
  );
  if (!word) return shield;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, ...style }}>
      {shield}
      <span style={{ fontSize: wordSize || size * 0.82, fontWeight: 700, letterSpacing: '-.01em', color: reversed ? 'var(--white)' : 'var(--slate-900)', fontFamily: 'var(--font-sans)' }}>Vitalis</span>
    </span>
  );
}
