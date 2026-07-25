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
  centeredFooter = false,
}) {
  const hasHeaderRow = Boolean(title) || Boolean(headerAction);
  const appShellClassName = shellClassName ? `app-shell ${shellClassName}` : 'app-shell';
  const footerClassName = centeredFooter ? 'sl001-shell-footer sl001-shell-footer--centered' : 'sl001-shell-footer';

  return (
    <main className={appShellClassName}>
      <section className="app-panel sl001-shell">
        <header className="sl001-header">
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
        <footer className={footerClassName}>
          <p className="sl001-kicker">v{APP_VERSION}</p>
        </footer>
      </section>
    </main>
  );
}

