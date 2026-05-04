import React from 'react';

export function AppShell({ children, className = '' }) {
  const shellClassName = className ? `app-shell ${className}` : 'app-shell';
  return <main className={shellClassName}>{children}</main>;
}

export default AppShell;
