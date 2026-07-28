import React from 'react';
import { TopBar } from '../../design-system/components/index.js';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined'
  ? __APP_VERSION__
  : '0.0.0';

export function AppShell({
  title,
  headerAction = null,
  onBack,
  backLabel,
  topBarRight,
  children,
  shellClassName = '',
  showVersion = false,
  stickyHeader = false,
}) {
  const hasHeaderRow = Boolean(title) || Boolean(headerAction);
  const appShellClassName = shellClassName ? `app-shell ${shellClassName}` : 'app-shell';
  const headerClassName = stickyHeader ? 'sl001-header sl001-header--sticky' : 'sl001-header';

  return (
    <main className={appShellClassName}>
      <section className="app-panel sl001-shell">
        <header className={headerClassName}>
          {typeof onBack === 'function' ? (
            <TopBar label={title} onBack={onBack} backLabel={backLabel} right={topBarRight} />
          ) : hasHeaderRow ? (
            <div className="sl001-header-row">
              {title ? <h1>{title}</h1> : null}
              {headerAction ? (
                <div className="sl001-header-action">{headerAction}</div>
              ) : null}
            </div>
          ) : null}
        </header>
        {children}
        {showVersion ? (
          <footer className="sl001-shell-footer">
            <p className="sl001-kicker">v{APP_VERSION}</p>
          </footer>
        ) : null}
      </section>
    </main>
  );
}

