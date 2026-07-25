import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';

const BUCKET_ORDER = ['today', 'soon', 'later'];

const BUCKET_LABELS = {
  today: 'Today',
  soon: 'Soon',
  later: 'Later',
};

const CATEGORY_LABELS = {
  checkup: 'Checkup',
  vaccination: 'Vaccination',
  counseling: 'Counseling',
};

const STATUS_LABELS = {
  done: 'Done',
  due: 'Due now',
  pending: 'Pending',
  soon: 'Coming up',
  planned: 'Planned',
  overdue: 'Overdue',
};

const HEALTH_READINESS_CATEGORIES = ['checkup', 'vaccination', 'counseling'];

// checkup:vaccination stays at the original 0.6:0.4 ratio when counseling is
// absent from a plan (redistribution below rescales to 100% among present
// categories) — counseling only takes its 0.2 share once it's actually present.
const HEALTH_READINESS_CATEGORY_SHARES = {
  checkup: 0.48,
  vaccination: 0.32,
  counseling: 0.2,
};

const HEALTH_READINESS_BUCKET_MULTIPLIERS = {
  today: 1.5,
  soon: 1.2,
  later: 1.0,
};

const HEALTH_READINESS_STATUS_CREDITS = {
  up_to_date: 1.0,
  planned: 0.6,
  due_soon: 0.4,
  overdue: 0.0,
};
// Grace window between an item's due date and it being treated as genuinely
// "overdue" rather than just "due now" — flat, not scaled by recurrence,
// since it needs to stay explainable regardless of a screening's cadence.
const OVERDUE_GRACE_DAYS = 30;

const EFFORT_SORT_RANKS = Object.freeze({
  low: 0,
  medium: 1,
  high: 2,
});
const DEFAULT_FOCUS_BUCKET_LIMITS = Object.freeze({
  today: 3,
  soon: 6,
});

function normalizeNonNegativeInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }

  return Math.floor(numeric);
}

function resolveFocusBucketLimits(options = {}) {
  const explicitToday = options.todayFocusLimit ?? options.focusBucketLimits?.today;
  const explicitSoon = options.soonFocusLimit ?? options.focusBucketLimits?.soon;

  return {
    today: normalizeNonNegativeInteger(explicitToday, DEFAULT_FOCUS_BUCKET_LIMITS.today),
    soon: normalizeNonNegativeInteger(explicitSoon, DEFAULT_FOCUS_BUCKET_LIMITS.soon),
  };
}

function isOutstandingItem(item) {
  return String(item?.status || '').trim().toLowerCase() !== 'done';
}

function resolveEffortSortRank(item) {
  const effort = String(item?.effortLevel ?? '').trim().toLowerCase();
  return EFFORT_SORT_RANKS[effort] ?? EFFORT_SORT_RANKS.medium;
}

function sortWithinBucket(a, b) {
  const isDoneA = String(a?.status || '').trim().toLowerCase() === 'done';
  const isDoneB = String(b?.status || '').trim().toLowerCase() === 'done';
  if (isDoneA !== isDoneB) {
    return isDoneA ? 1 : -1;
  }

  const dueDateA = resolveSortDueDate(a);
  const dueDateB = resolveSortDueDate(b);
  if (dueDateA && dueDateB && dueDateA.getTime() !== dueDateB.getTime()) {
    return dueDateA.getTime() - dueDateB.getTime();
  }
  if (dueDateA && !dueDateB) return -1;
  if (!dueDateA && dueDateB) return 1;

  const effortRankA = resolveEffortSortRank(a);
  const effortRankB = resolveEffortSortRank(b);
  if (effortRankA !== effortRankB) {
    return effortRankA - effortRankB;
  }

  if (a.priorityOrder !== b.priorityOrder) {
    return a.priorityOrder - b.priorityOrder;
  }

  return a.targetAge - b.targetAge;
}

function resolveSortDueDate(item) {
  const normalizedStatus = String(item?.status || '').trim().toLowerCase();

  if (normalizedStatus === 'done') {
    return resolveDoneItemDueDate(item);
  }

  return parseDateValue(
    item?.reminder?.scheduledFor
    || item?.reminderDate
    || item?.dueDate
    || item?.dueAt
    || item?.nextDueDate
    || item?.nextDueAt
    || item?.initialDueDate
    || item?.initialDueAt,
  );
}

function mapDisplayItem(item, options = {}) {
  const fallbackInterventionLabel = item.category === 'vaccination' ? 'Vaccination' : 'Preventive care';
  const liveCopy = resolveCatalogCopyForItemKey(item.catalogItemId);
  const liveStatus = resolveEffectiveItemStatus(item, options);

  return {
    ...item,
    name: liveCopy?.name ?? item.name,
    cadenceLabel: liveCopy?.cadenceLabel ?? item.cadenceLabel,
    whyItMatters: liveCopy?.whyItMatters ?? item.whyItMatters,
    recommendationText: liveCopy?.recommendationText ?? item.recommendationText,
    categoryLabel: CATEGORY_LABELS[item.category] ?? 'Preventive item',
    interventionTypeLabel: item.interventionTypeLabel ?? fallbackInterventionLabel,
    status: liveStatus,
    statusLabel: STATUS_LABELS[liveStatus] ?? 'Pending',
  };
}

export function groupItemsByPriority(items, options = {}) {
  const buckets = {
    today: [],
    soon: [],
    later: [],
  };
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const focusLimits = resolveFocusBucketLimits(options);
  const stagedUrgentItems = [];

  for (const item of items) {
    const displayBucket = resolveDashboardBucketForDisplay(item, { today });
    if (!buckets[displayBucket]) {
      continue;
    }

    const displayItem = mapDisplayItem(item, { today });
    const shouldStageUrgent = displayBucket === 'today' && isOutstandingItem(displayItem);

    if (shouldStageUrgent) {
      stagedUrgentItems.push(displayItem);
      continue;
    }

    buckets[displayBucket].push(displayItem);
  }

  stagedUrgentItems.sort(sortWithinBucket);

  for (let index = 0; index < stagedUrgentItems.length; index += 1) {
    const item = stagedUrgentItems[index];
    if (index < focusLimits.today) {
      buckets.today.push(item);
    } else if (index < focusLimits.today + focusLimits.soon) {
      buckets.soon.push(item);
    } else {
      buckets.later.push(item);
    }
  }

  for (const bucket of BUCKET_ORDER) {
    buckets[bucket].sort(sortWithinBucket);
  }

  return buckets;
}

export function selectHighlightedItem(bucketed) {
  const todayOutstanding = bucketed.today.filter(isOutstandingItem);
  if (todayOutstanding.length > 0) {
    return todayOutstanding[0];
  }

  const soonOutstanding = bucketed.soon.filter(isOutstandingItem);
  if (soonOutstanding.length > 0) {
    return soonOutstanding[0];
  }

  const laterOutstanding = bucketed.later.filter(isOutstandingItem);
  if (laterOutstanding.length > 0) {
    return laterOutstanding[0];
  }

  return null;
}

function normalizeScoreStatus(item, today) {
  const explicit = String(item?.scoreStatus || '').trim().toLowerCase();
  if (explicit === 'up_to_date' || explicit === 'planned' || explicit === 'due_soon' || explicit === 'overdue') {
    return explicit;
  }

  const status = resolveEffectiveItemStatus(item, { today });
  if (status === 'done') return 'up_to_date';
  if (status === 'planned') return 'planned';
  if (status === 'due' || status === 'overdue') return 'overdue';
  if (status === 'soon' || status === 'pending') return 'due_soon';
  return 'due_soon';
}

function parseDateValue(rawValue) {
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function parseCadenceIntervalDays(cadenceLabel) {
  const normalized = String(cadenceLabel || '').trim().toLowerCase();
  if (!normalized) return null;

  const rangeYears = /every\s+(\d+)\s*(?:to|-)\s*(\d+)\s*years?/.exec(normalized);
  if (rangeYears) {
    return Number(rangeYears[1]) * 365;
  }

  const fixedYears = /every\s+(\d+)\s*years?/.exec(normalized);
  if (fixedYears) {
    return Number(fixedYears[1]) * 365;
  }

  const fixedMonths = /every\s+(\d+)\s*months?/.exec(normalized);
  if (fixedMonths) {
    return Number(fixedMonths[1]) * 30;
  }

  if (
    normalized.includes('every year')
    || normalized.includes('at least every year')
    || normalized.includes('seasonal')
  ) {
    return 365;
  }

  return null;
}

function normalizePositiveInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Math.round(numeric);
}

export function resolveRecurrenceDays(item) {
  const explicitRecurrence = normalizePositiveInteger(item?.recurrence?.intervalDays);
  if (explicitRecurrence) {
    return explicitRecurrence;
  }

  const legacyRecurrence = normalizePositiveInteger(item?.recurrenceDays);
  if (legacyRecurrence) {
    return legacyRecurrence;
  }

  return parseCadenceIntervalDays(item?.cadenceLabel);
}

export function resolveSoonWindowDaysFromRecurrence(recurrenceDays) {
  const normalized = normalizePositiveInteger(recurrenceDays);
  if (!normalized) {
    return 60;
  }

  const quarterInterval = Math.round(normalized * 0.25);
  return Math.max(30, Math.min(365, quarterInterval));
}

export function resolveBucketFromDueDate({ dueDate, recurrenceDays, today }) {
  if (!(dueDate instanceof Date) || Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const todayDay = startOfDay(today);
  const dueDay = startOfDay(dueDate);

  if (dueDay.getTime() <= todayDay.getTime()) {
    return 'today';
  }

  const soonWindowDays = resolveSoonWindowDaysFromRecurrence(recurrenceDays);
  const soonStart = addDays(dueDay, -soonWindowDays);

  if (todayDay.getTime() >= soonStart.getTime()) {
    return 'soon';
  }

  return 'later';
}

function resolveStatusFromDueDate(dueDate, recurrenceDays, today) {
  if (!(dueDate instanceof Date) || Number.isNaN(dueDate.getTime())) {
    return 'pending';
  }

  const dueDay = startOfDay(dueDate);
  const overdueThreshold = addDays(dueDay, OVERDUE_GRACE_DAYS);

  if (today.getTime() >= overdueThreshold.getTime()) {
    return 'overdue';
  }
  if (today.getTime() >= dueDay.getTime()) {
    return 'due';
  }

  const soonWindowDays = resolveSoonWindowDaysFromRecurrence(recurrenceDays);
  const soonStart = addDays(dueDay, -soonWindowDays);
  if (today.getTime() >= soonStart.getTime()) {
    return 'soon';
  }

  return 'pending';
}

/**
 * The single source of truth for an item's user-facing status. Persisted
 * status (written at plan generation, or by markItemDone/scheduleReminder)
 * is a snapshot at the moment it was written — it never advances on its own
 * as time passes. This recomputes the true status fresh from today's date
 * every time, so "due"/"soon"/"pending"/"overdue" can never drift out of
 * sync with the item's actual due date, "done" naturally lapses back to
 * needing action once a recurring item's coverage window ends, and
 * "planned" naturally expires once its reminder date arrives.
 */
export function resolveEffectiveItemStatus(item, options = {}) {
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const now = startOfDay(today);
  const recurrenceDays = resolveRecurrenceDays(item);
  const completedOn = parseDateValue(item?.completedOn);

  if (completedOn) {
    if (!recurrenceDays) {
      return 'done';
    }

    const coverageEndsAt = startOfDay(
      parseDateValue(item?.nextDueDate || item?.nextDueAt) ?? addDays(completedOn, recurrenceDays),
    );

    if (now.getTime() < coverageEndsAt.getTime()) {
      return 'done';
    }

    return resolveStatusFromDueDate(coverageEndsAt, recurrenceDays, now);
  }

  const reminderDate = parseDateValue(item?.reminder?.scheduledFor || item?.reminderDate);
  if (reminderDate && now.getTime() < startOfDay(reminderDate).getTime()) {
    return 'planned';
  }

  const dueDate = reminderDate || parseDateValue(
    item?.dueDate || item?.dueAt || item?.nextDueDate || item?.nextDueAt || item?.initialDueDate || item?.initialDueAt,
  );

  return resolveStatusFromDueDate(dueDate, recurrenceDays, now);
}

function resolveDoneItemDueDate(item) {
  const explicitDueDate = parseDateValue(
    item?.dueDate
    || item?.dueAt
    || item?.nextDueDate
    || item?.nextDueAt,
  );
  if (explicitDueDate) {
    return explicitDueDate;
  }

  const completedOn = parseDateValue(item?.completedOn);
  if (!completedOn) {
    return null;
  }

  const recurrenceDays = resolveRecurrenceDays(item);
  if (!recurrenceDays) {
    return null;
  }

  return addDays(completedOn, recurrenceDays);
}

function resolveItemDueDate(item) {
  const reminderDate = parseDateValue(item?.reminder?.scheduledFor || item?.reminderDate);
  if (reminderDate) {
    return reminderDate;
  }

  const explicitDueDate = parseDateValue(
    item?.dueDate
    || item?.dueAt
    || item?.nextDueDate
    || item?.nextDueAt
    || item?.initialDueDate
    || item?.initialDueAt,
  );

  if (explicitDueDate) {
    return explicitDueDate;
  }

  return resolveDoneItemDueDate(item);
}

export function resolveDashboardBucketForDisplay(item, options = {}) {
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const liveStatus = resolveEffectiveItemStatus(item, { today });
  const dueDate = resolveItemDueDate(item);
  const recurrenceDays = resolveRecurrenceDays(item);
  const derivedBucket = resolveBucketFromDueDate({
    dueDate,
    recurrenceDays,
    today,
  });
  if (derivedBucket) {
    return derivedBucket;
  }

  if (liveStatus === 'due' || liveStatus === 'overdue') {
    return 'today';
  }
  if (liveStatus === 'soon') {
    return 'soon';
  }

  return 'later';
}

function resolveScoreBucket(item, scoreStatus, today) {
  if (scoreStatus === 'overdue') {
    return 'today';
  }

  const dueDate = parseDateValue(
    item?.reminder?.scheduledFor
    || item?.reminderDate
    || item?.dueDate
    || item?.dueAt
    || item?.nextDueDate
    || item?.nextDueAt,
  );
  const fromDueDate = resolveBucketFromDueDate({
    dueDate,
    recurrenceDays: resolveRecurrenceDays(item),
    today,
  });

  if (fromDueDate) {
    return fromDueDate;
  }

  if (scoreStatus === 'due_soon') return 'soon';
  return 'later';
}

function resolveBaseWeight(item) {
  const raw = Number(item?.baseWeight ?? item?.importanceWeight ?? 1);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }
  return raw;
}

function resolveCategoryShareMap(applicableItems) {
  const presentCategories = HEALTH_READINESS_CATEGORIES.filter((category) => (
    applicableItems.some((item) => item.category === category)
  ));

  const totalShareOfPresentCategories = presentCategories.reduce(
    (sum, category) => sum + (HEALTH_READINESS_CATEGORY_SHARES[category] ?? 0),
    0,
  );

  const shares = { checkup: 0, vaccination: 0, counseling: 0 };
  if (totalShareOfPresentCategories === 0) {
    return shares;
  }

  // A category absent from this profile's plan doesn't shrink the score —
  // its share is redistributed proportionally across the categories present.
  for (const category of presentCategories) {
    shares[category] = (HEALTH_READINESS_CATEGORY_SHARES[category] ?? 0) / totalShareOfPresentCategories;
  }

  return shares;
}

export function calculateHealthScore(items, options = {}) {
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const applicableItems = Array.isArray(items)
    ? items.filter((item) => HEALTH_READINESS_CATEGORIES.includes(item?.category))
    : [];

  if (applicableItems.length === 0) {
    return null;
  }

  const categoryShares = resolveCategoryShareMap(applicableItems);
  const categoryBaseTotals = {
    checkup: 0,
    vaccination: 0,
    counseling: 0,
  };

  for (const item of applicableItems) {
    categoryBaseTotals[item.category] += resolveBaseWeight(item);
  }

  let totalApplicableWeight = 0;
  let earnedWeight = 0;

  for (const item of applicableItems) {
    const baseWeight = resolveBaseWeight(item);
    const categoryShare = categoryShares[item.category] ?? 0;
    const categoryTotal = categoryBaseTotals[item.category] ?? 0;
    const normalizedBaseWeight = categoryTotal > 0
      ? (baseWeight / categoryTotal) * categoryShare
      : 0;

    const scoreStatus = normalizeScoreStatus(item, today);
    const bucket = resolveScoreBucket(item, scoreStatus, today);
    const bucketMultiplier = HEALTH_READINESS_BUCKET_MULTIPLIERS[bucket] ?? 1.0;
    const statusCredit = HEALTH_READINESS_STATUS_CREDITS[scoreStatus] ?? 0;
    const finalItemWeight = normalizedBaseWeight * bucketMultiplier;
    const itemScore = finalItemWeight * statusCredit;

    totalApplicableWeight += finalItemWeight;
    earnedWeight += itemScore;
  }

  if (totalApplicableWeight === 0) {
    return null;
  }

  return Math.round((earnedWeight / totalApplicableWeight) * 100);
}

function resolveDashboardProfileName(profile) {
  const displayName = String(
    profile?.firstName || profile?.name || profile?.displayLabel || '',
  ).trim();

  return displayName.split(/\s+/)[0] || 'Me';
}

export function buildDashboardProjection(planSnapshot, profile, options = {}) {
  const items = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];
  const bucketed = groupItemsByPriority(items, options);
  const highlightedItem = selectHighlightedItem(bucketed);
  const healthScore = calculateHealthScore(items, options);
  const profileName = resolveDashboardProfileName(profile);
  const profileAge = Number.isFinite(Number(profile?.age)) ? Number(profile.age) : null;
  const profileGender = String(profile?.gender || '').trim().toLowerCase();

  return {
    profileName,
    profileAge,
    profileGender,
    healthScore,
    highlightedItem,
    sections: BUCKET_ORDER.map((priority) => ({
      priority,
      title: BUCKET_LABELS[priority],
      items: bucketed[priority],
    })),
  };
}

export function hasPopulatedDashboard(projection) {
  const sectionItemCount = projection.sections.reduce((sum, section) => sum + section.items.length, 0);
  return sectionItemCount > 0 && Boolean(projection.highlightedItem);
}

export const dashboardLabels = {
  BUCKET_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
};
