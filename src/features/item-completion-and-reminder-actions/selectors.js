import {
  CATEGORY_LABELS,
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  PLAN_STATUSES,
} from '../health-plan-browsing-and-item-detail/model.js';
import { buildHealthPlanReadModel } from '../health-plan-browsing-and-item-detail/projection.js';
import {
  calculateHealthScore as calculateWeightedHealthScore,
  resolveDashboardBucketForDisplay,
} from '../self-onboarding-to-first-dashboard/dashboard.js';
import {
  formatDateForConfirmation,
  getSafeStatusLabel,
} from './model.js';

const BUCKET_ORDER = ['today', 'soon', 'later'];

const BUCKET_LABELS = Object.freeze({
  today: 'Today',
  soon: 'Soon',
  later: 'Later',
});

function sortWithinBucket(a, b) {
  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
}

function toDisplayItem(item) {
  const categoryLabel = CATEGORY_LABELS[item.category]?.singular ?? 'Preventive item';
  const interventionTypeLabel = item?.interventionTypeLabel
    ?? (item?.category === PLAN_CATEGORIES.vaccination ? 'Vaccination' : 'Preventive care');
  const reminderDate = item?.reminder?.scheduledFor;

  return {
    ...item,
    categoryLabel,
    interventionTypeLabel,
    statusLabel: getSafeStatusLabel(item.status),
    reminderDate,
    reminderDateLabel: reminderDate ? formatDateForConfirmation(reminderDate) : null,
  };
}

function toDisplayStatus(status, reminderDate) {
  if (status === PLAN_STATUSES.planned) {
    return PLAN_STATUSES.pending;
  }

  return status;
}

function toItems(snapshot) {
  return Array.isArray(snapshot?.items) ? snapshot.items.map(toDisplayItem) : [];
}

function parseDateValue(rawValue) {
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveItemDueDateForSort(source) {
  if (!source || typeof source !== 'object') return null;
  const normalizedStatus = String(source?.status || '').trim().toLowerCase();

  if (normalizedStatus === PLAN_STATUSES.done) {
    return parseDateValue(
      source?.dueDate
      || source?.dueAt
      || source?.nextDueDate
      || source?.nextDueAt,
    );
  }

  return parseDateValue(
    source?.reminder?.scheduledFor
    || source?.reminderDate
    || source?.dueDate
    || source?.dueAt
    || source?.nextDueDate
    || source?.nextDueAt
    || source?.initialDueDate
    || source?.initialDueAt,
  );
}

function toUrgencyRank(bucket) {
  if (bucket === 'today') return 0;
  if (bucket === 'soon') return 1;
  return 2;
}

function sortByUrgencyWithinCategory(a, b, sourceByItemKey) {
  const sourceA = sourceByItemKey[a.itemKey] ?? null;
  const sourceB = sourceByItemKey[b.itemKey] ?? null;
  const isDoneA = String(sourceA?.status || a?.status || '').trim().toLowerCase() === PLAN_STATUSES.done;
  const isDoneB = String(sourceB?.status || b?.status || '').trim().toLowerCase() === PLAN_STATUSES.done;

  if (isDoneA !== isDoneB) {
    return isDoneA ? 1 : -1;
  }

  const urgencyA = toUrgencyRank(resolveDashboardBucketForDisplay(sourceA ?? a));
  const urgencyB = toUrgencyRank(resolveDashboardBucketForDisplay(sourceB ?? b));
  if (urgencyA !== urgencyB) {
    return urgencyA - urgencyB;
  }

  const dueDateA = resolveItemDueDateForSort(sourceA);
  const dueDateB = resolveItemDueDateForSort(sourceB);
  if (dueDateA && dueDateB && dueDateA.getTime() !== dueDateB.getTime()) {
    return dueDateA.getTime() - dueDateB.getTime();
  }
  if (dueDateA && !dueDateB) return -1;
  if (!dueDateA && dueDateB) return 1;

  const targetAgeA = Number(sourceA?.targetAge);
  const targetAgeB = Number(sourceB?.targetAge);
  if (Number.isFinite(targetAgeA) && Number.isFinite(targetAgeB) && targetAgeA !== targetAgeB) {
    return targetAgeA - targetAgeB;
  }

  const priorityA = Number(sourceA?.priorityOrder);
  const priorityB = Number(sourceB?.priorityOrder);
  if (Number.isFinite(priorityA) && Number.isFinite(priorityB) && priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  return String(a.displayName || a.itemKey).localeCompare(String(b.displayName || b.itemKey));
}

function isOutstanding(item) {
  return item?.status !== PLAN_STATUSES.done;
}

export function groupItemsByPriorityForSlice(planSnapshot) {
  const buckets = {
    today: [],
    soon: [],
    later: [],
  };

  for (const item of toItems(planSnapshot)) {
    const displayBucket = resolveDashboardBucketForDisplay(item);
    if (!buckets[displayBucket]) {
      continue;
    }

    buckets[displayBucket].push(item);
  }

  for (const bucket of BUCKET_ORDER) {
    buckets[bucket].sort(sortWithinBucket);
  }

  return buckets;
}

export function selectHighlightedItemTodayThenSoon(planSnapshot) {
  const grouped = groupItemsByPriorityForSlice(planSnapshot);
  const todayOutstanding = grouped.today.filter(isOutstanding);

  if (todayOutstanding.length > 0) {
    return todayOutstanding[0];
  }

  const soonOutstanding = grouped.soon.filter(isOutstanding);
  if (soonOutstanding.length > 0) {
    return soonOutstanding[0];
  }

  return null;
}

export function calculateHealthScoreDoneVsOutstanding(planSnapshot) {
  const items = toItems(planSnapshot);
  return calculateWeightedHealthScore(items);
}

export function buildDashboardProjectionForSlice(planSnapshot, profile = null) {
  const grouped = groupItemsByPriorityForSlice(planSnapshot);
  const highlightedItem = selectHighlightedItemTodayThenSoon(planSnapshot);
  const profileName = profile?.name?.trim() || 'Me';
  const dueTodayCount = grouped.today.filter(isOutstanding).length;

  return {
    profileName,
    dueTodayCount,
    healthScore: calculateHealthScoreDoneVsOutstanding(planSnapshot),
    highlightedItem,
    sections: BUCKET_ORDER.map((priority) => ({
      priority,
      title: BUCKET_LABELS[priority],
      items: grouped[priority],
    })),
  };
}

export function buildPlanReadModelForSlice(planSnapshot) {
  const baseReadModel = buildHealthPlanReadModel(planSnapshot);
  const sourceByItemKey = Array.isArray(planSnapshot?.items)
    ? planSnapshot.items.reduce((index, source) => {
      if (source?.catalogItemId) {
        index[source.catalogItemId] = source;
      }
      return index;
    }, {})
    : {};

  const withReminderDetails = (item) => {
    const source = planSnapshot?.items?.find((sourceItem) => sourceItem.catalogItemId === item.itemKey);
    const reminderDate = source?.reminder?.scheduledFor ?? null;
    const completedOn = source?.completedOn ?? null;
    const status = toDisplayStatus(source?.status ?? item.status, reminderDate);

    return {
      ...item,
      reminderDate,
      reminderDateLabel: reminderDate ? formatDateForConfirmation(reminderDate) : null,
      completedOn,
      completedOnLabel: completedOn ? formatDateForConfirmation(completedOn) : null,
      statusLabel: getSafeStatusLabel(status),
      status,
    };
  };

  const checkups = baseReadModel.checkups
    .map(withReminderDetails)
    .sort((a, b) => sortByUrgencyWithinCategory(a, b, sourceByItemKey));
  const vaccinations = baseReadModel.vaccinations
    .map(withReminderDetails)
    .sort((a, b) => sortByUrgencyWithinCategory(a, b, sourceByItemKey));
  const allItems = [...checkups, ...vaccinations];

  const byItemKey = allItems.reduce((index, item) => {
    index[item.itemKey] = item;
    return index;
  }, {});

  return {
    ...baseReadModel,
    checkups,
    vaccinations,
    allItems,
    byItemKey,
  };
}

export function resolveDefaultCategoryForItem(item) {
  if (item?.category === PLAN_CATEGORIES.vaccination) {
    return PLAN_CATEGORIES.vaccination;
  }

  return PLAN_CATEGORIES.checkup;
}

export function resolveOriginForCategory(category) {
  return category === PLAN_CATEGORIES.vaccination ? DETAIL_ORIGIN.vaccinations : DETAIL_ORIGIN.checkups;
}
