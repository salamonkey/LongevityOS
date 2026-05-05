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
  soon: 'Coming up',
  planned: 'Plan',
  overdue: 'Overdue',
};

const HEALTH_SCORE_BUCKET_WEIGHTS = {
  today: 50,
  soon: 30,
  later: 20,
};

function sortWithinBucket(a, b) {
  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
}

function mapDisplayItem(item) {
  return {
    ...item,
    categoryLabel: CATEGORY_LABELS[item.category] ?? 'Preventive item',
    statusLabel: STATUS_LABELS[item.status] ?? 'Plan',
  };
}

export function groupItemsByPriority(items) {
  const buckets = {
    today: [],
    soon: [],
    later: [],
  };

  for (const item of items) {
    if (!buckets[item.dashboardBucket]) {
      continue;
    }

    buckets[item.dashboardBucket].push(mapDisplayItem(item));
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

export function calculateHealthScore(items) {
  const totalWeight = items.reduce((sum, item) => (
    sum + (HEALTH_SCORE_BUCKET_WEIGHTS[item.dashboardBucket] ?? 0)
  ), 0);

  if (totalWeight === 0) {
    return 0;
  }

  const creditedWeight = items.reduce((sum, item) => {
    const bucketWeight = HEALTH_SCORE_BUCKET_WEIGHTS[item.dashboardBucket] ?? 0;
    const itemValue = item.status === 'due' || item.status === 'overdue' ? 0 : bucketWeight;
    return sum + itemValue;
  }, 0);

  return Math.round((creditedWeight / totalWeight) * 100);
}

export function buildDashboardProjection(planSnapshot, profile) {
  const items = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];
  const bucketed = groupItemsByPriority(items);
  const highlightedItem = selectHighlightedItem(bucketed);
  const healthScore = calculateHealthScore(items);
  const profileName = profile?.name?.trim() || 'You';
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
