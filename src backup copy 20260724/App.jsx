import React, { useEffect, useMemo, useRef, useState } from 'react';
import ItemCompletionAndReminderActionsRoute from './routes/item-completion-and-reminder-actions.jsx';
import PlanTimelineRoute from './routes/plan-timeline.jsx';
import ProfileAreaAndHouseholdPreferencesRoute from './routes/profile-area-and-household-preferences.jsx';
import SelfOnboardingToFirstDashboardRoute from './routes/self-onboarding-to-first-dashboard.jsx';
import LiveEnrollment from './features/live-enrollment/LiveEnrollment.jsx';
import EmailPasswordAuth from './features/auth/EmailPasswordAuth.jsx';
import { generateInitialPlanSnapshot } from './features/self-onboarding-to-first-dashboard/plan.js';
import { DETAIL_ORIGIN, PLAN_CATEGORIES } from './features/health-plan-browsing-and-item-detail/model.js';
import { createProfileAreaAndHouseholdPreferencesSession } from './features/profile-area-and-household-preferences/service.js';
import {
  isSupabasePersistenceConfigured,
  loadAppRuntimeState,
  saveAppRuntimeState,
} from './lib/persistence/supabaseAppState.js';
import {
  createLiveEnrollmentAndPlan,
  ensureLivePlansSession,
  isLivePlanConflictError,
  isSupabaseLivePlansConfigured,
  loadLiveProfilesAndPlans,
  signOutLiveUser,
  signInLiveUserWithPassword,
  signUpLiveUserWithPassword,
  saveLivePlanForProfile,
  setLiveActiveProfile,
} from './lib/persistence/supabaseLivePlans.js';
import {
  isSupabaseCatalogConfigured,
  loadPreventiveCatalogFromSupabase,
} from './lib/catalog/supabasePreventiveCatalog.js';
import {
  setRuntimeCatalog,
} from './lib/catalog/runtimeCatalog.js';
import PrimaryNav from './components/PrimaryNav.jsx';
import './primary-nav.css';

const DEMO_PROFILE = Object.freeze({
  profileId: 'self',
  name: 'Me',
  age: 45,
  gender: 'female',
});

const PROFILE_AREA_SEED_DEFAULT = Object.freeze({
  profiles: [],
  plansByProfileId: {},
  manualEntriesByProfileId: {},
  reminderSettings: null,
  activeProfileId: null,
});

const APP_RUNTIME_STATE_SCHEMA_VERSION = 1;

function normalizeSeedFromPersistence(value) {
  if (!value || typeof value !== 'object') {
    return { ...PROFILE_AREA_SEED_DEFAULT };
  }

  return {
    profiles: Array.isArray(value.profiles) ? value.profiles : [],
    plansByProfileId: value.plansByProfileId && typeof value.plansByProfileId === 'object'
      ? value.plansByProfileId
      : {},
    manualEntriesByProfileId: value.manualEntriesByProfileId && typeof value.manualEntriesByProfileId === 'object'
      ? value.manualEntriesByProfileId
      : {},
    reminderSettings: value.reminderSettings && typeof value.reminderSettings === 'object'
      ? value.reminderSettings
      : null,
    activeProfileId: value.activeProfileId !== null && value.activeProfileId !== undefined
      ? String(value.activeProfileId)
      : null,
  };
}

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

function toProfileAreaSeedFromLiveData(liveState) {
  const profiles = Array.isArray(liveState?.profiles) ? liveState.profiles : [];
  const plansByProfileId = liveState?.plansByProfileId && typeof liveState.plansByProfileId === 'object'
    ? liveState.plansByProfileId
    : {};

  return {
    profiles,
    plansByProfileId,
    manualEntriesByProfileId: {},
    reminderSettings: null,
    activeProfileId: liveState?.activeProfileId ?? null,
  };
}

function resolveActiveProfileFromCollection(profiles, activeProfileId) {
  return profiles.find((profile) => String(profile.profileId) === String(activeProfileId)) ?? null;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    }),
  ]);
}

function isNotAuthenticatedError(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('not authenticated');
}

function resolveErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  const details = typeof error?.details === 'string' ? error.details.trim() : '';

  if (message && details) {
    return `${message} (${details})`;
  }

  if (message) {
    return message;
  }

  if (details) {
    return details;
  }

  return fallbackMessage;
}

function hasLoadedCatalog(catalogState) {
  return Boolean(
    catalogState?.ready
    && !catalogState?.error
    && Array.isArray(catalogState?.catalog)
    && catalogState.catalog.length > 0,
  );
}

function applyLivePlanPersistenceMetadata(planSnapshot, metadata) {
  if (!planSnapshot || !metadata || typeof metadata !== 'object') {
    return planSnapshot;
  }

  const itemUpdatedAtByCatalogItemId = metadata.itemUpdatedAtByCatalogItemId
    && typeof metadata.itemUpdatedAtByCatalogItemId === 'object'
    ? metadata.itemUpdatedAtByCatalogItemId
    : {};

  const nextItems = Array.isArray(planSnapshot.items)
    ? planSnapshot.items.map((item) => {
      const key = String(item.catalogItemId);
      const persistedUpdatedAt = itemUpdatedAtByCatalogItemId[key];
      if (!persistedUpdatedAt) {
        return item;
      }

      return {
        ...item,
        updatedAt: persistedUpdatedAt,
      };
    })
    : planSnapshot.items;

  return {
    ...planSnapshot,
    updatedAt: metadata.planUpdatedAt ?? planSnapshot.updatedAt,
    items: nextItems,
  };
}

export default function App() {
  const persistenceEnabled = isSupabasePersistenceConfigured();
  const catalogEnabled = isSupabaseCatalogConfigured();
  const livePlansEnabled = isSupabaseLivePlansConfigured();

  const hasHydratedPersistenceRef = useRef(false);
  const saveTimeoutRef = useRef(null);

  const [activeView, setActiveView] = useState(() => currentViewFromUrl());
  const [dashboardReturnScrollY, setDashboardReturnScrollY] = useState(null);
  const [runtimeProfile, setRuntimeProfile] = useState(null);
  const [runtimePlanSnapshot, setRuntimePlanSnapshot] = useState(null);
  const [profileAreaSeed, setProfileAreaSeed] = useState({ ...PROFILE_AREA_SEED_DEFAULT });
  const [persistenceReady, setPersistenceReady] = useState(!persistenceEnabled);

  const [catalogState, setCatalogState] = useState({
    ready: false,
    error: '',
    catalog: [],
    catalogVersion: '',
  });

  const [liveState, setLiveState] = useState({
    ready: !livePlansEnabled,
    error: '',
    authRequired: false,
    authMode: 'sign_in',
    authPending: false,
    signOutPending: false,
    authError: '',
    authInfo: '',
    userId: null,
    profiles: [],
    plansByProfileId: {},
    activeProfileId: null,
    enrolling: false,
    enrollmentError: '',
  });
  const [liveReloadToken, setLiveReloadToken] = useState(0);

  const [runtimePlanEntry, setRuntimePlanEntry] = useState({
    initialItemKey: undefined,
    initialOrigin: undefined,
    initialCategory: undefined,
    initialReturnToVaccinationTracker: false,
  });
  const [startupTimedOut, setStartupTimedOut] = useState(false);

  const hasCompletedOnboarding = Boolean(runtimeProfile && runtimePlanSnapshot);

  const demoPlanSnapshot = useMemo(() => {
    if (!catalogState.ready || catalogState.error) {
      return null;
    }

    return generateInitialPlanSnapshot(DEMO_PROFILE, {
      now: new Date(),
      catalog: catalogState.catalog,
      catalogVersion: catalogState.catalogVersion,
    });
  }, [catalogState.catalog, catalogState.catalogVersion, catalogState.error, catalogState.ready]);

  useEffect(() => {
    replaceViewInUrl(activeView);
  }, [activeView]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStartupTimedOut(true);
    }, 15000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!startupTimedOut) {
      return;
    }

    if (!livePlansEnabled && !catalogState.ready) {
      setCatalogState((previous) => ({
        ...previous,
        ready: true,
        error: 'Startup timed out while loading hosted preventive catalog.',
      }));
    }

    if (livePlansEnabled && !liveState.ready) {
      setLiveState((previous) => ({
        ...previous,
        ready: true,
        error: 'Startup timed out while loading live profiles/plans.',
      }));
    }
  }, [catalogState.ready, livePlansEnabled, liveState.ready, startupTimedOut]);

  useEffect(() => {
    let cancelled = false;

    if (livePlansEnabled) {
      return () => {
        cancelled = true;
      };
    }

    if (!catalogEnabled) {
      setCatalogState({
        ready: true,
        error: 'Hosted preventive catalog is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        catalog: [],
        catalogVersion: '',
      });
      return () => {
        cancelled = true;
      };
    }

    async function hydrateCatalog() {
      try {
        const { catalog, catalogVersion } = await withTimeout(
          loadPreventiveCatalogFromSupabase(),
          12000,
          'Timed out while loading hosted preventive catalog.',
        );
        if (cancelled) return;

        setRuntimeCatalog(catalog, catalogVersion);
        setCatalogState({
          ready: true,
          error: '',
          catalog,
          catalogVersion,
        });
      } catch (error) {
        if (cancelled) return;

        console.warn('Failed to load hosted preventive catalog from Supabase.', error);
        setCatalogState({
          ready: true,
          error: 'We could not load the hosted catalog right now. Please try again.',
          catalog: [],
          catalogVersion: '',
        });
      }
    }

    hydrateCatalog();

    return () => {
      cancelled = true;
    };
  }, [catalogEnabled]);

  useEffect(() => {
    let cancelled = false;

    if (!livePlansEnabled) {
      return () => {
        cancelled = true;
      };
    }

    async function hydrateLiveState() {
      try {
        await withTimeout(
          ensureLivePlansSession(),
          12000,
          'Timed out while establishing user session.',
        );
        const loaded = await withTimeout(
          loadLiveProfilesAndPlans(),
          12000,
          'Timed out while loading user profiles and plans.',
        );
        if (cancelled) return;

        const nextLiveState = {
          ready: true,
          error: '',
          authRequired: false,
          authMode: 'sign_in',
          authPending: false,
          signOutPending: false,
          authError: '',
          authInfo: '',
          userId: loaded.userId,
          profiles: loaded.profiles,
          plansByProfileId: loaded.plansByProfileId,
          activeProfileId: loaded.activeProfileId,
          enrolling: false,
          enrollmentError: '',
        };

        setLiveState(nextLiveState);
        setProfileAreaSeed(toProfileAreaSeedFromLiveData(nextLiveState));

        const activeProfile = resolveActiveProfileFromCollection(loaded.profiles, loaded.activeProfileId);
        const activePlan = activeProfile
          ? loaded.plansByProfileId[String(activeProfile.profileId)] ?? null
          : null;

        setRuntimeProfile(activeProfile);
        setRuntimePlanSnapshot(activePlan);
      } catch (error) {
        if (cancelled) return;

        if (isNotAuthenticatedError(error)) {
          setLiveState((previous) => ({
            ...previous,
            ready: true,
            error: '',
            authRequired: true,
            authPending: false,
            signOutPending: false,
            authError: '',
            userId: null,
            profiles: [],
            plansByProfileId: {},
            activeProfileId: null,
            enrolling: false,
            enrollmentError: '',
          }));
          return;
        }

        console.warn('Failed to hydrate live profile/plan state from Supabase.', error);
        setLiveState((previous) => ({
          ...previous,
          ready: true,
          authRequired: false,
          authPending: false,
          signOutPending: false,
          error: 'We could not load user profiles right now. Please try again.',
        }));
      }
    }

    hydrateLiveState();

    return () => {
      cancelled = true;
    };
  }, [livePlansEnabled, liveReloadToken]);

  const ensureCatalogReady = async () => {
    if (hasLoadedCatalog(catalogState)) {
      return {
        catalog: catalogState.catalog,
        catalogVersion: catalogState.catalogVersion,
      };
    }

    if (!catalogEnabled) {
      throw new Error('Hosted preventive catalog is not configured.');
    }

    const { catalog, catalogVersion } = await withTimeout(
      loadPreventiveCatalogFromSupabase(),
      12000,
      'Timed out while loading hosted preventive catalog.',
    );

    setRuntimeCatalog(catalog, catalogVersion);
    setCatalogState({
      ready: true,
      error: '',
      catalog,
      catalogVersion,
    });

    return { catalog, catalogVersion };
  };

  useEffect(() => {
    let cancelled = false;

    if (livePlansEnabled) {
      setPersistenceReady(true);
      return () => {
        cancelled = true;
      };
    }

    if (!persistenceEnabled) {
      setPersistenceReady(true);
      return () => {
        cancelled = true;
      };
    }

    async function hydrateFromSupabase() {
      try {
        const persisted = await loadAppRuntimeState();
        if (cancelled || !persisted || typeof persisted !== 'object') {
          return;
        }

        if (persisted.runtimeProfile && typeof persisted.runtimeProfile === 'object') {
          setRuntimeProfile(persisted.runtimeProfile);
        }

        if (persisted.runtimePlanSnapshot && typeof persisted.runtimePlanSnapshot === 'object') {
          setRuntimePlanSnapshot(persisted.runtimePlanSnapshot);
        }

        setProfileAreaSeed(normalizeSeedFromPersistence(persisted.profileAreaSeed));
      } catch (error) {
        console.warn('Failed to load runtime state from Supabase.', error);
      } finally {
        if (!cancelled) {
          hasHydratedPersistenceRef.current = true;
          setPersistenceReady(true);
        }
      }
    }

    hydrateFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [livePlansEnabled, persistenceEnabled]);

  useEffect(() => {
    if (livePlansEnabled) {
      return undefined;
    }

    if (!persistenceEnabled || !persistenceReady || !hasHydratedPersistenceRef.current) {
      return undefined;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveAppRuntimeState({
        schemaVersion: APP_RUNTIME_STATE_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        runtimeProfile,
        runtimePlanSnapshot,
        profileAreaSeed: normalizeSeedFromPersistence(profileAreaSeed),
      }).catch((error) => {
        console.warn('Failed to save runtime state to Supabase.', error);
      });
    }, 250);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [livePlansEnabled, persistenceEnabled, persistenceReady, profileAreaSeed, runtimePlanSnapshot, runtimeProfile]);

  useEffect(() => {
    if (!hasCompletedOnboarding && activeView !== 'onboarding') {
      setActiveView('onboarding');
    }
  }, [activeView, hasCompletedOnboarding]);

  useEffect(() => {
    if (activeView !== 'onboarding' || dashboardReturnScrollY === null) {
      return;
    }

    const scrollY = Math.max(0, Number(dashboardReturnScrollY) || 0);
    const restoreScroll = () => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
      }
    };

    restoreScroll();
    requestAnimationFrame(restoreScroll);
    setTimeout(restoreScroll, 0);
    setDashboardReturnScrollY(null);
  }, [activeView, dashboardReturnScrollY]);

  const syncProfileAreaSeedFromRuntime = (profile, planSnapshot) => {
    if (!profile?.profileId) {
      return;
    }

    const normalizedProfile = {
      profileId: String(profile.profileId),
      displayLabel: profile.name || profile.displayLabel || 'Profile',
      name: profile.name || profile.displayLabel || 'Profile',
      age: profile.age,
      gender: profile.gender,
      createdAt: profile.createdAt,
    };

    setProfileAreaSeed((previous) => {
      const existingProfiles = Array.isArray(previous.profiles) ? previous.profiles : [];
      const profileExists = existingProfiles.some((item) => String(item.profileId) === normalizedProfile.profileId);
      const nextProfiles = profileExists
        ? existingProfiles.map((item) => (
          String(item.profileId) === normalizedProfile.profileId ? { ...item, ...normalizedProfile } : item
        ))
        : [...existingProfiles, normalizedProfile];

      const nextPlansByProfileId = {
        ...(previous.plansByProfileId || {}),
      };

      if (planSnapshot?.profileId && Array.isArray(planSnapshot.items)) {
        nextPlansByProfileId[String(planSnapshot.profileId)] = planSnapshot;
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
    if (initialOrigin === DETAIL_ORIGIN.dashboard && typeof window !== 'undefined') {
      setDashboardReturnScrollY(window.scrollY || window.pageYOffset || 0);
    } else {
      setDashboardReturnScrollY(null);
    }

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
    if (!nextPlanSnapshot) {
      return;
    }

    setRuntimePlanSnapshot(nextPlanSnapshot);

    if (runtimeProfile?.profileId) {
      syncProfileAreaSeedFromRuntime(runtimeProfile, nextPlanSnapshot);
    }

    if (livePlansEnabled && runtimeProfile?.profileId) {
      const activeProfileId = runtimeProfile.profileId;

      saveLivePlanForProfile(activeProfileId, nextPlanSnapshot)
        .then((metadata) => {
          if (!metadata || typeof metadata !== 'object') {
            return;
          }

          setRuntimePlanSnapshot((previous) => {
            if (!previous || String(previous.profileId) !== String(activeProfileId)) {
              return previous;
            }

            return applyLivePlanPersistenceMetadata(previous, metadata);
          });

          setProfileAreaSeed((previous) => {
            const existingPlan = previous?.plansByProfileId?.[String(activeProfileId)];
            if (!existingPlan) {
              return previous;
            }

            return {
              ...previous,
              plansByProfileId: {
                ...(previous.plansByProfileId || {}),
                [String(activeProfileId)]: applyLivePlanPersistenceMetadata(existingPlan, metadata),
              },
            };
          });
        })
        .catch((error) => {
          console.warn('Failed to persist live plan changes.', error);
          if (isLivePlanConflictError(error)) {
            setLiveState((previous) => ({
              ...previous,
              enrollmentError: 'Your plan changed in another session. We reloaded the latest version.',
            }));
            setLiveReloadToken((previous) => previous + 1);
          }
        });
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
    if (profile) setRuntimeProfile(profile);
    if (planSnapshot) setRuntimePlanSnapshot(planSnapshot);
    if (profile) syncProfileAreaSeedFromRuntime(profile, planSnapshot);
  };

  const handleLiveEnrollment = async (payload, options = {}) => {
    if (!livePlansEnabled) {
      return;
    }

    setLiveState((previous) => ({
      ...previous,
      enrolling: true,
      enrollmentError: '',
    }));

    try {
      const resolvedCatalog = await ensureCatalogReady();

      await createLiveEnrollmentAndPlan(payload, {
        catalog: resolvedCatalog.catalog,
        catalogVersion: resolvedCatalog.catalogVersion,
        requireAdult: options.requireAdult !== false,
      });

      const loaded = await loadLiveProfilesAndPlans();
      const nextLiveState = {
        ready: true,
        error: '',
        authRequired: false,
        authMode: 'sign_in',
        authPending: false,
        signOutPending: false,
        authError: '',
        authInfo: '',
        userId: loaded.userId,
        profiles: loaded.profiles,
        plansByProfileId: loaded.plansByProfileId,
        activeProfileId: loaded.activeProfileId,
        enrolling: false,
        enrollmentError: '',
      };

      setLiveState(nextLiveState);
      setProfileAreaSeed(toProfileAreaSeedFromLiveData(nextLiveState));

      const activeProfile = resolveActiveProfileFromCollection(loaded.profiles, loaded.activeProfileId);
      const activePlan = activeProfile
        ? loaded.plansByProfileId[String(activeProfile.profileId)] ?? null
        : null;

      setRuntimeProfile(activeProfile);
      setRuntimePlanSnapshot(activePlan);
      setActiveView('onboarding');
    } catch (error) {
      const message = resolveErrorMessage(
        error,
        'We could not enroll this user right now. Please try again.',
      );

      setLiveState((previous) => ({
        ...previous,
        enrolling: false,
        enrollmentError: message,
      }));
    }
  };

  const handleAuthSignIn = async ({ email, password }) => {
    setLiveState((previous) => ({
      ...previous,
      authPending: true,
      authError: '',
      authInfo: '',
    }));

    try {
      await signInLiveUserWithPassword({ email, password });
      setLiveState((previous) => ({
        ...previous,
        ready: false,
        authRequired: false,
        authPending: false,
        signOutPending: false,
        authError: '',
        authInfo: '',
        error: '',
      }));
      setLiveReloadToken((previous) => previous + 1);
    } catch (error) {
      const message = resolveErrorMessage(
        error,
        'Could not sign in right now. Please try again.',
      );
      setLiveState((previous) => ({
        ...previous,
        authPending: false,
        signOutPending: false,
        authError: message,
      }));
    }
  };

  const handleAuthSignUp = async ({ email, password }) => {
    setLiveState((previous) => ({
      ...previous,
      authPending: true,
      authError: '',
      authInfo: '',
    }));

    try {
      const result = await signUpLiveUserWithPassword({ email, password });
      const hasSession = Boolean(result?.session);

      if (hasSession) {
        setLiveState((previous) => ({
          ...previous,
          ready: false,
          authRequired: false,
          authPending: false,
          signOutPending: false,
          authError: '',
          authInfo: '',
          error: '',
        }));
        setLiveReloadToken((previous) => previous + 1);
        return;
      }

      setLiveState((previous) => ({
        ...previous,
        authPending: false,
        signOutPending: false,
        authError: '',
        authInfo: 'Account created. Confirm your email, then sign in.',
        authMode: 'sign_in',
      }));
    } catch (error) {
      const message = resolveErrorMessage(
        error,
        'Could not create account right now. Please try again.',
      );
      setLiveState((previous) => ({
        ...previous,
        authPending: false,
        signOutPending: false,
        authError: message,
      }));
    }
  };

  const handleSwitchAuthMode = () => {
    setLiveState((previous) => ({
      ...previous,
      authMode: previous.authMode === 'sign_up' ? 'sign_in' : 'sign_up',
      authError: '',
      authInfo: '',
    }));
  };

  const handleLiveSignOut = async () => {
    if (!livePlansEnabled) {
      return;
    }

    setLiveState((previous) => ({
      ...previous,
      signOutPending: true,
    }));

    try {
      await signOutLiveUser();
      setRuntimeProfile(null);
      setRuntimePlanSnapshot(null);
      setProfileAreaSeed({ ...PROFILE_AREA_SEED_DEFAULT });
      setActiveView('onboarding');
      setLiveState((previous) => ({
        ...previous,
        ready: true,
        error: '',
        authRequired: true,
        authMode: 'sign_in',
        authPending: false,
        signOutPending: false,
        authError: '',
        authInfo: '',
        userId: null,
        profiles: [],
        plansByProfileId: {},
        activeProfileId: null,
        enrolling: false,
        enrollmentError: '',
      }));
    } catch (error) {
      console.warn('Failed to sign out live user.', error);
      setLiveState((previous) => ({
        ...previous,
        signOutPending: false,
      }));
    }
  };

  const handleLiveProfileSwitch = (profileId) => {
    const normalized = String(profileId ?? '').trim();
    if (!normalized) return;

    setLiveState((previous) => {
      const activeProfile = resolveActiveProfileFromCollection(previous.profiles, normalized);
      const activePlan = activeProfile
        ? previous.plansByProfileId[String(activeProfile.profileId)] ?? null
        : null;

      if (activeProfile) {
        setRuntimeProfile(activeProfile);
      }
      if (activePlan) {
        setRuntimePlanSnapshot(activePlan);
      }

      return {
        ...previous,
        activeProfileId: normalized,
      };
    });

    setLiveActiveProfile(normalized).catch((error) => {
      console.warn('Failed to persist active profile preference.', error);
    });
  };

  const handleProfileNavigate = (target = {}) => {
    const targetProfileId = target?.profile?.profileId;
    const seededPlanSnapshot = targetProfileId
      ? profileAreaSeed.plansByProfileId?.[targetProfileId]
      : null;
    const targetPlanSnapshot = target?.planSnapshot || seededPlanSnapshot || null;

    if (target?.profile) setRuntimeProfile(target.profile);
    if (targetPlanSnapshot) setRuntimePlanSnapshot(targetPlanSnapshot);
    if (target?.profile) syncProfileAreaSeedFromRuntime(target.profile, targetPlanSnapshot);

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

    const seededActiveProfileId = hasPersistedProfiles
      ? profileAreaSeed.activeProfileId
      : runtimeProfile?.profileId ?? null;

    return createProfileAreaAndHouseholdPreferencesSession({
      ...options,
      initialProfiles: seededProfiles,
      initialActiveProfileId: seededActiveProfileId,
      initialPlansByProfileId: seededPlanByProfileId,
      initialManualEntriesByProfileId: {},
      initialReminderSettings: profileAreaSeed.reminderSettings ?? undefined,
    });
  };

  const handleProfileSessionStateChange = (sessionState = {}) => {
    const profiles = Array.isArray(sessionState.profiles) ? sessionState.profiles : [];
    const plansByProfileId = sessionState.plansByProfileId && typeof sessionState.plansByProfileId === 'object'
      ? sessionState.plansByProfileId
      : {};

    setProfileAreaSeed({
      profiles,
      plansByProfileId,
      manualEntriesByProfileId: {},
      reminderSettings: sessionState.reminderSettings ?? null,
      activeProfileId: sessionState.activeProfileId ?? null,
    });

    const activeProfile = profiles.find((profile) => String(profile.profileId) === String(sessionState.activeProfileId)) ?? null;
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

  const handlePrimaryNavNavigate = (nextView) => {
    setDashboardReturnScrollY(null);
    setActiveView(nextView);
    if (typeof window !== 'undefined') {
      const resetToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      };
      resetToTop();
      requestAnimationFrame(resetToTop);
    }
  };

  if ((!livePlansEnabled && !catalogState.ready) || (livePlansEnabled && !liveState.ready)) {
    return (
      <>
        <PrimaryNav
          activeView={activeView}
          onNavigate={handlePrimaryNavNavigate}
          navLocked
          showActiveSelection={false}
        />
        <main className="sl001-shell">
          <p>{livePlansEnabled ? 'Loading your account...' : 'Loading hosted preventive catalog...'}</p>
        </main>
      </>
    );
  }

  if (!livePlansEnabled && catalogState.error) {
    return (
      <>
        <PrimaryNav
          activeView={activeView}
          onNavigate={handlePrimaryNavNavigate}
          navLocked
          showActiveSelection={false}
        />
        <main className="sl001-shell">
          <p role="alert">{catalogState.error}</p>
        </main>
      </>
    );
  }

  if (livePlansEnabled && liveState.error) {
    return (
      <>
        <PrimaryNav
          activeView={activeView}
          onNavigate={handlePrimaryNavNavigate}
          navLocked
          showActiveSelection={false}
        />
        <main className="sl001-shell">
          <p role="alert">{liveState.error}</p>
        </main>
      </>
    );
  }

  if (livePlansEnabled && liveState.authRequired) {
    return (
      <>
        <PrimaryNav
          activeView={activeView}
          onNavigate={handlePrimaryNavNavigate}
          navLocked
          showActiveSelection={false}
        />
        <EmailPasswordAuth
          mode={liveState.authMode}
          pending={liveState.authPending}
          errorMessage={liveState.authError}
          infoMessage={liveState.authInfo}
          onSignIn={handleAuthSignIn}
          onSignUp={handleAuthSignUp}
          onSwitchMode={handleSwitchAuthMode}
        />
      </>
    );
  }

  const showEnrollment = livePlansEnabled && !hasCompletedOnboarding;

  let activeSurface = (
    <SelfOnboardingToFirstDashboardRoute
      initialProfile={runtimeProfile}
      initialPlanSnapshot={runtimePlanSnapshot}
      planGenerator={(profile, options = {}) => generateInitialPlanSnapshot(profile, {
        ...options,
        catalog: catalogState.catalog,
        catalogVersion: catalogState.catalogVersion,
      })}
      onOpenHealthPlan={openHealthPlan}
      onOpenVaccinations={openVaccinations}
      onOnboardingCompleted={handleSelfOnboardingCompleted}
    />
  );

  if (showEnrollment) {
    activeSurface = (
      <LiveEnrollment
        onSubmit={(payload) => handleLiveEnrollment(payload, { requireAdult: true })}
        pending={liveState.enrolling}
        errorMessage={liveState.enrollmentError}
        submitLabel="Create my plan"
        heading="Tell us about yourself"
        description=""
        hideIntroCard
        requireAdult
      />
    );
  }

  if (!showEnrollment) {
    if (activeView === 'profile') {
      activeSurface = livePlansEnabled
        ? (
          <LiveEnrollment
            onSubmit={(payload) => handleLiveEnrollment(payload, { requireAdult: false })}
            pending={liveState.enrolling}
            errorMessage={liveState.enrollmentError}
            submitLabel="Add family member"
            heading="Add family member"
            description="Create a profile you own and generate a dedicated persisted plan."
            ctaLabel="Sign out"
            ctaPending={liveState.signOutPending}
            onCtaClick={handleLiveSignOut}
            ctaPlacement="bottom"
            requireAdult={false}
          />
        )
        : (
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
  }

  const navProfiles = livePlansEnabled
    ? liveState.profiles
    : (profileAreaSeed.profiles ?? []);
  const navActiveProfileId = livePlansEnabled
    ? liveState.activeProfileId
    : profileAreaSeed.activeProfileId;

  return (
    <>
      <PrimaryNav
        activeView={activeView}
        onNavigate={handlePrimaryNavNavigate}
        navLocked={!hasCompletedOnboarding && !livePlansEnabled}
        showActiveSelection={hasCompletedOnboarding || livePlansEnabled}
        profiles={navProfiles}
        activeProfileId={navActiveProfileId}
        onProfileChange={livePlansEnabled ? handleLiveProfileSwitch : undefined}
      />
      {activeSurface}
    </>
  );
}
