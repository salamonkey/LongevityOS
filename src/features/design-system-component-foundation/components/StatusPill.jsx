import React from 'react';
import { resolveStatusSemantics } from '../semanticPresentation.js';

export function StatusPill({ status }) {
  const semantic = resolveStatusSemantics(status);

  return (
    <span className={`status-chip ${semantic.toneClassName}`} data-token={semantic.token}>
      {semantic.label}
    </span>
  );
}

export default StatusPill;
