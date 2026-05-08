import React, { useEffect, useState } from 'react';
import ItemCompletionAndReminderActionsRoute from './routes/item-completion-and-reminder-actions.jsx';
import PlanTimelineRoute from './routes/plan-timeline.jsx';
import ProfileAreaAndHouseholdPreferencesRoute from './routes/profile-area-and-household-preferences.jsx';
import SelfOnboardingToFirstDashboardRoute from './routes/self-onboarding-to-first-dashboard.jsx';
import { generateInitialPlanSnapshot } from './features/self-onboarding-to-first-dashboard/plan.js';
import { DETAIL_ORIGIN, PLAN_CATEGORIES } from './features/health-plan-browsing-and-item-detail/model.js';
import { createProfileAreaAndHouseholdPreferencesSession } from './features/profile-area-and-household-preferences/service.js';
import PrimaryNav from './components/PrimaryNav.jsx';
import './primary-nav.css';

const DEMO_PROFILE = Object.freeze({
  profileId: 'self',
  name: 'Me',
  age: 45,
  gender: 'female',
});

const demoPlanSnapshot = generateInitialPlanSnapshot(DEMO_PROFILE, { now: new Date() });

function normalizeView(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'plan') return 'plan';
  if (normalized === 'timeline') return 'timeline';
  if (normalized === 'profile' || normalized === 'profiles' || normalized === 'preferences') return 'profile';
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
  else if (view === 'timeline') url.searchParams.set('view', 'timeline');
  else if (view === 'profile') url.searchParams.set('view', 'profile');
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
  const [profileAreaSeed, setProfileAreaSeed] = useState({
    profiles: [],
    plansByProfileId: {},
    manualEntriesByProfileId: {},
    reminderSettings: null,
    activeProfileId: null,
  });
  const [runtimePlanEntry, setRuntimePlanEntry] = useState({
    initialItemKey: undefined,
    initialOrigin: undefined,
    initialCategory: undefined,
    initialReturnToVaccinationTracker: false,
  });
  const hasCompletedOnboarding = Boolean(runtimeProfile && runtimePlanSnapshot);

  useEffect(() => {
    replaceViewInUrl(activeView);
  }, [activeView]);

  useEffect(() => {
    if (!hasCompletedOnboarding && activeView !== 'onboarding') {
      setActiveView('onboarding');
    }
  }, [activeView, hasCompletedOnboarding]);

  const syncProfileAreaSeedFromRuntime = (profile, planSnapshot) => {
    if (!profile?.profileId) {
      return;
    }

    const normalizedProfile = {
      profileId: profile.profileId,
      displayLabel: profile.name || profile.displayLabel || 'Profile',
      name: profile.name || profile.displayLabel || 'Profile',
      age: profile.age,
      gender: profile.gender,
      createdAt: profile.createdAt,
    };

    setProfileAreaSeed((previous) => {
      const existingProfiles = Array.isArray(previous.profiles) ? previous.profiles : [];
      const profileExists = existingProfiles.some((item) => item.profileId === normalizedProfile.profileId);
      const nextProfiles = profileExists
        ? existingProfiles.map((item) => (
          item.profileId === normalizedProfile.profileId ? { ...item, ...normalizedProfile } : item
        ))
        : [...existingProfiles, normalizedProfile];
      const nextPlansByProfileId = {
        ...(previous.plansByProfileId || {}),
      };

      if (planSnapshot?.profileId === normalizedProfile.profileId && Array.isArray(planSnapshot.items)) {
        nextPlansByProfileId[normalizedProfile.profileId] = planSnapshot;
      }

      return {
        profiles: nextProfiles,
        plansByProfileId: nextPlansByProfileId,
        manualEntriesByProfileId: {
          ...(previous.manualEntriesByProfileId || {}),
        },
        reminderSettings: previous.reminderSettings ?? null,
        activeProfileId: normalizedProfile.profileId,
      };
    });
  };

  const openHealthPlan = ({
    planSnapshot,
    profile,
    initialItemKey,
    initialOrigin,
    initialCategory,
  } = {}) => {
    if (planSnapshot) setRuntimePlanSnapshot(planSnapshot);
    if (profile) setRuntimeProfile(profile);
    if (profile) syncProfileAreaSeedFromRuntime(profile, planSnapshot);
    setRuntimePlanEntry({
      initialItemKey,
      initialOrigin,
      initialCategory,
      initialReturnToVaccinationTracker: false,
    });
    setActiveView('plan');
  };

  const handlePlanNavigate = (target) => {
    if (target?.destination === DETAIL_ORIGIN.dashboard) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('onboarding');
      return;
    }

    if (target?.destination === DETAIL_ORIGIN.vaccinations) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.vaccination,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('plan');
    }
  };

  const handlePlanSnapshotChange = (nextPlanSnapshot) => {
    if (nextPlanSnapshot) {
      setRuntimePlanSnapshot(nextPlanSnapshot);
      if (runtimeProfile?.profileId) {
        syncProfileAreaSeedFromRuntime(runtimeProfile, nextPlanSnapshot);
      }
    }
  };

  const openVaccinations = ({ planSnapshot, profile } = {}) => {
    if (planSnapshot) setRuntimePlanSnapshot(planSnapshot);
    if (profile) setRuntimeProfile(profile);
    if (profile) syncProfileAreaSeedFromRuntime(profile, planSnapshot);
    setRuntimePlanEntry({
      initialItemKey: undefined,
      initialOrigin: undefined,
      initialCategory: PLAN_CATEGORIES.vaccination,
      initialReturnToVaccinationTracker: false,
    });
    setActiveView('plan');
  };

  const openTimelineItem = (item) => {
    if (!item?.itemKey) return;

    setRuntimePlanEntry({
      initialItemKey: item.itemKey,
      initialOrigin: DETAIL_ORIGIN.direct,
      initialCategory: item.category === PLAN_CATEGORIES.vaccination
        ? PLAN_CATEGORIES.vaccination
        : PLAN_CATEGORIES.checkup,
      initialReturnToVaccinationTracker: false,
    });
    setActiveView('plan');
  };

  const handleSelfOnboardingCompleted = ({ profile, planSnapshot } = {}) => {
    if (profile) {
      setRuntimeProfile(profile);
    }
    if (planSnapshot) {
      setRuntimePlanSnapshot(planSnapshot);
    }
    if (profile) {
      syncProfileAreaSeedFromRuntime(profile, planSnapshot);
    }
  };

  const handleProfileNavigate = (target = {}) => {
    const targetProfileId = target?.profile?.profileId;
    const seededPlanSnapshot = targetProfileId
      ? profileAreaSeed.plansByProfileId?.[targetProfileId]
      : null;
    const targetPlanSnapshot = target?.planSnapshot || seededPlanSnapshot || null;

    if (target?.profile) {
      setRuntimeProfile(target.profile);
    }

    if (targetPlanSnapshot) {
      setRuntimePlanSnapshot(targetPlanSnapshot);
    }

    if (target?.profile) {
      syncProfileAreaSeedFromRuntime(target.profile, targetPlanSnapshot);
    }

    if (target?.destination === DETAIL_ORIGIN.dashboard) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('onboarding');
      return;
    }

    if (target?.destination === DETAIL_ORIGIN.vaccinations) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.vaccination,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('plan');
      return;
    }

    if (target?.destination === DETAIL_ORIGIN.checkups || target?.destination === 'plan') {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('plan');
    }
  };

  const profileAreaSessionFactory = (options = {}) => {
    const hasPersistedProfiles = Array.isArray(profileAreaSeed.profiles) && profileAreaSeed.profiles.length > 0;
    const seededProfiles = hasPersistedProfiles
      ? profileAreaSeed.profiles
      : (
        runtimeProfile
          ? [{
            profileId: runtimeProfile.profileId,
            displayLabel: runtimeProfile.name || 'Me',
            name: runtimeProfile.name || 'Me',
            age: runtimeProfile.age,
            gender: runtimeProfile.gender,
            createdAt: runtimeProfile.createdAt,
          }]
          : []
      );
    const seededPlanByProfileId = hasPersistedProfiles
      ? profileAreaSeed.plansByProfileId
      : (
        runtimeProfile && runtimePlanSnapshot
          ? { [runtimeProfile.profileId]: runtimePlanSnapshot }
          : {}
      );
    const seededManualEntriesByProfileId = hasPersistedProfiles
      ? profileAreaSeed.manualEntriesByProfileId
      : {};
    const seededActiveProfileId = hasPersistedProfiles
      ? profileAreaSeed.activeProfileId
      : runtimeProfile?.profileId ?? null;

    return createProfileAreaAndHouseholdPreferencesSession({
      ...options,
      initialProfiles: seededProfiles,
      initialActiveProfileId: seededActiveProfileId,
      initialPlansByProfileId: seededPlanByProfileId,
      initialManualEntriesByProfileId: seededManualEntriesByProfileId,
      initialReminderSettings: profileAreaSeed.reminderSettings ?? undefined,
    });
  };

  const handleProfileSessionStateChange = (sessionState = {}) => {
    const profiles = Array.isArray(sessionState.profiles) ? sessionState.profiles : [];
    const plansByProfileId = sessionState.plansByProfileId && typeof sessionState.plansByProfileId === 'object'
      ? sessionState.plansByProfileId
      : {};
    const manualEntriesByProfileId = sessionState.manualEntriesByProfileId && typeof sessionState.manualEntriesByProfileId === 'object'
      ? sessionState.manualEntriesByProfileId
      : {};
    const reminderSettings = sessionState.reminderSettings && typeof sessionState.reminderSettings === 'object'
      ? sessionState.reminderSettings
      : null;

    setProfileAreaSeed({
      profiles,
      plansByProfileId,
      manualEntriesByProfileId,
      reminderSettings,
      activeProfileId: sessionState.activeProfileId ?? null,
    });

    const activeProfile = profiles.find((profile) => profile.profileId === sessionState.activeProfileId) ?? null;
    const activePlanSnapshot = activeProfile?.profileId
      ? plansByProfileId[activeProfile.profileId] ?? null
      : null;

    if (activeProfile) {
      setRuntimeProfile(activeProfile);
    }

    if (activePlanSnapshot) {
      setRuntimePlanSnapshot(activePlanSnapshot);
    }
  };

  let activeSurface = (
    <SelfOnboardingToFirstDashboardRoute
      initialProfile={runtimeProfile}
      initialPlanSnapshot={runtimePlanSnapshot}
      onOpenHealthPlan={openHealthPlan}
      onOpenVaccinations={openVaccinations}
      onOnboardingCompleted={handleSelfOnboardingCompleted}
    />
  );

  if (activeView === 'profile') {
    activeSurface = (
      <ProfileAreaAndHouseholdPreferencesRoute
        onNavigate={handleProfileNavigate}
        onSessionStateChange={handleProfileSessionStateChange}
        sessionFactory={profileAreaSessionFactory}
      />
    );
  } else if (activeView === 'plan') {
    activeSurface = (
      <ItemCompletionAndReminderActionsRoute
        profile={runtimeProfile || DEMO_PROFILE}
        initialPlanSnapshot={runtimePlanSnapshot || demoPlanSnapshot}
        initialItemKey={runtimePlanEntry.initialItemKey}
        initialOrigin={runtimePlanEntry.initialOrigin}
        initialCategory={runtimePlanEntry.initialCategory}
        initialReturnToVaccinationTracker={runtimePlanEntry.initialReturnToVaccinationTracker}
        onNavigate={handlePlanNavigate}
        onPlanSnapshotChange={handlePlanSnapshotChange}
      />
    );
  } else if (activeView === 'timeline') {
    activeSurface = (
      <PlanTimelineRoute
        profile={runtimeProfile || DEMO_PROFILE}
        planSnapshot={runtimePlanSnapshot || demoPlanSnapshot}
        onOpenItem={openTimelineItem}
      />
    );
  }

  return (
    <>
      <PrimaryNav
        activeView={activeView}
        onNavigate={setActiveView}
        navLocked={!hasCompletedOnboarding}
        showActiveSelection={hasCompletedOnboarding}
      />
      {activeSurface}
    </>
  );
}
