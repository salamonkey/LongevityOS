import {
  EFFORT_LEVELS,
  MVP_CATALOG_VERSION,
  MVP_PREVENTIVE_CATALOG,
  getInterventionTypeLabel,
  resolveInterventionTypeForCatalogItem,
} from './catalog.js';
import {
  resolveBucketFromDueDate,
  resolveRecurrenceDays,
  resolveSoonWindowDaysFromRecurrence,
} from './dashboard.js';

const ALLOWED_CATEGORIES = new Set(['checkup', 'vaccination']);
const ALLOWED_RULE_GENDERS = new Set(['female', 'male']);
const EFFORT_SORT_RANKS = Object.freeze({
  [EFFORT_LEVELS.low]: 0,
  [EFFORT_LEVELS.medium]: 1,
  [EFFORT_LEVELS.high]: 2,
});

function normalizeProfileForRules(profile = {}) {
  const ageNumber = Number(profile.age);
  const normalizedAge = Number.isFinite(ageNumber) ? Math.floor(ageNumber) : NaN;
  const normalizedGender = String(profile.gender ?? profile.sex ?? '')
    .trim()
    .toLowerCase();

  return {
    ...profile,
    age: normalizedAge,
    gender: normalizedGender,
  };
}

function findMatchingRuleBand(ruleBands, profile) {
  return ruleBands.find((band) => (
    band.gender === profile.gender
    && profile.age >= band.minAge
    && profile.age <= band.maxAge
  ));
}

function normalizeProfileRiskFlags(profile = {}) {
  const flags = new Set();

  if (Array.isArray(profile.riskFlags)) {
    for (const value of profile.riskFlags) {
      const normalized = String(value ?? '').trim().toLowerCase();
      if (normalized) {
        flags.add(normalized);
      }
    }
  }

  const riskFactors = profile.riskFactors;
  if (riskFactors && typeof riskFactors === 'object') {
    for (const [key, value] of Object.entries(riskFactors)) {
      if (!value) continue;
      const normalized = String(key ?? '').trim().toLowerCase();
      if (normalized) {
        flags.add(normalized);
      }
    }
  }

  return flags;
}

function hasRequiredRiskFlags(catalogItem, profileRiskFlags) {
  const required = Array.isArray(catalogItem?.requiredRiskFlags)
    ? catalogItem.requiredRiskFlags
    : [];
  if (required.length === 0) {
    return true;
  }

  return required.every((flag) => profileRiskFlags.has(String(flag ?? '').trim().toLowerCase()));
}

function normalizeEffortLevel(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === EFFORT_LEVELS.low || normalized === EFFORT_LEVELS.medium || normalized === EFFORT_LEVELS.high) {
    return normalized;
  }

  return EFFORT_LEVELS.medium;
}

function resolveEffortSortRank(item) {
  const effort = normalizeEffortLevel(item?.effortLevel);
  return EFFORT_SORT_RANKS[effort] ?? EFFORT_SORT_RANKS[EFFORT_LEVELS.medium];
}

function comparePlanItems(a, b) {
  const bucketOrder = { today: 0, soon: 1, later: 2 };
  const leftBucket = bucketOrder[a.initialBucket] ?? 2;
  const rightBucket = bucketOrder[b.initialBucket] ?? 2;

  if (leftBucket !== rightBucket) {
    return bucketOrder[a.initialBucket] - bucketOrder[b.initialBucket];
  }

  const effortRankLeft = resolveEffortSortRank(a);
  const effortRankRight = resolveEffortSortRank(b);
  if (effortRankLeft !== effortRankRight) {
    return effortRankLeft - effortRankRight;
  }

  if (a.priorityOrder !== b.priorityOrder) {
    return a.priorityOrder - b.priorityOrder;
  }

  return a.targetAge - b.targetAge;
}

function startOfDay(date) {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, deltaDays) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + deltaDays);
  return copy;
}

function resolveInitialDueDate({ profileAge, targetAge, recurrenceDays, now }) {
  const today = startOfDay(now);
  const currentAge = Number(profileAge);
  const target = Number(targetAge);
  const recurrence = Number(recurrenceDays);

  if (!Number.isFinite(currentAge) || !Number.isFinite(target)) {
    return today;
  }

  // At onboarding, avoid treating long-cadence items as immediately due.
  if (currentAge >= target) {
    if (Number.isFinite(recurrence) && recurrence > 365) {
      return addDays(today, recurrence);
    }

    return today;
  }

  const yearsUntilTarget = Math.max(0, target - currentAge);
  return addDays(today, yearsUntilTarget * 365);
}

function resolveInitialStatus({ initialDueDate, recurrenceDays, now }) {
  const bucket = resolveBucketFromDueDate({
    dueDate: initialDueDate,
    recurrenceDays,
    today: now,
  });

  if (bucket === 'today') return 'due';
  if (bucket === 'soon') return 'soon';
  return 'pending';
}

export function generateInitialPlanSnapshot(profile, options = {}) {
  const now = options.now instanceof Date ? new Date(options.now.getTime()) : new Date(options.now ?? Date.now());
  const nowIso = now.toISOString();
  const catalog = options.catalog ?? MVP_PREVENTIVE_CATALOG;
  const catalogVersion = options.catalogVersion ?? MVP_CATALOG_VERSION;
  const normalizedProfile = normalizeProfileForRules(profile);
  const profileRiskFlags = normalizeProfileRiskFlags(profile);

  const items = [];

  if (!Number.isFinite(normalizedProfile.age) || !ALLOWED_RULE_GENDERS.has(normalizedProfile.gender)) {
    return {
      planId: `plan-${profile.profileId}`,
      profileId: profile.profileId,
      catalogVersion,
      generatedAt: nowIso,
      items,
    };
  }

  for (const catalogItem of catalog) {
    if (!hasRequiredRiskFlags(catalogItem, profileRiskFlags)) {
      continue;
    }

    const matchedBand = findMatchingRuleBand(catalogItem.ruleBands, normalizedProfile);

    if (!matchedBand) {
      continue;
    }

    if (!ALLOWED_CATEGORIES.has(catalogItem.category)) {
      throw new Error(`Unsupported category in catalog: ${catalogItem.category}`);
    }

    const interventionType = resolveInterventionTypeForCatalogItem(catalogItem);
    const recurrenceDays = resolveRecurrenceDays(catalogItem);
    const initialDueDate = resolveInitialDueDate({
      profileAge: normalizedProfile.age,
      targetAge: matchedBand.targetAge,
      recurrenceDays,
      now,
    });
    const initialBucket = resolveBucketFromDueDate({
      dueDate: initialDueDate,
      recurrenceDays,
      today: now,
    }) ?? 'later';
    const initialStatus = resolveInitialStatus({
      initialDueDate,
      recurrenceDays,
      now,
    });

    items.push({
      catalogItemId: catalogItem.itemId,
      name: catalogItem.name,
      category: catalogItem.category,
      interventionType,
      interventionTypeLabel: getInterventionTypeLabel(interventionType),
      effortLevel: normalizeEffortLevel(catalogItem.effortLevel),
      cadenceLabel: catalogItem.cadenceLabel,
      recurrence: {
        intervalDays: recurrenceDays,
        soonWindowDays: resolveSoonWindowDaysFromRecurrence(recurrenceDays),
      },
      whyItMatters: catalogItem.whyItMatters,
      targetAge: matchedBand.targetAge,
      priorityOrder: matchedBand.priorityOrder,
      initialDueDate: initialDueDate.toISOString(),
      nextDueDate: initialDueDate.toISOString(),
      initialBucket,
      status: initialStatus,
    });
  }

  items.sort(comparePlanItems);

  return {
    planId: `plan-${profile.profileId}`,
    profileId: profile.profileId,
    catalogVersion,
    generatedAt: nowIso,
    items,
  };
}

export async function generateInitialPlanSnapshotAsync(profile, options = {}) {
  const delayMs = options.delayMs ?? 250;
  const timeoutDelay = Math.max(0, Number(delayMs));

  await new Promise((resolve) => {
    setTimeout(resolve, timeoutDelay);
  });

  return generateInitialPlanSnapshot(profile, options);
}
