import {
  ALLOWED_OPT_OUT_PRESETS,
  ALLOWED_REMINDER_TIMING_TYPES,
  DETAIL_ACTION_ERRORS,
  OPT_OUT_PRESET_MONTHS,
  addMonthsToIsoDate,
  parseIsoDateInput,
  resolveReminderScheduledFor,
  toIsoDate,
} from './model.js';
import {
  resolveRecurrenceDays,
  resolveSoonWindowDaysFromRecurrence,
} from '../self-onboarding-to-first-dashboard/dashboard.js';
import { ALLOWED_PLAN_CATEGORIES } from '../health-plan-browsing-and-item-detail/model.js';
import {
  resolveInterventionTypeForCatalogItem,
  getInterventionTypeLabel,
} from '../self-onboarding-to-first-dashboard/catalog-model.js';

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

export function setItemOptOutInSnapshot(planSnapshot, profileId, itemId, optOutInput = {}, clock = () => new Date()) {
  assertProfileScope(planSnapshot, profileId);

  const preset = optOutInput?.preset;
  if (!ALLOWED_OPT_OUT_PRESETS.includes(preset)) {
    throw new Error(DETAIL_ACTION_ERRORS.missing_opt_out_duration);
  }

  const now = resolveNow(clock);
  const decidedOn = toIsoDate(now);
  const months = OPT_OUT_PRESET_MONTHS[preset];
  const until = months == null ? null : addMonthsToIsoDate(decidedOn, months);

  const updatedSnapshot = updateItemInSnapshot(planSnapshot, itemId, (item) => ({
    ...item,
    status: 'opted_out',
    optOut: { preset, until, decidedOn },
  }));

  const updatedItem = updatedSnapshot.items.find((item) => item.catalogItemId === itemId) ?? null;

  return {
    planSnapshot: updatedSnapshot,
    item: updatedItem,
  };
}

export function clearItemOptOutInSnapshot(planSnapshot, profileId, itemId, clock = () => new Date()) {
  assertProfileScope(planSnapshot, profileId);
  resolveNow(clock);

  const updatedSnapshot = updateItemInSnapshot(planSnapshot, itemId, (item) => ({
    ...item,
    status: 'pending',
    optOut: undefined,
  }));

  const updatedItem = updatedSnapshot.items.find((item) => item.catalogItemId === itemId) ?? null;

  return {
    planSnapshot: updatedSnapshot,
    item: updatedItem,
  };
}

function generateCustomItemId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

// Turns a user-authored item (e.g. converting an unlinked appointment like
// "Physiotherapie") into a first-class plan item, tagged source: 'custom' so
// it stays clearly distinct from anything the rules engine generated from
// the locked catalog -- see the [SL-001] invariant test, which only ever
// asserts on generateInitialPlanSnapshot's own output and is untouched by
// items added here, after generation, through this separate path.
export function addCustomItemToSnapshot(planSnapshot, profileId, input = {}, clock = () => new Date()) {
  assertProfileScope(planSnapshot, profileId);
  const now = resolveNow(clock);

  const name = String(input?.name ?? '').trim();
  if (!name) {
    throw new Error('A name is required.');
  }

  const category = ALLOWED_PLAN_CATEGORIES.includes(input?.category) ? input.category : null;
  if (!category) {
    throw new Error('Please choose a category.');
  }

  const recurrenceDays = Number.isFinite(Number(input?.recurrenceDays)) && Number(input.recurrenceDays) > 0
    ? Number(input.recurrenceDays)
    : null;
  const cadenceLabel = String(input?.cadenceLabel ?? '').trim() || undefined;
  const interventionType = resolveInterventionTypeForCatalogItem({ category });
  const startDate = input?.startDate ? (parseIsoDateInput(input.startDate) ?? toIsoDate(now)) : toIsoDate(now);
  const note = String(input?.note ?? '').trim() || null;

  const item = {
    catalogItemId: generateCustomItemId(),
    name,
    category,
    interventionType,
    interventionTypeLabel: getInterventionTypeLabel(interventionType),
    effortLevel: 'medium',
    cadenceLabel,
    recurrence: {
      intervalDays: recurrenceDays,
      soonWindowDays: resolveSoonWindowDaysFromRecurrence(recurrenceDays),
    },
    whyItMatters: note,
    recommendationText: null,
    evidenceTier: null,
    uspstfGrade: null,
    requiresSharedDecision: false,
    targetAge: null,
    priorityOrder: 0,
    initialDueDate: startDate,
    nextDueDate: startDate,
    initialBucket: null,
    status: 'pending',
    source: 'custom',
    clinicalRegion: input?.clinicalRegion || null,
  };

  const currentItems = Array.isArray(planSnapshot?.items) ? cloneSnapshotItems(planSnapshot.items) : [];

  return {
    planSnapshot: {
      ...planSnapshot,
      items: [...currentItems, item],
    },
    item,
  };
}

// Converts a "not applicable" catalog item (as returned by
// resolveNonApplicableCatalogItems) into a real, explicitly-adopted plan
// item -- the user has decided the usual age/gender/risk-flag/guideline-
// country gating doesn't apply to their situation and wants it on their
// plan anyway. Tagged source: 'manually-adopted' so it stays clearly
// distinct from both a normal rule-matched item ('catalog') and a freeform
// user-authored one ('custom', see addCustomItemToSnapshot above) -- unlike
// that function, the real catalog copy (name/whyItMatters/
// recommendationText/sourceRef/etc.) is preserved rather than left blank
// for the user to type, since this is a real catalog item, just one the
// rules engine didn't include on its own.
export function adoptCatalogItemToSnapshot(planSnapshot, profileId, nonApplicableItem, clock = () => new Date()) {
  assertProfileScope(planSnapshot, profileId);
  const now = resolveNow(clock);

  const catalogItemId = String(nonApplicableItem?.catalogItemId ?? '').trim();
  if (!catalogItemId) {
    throw new Error('A catalog item is required.');
  }

  const currentItems = Array.isArray(planSnapshot?.items) ? cloneSnapshotItems(planSnapshot.items) : [];
  if (currentItems.some((existing) => existing.catalogItemId === catalogItemId)) {
    throw new Error('This item is already in your plan.');
  }

  const category = ALLOWED_PLAN_CATEGORIES.includes(nonApplicableItem?.category) ? nonApplicableItem.category : null;
  if (!category) {
    throw new Error('Please choose a category.');
  }

  const interventionType = resolveInterventionTypeForCatalogItem({ category });
  const recurrenceDays = Number.isFinite(Number(nonApplicableItem?.recurrenceIntervalDays)) && Number(nonApplicableItem.recurrenceIntervalDays) > 0
    ? Number(nonApplicableItem.recurrenceIntervalDays)
    : null;
  const todayIso = toIsoDate(now);

  const item = {
    catalogItemId,
    name: nonApplicableItem.name,
    category,
    interventionType,
    interventionTypeLabel: getInterventionTypeLabel(interventionType),
    effortLevel: 'medium',
    cadenceLabel: nonApplicableItem.cadenceLabel ?? undefined,
    recurrence: {
      intervalDays: recurrenceDays,
      soonWindowDays: resolveSoonWindowDaysFromRecurrence(recurrenceDays),
    },
    whyItMatters: nonApplicableItem.whyItMatters,
    recommendationText: nonApplicableItem.recommendationText,
    evidenceTier: nonApplicableItem.evidenceTier ?? null,
    uspstfGrade: nonApplicableItem.uspstfGrade ?? null,
    sourceRef: nonApplicableItem.sourceRef ?? null,
    requiresSharedDecision: false,
    matchedRiskFlags: [],
    targetAge: Number.isFinite(nonApplicableItem?.targetAge) ? nonApplicableItem.targetAge : null,
    priorityOrder: 0,
    initialDueDate: todayIso,
    nextDueDate: todayIso,
    initialBucket: null,
    status: 'pending',
    source: 'manually-adopted',
    clinicalRegion: null,
  };

  return {
    planSnapshot: {
      ...planSnapshot,
      items: [...currentItems, item],
    },
    item,
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

    setItemOptOut(targetProfileId, itemId, optOutInput = {}) {
      try {
        const result = setItemOptOutInSnapshot(getPlanSnapshot(), targetProfileId, itemId, optOutInput, clock);
        setPlanSnapshot(result.planSnapshot);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw error;
        }

        throw new Error(DETAIL_ACTION_ERRORS.action_failed);
      }
    },

    clearItemOptOut(targetProfileId, itemId) {
      try {
        const result = clearItemOptOutInSnapshot(getPlanSnapshot(), targetProfileId, itemId, clock);
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
