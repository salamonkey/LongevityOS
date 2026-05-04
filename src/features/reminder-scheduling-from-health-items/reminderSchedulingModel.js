import {
  HEALTH_ITEM_STATUS,
  loadPersistedHealthItems,
  mergePersistedHealthItems,
} from '../health-item-detail-and-completion/healthItemsModel.js';

export const REMINDER_TIMING_TYPE = Object.freeze({
  ONE_MONTH: 'ONE_MONTH',
  THREE_MONTHS: 'THREE_MONTHS',
  CUSTOM_DATE: 'CUSTOM_DATE',
});

const TIMING_TYPES = new Set(Object.values(REMINDER_TIMING_TYPE));
const REMINDER_STORAGE_KEY_PREFIX = 'sl-004-reminders:';

export function loadReminderSchedulingItems(profile) {
  const persistedItems = loadPersistedHealthItems(profile.profileId);
  const mergedItems = mergePersistedHealthItems(profile, persistedItems);
  const reminders = loadPersistedReminderRecords(profile.profileId);
  return applyReminderProjection(mergedItems, reminders);
}

export function applyReminderProjection(healthItems, reminderRecords) {
  const remindersByItemId = new Map(
    reminderRecords.map((record) => [record.healthItemId, record]),
  );

  return healthItems.map((item) => {
    const reminder = remindersByItemId.get(item.id) ?? null;

    return {
      ...item,
      supportsReminder: supportsReminderForItem(item),
      reminder,
      hasReminder: Boolean(reminder),
      reminderDateLabel: reminder ? formatReminderDateForDisplay(reminder.remindOnDate) : '',
    };
  });
}

export function supportsReminderForItem(item) {
  return Boolean(item?.id);
}

export function loadPersistedReminderRecords(profileId) {
  if (!profileId || !globalThis.localStorage) {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(`${REMINDER_STORAGE_KEY_PREFIX}${profileId}`);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidReminderRecord);
  } catch {
    return [];
  }
}

export function persistReminderRecords(profileId, reminderRecords) {
  if (!profileId || !globalThis.localStorage) {
    return;
  }

  globalThis.localStorage.setItem(
    `${REMINDER_STORAGE_KEY_PREFIX}${profileId}`,
    JSON.stringify(reminderRecords.filter(isValidReminderRecord)),
  );
}

export function upsertReminderRecord({
  profileId,
  healthItem,
  reminderRecords,
  timingType,
  customDate,
  now = new Date(),
}) {
  if (!profileId) {
    throw new Error('Profile id is required to save a reminder.');
  }

  if (!supportsReminderForItem(healthItem)) {
    throw new Error('This health item does not support reminders.');
  }

  if (!TIMING_TYPES.has(timingType)) {
    throw new Error('Unsupported reminder timing type.');
  }

  const nowIso = toIsoTimestamp(now);
  const remindOnDate = resolveReminderDate({ timingType, customDate, now });

  const nextRecord = {
    profileId,
    healthItemId: healthItem.id,
    timingType,
    remindOnDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  let replaced = false;
  const updatedRecords = reminderRecords.map((record) => {
    if (record.profileId !== profileId || record.healthItemId !== healthItem.id) {
      return record;
    }

    replaced = true;
    return {
      ...record,
      timingType: nextRecord.timingType,
      remindOnDate: nextRecord.remindOnDate,
      updatedAt: nowIso,
    };
  });

  if (!replaced) {
    updatedRecords.push(nextRecord);
  }

  return updatedRecords;
}

export function resolveReminderDate({ timingType, customDate, now = new Date() }) {
  if (timingType === REMINDER_TIMING_TYPE.ONE_MONTH) {
    return addCalendarMonthsAsDateOnly(now, 1);
  }

  if (timingType === REMINDER_TIMING_TYPE.THREE_MONTHS) {
    return addCalendarMonthsAsDateOnly(now, 3);
  }

  const customDateOnly = toDateOnly(customDate);
  if (!customDateOnly) {
    throw new Error('A custom reminder date is required.');
  }

  if (isDateBeforeToday(customDateOnly, now)) {
    throw new Error('Choose today or a future date.');
  }

  return customDateOnly;
}

export function addCalendarMonthsAsDateOnly(input, monthsToAdd) {
  const baseDate = toValidDate(input);
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const day = baseDate.getUTCDate();

  const targetMonthIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, normalizedTargetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDayOfMonth);

  const targetDate = new Date(Date.UTC(targetYear, normalizedTargetMonth, targetDay));
  return toDateOnly(targetDate);
}

export function formatReminderDateForDisplay(dateOnly, locale = 'en-US') {
  const isoText = toDateOnly(dateOnly);
  if (!isoText) {
    return 'Date to be confirmed';
  }

  const parsed = new Date(`${isoText}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date to be confirmed';
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function getReminderStatusText(reminder) {
  if (!reminder) {
    return 'No reminder saved yet.';
  }

  return `Reminder set for ${formatReminderDateForDisplay(reminder.remindOnDate)}.`;
}

export function getReminderTimingLabel(timingType) {
  if (timingType === REMINDER_TIMING_TYPE.ONE_MONTH) {
    return 'In 1 month';
  }

  if (timingType === REMINDER_TIMING_TYPE.THREE_MONTHS) {
    return 'In 3 months';
  }

  return 'Custom date';
}

export function isReminderSupportedStatus(status) {
  return (
    status === HEALTH_ITEM_STATUS.DUE
    || status === HEALTH_ITEM_STATUS.PLANNED
    || status === HEALTH_ITEM_STATUS.DONE
  );
}

function isDateBeforeToday(dateOnly, nowDate) {
  const today = toDateOnly(nowDate);
  if (!today) {
    return false;
  }

  return dateOnly < today;
}

function toIsoTimestamp(input) {
  return toValidDate(input).toISOString();
}

function toValidDate(input) {
  const parsed = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Date value must be valid.');
  }

  return parsed;
}

function toDateOnly(input) {
  if (!input) {
    return '';
  }

  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const parsed = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidReminderRecord(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  return (
    typeof record.profileId === 'string'
    && record.profileId.length > 0
    && typeof record.healthItemId === 'string'
    && record.healthItemId.length > 0
    && TIMING_TYPES.has(record.timingType)
    && /^\d{4}-\d{2}-\d{2}$/.test(String(record.remindOnDate ?? ''))
    && typeof record.createdAt === 'string'
    && record.createdAt.length > 0
    && typeof record.updatedAt === 'string'
    && record.updatedAt.length > 0
  );
}
