import React, { useEffect, useState } from 'react';
import ItemCompletionAndReminderActionsRoute from './routes/item-completion-and-reminder-actions.jsx';
import SelfOnboardingToFirstDashboardRoute from './routes/self-onboarding-to-first-dashboard.jsx';
import { generateInitialPlanSnapshot } from './features/self-onboarding-to-first-dashboard/plan.js';
import { DETAIL_ORIGIN, PLAN_CATEGORIES } from './features/health-plan-browsing-and-item-detail/model.js';

const DEMO_PROFILE = Object.freeze({
  profileId: 'self',
  name: 'You',
  age: 45,
  gender: 'female',
});

const demoPlanSnapshot = generateInitialPlanSnapshot(DEMO_PROFILE, { now: new Date() });

function normalizeView(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'plan') return 'plan';
  // Keep legacy SL-003 URL working but fold it into the canonical plan flow.
  if (normalized === 'actions') return 'plan';
  return 'onboarding';
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
        initialCategory: PLAN_CATEGORIES.checkup,
      });
      setActiveView('onboarding');
    }
  };

  const handlePlanSnapshotChange = (nextPlanSnapshot) => {
    if (nextPlanSnapshot) {
      setRuntimePlanSnapshot(nextPlanSnapshot);
    }
  };

  if (activeView === 'plan') {
    return (
      <ItemCompletionAndReminderActionsRoute
        profile={runtimeProfile || DEMO_PROFILE}
        initialPlanSnapshot={runtimePlanSnapshot || demoPlanSnapshot}
        initialItemKey={runtimePlanEntry.initialItemKey}
        initialOrigin={runtimePlanEntry.initialOrigin}
        initialCategory={runtimePlanEntry.initialCategory}
        onNavigate={handlePlanNavigate}
        onPlanSnapshotChange={handlePlanSnapshotChange}
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
