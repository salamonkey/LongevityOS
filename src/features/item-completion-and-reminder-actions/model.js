import { getStatusLabel } from '../health-plan-browsing-and-item-detail/model.js';

export const REMINDER_TIMING_TYPES = Object.freeze({
  one_month: 'one_month',
  three_months: 'three_months',
  custom_date: 'custom_date',
});

export const ALLOWED_REMINDER_TIMING_TYPES = Object.freeze(Object.values(REMINDER_TIMING_TYPES));

export const REMINDER_OPTION_LABELS = Object.freeze({
  [REMINDER_TIMING_TYPES.one_month]: 'In 1 month',
  [REMINDER_TIMING_TYPES.three_months]: 'In 3 months',
  [REMINDER_TIMING_TYPES.custom_date]: 'Choose date',
});

export const DETAIL_ACTION_ERRORS = Object.freeze({
  missing_date: 'Please choose a reminder date.',
  past_date: 'Choose a future date for your reminder.',
  invalid_date: 'Enter a valid calendar date.',
  action_failed: 'We could not save your update. Please try again.',
});

function toDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  return new Date(value);
}

export function toIsoDate(value) {
  const parsed = toDate(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function parseIsoDateInput(value) {
  const trimmed = String(value ?? '').trim();
  const pattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = pattern.exec(trimmed);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function formatDateForConfirmation(isoDate, locale = 'en-US') {
  if (!isoDate || typeof isoDate !== 'string') {
    return 'your selected date';
  }

  const parsed = parseIsoDateInput(isoDate);
  if (!parsed) {
    return 'your selected date';
  }

  const date = new Date(`${parsed}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function addMonthsToIsoDate(baseIsoDate, months) {
  const [yearText, monthText, dayText] = baseIsoDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const candidate = new Date(Date.UTC(year, month - 1 + months, day));
  const monthOverflowed = candidate.getUTCDate() !== day;

  if (!monthOverflowed) {
    return candidate.toISOString().slice(0, 10);
  }

  const endOfTargetMonth = new Date(Date.UTC(year, month - 1 + months + 1, 0));
  return endOfTargetMonth.toISOString().slice(0, 10);
}

export function resolveReminderScheduledFor(reminderInput, nowValue = new Date()) {
  const timingType = reminderInput?.timingType;
  const todayIso = toIsoDate(nowValue);

  if (!todayIso) {
    throw new Error('Invalid current date for reminder resolution.');
  }

  if (timingType === REMINDER_TIMING_TYPES.one_month) {
    return {
      timingType,
      scheduledFor: addMonthsToIsoDate(todayIso, 1),
    };
  }

  if (timingType === REMINDER_TIMING_TYPES.three_months) {
    return {
      timingType,
      scheduledFor: addMonthsToIsoDate(todayIso, 3),
    };
  }

  if (timingType === REMINDER_TIMING_TYPES.custom_date) {
    const customIsoDate = parseIsoDateInput(reminderInput?.customDate);

    if (!customIsoDate) {
      const missingDate = String(reminderInput?.customDate ?? '').trim().length === 0;
      throw new Error(missingDate ? DETAIL_ACTION_ERRORS.missing_date : DETAIL_ACTION_ERRORS.invalid_date);
    }

    if (customIsoDate <= todayIso) {
      throw new Error(DETAIL_ACTION_ERRORS.past_date);
    }

    return {
      timingType,
      scheduledFor: customIsoDate,
    };
  }

  throw new Error(`Unsupported reminder timing type: ${timingType}`);
}

export function getReminderOptionLabel(timingType) {
  return REMINDER_OPTION_LABELS[timingType] ?? REMINDER_OPTION_LABELS[REMINDER_TIMING_TYPES.custom_date];
}

export function getSafeStatusLabel(status) {
  return getStatusLabel(status);
}
