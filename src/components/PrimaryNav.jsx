import React from 'react';

const NAV_ICON_BY_VIEW = {
  onboarding: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M3 11.5 12 4l9 7.5V21h-6v-5h-6v5H3z" fill="currentColor" />
    </svg>
  ),
  plan: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M5 4h14v16H5z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9h8M8 13h8M8 17h5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  timeline: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M6 5v14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="6" cy="6" r="2.2" fill="currentColor" />
      <circle cx="6" cy="12" r="2.2" fill="currentColor" />
      <circle cx="6" cy="18" r="2.2" fill="currentColor" />
      <path d="M10 6h8M10 12h6M10 18h9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5 20c0-3.7 2.9-6 7-6s7 2.3 7 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { view: 'onboarding', label: 'Dashboard' },
  { view: 'plan', label: 'Plan' },
  { view: 'timeline', label: 'Timeline' },
  { view: 'profile', label: 'Profile' },
];

export default function PrimaryNav({
  activeView,
  onNavigate,
  navLocked = false,
  showActiveSelection = true,
}) {
  return (
    <>
      <nav className={`desktop-top-nav${navLocked ? ' is-locked' : ''}`} aria-label="Primary navigation">
        <div className="desktop-top-nav-inner">
          {NAV_ITEMS.map((item) => {
            const isActive = showActiveSelection && activeView === item.view;
            const isDisabled = navLocked;
            return (
              <button
                key={`desktop-${item.view}`}
                type="button"
                className={`desktop-top-nav-button${isActive ? ' is-active' : ''}${isDisabled ? ' is-disabled' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={isDisabled ? 'true' : undefined}
                tabIndex={isDisabled ? -1 : 0}
                onClick={() => {
                  if (isDisabled) return;
                  onNavigate(item.view);
                }}
              >
                <span className="desktop-top-nav-icon">{NAV_ICON_BY_VIEW[item.view]}</span>
                <span className="desktop-top-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <nav className={`mobile-bottom-nav${navLocked ? ' is-locked' : ''}`} aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = showActiveSelection && activeView === item.view;
          const isDisabled = navLocked;
          return (
            <button
              key={`mobile-${item.view}`}
              type="button"
              className={`mobile-bottom-nav-button${isActive ? ' is-active' : ''}${isDisabled ? ' is-disabled' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={isDisabled ? 'true' : undefined}
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => {
                if (isDisabled) return;
                onNavigate(item.view);
              }}
            >
              <span className="mobile-bottom-nav-icon">{NAV_ICON_BY_VIEW[item.view]}</span>
              <span className="mobile-bottom-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
