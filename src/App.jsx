import React, { useEffect, useState } from 'react';
import ItemCompletionAndReminderActionsRoute from './routes/item-completion-and-reminder-actions.jsx';
import PlanTimelineRoute from './routes/plan-timeline.jsx';
import SelfOnboardingToFirstDashboardRoute from './routes/self-onboarding-to-first-dashboard.jsx';
import LiveEnrollment from './features/live-enrollment/LiveEnrollment.jsx';
import RiskProfileStep from './features/live-enrollment/RiskProfileStep.jsx';
import StatusQuoStep from './features/live-enrollment/StatusQuoStep.jsx';
import { buildStatusQuoGroups } from './features/live-enrollment/statusQuo.js';
import EmailPasswordAuth from './features/auth/EmailPasswordAuth.jsx';
import { DETAIL_ORIGIN, PLAN_CATEGORIES } from './features/health-plan-browsing-and-item-detail/model.js';
import { generateInitialPlanSnapshot } from './features/self-onboarding-to-first-dashboard/plan.js';
import {
  createLiveEnrollmentAndPlan,
  ensureLivePlansSession,
  isLivePlanConflictError,
  isSupabaseLivePlansConfigured,
  loadLiveProfilesAndPlans,
  signOutLiveUser,
  deleteOwnLiveAccount,
  signInLiveUserWithPassword,
  signUpLiveUserWithPassword,
  saveLivePlanForProfile,
  setLiveActiveProfile,
  setLiveUserLocale,
  setRiskProfileReviewCadence,
  updateHealthProfile,
  updateHealthProfileRiskFlags,
  listAppointmentsForProfile,
  createAppointment,
  linkAppointmentToPlanItem,
} from './lib/persistence/supabaseLivePlans.js';
import { addCustomItemToSnapshot, markItemDoneInSnapshot } from './features/item-completion-and-reminder-actions/actions.js';
import {
  isSupabaseCatalogConfigured,
  loadPreventiveCatalogFromSupabase,
} from './lib/catalog/supabasePreventiveCatalog.js';
import {
  setRuntimeCatalog,
} from './lib/catalog/runtimeCatalog.js';
import PrimaryNav from './components/PrimaryNav.jsx';
import ComingSoonSurface from './components/ComingSoonSurface.jsx';
import LandingSplash from './components/LandingSplash.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import ProfileOverviewScreen from './components/ProfileOverviewScreen.jsx';
import ProfileSheet from './components/ProfileSheet.jsx';
import { AppShell } from './features/self-onboarding-to-first-dashboard/components.jsx';
import { Card } from './design-system/components/index.js';
import { useTranslation } from './lib/i18n/index.js';
import './primary-nav.css';

function normalizeView(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'start' || normalized === 'onboarding' || normalized === 'dashboard') return 'start';
  if (normalized === 'vaccinations' || normalized === 'impfen') return 'checkups';
  if (normalized === 'checkups' || normalized === 'vorsorge' || normalized === 'plan' || normalized === 'actions') return 'checkups';
  if (normalized === 'termine' || normalized === 'appointments') return 'timeline';
  if (normalized === 'safe' || normalized === 'documents' || normalized === 'dokumentensafe') return 'safe';
  if (normalized === 'timeline') return 'timeline';
  if (normalized === 'settings') return 'settings';
  if (normalized === 'your-profile' || normalized === 'profile-overview') return 'your-profile';
  if (normalized === 'profile' || normalized === 'profiles' || normalized === 'preferences') return 'profile';
  return 'start';
}

function currentViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeView(params.get('view'));
}

function replaceViewInUrl(view) {
  const url = new URL(window.location.href);
  if (view === 'start') url.searchParams.delete('view');
  else url.searchParams.set('view', view);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(null, '', next);
  }
}

function resolveActiveProfileFromCollection(profiles, activeProfileId) {
  return profiles.find((profile) => String(profile.profileId) === String(activeProfileId)) ?? null;
}

function sameStringSet(a, b) {
  const setA = new Set(Array.isArray(a) ? a : []);
  const setB = new Set(Array.isArray(b) ? b : []);
  if (setA.size !== setB.size) return false;
  for (const value of setA) {
    if (!setB.has(value)) return false;
  }
  return true;
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
    Array.isArray(catalogState?.catalog)
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
  const { locale, t, setLocale } = useTranslation();
  const catalogEnabled = isSupabaseCatalogConfigured();
  const livePlansEnabled = isSupabaseLivePlansConfigured();

  const [activeView, setActiveView] = useState(() => currentViewFromUrl());
  const [dashboardReturnScrollY, setDashboardReturnScrollY] = useState(null);
  const [runtimeProfile, setRuntimeProfile] = useState(null);
  const [runtimePlanSnapshot, setRuntimePlanSnapshot] = useState(null);

  const [catalogState, setCatalogState] = useState({
    catalog: [],
    catalogVersion: '',
  });
  const [catalogGeneration, setCatalogGeneration] = useState(0);

  const [liveState, setLiveState] = useState({
    ready: !livePlansEnabled,
    error: '',
    authRequired: false,
    authMode: 'sign_in',
    authPending: false,
    signOutPending: false,
    deleteAccountPending: false,
    deleteAccountError: '',
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
  const [showLandingSplash, setShowLandingSplash] = useState(true);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [profileOverviewOrigin, setProfileOverviewOrigin] = useState('start');
  const [showRiskProfileStep, setShowRiskProfileStep] = useState(false);
  const [riskProfilePending, setRiskProfilePending] = useState(false);
  const [riskProfileError, setRiskProfileError] = useState('');
  // True only while the risk-profile step is running as part of first-time
  // signup -- distinguishes that from a later "review risk factors" visit
  // from the dashboard/profile screen, which should never chain into the
  // status-quo step again.
  const [riskProfileIsOnboarding, setRiskProfileIsOnboarding] = useState(false);
  const [showStatusQuoStep, setShowStatusQuoStep] = useState(false);
  const [statusQuoPending, setStatusQuoPending] = useState(false);
  const [statusQuoError, setStatusQuoError] = useState('');
  const [profileDetailsPending, setProfileDetailsPending] = useState(false);
  const [profileDetailsError, setProfileDetailsError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [appointmentsPending, setAppointmentsPending] = useState(false);
  const [appointmentSaveError, setAppointmentSaveError] = useState('');

  const hasCompletedOnboarding = Boolean(runtimeProfile && runtimePlanSnapshot);

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

    if (!liveState.ready) {
      setLiveState((previous) => ({
        ...previous,
        ready: true,
        error: t('appError.startupTimedOut'),
      }));
    }
  }, [liveState.ready, startupTimedOut, t]);

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
          t('appError.sessionTimedOut'),
        );
        const loaded = await withTimeout(
          loadLiveProfilesAndPlans(),
          12000,
          t('appError.profilesTimedOut'),
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

        const activeProfile = resolveActiveProfileFromCollection(loaded.profiles, loaded.activeProfileId);
        const activePlan = activeProfile
          ? loaded.plansByProfileId[String(activeProfile.profileId)] ?? null
          : null;

        setRuntimeProfile(activeProfile);
        setRuntimePlanSnapshot(activePlan);

        // Apply this account's saved language preference on every fresh
        // login/device -- but only when one is actually saved. A brand-new
        // signup has no app_user_preferences.locale row yet, so this must
        // never clobber whatever the user just picked on the landing page.
        if (loaded.locale && loaded.locale !== locale) {
          setLocale(loaded.locale);
        }
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
          error: t('appError.loadProfilesFailed'),
        }));
      }
    }

    hydrateLiveState();

    return () => {
      cancelled = true;
    };
  }, [livePlansEnabled, liveReloadToken, t]);

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
      loadPreventiveCatalogFromSupabase({ locale }),
      12000,
      t('appError.catalogTimedOut'),
    );

    setRuntimeCatalog(catalog, catalogVersion);
    setCatalogState({
      catalog,
      catalogVersion,
    });
    setCatalogGeneration((previous) => previous + 1);

    return { catalog, catalogVersion };
  };

  // Reloads the catalog under the active locale whenever it changes, so
  // already-generated plans (whose display copy was snapshotted at
  // generation time) pick up translated catalog content live via the
  // runtime-catalog overlay, not just newly-generated plans.
  useEffect(() => {
    if (!catalogEnabled) {
      return;
    }

    let cancelled = false;

    async function reloadCatalogForLocale() {
      try {
        const { catalog, catalogVersion } = await loadPreventiveCatalogFromSupabase({ locale });
        if (cancelled) return;

        setRuntimeCatalog(catalog, catalogVersion);
        setCatalogState({ catalog, catalogVersion });
        setCatalogGeneration((previous) => previous + 1);
      } catch (error) {
        console.warn('Failed to reload preventive catalog for locale change.', error);
      }
    }

    reloadCatalogForLocale();

    return () => {
      cancelled = true;
    };
  }, [catalogEnabled, locale]);

  useEffect(() => {
    if (!hasCompletedOnboarding && activeView !== 'start') {
      setActiveView('start');
    }
  }, [activeView, hasCompletedOnboarding]);

  useEffect(() => {
    if (!livePlansEnabled || !runtimeProfile?.profileId) {
      setAppointments([]);
      return;
    }

    let cancelled = false;
    setAppointmentsPending(true);

    listAppointmentsForProfile(runtimeProfile.profileId)
      .then((loaded) => {
        if (!cancelled) {
          setAppointments(loaded);
        }
      })
      .catch((error) => {
        console.warn('Failed to load appointments.', error);
      })
      .finally(() => {
        if (!cancelled) {
          setAppointmentsPending(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [livePlansEnabled, runtimeProfile?.profileId]);

  const handleCreateAppointment = async (input) => {
    if (!runtimeProfile?.profileId) {
      return false;
    }

    setAppointmentSaveError('');

    try {
      const created = await createAppointment(runtimeProfile.profileId, input);
      setAppointments((previous) => [...previous, created].sort(
        (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
      ));
      return true;
    } catch (error) {
      setAppointmentSaveError(resolveErrorMessage(error, t('appError.appointmentSaveFailed')));
      return false;
    }
  };

  const handleConvertAppointment = async (appointment, input) => {
    if (!runtimeProfile?.profileId || !runtimePlanSnapshot) {
      return false;
    }

    setAppointmentSaveError('');

    try {
      const result = addCustomItemToSnapshot(runtimePlanSnapshot, runtimeProfile.profileId, input);
      await saveLivePlanForProfile(runtimeProfile.profileId, result.planSnapshot);
      setRuntimePlanSnapshot(result.planSnapshot);

      const planItemId = await linkAppointmentToPlanItem(
        runtimeProfile.profileId,
        appointment.id,
        result.item.catalogItemId,
      );

      setAppointments((previous) => previous.map((existing) => (
        existing.id === appointment.id
          ? { ...existing, planItemId, catalogItemId: result.item.catalogItemId }
          : existing
      )));

      return true;
    } catch (error) {
      setAppointmentSaveError(resolveErrorMessage(error, t('appError.appointmentSaveFailed')));
      return false;
    }
  };

  useEffect(() => {
    if (activeView !== 'start' || dashboardReturnScrollY === null) {
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

    setRuntimePlanEntry({
      initialItemKey,
      initialOrigin,
      initialCategory,
      initialReturnToVaccinationTracker: false,
    });
    setActiveView('checkups');
  };

  const handlePlanNavigate = (target) => {
    if (target?.destination === DETAIL_ORIGIN.dashboard) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('start');
      return;
    }

    if (target?.destination === DETAIL_ORIGIN.timeline) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('timeline');
      return;
    }

    if (target?.destination === DETAIL_ORIGIN.vaccinations) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.vaccination,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('checkups');
      return;
    }

    if (target?.destination === DETAIL_ORIGIN.checkups || target?.destination === DETAIL_ORIGIN.counseling) {
      setRuntimePlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
      setActiveView('checkups');
    }
  };

  const handlePlanSnapshotChange = (nextPlanSnapshot) => {
    if (!nextPlanSnapshot) {
      return;
    }

    setRuntimePlanSnapshot(nextPlanSnapshot);

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

    setRuntimePlanEntry({
      initialItemKey: undefined,
      initialOrigin: undefined,
      initialCategory: PLAN_CATEGORIES.vaccination,
      initialReturnToVaccinationTracker: false,
    });
    setActiveView('checkups');
  };

  const openTimelineItem = (item) => {
    if (!item?.itemKey) return;

    const category = item.category === PLAN_CATEGORIES.vaccination
      ? PLAN_CATEGORIES.vaccination
      : PLAN_CATEGORIES.checkup;

    setRuntimePlanEntry({
      initialItemKey: item.itemKey,
      initialOrigin: DETAIL_ORIGIN.timeline,
      initialCategory: category,
      initialReturnToVaccinationTracker: false,
    });
    setActiveView('checkups');
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

      const activeProfile = resolveActiveProfileFromCollection(loaded.profiles, loaded.activeProfileId);
      const activePlan = activeProfile
        ? loaded.plansByProfileId[String(activeProfile.profileId)] ?? null
        : null;

      setRuntimeProfile(activeProfile);
      setRuntimePlanSnapshot(activePlan);
      setActiveView('start');
      // Every newly created profile goes through this, not just the primary
      // signup -- a managed family member's plan deserves the same
      // personalization as the account holder's own, not a raw age/gender
      // default.
      setRiskProfileIsOnboarding(true);
      setShowRiskProfileStep(true);
    } catch (error) {
      const message = resolveErrorMessage(
        error,
        t('appError.enrollFailed'),
      );

      setLiveState((previous) => ({
        ...previous,
        enrolling: false,
        enrollmentError: message,
      }));
    }
  };

  const handleSaveRiskProfile = async (riskFlags, extra = {}) => {
    if (!runtimeProfile?.profileId) {
      setShowRiskProfileStep(false);
      return;
    }

    setRiskProfilePending(true);
    setRiskProfileError('');

    try {
      const saved = await updateHealthProfileRiskFlags(runtimeProfile.profileId, riskFlags, {
        pregnancyDueDate: extra.pregnancyDueDate ?? null,
        reviewedKeys: extra.reviewedKeys ?? [],
      });
      const updatedProfile = {
        ...runtimeProfile,
        riskFlags: saved.riskFlags,
        riskProfileReviewedKeys: saved.riskProfileReviewedKeys,
        riskProfileReviewedAt: saved.riskProfileReviewedAt,
        pregnancyDueDate: saved.pregnancyDueDate,
      };
      const resolvedCatalog = await ensureCatalogReady();
      const regeneratedPlan = generateInitialPlanSnapshot(updatedProfile, {
        catalog: resolvedCatalog.catalog,
        catalogVersion: resolvedCatalog.catalogVersion,
      });

      setRuntimeProfile(updatedProfile);
      handlePlanSnapshotChange(regeneratedPlan);
      setShowRiskProfileStep(false);
      if (riskProfileIsOnboarding) {
        setRiskProfileIsOnboarding(false);
        if (buildStatusQuoGroups(regeneratedPlan).length > 0) {
          setShowStatusQuoStep(true);
        }
      }
    } catch (error) {
      setRiskProfileError(resolveErrorMessage(
        error,
        t('appError.riskProfileSaveFailed'),
      ));
    } finally {
      setRiskProfilePending(false);
    }
  };

  // Background persistence for every Back/Continue/Später step in the risk-
  // profile wizard (plus a short debounce while lingering on one step), so
  // progress survives even if the user never reaches the final "Speichern".
  // Deliberately silent: no pending/error UI, and it never touches
  // showRiskProfileStep or the onboarding chain -- those stay under
  // handleSaveRiskProfile/handleSkipRiskProfile's control.
  const handleAutosaveRiskProfile = async (riskFlags, extra = {}) => {
    if (!runtimeProfile?.profileId) {
      return;
    }

    try {
      // Back/Continue/Später flush this even when the visible answers
      // haven't actually changed since the last save (e.g. just paging
      // through an already-reviewed profile) -- only re-stamp the review
      // timestamp when something genuinely did change, so idly opening and
      // leaving the wizard can't silently reset the cadence clock.
      const hasActuallyChanged = !sameStringSet(riskFlags, runtimeProfile.riskFlags)
        || !sameStringSet(extra.reviewedKeys, runtimeProfile.riskProfileReviewedKeys);

      const saved = await updateHealthProfileRiskFlags(runtimeProfile.profileId, riskFlags, {
        pregnancyDueDate: extra.pregnancyDueDate ?? null,
        reviewedKeys: extra.reviewedKeys ?? [],
        stampReviewedAt: hasActuallyChanged,
      });
      const updatedProfile = {
        ...runtimeProfile,
        riskFlags: saved.riskFlags,
        riskProfileReviewedKeys: saved.riskProfileReviewedKeys,
        riskProfileReviewedAt: saved.riskProfileReviewedAt ?? runtimeProfile.riskProfileReviewedAt,
        pregnancyDueDate: saved.pregnancyDueDate,
      };
      const resolvedCatalog = await ensureCatalogReady();
      const regeneratedPlan = generateInitialPlanSnapshot(updatedProfile, {
        catalog: resolvedCatalog.catalog,
        catalogVersion: resolvedCatalog.catalogVersion,
      });

      setRuntimeProfile(updatedProfile);
      handlePlanSnapshotChange(regeneratedPlan);
    } catch (error) {
      console.warn('Failed to autosave risk profile progress.', error);
    }
  };

  const handleSkipRiskProfile = () => {
    setShowRiskProfileStep(false);
    if (riskProfileIsOnboarding) {
      setRiskProfileIsOnboarding(false);
      if (buildStatusQuoGroups(runtimePlanSnapshot).length > 0) {
        setShowStatusQuoStep(true);
      }
    }
  };

  const handleSaveStatusQuo = async (completions) => {
    if (!runtimeProfile?.profileId || !runtimePlanSnapshot) {
      setShowStatusQuoStep(false);
      return;
    }

    if (!Array.isArray(completions) || completions.length === 0) {
      setShowStatusQuoStep(false);
      return;
    }

    setStatusQuoPending(true);
    setStatusQuoError('');

    try {
      let updatedSnapshot = runtimePlanSnapshot;
      for (const completion of completions) {
        const result = markItemDoneInSnapshot(updatedSnapshot, runtimeProfile.profileId, completion.itemKey, {
          customDate: completion.date,
        });
        updatedSnapshot = result.planSnapshot;
      }

      handlePlanSnapshotChange(updatedSnapshot);
      setShowStatusQuoStep(false);
    } catch (error) {
      setStatusQuoError(resolveErrorMessage(
        error,
        t('appError.statusQuoSaveFailed'),
      ));
    } finally {
      setStatusQuoPending(false);
    }
  };

  const handleSkipStatusQuo = () => {
    setShowStatusQuoStep(false);
  };

  // Background persistence for every Back/Continue/Später step in the
  // status-quo wizard, mirroring handleAutosaveRiskProfile: silent (no
  // pending/error UI), and it never touches showStatusQuoStep -- that stays
  // under handleSaveStatusQuo/handleSkipStatusQuo's control. Each "yes"
  // answer is a real mark-done action, so this reuses the exact same
  // markItemDoneInSnapshot loop handleSaveStatusQuo runs at the end, just
  // applied as the user goes instead of only once at the finish line.
  const handleAutosaveStatusQuo = async (completions) => {
    if (!runtimeProfile?.profileId || !runtimePlanSnapshot) {
      return;
    }
    if (!Array.isArray(completions) || completions.length === 0) {
      return;
    }

    try {
      let updatedSnapshot = runtimePlanSnapshot;
      for (const completion of completions) {
        const result = markItemDoneInSnapshot(updatedSnapshot, runtimeProfile.profileId, completion.itemKey, {
          customDate: completion.date,
        });
        updatedSnapshot = result.planSnapshot;
      }

      handlePlanSnapshotChange(updatedSnapshot);
    } catch (error) {
      console.warn('Failed to autosave status quo progress.', error);
    }
  };

  const handleSaveProfileDetails = async (updates) => {
    if (!runtimeProfile?.profileId) {
      return false;
    }

    setProfileDetailsPending(true);
    setProfileDetailsError('');

    try {
      const updatedProfile = await updateHealthProfile(runtimeProfile.profileId, updates);
      const mergedProfile = { ...runtimeProfile, ...updatedProfile, riskFlags: runtimeProfile.riskFlags };

      const affectsPlanGeneration = updates.birthdate !== undefined || updates.gender !== undefined;
      if (affectsPlanGeneration) {
        const resolvedCatalog = await ensureCatalogReady();
        const regeneratedPlan = generateInitialPlanSnapshot(mergedProfile, {
          catalog: resolvedCatalog.catalog,
          catalogVersion: resolvedCatalog.catalogVersion,
        });
        handlePlanSnapshotChange(regeneratedPlan);
      }

      setRuntimeProfile(mergedProfile);
      setLiveState((previous) => ({
        ...previous,
        profiles: previous.profiles.map((profile) => (
          String(profile.profileId) === String(mergedProfile.profileId) ? mergedProfile : profile
        )),
      }));

      return true;
    } catch (error) {
      setProfileDetailsError(resolveErrorMessage(
        error,
        t('appError.profileDetailsSaveFailed'),
      ));
      return false;
    } finally {
      setProfileDetailsPending(false);
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
        t('appError.signInFailed'),
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
        // Persist whatever language is active right now (i.e. whatever the
        // user picked on the landing page before signing up) so it's still
        // their language on the next login, from any device.
        setLiveUserLocale(locale).catch((error) => {
          console.warn('Failed to persist account language preference.', error);
        });

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
        authInfo: t('appError.accountCreatedConfirmEmail'),
        authMode: 'sign_in',
      }));
    } catch (error) {
      const message = resolveErrorMessage(
        error,
        t('appError.signUpFailed'),
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
      setActiveView('start');
      setShowLandingSplash(true);
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

  const handleDeleteAccount = async () => {
    if (!livePlansEnabled) {
      return;
    }

    setLiveState((previous) => ({
      ...previous,
      deleteAccountPending: true,
      deleteAccountError: '',
    }));

    try {
      await deleteOwnLiveAccount();
      setRuntimeProfile(null);
      setRuntimePlanSnapshot(null);
      setActiveView('start');
      setShowLandingSplash(true);
      setLiveState((previous) => ({
        ...previous,
        ready: true,
        error: '',
        authRequired: true,
        authMode: 'sign_in',
        authPending: false,
        signOutPending: false,
        deleteAccountPending: false,
        deleteAccountError: '',
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
      const message = resolveErrorMessage(error, t('appError.deleteAccountFailed'));
      setLiveState((previous) => ({
        ...previous,
        deleteAccountPending: false,
        deleteAccountError: message,
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

  const handleSetLocale = (nextLocale) => {
    setLocale(nextLocale);

    if (livePlansEnabled && liveState.userId) {
      setLiveUserLocale(nextLocale).catch((error) => {
        console.warn('Failed to persist account language preference.', error);
      });
    }
  };

  const handleSetRiskReviewCadence = (cadenceMonths) => {
    if (!runtimeProfile?.profileId) {
      return;
    }

    const updatedProfile = { ...runtimeProfile, riskProfileReviewCadenceMonths: cadenceMonths };
    setRuntimeProfile(updatedProfile);
    setLiveState((previous) => ({
      ...previous,
      profiles: previous.profiles.map((profile) => (
        String(profile.profileId) === String(updatedProfile.profileId) ? updatedProfile : profile
      )),
    }));

    setRiskProfileReviewCadence(runtimeProfile.profileId, cadenceMonths).catch((error) => {
      console.warn('Failed to persist risk profile review cadence.', error);
    });
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

  if (!livePlansEnabled) {
    return (
      <>
        <PrimaryNav
          activeView={activeView}
          onNavigate={handlePrimaryNavNavigate}
          navLocked
          showActiveSelection={false}
        />
        <AppShell title={null}>
          <Card padding={20} style={{ textAlign: 'center', marginTop: 24 }}>
            <p role="alert" style={{ margin: 0, color: 'var(--status-overdue)', fontWeight: 600 }}>
              {t('appError.supabaseNotConfigured')}
            </p>
          </Card>
        </AppShell>
      </>
    );
  }

  if (!liveState.ready) {
    return (
      <>
        <PrimaryNav
          activeView={activeView}
          onNavigate={handlePrimaryNavNavigate}
          navLocked
          showActiveSelection={false}
        />
        <AppShell title={null}>
          <Card padding={20} style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('appError.loadingAccount')}</p>
          </Card>
        </AppShell>
      </>
    );
  }

  if (liveState.error) {
    return (
      <>
        <PrimaryNav
          activeView={activeView}
          onNavigate={handlePrimaryNavNavigate}
          navLocked
          showActiveSelection={false}
        />
        <AppShell title={null}>
          <Card padding={20} style={{ textAlign: 'center', marginTop: 24 }}>
            <p role="alert" style={{ margin: 0, color: 'var(--status-overdue)', fontWeight: 600 }}>
              {liveState.error}
            </p>
          </Card>
        </AppShell>
      </>
    );
  }

  if (liveState.authRequired) {
    return (
      <>
        {showLandingSplash ? null : (
          <PrimaryNav
            activeView={activeView}
            onNavigate={handlePrimaryNavNavigate}
            navLocked
            showActiveSelection={false}
          />
        )}
        {showLandingSplash ? (
          <LandingSplash onGetStarted={() => setShowLandingSplash(false)} />
        ) : (
          <EmailPasswordAuth
            mode={liveState.authMode}
            pending={liveState.authPending}
            errorMessage={liveState.authError}
            infoMessage={liveState.authInfo}
            onSignIn={handleAuthSignIn}
            onSignUp={handleAuthSignUp}
            onSwitchMode={handleSwitchAuthMode}
            onBack={() => setShowLandingSplash(true)}
          />
        )}
      </>
    );
  }

  const showEnrollment = !hasCompletedOnboarding;

  let activeSurface = (
    <SelfOnboardingToFirstDashboardRoute
      initialProfile={runtimeProfile}
      initialPlanSnapshot={runtimePlanSnapshot}
      onOpenHealthPlan={openHealthPlan}
      onOpenVaccinations={openVaccinations}
      onOpenSettings={() => handlePrimaryNavNavigate('settings')}
      onOpenProfile={() => setShowProfileSheet(true)}
      onOpenRiskProfile={() => { setRiskProfileIsOnboarding(false); setShowRiskProfileStep(true); }}
      onOpenTimeline={() => handlePrimaryNavNavigate('timeline')}
      catalogGeneration={catalogGeneration}
    />
  );

  if (showEnrollment) {
    activeSurface = (
      <LiveEnrollment
        onSubmit={(payload) => handleLiveEnrollment(payload, { requireAdult: true })}
        pending={liveState.enrolling}
        errorMessage={liveState.enrollmentError}
        requireAdult
      />
    );
  }

  if (!showEnrollment) {
    if (activeView === 'profile') {
      activeSurface = (
        <LiveEnrollment
          onSubmit={(payload) => handleLiveEnrollment(payload, { requireAdult: false })}
          pending={liveState.enrolling}
          errorMessage={liveState.enrollmentError}
          submitLabel={t('enrollment.submitAddFamilyMember')}
          heading={t('enrollment.headingAddFamilyMember')}
          description={t('enrollment.descriptionAddFamilyMember')}
          ctaLabel={t('enrollment.signOut')}
          ctaPending={liveState.signOutPending}
          onCtaClick={handleLiveSignOut}
          requireAdult={false}
        />
      );
    } else if (activeView === 'checkups') {
      activeSurface = (
        <ItemCompletionAndReminderActionsRoute
          key="checkups"
          profile={runtimeProfile}
          initialPlanSnapshot={runtimePlanSnapshot}
          initialItemKey={runtimePlanEntry.initialItemKey}
          initialOrigin={runtimePlanEntry.initialOrigin}
          initialCategory={runtimePlanEntry.initialCategory ?? null}
          visibleCategories={[PLAN_CATEGORIES.checkup, PLAN_CATEGORIES.vaccination, PLAN_CATEGORIES.counseling]}
          initialReturnToVaccinationTracker={runtimePlanEntry.initialReturnToVaccinationTracker}
          onNavigate={handlePlanNavigate}
          onPlanSnapshotChange={handlePlanSnapshotChange}
          catalogGeneration={catalogGeneration}
        />
      );
    } else if (activeView === 'timeline') {
      activeSurface = (
        <PlanTimelineRoute
          profile={runtimeProfile}
          planSnapshot={runtimePlanSnapshot}
          onOpenItem={openTimelineItem}
          catalogGeneration={catalogGeneration}
          appointments={appointments}
          appointmentsPending={appointmentsPending}
          onCreateAppointment={handleCreateAppointment}
          onConvertAppointment={handleConvertAppointment}
          appointmentSaveError={appointmentSaveError}
        />
      );
    } else if (activeView === 'settings') {
      activeSurface = (
        <SettingsScreen
          profile={runtimeProfile}
          locale={locale}
          onSetLocale={handleSetLocale}
          riskReviewCadenceMonths={runtimeProfile?.riskProfileReviewCadenceMonths ?? 12}
          onSetRiskReviewCadence={handleSetRiskReviewCadence}
          onOpenProfiles={() => setShowProfileSheet(true)}
          onOpenProfileOverview={() => {
            setProfileOverviewOrigin('settings');
            handlePrimaryNavNavigate('your-profile');
          }}
          onSaveAccountDetails={handleSaveProfileDetails}
          accountDetailsPending={profileDetailsPending}
          accountDetailsError={profileDetailsError}
          onSignOut={handleLiveSignOut}
          onBack={() => handlePrimaryNavNavigate('start')}
          signOutPending={liveState.signOutPending}
          onDeleteAccount={handleDeleteAccount}
          deleteAccountPending={liveState.deleteAccountPending}
          deleteAccountError={liveState.deleteAccountError}
        />
      );
    } else if (activeView === 'your-profile') {
      activeSurface = (
        <ProfileOverviewScreen
          profile={runtimeProfile}
          planSnapshot={runtimePlanSnapshot}
          onBack={() => handlePrimaryNavNavigate(profileOverviewOrigin)}
          onSaveProfileDetails={handleSaveProfileDetails}
          profileDetailsPending={profileDetailsPending}
          profileDetailsError={profileDetailsError}
          onReviewRiskProfile={() => { setRiskProfileIsOnboarding(false); setShowRiskProfileStep(true); }}
          onReviewStatusQuo={() => setShowStatusQuoStep(true)}
        />
      );
    } else if (activeView === 'safe') {
      activeSurface = <ComingSoonSurface />;
    }
  }

  if (!showEnrollment && showRiskProfileStep) {
    activeSurface = (
      <RiskProfileStep
        initialRiskFlags={runtimeProfile?.riskFlags ?? []}
        initialReviewedKeys={runtimeProfile?.riskProfileReviewedKeys ?? []}
        initialPregnancyDueDate={runtimeProfile?.pregnancyDueDate ?? ''}
        onSave={handleSaveRiskProfile}
        onAutosave={handleAutosaveRiskProfile}
        onSkip={handleSkipRiskProfile}
        pending={riskProfilePending}
        errorMessage={riskProfileError}
      />
    );
  }

  if (!showEnrollment && showStatusQuoStep) {
    activeSurface = (
      <StatusQuoStep
        planSnapshot={runtimePlanSnapshot}
        onSave={handleSaveStatusQuo}
        onAutosave={handleAutosaveStatusQuo}
        onSkip={handleSkipStatusQuo}
        pending={statusQuoPending}
        errorMessage={statusQuoError}
      />
    );
  }

  return (
    <>
      <PrimaryNav
        activeView={activeView}
        onNavigate={handlePrimaryNavNavigate}
        navLocked={false}
        showActiveSelection
      />
      {activeSurface}
      <ProfileSheet
        open={showProfileSheet}
        profiles={liveState.profiles}
        activeProfileId={liveState.activeProfileId}
        onClose={() => setShowProfileSheet(false)}
        onPick={(profileId) => {
          handleLiveProfileSwitch(profileId);
          setShowProfileSheet(false);
        }}
        onAddProfile={() => {
          setShowProfileSheet(false);
          handlePrimaryNavNavigate('profile');
        }}
      />
    </>
  );
}
