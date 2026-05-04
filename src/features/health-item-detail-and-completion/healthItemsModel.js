import { calculateHealthScore, PRIORITY_HORIZONS } from '../profile/profilePlan.js';

export const HEALTH_ITEM_STATUS = Object.freeze({
  DUE: 'Due',
  PLANNED: 'Planned',
  DONE: 'Done',
});

const STATUS_VALUES = new Set(Object.values(HEALTH_ITEM_STATUS));
const STORAGE_KEY_PREFIX = 'sl-002-health-items:';

function assertStatus(status) {
  if (!STATUS_VALUES.has(status)) {
    throw new Error(`Unsupported health item status: ${status}`);
  }
}

function buildInitialStatusContext(priorityHorizon, generatedAtDate) {
  const generatedTime = new Date(generatedAtDate);
  if (Number.isNaN(generatedTime.getTime())) {
    throw new Error('Profile generatedAt date must be a valid ISO timestamp.');
  }

  if (priorityHorizon === 'Today') {
    return {
      status: HEALTH_ITEM_STATUS.DUE,
      nextDueDate: generatedTime.toISOString(),
      plannedForDate: null,
      lastCompletedAt: null,
    };
  }

  const plannedDate = new Date(generatedTime);
  const dayDelta = priorityHorizon === 'Soon' ? 30 : 90;
  plannedDate.setDate(plannedDate.getDate() + dayDelta);

  return {
    status: HEALTH_ITEM_STATUS.PLANNED,
    nextDueDate: null,
    plannedForDate: plannedDate.toISOString(),
    lastCompletedAt: null,
  };
}

export function createHealthItemsFromProfile(profile) {
  if (!profile?.profileId || !Array.isArray(profile?.planItems)) {
    throw new Error('Profile with generated plan items is required.');
  }

  return profile.planItems.map((planItem) => {
    const statusContext = buildInitialStatusContext(planItem.priorityHorizon, profile.generatedAt);

    return {
      id: planItem.itemCode,
      profileId: profile.profileId,
      title: planItem.title,
      actionLabel: planItem.title,
      whyItMatters: planItem.whyItMatters,
      recommendationFrequency: planItem.frequencyLabel,
      priorityHorizon: planItem.priorityHorizon,
      displayOrder: planItem.displayOrder,
      status: statusContext.status,
      nextDueDate: statusContext.nextDueDate,
      plannedForDate: statusContext.plannedForDate,
      lastCompletedAt: statusContext.lastCompletedAt,
      updatedAt: profile.generatedAt,
    };
  });
}

function normalizeHealthItem(healthItem) {
  assertStatus(healthItem.status);

  return {
    ...healthItem,
    nextDueDate: healthItem.nextDueDate ?? null,
    plannedForDate: healthItem.plannedForDate ?? null,
    lastCompletedAt: healthItem.lastCompletedAt ?? null,
  };
}

export function mergePersistedHealthItems(profile, persistedItems) {
  const baseItems = createHealthItemsFromProfile(profile);
  if (!Array.isArray(persistedItems) || persistedItems.length === 0) {
    return baseItems;
  }

  const persistedById = new Map(
    persistedItems
      .filter((item) => item.profileId === profile.profileId)
      .map((item) => [item.id, normalizeHealthItem(item)]),
  );

  return baseItems.map((baseItem) => {
    const persisted = persistedById.get(baseItem.id);
    if (!persisted) {
      return baseItem;
    }

    return {
      ...baseItem,
      status: persisted.status,
      nextDueDate: persisted.nextDueDate,
      plannedForDate: persisted.plannedForDate,
      lastCompletedAt: persisted.lastCompletedAt,
      updatedAt: persisted.updatedAt ?? baseItem.updatedAt,
    };
  });
}

export function groupHealthItemsForDashboard(healthItems) {
  const grouped = Object.fromEntries(PRIORITY_HORIZONS.map((horizon) => [horizon, []]));

  for (const item of healthItems) {
    assertStatus(item.status);

    if (!grouped[item.priorityHorizon]) {
      throw new Error(`Unsupported priority horizon: ${item.priorityHorizon}`);
    }

    if (item.status === HEALTH_ITEM_STATUS.DONE) {
      continue;
    }

    grouped[item.priorityHorizon].push({ ...item });
  }

  for (const horizon of PRIORITY_HORIZONS) {
    grouped[horizon].sort((left, right) => left.displayOrder - right.displayOrder);
  }

  return grouped;
}

export function getHealthItemStatusContext(healthItem, locale = 'en-US') {
  assertStatus(healthItem.status);

  const formatDate = (isoDate) => {
    if (!isoDate) {
      return null;
    }

    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsed);
  };

  if (healthItem.status === HEALTH_ITEM_STATUS.DUE) {
    const dueText = formatDate(healthItem.nextDueDate);
    return dueText ? `Due on ${dueText}` : 'Due now';
  }

  if (healthItem.status === HEALTH_ITEM_STATUS.PLANNED) {
    const plannedText = formatDate(healthItem.plannedForDate);
    return plannedText ? `Planned for ${plannedText}` : 'Planned timing needs confirmation';
  }

  const completedText = formatDate(healthItem.lastCompletedAt);
  return completedText ? `Completed on ${completedText}` : 'Marked done';
}

export function markHealthItemDone(activeProfileId, healthItemId, healthItems, completedAt = new Date()) {
  const completionIso = completedAt.toISOString();
  let itemFound = false;

  const nextItems = healthItems.map((item) => {
    if (item.profileId !== activeProfileId || item.id !== healthItemId) {
      return item;
    }

    itemFound = true;
    assertStatus(item.status);

    if (item.status === HEALTH_ITEM_STATUS.DONE) {
      throw new Error('This item is already done.');
    }

    return {
      ...item,
      status: HEALTH_ITEM_STATUS.DONE,
      lastCompletedAt: completionIso,
      plannedForDate: null,
      updatedAt: completionIso,
    };
  });

  if (!itemFound) {
    throw new Error('Health item was not found in the active profile.');
  }

  return nextItems;
}

export function calculateDisplayedHealthScore(healthItems) {
  const activePlanItems = healthItems
    .filter((item) => item.status !== HEALTH_ITEM_STATUS.DONE)
    .map((item) => ({ priorityHorizon: item.priorityHorizon }));

  return calculateHealthScore(activePlanItems);
}

export function getHealthItemById(activeProfileId, healthItemId, healthItems) {
  return (
    healthItems.find((item) => item.profileId === activeProfileId && item.id === healthItemId) ?? null
  );
}

export function loadPersistedHealthItems(profileId) {
  if (!profileId || !globalThis.localStorage) {
    return null;
  }

  try {
    const raw = globalThis.localStorage.getItem(`${STORAGE_KEY_PREFIX}${profileId}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistHealthItems(profileId, healthItems) {
  if (!profileId || !globalThis.localStorage) {
    return;
  }

  globalThis.localStorage.setItem(`${STORAGE_KEY_PREFIX}${profileId}`, JSON.stringify(healthItems));
}

export function clearPersistedHealthItems(profileId) {
  if (!profileId || !globalThis.localStorage) {
    return;
  }

  globalThis.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${profileId}`);
}
