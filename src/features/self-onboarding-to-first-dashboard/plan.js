import {
  EFFORT_LEVELS,
  getInterventionTypeLabel,
  resolveInterventionTypeForCatalogItem,
} from './catalog-model.js';
import {
  resolveBucketFromDueDate,
  resolveRecurrenceDays,
  resolveSoonWindowDaysFromRecurrence,
} from './dashboard.js';
import {
  getRuntimeCatalog,
  getRuntimeCatalogVersion,
} from '../../lib/catalog/runtimeCatalog.js';
import { resolveAgeInMonthsFromBirthdate } from '../../lib/age.js';

const ALLOWED_CATEGORIES = new Set(['checkup', 'vaccination', 'counseling']);
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

  const ageMonthsFromBirthdate = profile.birthdate
    ? resolveAgeInMonthsFromBirthdate(profile.birthdate)
    : NaN;
  const normalizedAgeMonths = Number.isFinite(ageMonthsFromBirthdate)
    ? ageMonthsFromBirthdate
    : (Number.isFinite(normalizedAge) ? normalizedAge * 12 : NaN);

  return {
    ...profile,
    age: normalizedAge,
    ageMonths: normalizedAgeMonths,
    gender: normalizedGender,
  };
}

// Returns every band whose gender/age range matches the profile (not just the first),
// pre-sorted by priorityOrder (the catalog fetch layer already sorts ruleBands this
// way) so the caller can pick the first one whose risk flags are also satisfied,
// instead of giving up on the first age/gender match alone. Without this, an item
// with overlapping bands at different risk-flag gates (e.g. chlamydia-gonorrhea-
// screening's unconditional under-25 band vs. its risk-gated adult band, or any of the
// BAG Impfplan vaccination items with many overlapping risk-condition dose bands at
// the same age range) could be dropped entirely just because the *first* matching band
// happened to require a flag the profile doesn't have.
function findMatchingRuleBandCandidates(ruleBands, profile) {
  return ruleBands.filter((band) => (
    band.gender === profile.gender
    && profile.age >= band.minAge
    && profile.age <= band.maxAge
  ));
}

// Same idea as findMatchingRuleBandCandidates, but for vaccine dose bands: matched on
// age-in-months (not whole years) and gender 'both' counts as a match for either sex.
// Returns in-range bands first (so a currently-eligible recommendation always wins),
// followed by the nearest upcoming band(s) as a fallback -- NOT instead of them. A
// full-lifespan risk-condition band (e.g. "any age, if you have condition X") is
// technically "in range" at every age, and would otherwise silently shadow a same-item
// general-population band that only applies later (e.g. an infant dose-1 band starting
// at 2 months): if the profile doesn't have that risk flag, the caller's search for a
// satisfied candidate needs to be able to fall through to the upcoming general band
// instead of finding zero matches.
function findMatchingVaccineDoseCandidates(vaccineDoses, profile) {
  if (!Array.isArray(vaccineDoses)) {
    return [];
  }

  const genderMatches = vaccineDoses.filter((dose) => (
    dose.gender === profile.gender || dose.gender === 'both'
  ));

  const inRange = genderMatches.filter((dose) => (
    profile.ageMonths >= dose.ageMinMonths && profile.ageMonths <= dose.ageMaxMonths
  ));

  const upcoming = genderMatches.filter((dose) => dose.ageMinMonths > profile.ageMonths);
  if (upcoming.length === 0) {
    return inRange;
  }

  const nearestAgeMinMonths = Math.min(...upcoming.map((dose) => dose.ageMinMonths));
  const nearestUpcoming = upcoming.filter((dose) => dose.ageMinMonths === nearestAgeMinMonths);

  return [...inRange, ...nearestUpcoming];
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

function hasRequiredRiskFlags(catalogItem, matchedBand, profileRiskFlags) {
  const bandRequired = Array.isArray(matchedBand?.requiredRiskFlags)
    ? matchedBand.requiredRiskFlags
    : [];
  const required = bandRequired.length > 0
    ? bandRequired
    : (Array.isArray(catalogItem?.requiredRiskFlags) ? catalogItem.requiredRiskFlags : []);

  if (required.length === 0) {
    return true;
  }

  return required.every((flag) => profileRiskFlags.has(String(flag ?? '').trim().toLowerCase()));
}

function resolveEffectiveCadenceForItem(catalogItem, matchedBand) {
  const bandIntervalDays = Number(matchedBand?.recurrenceIntervalDays);

  return {
    cadenceLabel: matchedBand?.cadenceLabel ?? catalogItem?.cadenceLabel,
    recurrence: {
      intervalDays: Number.isFinite(bandIntervalDays) && bandIntervalDays > 0
        ? bandIntervalDays
        : catalogItem?.recurrence?.intervalDays,
    },
  };
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

const AVERAGE_DAYS_PER_MONTH = 30.44;

// Same shape as resolveInitialDueDate, but for vaccine dose bands whose target age is
// in months rather than years (pediatric dosing needs that precision).
function resolveInitialDueDateFromMonths({ profileAgeMonths, targetAgeMonths, recurrenceDays, now }) {
  const today = startOfDay(now);
  const currentAgeMonths = Number(profileAgeMonths);
  const targetMonths = Number(targetAgeMonths);
  const recurrence = Number(recurrenceDays);

  if (!Number.isFinite(currentAgeMonths) || !Number.isFinite(targetMonths)) {
    return today;
  }

  if (currentAgeMonths >= targetMonths) {
    if (Number.isFinite(recurrence) && recurrence > 365) {
      return addDays(today, recurrence);
    }

    return today;
  }

  const monthsUntilTarget = Math.max(0, targetMonths - currentAgeMonths);
  return addDays(today, Math.round(monthsUntilTarget * AVERAGE_DAYS_PER_MONTH));
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
  const catalog = Array.isArray(options.catalog) ? options.catalog : getRuntimeCatalog();
  const catalogVersion = options.catalogVersion ?? getRuntimeCatalogVersion();
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
    if (!ALLOWED_CATEGORIES.has(catalogItem.category)) {
      throw new Error(`Unsupported category in catalog: ${catalogItem.category}`);
    }

    const isVaccination = catalogItem.category === 'vaccination';
    let effectiveCadence;
    let evidenceTier = null;
    let uspstfGrade = null;
    let sourceRef = null;
    let evidenceNote = null;
    let requiresSharedDecision = false;
    let targetAgeForSort;
    let priorityOrder;
    let recurrenceDays;
    let initialDueDate;

    if (isVaccination) {
      // Vaccine dose bands use age-in-months and can carry dose-sequence/risk-
      // condition rows that overlap in age range -- take the first candidate whose
      // risk flags are satisfied rather than only ever trying one.
      const candidates = findMatchingVaccineDoseCandidates(catalogItem.vaccineDoses, normalizedProfile);
      const matchedDose = candidates.find((dose) => hasRequiredRiskFlags(catalogItem, dose, profileRiskFlags));

      if (!matchedDose) {
        continue;
      }

      effectiveCadence = {
        cadenceLabel: matchedDose.cadenceLabel ?? catalogItem.cadenceLabel,
        recurrence: { intervalDays: matchedDose.recurrenceIntervalDays },
      };
      priorityOrder = matchedDose.priorityOrder;
      targetAgeForSort = matchedDose.targetAgeMonths / 12;
      sourceRef = matchedDose.sourceRef ?? null;
      evidenceNote = matchedDose.evidenceNote ?? null;
      recurrenceDays = resolveRecurrenceDays(effectiveCadence);
      initialDueDate = resolveInitialDueDateFromMonths({
        profileAgeMonths: normalizedProfile.ageMonths,
        targetAgeMonths: matchedDose.targetAgeMonths,
        recurrenceDays,
        now,
      });
    } else {
      const candidates = findMatchingRuleBandCandidates(catalogItem.ruleBands, normalizedProfile);
      const matchedBand = candidates.find((band) => hasRequiredRiskFlags(catalogItem, band, profileRiskFlags));

      if (!matchedBand) {
        continue;
      }

      effectiveCadence = resolveEffectiveCadenceForItem(catalogItem, matchedBand);
      evidenceTier = matchedBand.evidenceTier ?? null;
      uspstfGrade = matchedBand.uspstfGrade ?? null;
      requiresSharedDecision = Boolean(matchedBand.requiresSharedDecision);
      priorityOrder = matchedBand.priorityOrder;
      targetAgeForSort = matchedBand.targetAge;
      recurrenceDays = resolveRecurrenceDays(effectiveCadence);
      initialDueDate = resolveInitialDueDate({
        profileAge: normalizedProfile.age,
        targetAge: matchedBand.targetAge,
        recurrenceDays,
        now,
      });
    }

    const interventionType = resolveInterventionTypeForCatalogItem(catalogItem);
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
      cadenceLabel: effectiveCadence.cadenceLabel,
      recurrence: {
        intervalDays: recurrenceDays,
        soonWindowDays: resolveSoonWindowDaysFromRecurrence(recurrenceDays),
      },
      whyItMatters: catalogItem.whyItMatters,
      recommendationText: catalogItem.recommendationText,
      evidenceTier,
      uspstfGrade,
      sourceRef,
      evidenceNote,
      requiresSharedDecision,
      targetAge: Math.round(targetAgeForSort),
      priorityOrder,
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
