import React from 'react';
import { IconButton } from './IconButton.jsx';
import { Logo } from './Logo.jsx';
import './TopBar.css';

export function TopBar({ label, onBack, backLabel, right }) {
  return (
    <div className="vds-topbar">
      <IconButton icon="chevron-left" variant="ghost" label={backLabel} onClick={onBack} />
      <div className="vds-topbar-title">{label}</div>
      {right !== undefined ? right : <Logo size={36} word={false} />}
    </div>
  );
}
