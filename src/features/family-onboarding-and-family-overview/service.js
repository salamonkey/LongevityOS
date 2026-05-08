import {
  generateInitialPlanSnapshot,
} from '../self-onboarding-to-first-dashboard/plan.js';
import {
  FAMILY_ACCOUNT_ERRORS,
  FAMILY_PROFILE_LIMIT,
  buildSelfProfileFromOnboarding,
  canCreateAnotherProfile,
  createHealthProfile,
} from './model.js';
import {
  buildFamilyOverview,
} from './projection.js';

export const FAMILY_SURFACES = Object.freeze({
  onboardingSelf: 'onboarding_self',
  onboardingFamily: 'onboarding_family',
  familyOverview: 'family_overview',
  dashboard: 'dashboard',
  plan: 'plan',
  vaccinations: 'vaccinations',
});

function resolveNow(now) {
  const value = typeof now === 'function' ? now() : now;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function assertProfileOwnership(profileId, profiles) {
  const profile = profiles.find((candidate) => candidate.profileId === profileId);
  if (!profile) {
    throw new Error(FAMILY_ACCOUNT_ERRORS.profileNotFound);
  }

  return profile;
}

export function createFamilyAccountSession(options = {}) {
  const now = options.now ?? (() => new Date());
  const planGenerator = typeof options.planGenerator === 'function'
    ? options.planGenerator
    : (profile, generatorOptions = {}) => generateInitialPlanSnapshot(profile, generatorOptions);

  let profiles = [];
  let plansByProfileId = {};
  let manualEntriesByProfileId = {};
  let activeProfileId = null;
  let currentSurface = FAMILY_SURFACES.onboardingSelf;
  let onboardingCompleted = false;

  async function createPlanForProfile(profile) {
    try {
      const generated = await Promise.resolve(planGenerator(profile, { now: resolveNow(now) }));

      if (!generated || generated.profileId !== profile.profileId || !Array.isArray(generated.items)) {
        throw new Error(FAMILY_ACCOUNT_ERRORS.planCreateFailed);
      }

      return generated;
    } catch {
      throw new Error(FAMILY_ACCOUNT_ERRORS.planCreateFailed);
    }
  }

  function assertCanCreateProfile() {
    if (!canCreateAnotherProfile(profiles, FAMILY_PROFILE_LIMIT)) {
      throw new Error(FAMILY_ACCOUNT_ERRORS.profileLimitReached);
    }
  }

  return {
    getState() {
      return {
        profiles: profiles.map((profile) => ({ ...profile })),
        plansByProfileId: { ...plansByProfileId },
        manualEntriesByProfileId: { ...manualEntriesByProfileId },
        activeProfileId,
        currentSurface,
        onboardingCompleted,
      };
    },

    getActiveProfile() {
      return profiles.find((profile) => profile.profileId === activeProfileId) ?? null;
    },

    getFamilyOverview() {
      return buildFamilyOverview(profiles, plansByProfileId);
    },

    getManualEntries(profileId) {
      const targetId = profileId ?? activeProfileId;
      assertProfileOwnership(targetId, profiles);
      return [...(manualEntriesByProfileId[targetId] ?? [])];
    },

    setManualEntries(profileId, entries) {
      assertProfileOwnership(profileId, profiles);
      manualEntriesByProfileId = {
        ...manualEntriesByProfileId,
        [profileId]: Array.isArray(entries) ? [...entries] : [],
      };

      return this.getManualEntries(profileId);
    },

    async createSelfProfile(input) {
      if (profiles.some((profile) => profile.profileId === 'self')) {
        throw new Error(FAMILY_ACCOUNT_ERRORS.profileAlreadyExists);
      }

      const validation = buildSelfProfileFromOnboarding(input, { now: resolveNow(now) });
      if (!validation.isValid) {
        return validation;
      }

      const profile = validation.normalized;
      const plan = await createPlanForProfile(profile);

      profiles = [profile];
      plansByProfileId = { [profile.profileId]: plan };
      manualEntriesByProfileId = { [profile.profileId]: [] };
      activeProfileId = profile.profileId;
      currentSurface = FAMILY_SURFACES.onboardingFamily;

      return {
        isValid: true,
        errors: {},
        profile,
        plan,
      };
    },

    async addFamilyProfile(input, optionsForProfile = {}) {
      assertCanCreateProfile();

      let profile;
      try {
        profile = createHealthProfile(input, {
          now: resolveNow(now),
          profileIdFactory: optionsForProfile.profileIdFactory,
          profileId: optionsForProfile.profileId,
        });
      } catch (error) {
        if (error?.validation) {
          return error.validation;
        }

        throw new Error(FAMILY_ACCOUNT_ERRORS.profileCreateFailed);
      }

      const duplicate = profiles.some((existing) => existing.profileId === profile.profileId);
      if (duplicate) {
        throw new Error(FAMILY_ACCOUNT_ERRORS.profileCreateFailed);
      }

      const plan = await createPlanForProfile(profile);

      profiles = [...profiles, profile];
      plansByProfileId = {
        ...plansByProfileId,
        [profile.profileId]: plan,
      };
      manualEntriesByProfileId = {
        ...manualEntriesByProfileId,
        [profile.profileId]: [],
      };

      return {
        isValid: true,
        errors: {},
        profile,
        plan,
      };
    },

    completeOnboarding() {
      onboardingCompleted = true;

      if (profiles.length > 1) {
        currentSurface = FAMILY_SURFACES.familyOverview;
      } else {
        currentSurface = FAMILY_SURFACES.dashboard;
      }

      activeProfileId = activeProfileId ?? profiles[0]?.profileId ?? null;

      return {
        surface: currentSurface,
        activeProfileId,
      };
    },

    openFamilyOverview() {
      currentSurface = FAMILY_SURFACES.familyOverview;
      return currentSurface;
    },

    openProfileDashboard(profileId) {
      assertProfileOwnership(profileId, profiles);
      activeProfileId = profileId;
      currentSurface = FAMILY_SURFACES.dashboard;
      return currentSurface;
    },

    openProfilePlan(profileId) {
      assertProfileOwnership(profileId, profiles);
      activeProfileId = profileId;
      currentSurface = FAMILY_SURFACES.plan;
      return currentSurface;
    },

    openProfileVaccinations(profileId) {
      assertProfileOwnership(profileId, profiles);
      activeProfileId = profileId;
      currentSurface = FAMILY_SURFACES.vaccinations;
      return currentSurface;
    },

    getPlanSnapshot(profileId) {
      const targetId = profileId ?? activeProfileId;
      assertProfileOwnership(targetId, profiles);
      return plansByProfileId[targetId] ?? null;
    },

    setPlanSnapshot(profileId, nextSnapshot) {
      assertProfileOwnership(profileId, profiles);
      if (!nextSnapshot || nextSnapshot.profileId !== profileId || !Array.isArray(nextSnapshot.items)) {
        throw new Error(FAMILY_ACCOUNT_ERRORS.profileNotFound);
      }

      plansByProfileId = {
        ...plansByProfileId,
        [profileId]: nextSnapshot,
      };

      return nextSnapshot;
    },
  };
}
