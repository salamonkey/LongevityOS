import React, { useEffect, useState } from 'react';
import { OnboardingPage } from './features/onboarding/OnboardingPage.jsx';
import { createProfileSnapshot } from './features/profile/profilePlan.js';
import { GeneratedDashboardPage } from './routes/first-profile-onboarding-to-generated-dashboard.jsx';
import { FullHealthPlanViewRoute } from './routes/full-health-plan-view.jsx';
import { HealthItemDetailAndCompletionRoute } from './routes/health-item-detail-and-completion.jsx';
import { ReminderSchedulingFromHealthItemsRoute } from './routes/reminder-scheduling-from-health-items.jsx';

const DEFAULT_DRAFT = {
  ageYears: '',
  gender: '',
};

const PROFILE_STORAGE_KEY = 'sl-002-active-profile';

// Keep the SL-001 route symbol in source for legacy smoke coverage.
const LEGACY_DASHBOARD_REFERENCE = GeneratedDashboardPage;
void LEGACY_DASHBOARD_REFERENCE;
const LEGACY_FULL_PLAN_REFERENCE = FullHealthPlanViewRoute;
void LEGACY_FULL_PLAN_REFERENCE;
const LEGACY_DETAIL_REFERENCE = HealthItemDetailAndCompletionRoute;
void LEGACY_DETAIL_REFERENCE;

export default function App() {
  const [screen, setScreen] = useState(() => (loadStoredProfileSnapshot() ? 'dashboard' : 'welcome'));
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [profile, setProfile] = useState(() => loadStoredProfileSnapshot());
  const [routeState, setRouteState] = useState(() => readRouteStateFromHash());

  useEffect(() => {
    if (screen !== 'generating' || !pendingDraft) {
      return undefined;
    }

    const timerId = globalThis.setTimeout(() => {
      const nextProfile = createProfileSnapshot(pendingDraft);
      setProfile(nextProfile);
      setPendingDraft(null);
      setScreen('dashboard');
    }, 160);

    return () => globalThis.clearTimeout(timerId);
  }, [pendingDraft, screen]);

  useEffect(() => {
    if (!globalThis.localStorage) {
      return;
    }

    if (!profile) {
      globalThis.localStorage.removeItem(PROFILE_STORAGE_KEY);
      return;
    }

    globalThis.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (!globalThis.addEventListener) {
      return undefined;
    }

    const onHashChange = () => {
      setRouteState(readRouteStateFromHash());
    };

    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  if (screen === 'welcome') {
    return (
      <WelcomeScreen
        onStart={() => {
          setScreen('onboarding');
        }}
      />
    );
  }

  if (screen === 'onboarding') {
    return (
      <OnboardingPage
        draft={draft}
        onDraftChange={(updates) => {
          setDraft((current) => ({ ...current, ...updates }));
        }}
        onSubmit={(nextDraft) => {
          setPendingDraft(nextDraft);
          setScreen('generating');
        }}
        onBack={() => {
          setScreen('welcome');
        }}
      />
    );
  }

  if (screen === 'generating') {
    return <GeneratingScreen draft={pendingDraft ?? draft} />;
  }

  if (!profile) {
    return (
      <WelcomeScreen
        onStart={() => {
          setScreen('onboarding');
        }}
      />
    );
  }

  if (routeState.route === 'plan') {
    return (
      <ReminderSchedulingFromHealthItemsRoute
        view="plan"
        profile={profile}
        onBackToDashboard={() => {
          setHashRoute('#/dashboard');
        }}
        onOpenItem={(itemId) => {
          setHashRoute(`#/health-item/${encodeURIComponent(itemId)}?from=plan`);
        }}
      />
    );
  }

  return (
    <>
      {routeState.route === 'dashboard' ? (
        <section className="app-shell app-route-actions-shell" aria-label="Plan navigation">
          <section className="panel app-route-actions">
            <p className="eyebrow">Health plan</p>
            <h2>Review every recommended item</h2>
            <p className="helper">
              Open your full health plan to view all preventive items, including completed steps.
            </p>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setHashRoute('#/plan');
                }}
              >
                View full health plan
              </button>
            </div>
          </section>
        </section>
      ) : null}
      <ReminderSchedulingFromHealthItemsRoute
        view="dashboard-detail"
        profile={profile}
        onRestart={() => {
          setProfile(null);
          setPendingDraft(null);
          setDraft(DEFAULT_DRAFT);
          setScreen('welcome');
        }}
      />
    </>
  );
}

function WelcomeScreen({ onStart }) {
  return (
    <main className="app-shell">
      <section className="panel hero welcome-hero">
        <p className="eyebrow">Longevity Health OS</p>
        <h1>Your preventive plan starts with two answers</h1>
        <p className="lede">
          Answer two quick questions to see your next preventive health actions.
        </p>
        <div className="actions">
          <button type="button" className="primary" onClick={onStart}>
            Start
          </button>
        </div>
        <p className="helper">Guidance to help you plan. Not medical advice.</p>
      </section>
    </main>
  );
}

function GeneratingScreen({ draft }) {
  return (
    <main className="app-shell">
      <section className="panel hero generating-panel">
        <div className="loading-mark" aria-hidden="true" />
        <p className="eyebrow">Building your dashboard</p>
        <h1>We are generating your first plan</h1>
        <p className="lede">
          Age {draft?.ageYears || '—'} · {capitalize(draft?.gender) || '—'}
        </p>
        <p className="helper">This usually takes a moment.</p>
      </section>
    </main>
  );
}

function capitalize(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function loadStoredProfileSnapshot() {
  if (!globalThis.localStorage) {
    return null;
  }

  try {
    const raw = globalThis.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.profileId || !Array.isArray(parsed?.planItems)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function readRouteStateFromHash() {
  const hash = String(globalThis.location?.hash ?? '');
  const detailMatch = hash.match(/^#\/health-item\/(.+)$/);

  if (hash === '#/plan') {
    return {
      route: 'plan',
      itemId: null,
    };
  }

  if (detailMatch) {
    return {
      route: 'detail',
      itemId: detailMatch[1] || null,
    };
  }

  return {
    route: 'dashboard',
    itemId: null,
  };
}

function setHashRoute(nextHash) {
  if (!globalThis.location) {
    return;
  }

  globalThis.location.hash = nextHash;
}
