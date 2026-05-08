import {
  ALLOWED_REMINDER_TIMING_TYPES,
  DETAIL_ACTION_ERRORS,
  parseIsoDateInput,
  resolveReminderScheduledFor,
  toIsoDate,
} from './model.js';
import {
  resolveRecurrenceDays,
} from '../self-onboarding-to-first-dashboard/dashboard.js';

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

function resolveDoneCompletedOn(doneInput = {}, now) {
  const todayIso = toIsoDate(now);
  if (!todayIso) {
    throw new Error('Invalid system date.');
  }

  const customDateText = String(doneInput?.customDate ?? '').trim();
  if (!customDateText) {
    return todayIso;
  }

  const parsed = parseIsoDateInput(customDateText);
  if (!parsed) {
    throw new Error(DETAIL_ACTION_ERRORS.invalid_date);
  }

  if (parsed > todayIso) {
    throw new Error(DETAIL_ACTION_ERRORS.future_done_date);
  }

  return parsed;
}

function addDaysToIsoDate(isoDate, intervalDays) {
  const parsed = parseIsoDateInput(isoDate);
  const safeInterval = Number(intervalDays);

  if (!parsed || !Number.isFinite(safeInterval) || safeInterval <= 0) {
    return null;
  }

  const [yearText, monthText, dayText] = parsed.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + Math.round(safeInterval));
  return date.toISOString().slice(0, 10);
}

export function markItemDoneInSnapshot(planSnapshot, profileId, itemId, doneInput = {}, clock = () => new Date()) {
  assertProfileScope(planSnapshot, profileId);
  const now = resolveNow(clock);
  const completedOn = resolveDoneCompletedOn(doneInput, now);

  const updatedSnapshot = updateItemInSnapshot(planSnapshot, itemId, (item) => {
    const recurrenceDays = resolveRecurrenceDays(item);
    const nextDueDate = addDaysToIsoDate(completedOn, recurrenceDays);

    return {
      ...item,
      status: 'done',
      reminder: undefined,
      completedOn,
      dueDate: undefined,
      dueAt: undefined,
      nextDueAt: undefined,
      nextDueDate: nextDueDate ?? undefined,
    };
  });

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
    status: 'pending',
    reminder,
    completedOn: undefined,
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
    markItemDone(targetProfileId, itemId, doneInput = {}) {
      try {
        const result = markItemDoneInSnapshot(getPlanSnapshot(), targetProfileId, itemId, doneInput, clock);
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
