const BUCKET_ORDER = ['today', 'soon', 'later'];

const BUCKET_LABELS = {
  today: 'Today',
  soon: 'Soon',
  later: 'Later',
};

const CATEGORY_LABELS = {
  checkup: 'Checkup',
  vaccination: 'Vaccination',
};

const STATUS_LABELS = {
  done: 'Done',
  due: 'Due now',
  pending: 'Pending',
  soon: 'Coming up',
  planned: 'Planned',
  overdue: 'Overdue',
};

const HEALTH_READINESS_CATEGORY_SHARES = {
  checkup: 0.6,
  vaccination: 0.4,
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

  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
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

function mapDisplayItem(item) {
  const fallbackInterventionLabel = item.category === 'vaccination' ? 'Vaccination' : 'Preventive care';

  return {
    ...item,
    categoryLabel: CATEGORY_LABELS[item.category] ?? 'Preventive item',
    interventionTypeLabel: item.interventionTypeLabel ?? fallbackInterventionLabel,
    statusLabel: STATUS_LABELS[item.status] ?? 'Pending',
  };
}

export function groupItemsByPriority(items, options = {}) {
  const buckets = {
    today: [],
    soon: [],
    later: [],
  };
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();

  for (const item of items) {
    const displayBucket = resolveDashboardBucketForDisplay(item, { today });
    if (!buckets[displayBucket]) {
      continue;
    }

    buckets[displayBucket].push(mapDisplayItem(item));
  }

  for (const bucket of BUCKET_ORDER) {
    buckets[bucket].sort(sortWithinBucket);
  }

  return buckets;
}

export function selectHighlightedItem(bucketed) {
  if (bucketed.today.length > 0) {
    return bucketed.today[0];
  }

  if (bucketed.soon.length > 0) {
    return bucketed.soon[0];
  }

  if (bucketed.later.length > 0) {
    return bucketed.later[0];
  }

  return null;
}

function normalizeScoreStatus(item) {
  const explicit = String(item?.scoreStatus || '').trim().toLowerCase();
  if (explicit === 'up_to_date' || explicit === 'planned' || explicit === 'due_soon' || explicit === 'overdue') {
    return explicit;
  }

  const status = String(item?.status || '').trim().toLowerCase();
  if (status === 'done' || status === 'up_to_date') return 'up_to_date';
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
  const normalizedStatus = String(item?.status || '').trim().toLowerCase();
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const dueDate = normalizedStatus === 'done'
    ? resolveDoneItemDueDate(item)
    : resolveItemDueDate(item);
  const recurrenceDays = resolveRecurrenceDays(item);
  const derivedBucket = resolveBucketFromDueDate({
    dueDate,
    recurrenceDays,
    today,
  });
  if (derivedBucket) {
    return derivedBucket;
  }

  if (normalizedStatus === 'due' || normalizedStatus === 'overdue') {
    return 'today';
  }
  if (normalizedStatus === 'soon') {
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
  const hasCheckups = applicableItems.some((item) => item.category === 'checkup');
  const hasVaccinations = applicableItems.some((item) => item.category === 'vaccination');

  if (hasCheckups && hasVaccinations) {
    return {
      checkup: HEALTH_READINESS_CATEGORY_SHARES.checkup,
      vaccination: HEALTH_READINESS_CATEGORY_SHARES.vaccination,
    };
  }

  if (hasCheckups) {
    return {
      checkup: 1,
      vaccination: 0,
    };
  }

  if (hasVaccinations) {
    return {
      checkup: 0,
      vaccination: 1,
    };
  }

  return {
    checkup: 0,
    vaccination: 0,
  };
}

export function calculateHealthScore(items, options = {}) {
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const applicableItems = Array.isArray(items)
    ? items.filter((item) => item?.category === 'checkup' || item?.category === 'vaccination')
    : [];

  if (applicableItems.length === 0) {
    return null;
  }

  const categoryShares = resolveCategoryShareMap(applicableItems);
  const categoryBaseTotals = {
    checkup: 0,
    vaccination: 0,
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

    const scoreStatus = normalizeScoreStatus(item);
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

export function buildDashboardProjection(planSnapshot, profile, options = {}) {
  const items = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];
  const bucketed = groupItemsByPriority(items, options);
  const highlightedItem = selectHighlightedItem(bucketed);
  const healthScore = calculateHealthScore(items, options);
  const profileName = profile?.name?.trim() || 'Me';
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
