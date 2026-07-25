import {
  REMINDER_TIMING_TYPES,
} from '../item-completion-and-reminder-actions/model.js';

export const PROFILE_AREA_PROFILE_LIMIT = 5;

export const PROFILE_AREA_ALLOWED_GENDERS = Object.freeze(['female', 'male']);

export const PROFILE_AREA_ALLOWED_DESTINATIONS = Object.freeze([
  'dashboard',
  'plan',
  'vaccinations',
]);

export const PROFILE_AREA_ALLOWED_PROFILE_ACTIONS = Object.freeze([
  'create',
  'view',
  'edit',
]);

export const PROFILE_AREA_VALIDATION_ERRORS = Object.freeze({
  displayLabel: 'Enter a name for this profile.',
  ageMissing: 'Enter an age for this profile.',
  ageNumeric: 'Age must be a whole number.',
  ageRange: 'Age must be between 0 and 120.',
  gender: 'Choose a gender for this profile.',
});

export const PROFILE_AREA_ERRORS = Object.freeze({
  profileLimitReached: `You can manage up to ${PROFILE_AREA_PROFILE_LIMIT} profiles in one account.`,
  profileNotFound: 'This profile is not available in your account.',
  profileCreateFailed: 'We could not create this profile right now. Please try again.',
  profileUpdateFailed: 'We could not save your changes right now. Please try again.',
  planRegenerationFailed: 'We could not update this profile plan right now. Please try again.',
  invalidDestination: 'This destination is not available right now.',
});

export const PROFILE_AREA_REMINDER_SETTINGS_ERRORS = Object.freeze({
  remindersEnabled: 'Choose whether reminders are on or off.',
  defaultTiming: 'Choose a default reminder timing.',
});

export const PROFILE_AREA_ALLOWED_REMINDER_DEFAULT_TIMINGS = Object.freeze([
  REMINDER_TIMING_TYPES.one_month,
  REMINDER_TIMING_TYPES.three_months,
]);

export const PROFILE_AREA_REMINDER_TIMING_LABELS = Object.freeze({
  [REMINDER_TIMING_TYPES.one_month]: '1 month before a due item',
  [REMINDER_TIMING_TYPES.three_months]: '3 months before a due item',
});

export const DEFAULT_PROFILE_AREA_REMINDER_SETTINGS = Object.freeze({
  remindersEnabled: true,
  defaultTiming: REMINDER_TIMING_TYPES.one_month,
});

function parseWholeAge(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return { ok: false, code: 'ageMissing' };
  }

  if (!/^\d+$/.test(text)) {
    return { ok: false, code: 'ageNumeric' };
  }

  const age = Number(text);
  if (!Number.isInteger(age) || age < 0 || age > 120) {
    return { ok: false, code: 'ageRange' };
  }

  return { ok: true, value: age };
}

function normalizeGender(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!PROFILE_AREA_ALLOWED_GENDERS.includes(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeDisplayLabel(value) {
  return String(value ?? '').trim();
}

export function validateProfileBasicsInput(input) {
  const errors = {};

  const displayLabel = normalizeDisplayLabel(input?.displayLabel);
  if (!displayLabel) {
    errors.displayLabel = PROFILE_AREA_VALIDATION_ERRORS.displayLabel;
  }

  const parsedAge = parseWholeAge(input?.age);
  if (!parsedAge.ok) {
    errors.age = PROFILE_AREA_VALIDATION_ERRORS[parsedAge.code];
  }

  const gender = normalizeGender(input?.gender);
  if (!gender) {
    errors.gender = PROFILE_AREA_VALIDATION_ERRORS.gender;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      displayLabel,
      age: parsedAge.ok ? parsedAge.value : null,
      gender,
    },
  };
}

export function validateReminderSettingsInput(input) {
  const errors = {};

  const remindersEnabled = input?.remindersEnabled;
  if (typeof remindersEnabled !== 'boolean') {
    errors.remindersEnabled = PROFILE_AREA_REMINDER_SETTINGS_ERRORS.remindersEnabled;
  }

  const defaultTiming = String(input?.defaultTiming ?? '').trim();
  if (!PROFILE_AREA_ALLOWED_REMINDER_DEFAULT_TIMINGS.includes(defaultTiming)) {
    errors.defaultTiming = PROFILE_AREA_REMINDER_SETTINGS_ERRORS.defaultTiming;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      remindersEnabled: typeof remindersEnabled === 'boolean' ? remindersEnabled : null,
      defaultTiming,
    },
  };
}

export function canCreateAnotherProfile(profiles, limit = PROFILE_AREA_PROFILE_LIMIT) {
  const total = Array.isArray(profiles) ? profiles.length : 0;
  return total < limit;
}

export function hasPlanInputChanges(previousProfile, nextInput) {
  if (!previousProfile || !nextInput) {
    return false;
  }

  const nextAge = Number(nextInput.age);
  const nextGender = String(nextInput.gender ?? '').trim().toLowerCase();

  return previousProfile.age !== nextAge || previousProfile.gender !== nextGender;
}

export function formatProfileDescriptor(profile) {
  if (!profile || typeof profile !== 'object') {
    return 'Age not set - Gender not set';
  }

  const age = Number.isInteger(profile.age) ? `Age ${profile.age}` : 'Age not set';
  const gender = PROFILE_AREA_ALLOWED_GENDERS.includes(profile.gender)
    ? `${profile.gender[0].toUpperCase()}${profile.gender.slice(1)}`
    : 'Gender not set';

  return `${age} - ${gender}`;
}

export function formatProfileCountText(count, limit = PROFILE_AREA_PROFILE_LIMIT) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  return `${safeCount} of ${limit} profiles`;
}
