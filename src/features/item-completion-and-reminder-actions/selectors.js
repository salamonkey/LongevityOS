import {
  CATEGORY_LABELS,
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  PLAN_STATUSES,
} from '../health-plan-browsing-and-item-detail/model.js';
import { buildHealthPlanReadModel } from '../health-plan-browsing-and-item-detail/projection.js';
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
  const reminderDate = item?.reminder?.scheduledFor;

  return {
    ...item,
    categoryLabel,
    statusLabel: getSafeStatusLabel(item.status),
    reminderDate,
    reminderDateLabel: reminderDate ? formatDateForConfirmation(reminderDate) : null,
  };
}

function toItems(snapshot) {
  return Array.isArray(snapshot?.items) ? snapshot.items.map(toDisplayItem) : [];
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
    if (!buckets[item.dashboardBucket]) {
      continue;
    }

    buckets[item.dashboardBucket].push(item);
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

  if (items.length === 0) {
    return 0;
  }

  const completedCount = items.filter((item) => item.status === PLAN_STATUSES.done).length;
  return Math.round((completedCount / items.length) * 100);
}

export function buildDashboardProjectionForSlice(planSnapshot, profile = null) {
  const grouped = groupItemsByPriorityForSlice(planSnapshot);
  const highlightedItem = selectHighlightedItemTodayThenSoon(planSnapshot);
  const profileName = profile?.name?.trim() || 'You';
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

  const withReminderDetails = (item) => {
    const source = planSnapshot?.items?.find((sourceItem) => sourceItem.catalogItemId === item.itemKey);
    const reminderDate = source?.reminder?.scheduledFor ?? null;

    return {
      ...item,
      reminderDate,
      reminderDateLabel: reminderDate ? formatDateForConfirmation(reminderDate) : null,
      statusLabel: getSafeStatusLabel(source?.status ?? item.status),
      status: source?.status ?? item.status,
    };
  };

  const checkups = baseReadModel.checkups.map(withReminderDetails);
  const vaccinations = baseReadModel.vaccinations.map(withReminderDetails);
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
