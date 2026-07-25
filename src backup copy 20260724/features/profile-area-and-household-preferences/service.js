import {
  buildDashboardProjectionForSlice,
} from '../item-completion-and-reminder-actions/selectors.js';
import {
  generateInitialPlanSnapshot,
} from '../self-onboarding-to-first-dashboard/plan.js';
import {
  PROFILE_AREA_ALLOWED_DESTINATIONS,
  PROFILE_AREA_ALLOWED_PROFILE_ACTIONS,
  PROFILE_AREA_ALLOWED_REMINDER_DEFAULT_TIMINGS,
  PROFILE_AREA_ERRORS,
  PROFILE_AREA_PROFILE_LIMIT,
  canCreateAnotherProfile,
  formatProfileDescriptor,
  hasPlanInputChanges,
  validateProfileBasicsInput,
  validateReminderSettingsInput,
  DEFAULT_PROFILE_AREA_REMINDER_SETTINGS,
} from './model.js';

export const PROFILE_AREA_SURFACES = Object.freeze({
  household: 'household',
  create: 'create',
  detail: 'detail',
  preferences: 'preferences',
  destination: 'destination',
});

function resolveNow(now) {
  const value = typeof now === 'function' ? now() : now;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function cloneReminder(reminder) {
  if (!reminder || typeof reminder !== 'object') {
    return undefined;
  }

  return {
    timingType: reminder.timingType,
    scheduledFor: reminder.scheduledFor,
    createdAt: reminder.createdAt,
  };
}

function clonePlanSnapshot(planSnapshot) {
  if (!planSnapshot || typeof planSnapshot !== 'object') {
    return null;
  }

  return {
    ...planSnapshot,
    items: Array.isArray(planSnapshot.items)
      ? planSnapshot.items.map((item) => ({
        ...item,
        reminder: cloneReminder(item.reminder),
      }))
      : [],
  };
}

function rebindGeneratedPlanState(previousSnapshot, regeneratedSnapshot) {
  const previousItems = Array.isArray(previousSnapshot?.items) ? previousSnapshot.items : [];
  const previousByItemId = previousItems.reduce((index, item) => {
    if (!item?.catalogItemId) {
      return index;
    }

    index[item.catalogItemId] = item;
    return index;
  }, {});

  const reboundItems = regeneratedSnapshot.items.map((item) => {
    const previous = previousByItemId[item.catalogItemId];
    if (!previous) {
      return item;
    }

    if (previous.status === 'done') {
      return {
        ...item,
        status: 'done',
        reminder: undefined,
      };
    }

    if (previous.status === 'planned' || previous.reminder) {
      return {
        ...item,
        status: 'pending',
        reminder: cloneReminder(previous.reminder),
      };
    }

    return item;
  });

  return {
    ...regeneratedSnapshot,
    items: reboundItems,
  };
}

function createProfileIdFactory() {
  return (name) => {
    const slug = String(name ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'profile';

    const suffix = `${Math.floor(Math.random() * 100000)}`.padStart(5, '0');
    return `profile-${slug}-${suffix}`;
  };
}

function assertDestination(destination) {
  if (!PROFILE_AREA_ALLOWED_DESTINATIONS.includes(destination)) {
    throw new Error(PROFILE_AREA_ERRORS.invalidDestination);
  }
}

function formatHealthScoreLabel(score) {
  if (score === null || score === undefined) {
    return 'N/A';
  }

  return Number.isFinite(Number(score)) ? `${Math.round(Number(score))}%` : 'N/A';
}

export function createProfileAreaAndHouseholdPreferencesSession(options = {}) {
  const now = options.now ?? (() => new Date());
  const planGenerator = typeof options.planGenerator === 'function'
    ? options.planGenerator
    : (profile, generatorOptions = {}) => generateInitialPlanSnapshot(profile, generatorOptions);
  const profileIdFactory = typeof options.profileIdFactory === 'function'
    ? options.profileIdFactory
    : createProfileIdFactory();

  let profiles = [];
  let plansByProfileId = {};
  let manualEntriesByProfileId = {};
  const reminderValidation = validateReminderSettingsInput({
    remindersEnabled: options.initialReminderSettings?.remindersEnabled,
    defaultTiming: options.initialReminderSettings?.defaultTiming,
  });
  let reminderSettings = reminderValidation.isValid
    ? {
      remindersEnabled: reminderValidation.normalized.remindersEnabled,
      defaultTiming: reminderValidation.normalized.defaultTiming,
    }
    : {
      ...DEFAULT_PROFILE_AREA_REMINDER_SETTINGS,
    };
  let activeProfileId = null;
  let currentSurface = PROFILE_AREA_SURFACES.household;
  let destinationContext = null;

  if (Array.isArray(options.initialProfiles) && options.initialProfiles.length > 0) {
    profiles = options.initialProfiles.map((profile) => ({
      ...profile,
      displayLabel: profile.displayLabel || profile.name || 'Profile',
      name: profile.name || profile.displayLabel || 'Profile',
    }));

    activeProfileId = options.initialActiveProfileId ?? profiles[0].profileId;

    const inputPlansByProfileId = options.initialPlansByProfileId && typeof options.initialPlansByProfileId === 'object'
      ? options.initialPlansByProfileId
      : {};
    plansByProfileId = profiles.reduce((index, profile) => {
      const snapshot = inputPlansByProfileId[profile.profileId];
      if (snapshot && snapshot.profileId === profile.profileId && Array.isArray(snapshot.items)) {
        index[profile.profileId] = clonePlanSnapshot(snapshot);
      }
      return index;
    }, {});

    const inputManualEntriesByProfileId = options.initialManualEntriesByProfileId && typeof options.initialManualEntriesByProfileId === 'object'
      ? options.initialManualEntriesByProfileId
      : {};
    manualEntriesByProfileId = profiles.reduce((index, profile) => {
      const entries = inputManualEntriesByProfileId[profile.profileId];
      index[profile.profileId] = Array.isArray(entries) ? [...entries] : [];
      return index;
    }, {});
  }

  async function generatePlanForProfile(profile, previousSnapshot = null) {
    let generated;

    try {
      generated = await Promise.resolve(planGenerator(profile, { now: resolveNow(now) }));
    } catch {
      throw new Error(PROFILE_AREA_ERRORS.planRegenerationFailed);
    }

    if (!generated || generated.profileId !== profile.profileId || !Array.isArray(generated.items)) {
      throw new Error(PROFILE_AREA_ERRORS.planRegenerationFailed);
    }

    return rebindGeneratedPlanState(previousSnapshot, generated);
  }

  function findProfile(profileId) {
    return profiles.find((profile) => profile.profileId === profileId) ?? null;
  }

  function assertProfile(profileId) {
    const profile = findProfile(profileId);
    if (!profile) {
      throw new Error(PROFILE_AREA_ERRORS.profileNotFound);
    }

    return profile;
  }

  function withDashboardSummary(profile, planSnapshot) {
    const projection = buildDashboardProjectionForSlice(planSnapshot, {
      name: profile.displayLabel,
    });

    const dueToday = Number(projection.dueTodayCount ?? 0);
    const soonCount = Array.isArray(projection.sections)
      ? (projection.sections.find((section) => section.priority === 'soon')?.items ?? []).filter((item) => item.status !== 'done').length
      : 0;

    return {
      profileId: profile.profileId,
      displayLabel: profile.displayLabel,
      age: profile.age,
      gender: profile.gender,
      descriptor: formatProfileDescriptor(profile),
      healthScore: projection.healthScore,
      healthScoreLabel: formatHealthScoreLabel(projection.healthScore),
      dueTodayCount: dueToday,
      dueSummary: dueToday > 0 ? `${dueToday} due today` : 'No items due today',
      soonSummary: soonCount > 0 ? `${soonCount} coming up soon` : 'No soon items',
      highlightedItemName: projection.highlightedItem?.name ?? 'No next step available',
      destinations: PROFILE_AREA_ALLOWED_DESTINATIONS.map((destination) => ({
        destination,
        profileId: profile.profileId,
        label: destination === 'dashboard'
          ? 'Dashboard'
          : destination === 'plan'
            ? 'Plan'
            : 'Vaccinations',
      })),
    };
  }

  return {
    getState() {
      return {
        profiles: profiles.map((profile) => ({ ...profile })),
        plansByProfileId: Object.keys(plansByProfileId).reduce((index, profileId) => {
          index[profileId] = clonePlanSnapshot(plansByProfileId[profileId]);
          return index;
        }, {}),
        manualEntriesByProfileId: Object.keys(manualEntriesByProfileId).reduce((index, profileId) => {
          index[profileId] = [...manualEntriesByProfileId[profileId]];
          return index;
        }, {}),
        reminderSettings: { ...reminderSettings },
        activeProfileId,
        currentSurface,
        destinationContext: destinationContext ? { ...destinationContext } : null,
      };
    },

    getProfile(profileId) {
      return assertProfile(profileId);
    },

    getPlanSnapshot(profileId) {
      const targetId = profileId ?? activeProfileId;
      assertProfile(targetId);
      return clonePlanSnapshot(plansByProfileId[targetId]);
    },

    setPlanSnapshot(profileId, nextPlanSnapshot) {
      assertProfile(profileId);

      if (!nextPlanSnapshot || nextPlanSnapshot.profileId !== profileId || !Array.isArray(nextPlanSnapshot.items)) {
        throw new Error(PROFILE_AREA_ERRORS.planRegenerationFailed);
      }

      plansByProfileId = {
        ...plansByProfileId,
        [profileId]: clonePlanSnapshot(nextPlanSnapshot),
      };

      return this.getPlanSnapshot(profileId);
    },

    getManualEntries(profileId) {
      const targetId = profileId ?? activeProfileId;
      assertProfile(targetId);
      return [...(manualEntriesByProfileId[targetId] ?? [])];
    },

    setManualEntries(profileId, entries) {
      assertProfile(profileId);
      manualEntriesByProfileId = {
        ...manualEntriesByProfileId,
        [profileId]: Array.isArray(entries) ? [...entries] : [],
      };

      return this.getManualEntries(profileId);
    },

    async createProfile(input, optionsForProfile = {}) {
      if (!canCreateAnotherProfile(profiles, PROFILE_AREA_PROFILE_LIMIT)) {
        throw new Error(PROFILE_AREA_ERRORS.profileLimitReached);
      }

      const validation = validateProfileBasicsInput(input);
      if (!validation.isValid) {
        return validation;
      }

      const nowDate = resolveNow(now);
      const profileId = String(optionsForProfile.profileId ?? profileIdFactory(validation.normalized.displayLabel));
      if (findProfile(profileId)) {
        throw new Error(PROFILE_AREA_ERRORS.profileCreateFailed);
      }

      const profile = {
        profileId,
        displayLabel: validation.normalized.displayLabel,
        name: validation.normalized.displayLabel,
        age: validation.normalized.age,
        gender: validation.normalized.gender,
        createdAt: nowDate.toISOString(),
      };

      let plan;
      try {
        plan = await generatePlanForProfile(profile);
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw error;
        }

        throw new Error(PROFILE_AREA_ERRORS.profileCreateFailed);
      }

      profiles = [...profiles, profile];
      plansByProfileId = {
        ...plansByProfileId,
        [profile.profileId]: plan,
      };
      manualEntriesByProfileId = {
        ...manualEntriesByProfileId,
        [profile.profileId]: manualEntriesByProfileId[profile.profileId] ?? [],
      };

      activeProfileId = profile.profileId;
      currentSurface = PROFILE_AREA_SURFACES.household;

      return {
        isValid: true,
        errors: {},
        profile,
        plan,
      };
    },

    async updateProfileBasics(profileId, input) {
      const currentProfile = assertProfile(profileId);

      const validation = validateProfileBasicsInput(input);
      if (!validation.isValid) {
        return validation;
      }

      const candidateProfile = {
        ...currentProfile,
        displayLabel: validation.normalized.displayLabel,
        name: validation.normalized.displayLabel,
        age: validation.normalized.age,
        gender: validation.normalized.gender,
      };

      const shouldRegeneratePlan = hasPlanInputChanges(currentProfile, validation.normalized);
      const previousSnapshot = plansByProfileId[profileId] ?? null;
      let nextSnapshot = previousSnapshot;

      if (shouldRegeneratePlan) {
        nextSnapshot = await generatePlanForProfile(candidateProfile, previousSnapshot);
      }

      profiles = profiles.map((profile) => (
        profile.profileId === profileId ? candidateProfile : profile
      ));

      if (nextSnapshot) {
        plansByProfileId = {
          ...plansByProfileId,
          [profileId]: nextSnapshot,
        };
      }

      activeProfileId = profileId;
      currentSurface = PROFILE_AREA_SURFACES.detail;

      const dashboardProjection = nextSnapshot
        ? buildDashboardProjectionForSlice(nextSnapshot, { name: candidateProfile.displayLabel })
        : null;

      return {
        isValid: true,
        errors: {},
        profile: candidateProfile,
        planSnapshot: clonePlanSnapshot(nextSnapshot),
        planRegenerated: shouldRegeneratePlan,
        dashboardProjection,
      };
    },

    openHousehold() {
      currentSurface = PROFILE_AREA_SURFACES.household;
      destinationContext = null;
      return currentSurface;
    },

    openCreateProfile() {
      currentSurface = PROFILE_AREA_SURFACES.create;
      destinationContext = null;
      return currentSurface;
    },

    selectActiveProfile(profileId) {
      const profile = assertProfile(profileId);
      activeProfileId = profileId;
      destinationContext = null;
      return { ...profile };
    },

    openProfileDetail(profileId) {
      assertProfile(profileId);
      activeProfileId = profileId;
      currentSurface = PROFILE_AREA_SURFACES.detail;
      destinationContext = null;
      return currentSurface;
    },

    openPreferences() {
      currentSurface = PROFILE_AREA_SURFACES.preferences;
      destinationContext = null;
      return currentSurface;
    },

    openProfileDestination(profileId, destination) {
      assertProfile(profileId);
      assertDestination(destination);

      activeProfileId = profileId;
      currentSurface = PROFILE_AREA_SURFACES.destination;
      destinationContext = {
        profileId,
        destination,
      };

      return {
        profileId,
        destination,
      };
    },

    getHouseholdOverview() {
      return profiles.map((profile) => {
        const snapshot = plansByProfileId[profile.profileId];
        if (!snapshot) {
          return {
            profileId: profile.profileId,
            displayLabel: profile.displayLabel,
            age: profile.age,
            gender: profile.gender,
            descriptor: formatProfileDescriptor(profile),
            healthScore: null,
            healthScoreLabel: 'N/A',
            dueTodayCount: 0,
            dueSummary: 'No items due today',
            soonSummary: 'No soon items',
            highlightedItemName: 'No next step available',
            destinations: PROFILE_AREA_ALLOWED_DESTINATIONS.map((destination) => ({
              destination,
              profileId: profile.profileId,
              label: destination === 'dashboard'
                ? 'Dashboard'
                : destination === 'plan'
                  ? 'Plan'
                  : 'Vaccinations',
            })),
          };
        }

        return withDashboardSummary(profile, snapshot);
      });
    },

    getActiveProfileSummary() {
      if (!activeProfileId) {
        return null;
      }

      const profile = assertProfile(activeProfileId);
      const snapshot = plansByProfileId[profile.profileId] ?? null;
      if (!snapshot) {
        return null;
      }

      return withDashboardSummary(profile, snapshot);
    },

    getPreferencesViewModel() {
      const sectionIds = ['reminder_settings'];
      return {
        sectionIds,
        sections: [
          {
            id: 'reminder_settings',
            heading: 'Reminder settings',
            description: 'Choose how reminders are handled for this household.',
            settings: {
              remindersEnabled: reminderSettings.remindersEnabled,
              defaultTiming: reminderSettings.defaultTiming,
              allowedDefaultTimings: [...PROFILE_AREA_ALLOWED_REMINDER_DEFAULT_TIMINGS],
            },
          },
        ],
      };
    },

    updateReminderSettings(input) {
      const validation = validateReminderSettingsInput(input);
      if (!validation.isValid) {
        return validation;
      }

      reminderSettings = {
        remindersEnabled: validation.normalized.remindersEnabled,
        defaultTiming: validation.normalized.defaultTiming,
      };

      return {
        isValid: true,
        errors: {},
        reminderSettings: { ...reminderSettings },
      };
    },

    getProfileManagementCapabilities() {
      return {
        profileActions: [...PROFILE_AREA_ALLOWED_PROFILE_ACTIONS],
        destinations: [...PROFILE_AREA_ALLOWED_DESTINATIONS],
      };
    },
  };
}
