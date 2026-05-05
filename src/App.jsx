import React, { useEffect, useState } from 'react';
import HealthPlanBrowsingAndItemDetailRoute from './routes/health-plan-browsing-and-item-detail.jsx';
import SelfOnboardingToFirstDashboardRoute from './routes/self-onboarding-to-first-dashboard.jsx';
import { generateInitialPlanSnapshot } from './features/self-onboarding-to-first-dashboard/plan.js';
import { DETAIL_ORIGIN } from './features/health-plan-browsing-and-item-detail/model.js';

const DEMO_PROFILE = Object.freeze({
  profileId: 'self',
  name: 'You',
  age: 52,
  gender: 'female',
});

const demoPlanSnapshot = generateInitialPlanSnapshot(DEMO_PROFILE);

function normalizeView(value) {
  return String(value || '').toLowerCase() === 'plan' ? 'plan' : 'onboarding';
}

function currentViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeView(params.get('view'));
}

function replaceViewInUrl(view) {
  const url = new URL(window.location.href);
  if (view === 'plan') url.searchParams.set('view', 'plan');
  else url.searchParams.delete('view');
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(null, '', next);
  }
}

export default function App() {
  const [activeView, setActiveView] = useState(() => currentViewFromUrl());
  const [runtimeProfile, setRuntimeProfile] = useState(null);
  const [runtimePlanSnapshot, setRuntimePlanSnapshot] = useState(null);
  const [runtimePlanEntry, setRuntimePlanEntry] = useState({
    initialItemKey: undefined,
    initialOrigin: undefined,
    initialCategory: undefined,
  });

  useEffect(() => {
    replaceViewInUrl(activeView);
  }, [activeView]);

  const openHealthPlan = ({
    planSnapshot,
    profile,
    initialItemKey,
    initialOrigin,
    initialCategory,
  } = {}) => {
    if (planSnapshot) setRuntimePlanSnapshot(planSnapshot);
    if (profile) setRuntimeProfile(profile);
    setRuntimePlanEntry({
      initialItemKey,
      initialOrigin,
      initialCategory,
    });
    setActiveView('plan');
  };

  const handlePlanNavigate = (target) => {
    if (target?.destination === DETAIL_ORIGIN.dashboard) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: undefined,
      });
      setActiveView('onboarding');
    }
  };

  if (activeView === 'plan') {
    return (
      <HealthPlanBrowsingAndItemDetailRoute
        planSnapshot={runtimePlanSnapshot || demoPlanSnapshot}
        initialItemKey={runtimePlanEntry.initialItemKey}
        initialOrigin={runtimePlanEntry.initialOrigin}
        initialCategory={runtimePlanEntry.initialCategory}
        onNavigate={handlePlanNavigate}
      />
    );
  }
  return (
    <SelfOnboardingToFirstDashboardRoute
      initialProfile={runtimeProfile}
      initialPlanSnapshot={runtimePlanSnapshot}
      onOpenHealthPlan={openHealthPlan}
    />
  );
}
