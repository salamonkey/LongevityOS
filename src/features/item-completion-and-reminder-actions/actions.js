import {
  ALLOWED_REMINDER_TIMING_TYPES,
  DETAIL_ACTION_ERRORS,
  resolveReminderScheduledFor,
} from './model.js';

function cloneSnapshotItems(items) {
  return items.map((item) => ({
    ...item,
    reminder: item?.reminder ? { ...item.reminder } : undefined,
  }));
}

function assertProfileScope(planSnapshot, profileId) {
  if (!planSnapshot || planSnapshot.profileId !== profileId) {
    throw new Error('This plan is not available for the selected profile.');
  }
}

function updateItemInSnapshot(planSnapshot, itemId, updater) {
  const currentItems = Array.isArray(planSnapshot?.items) ? cloneSnapshotItems(planSnapshot.items) : [];
  let didUpdate = false;

  const items = currentItems.map((item) => {
    if (item.catalogItemId !== itemId) {
      return item;
    }

    didUpdate = true;
    return updater(item);
  });

  if (!didUpdate) {
    throw new Error('This item is not available in your current plan.');
  }

  return {
    ...planSnapshot,
    items,
  };
}

function resolveNow(clock) {
  const now = typeof clock === 'function' ? clock() : new Date();
  const parsed = now instanceof Date ? new Date(now.getTime()) : new Date(now);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid system date.');
  }

  return parsed;
}

export function markItemDoneInSnapshot(planSnapshot, profileId, itemId) {
  assertProfileScope(planSnapshot, profileId);

  const updatedSnapshot = updateItemInSnapshot(planSnapshot, itemId, (item) => ({
    ...item,
    status: 'done',
    reminder: undefined,
  }));

  const updatedItem = updatedSnapshot.items.find((item) => item.catalogItemId === itemId) ?? null;

  return {
    planSnapshot: updatedSnapshot,
    item: updatedItem,
  };
}

export function scheduleItemReminderInSnapshot(planSnapshot, profileId, itemId, reminderInput, clock) {
  assertProfileScope(planSnapshot, profileId);

  const timingType = reminderInput?.timingType;
  if (!ALLOWED_REMINDER_TIMING_TYPES.includes(timingType)) {
    throw new Error('Please choose one of the available reminder options.');
  }

  const now = resolveNow(clock);
  const resolvedReminder = resolveReminderScheduledFor(reminderInput, now);
  const reminder = {
    timingType: resolvedReminder.timingType,
    scheduledFor: resolvedReminder.scheduledFor,
    createdAt: now.toISOString(),
  };

  const updatedSnapshot = updateItemInSnapshot(planSnapshot, itemId, (item) => ({
    ...item,
    status: 'planned',
    reminder,
  }));

  const updatedItem = updatedSnapshot.items.find((item) => item.catalogItemId === itemId) ?? null;

  return {
    planSnapshot: updatedSnapshot,
    item: updatedItem,
    reminder,
  };
}

export function createItemActionService({ profileId, getPlanSnapshot, setPlanSnapshot, clock = () => new Date() }) {
  if (typeof getPlanSnapshot !== 'function' || typeof setPlanSnapshot !== 'function') {
    throw new Error('Item action service requires getPlanSnapshot and setPlanSnapshot callbacks.');
  }

  return {
    markItemDone(targetProfileId, itemId) {
      try {
        const result = markItemDoneInSnapshot(getPlanSnapshot(), targetProfileId, itemId);
        setPlanSnapshot(result.planSnapshot);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw error;
        }

        throw new Error(DETAIL_ACTION_ERRORS.action_failed);
      }
    },

    scheduleItemReminder(targetProfileId, itemId, reminderInput) {
      try {
        const result = scheduleItemReminderInSnapshot(
          getPlanSnapshot(),
          targetProfileId,
          itemId,
          reminderInput,
          clock,
        );

        setPlanSnapshot(result.planSnapshot);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw error;
        }

        throw new Error(DETAIL_ACTION_ERRORS.action_failed);
      }
    },

    get profileId() {
      return profileId;
    },
  };
}
