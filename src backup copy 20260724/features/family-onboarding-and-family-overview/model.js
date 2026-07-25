export const FAMILY_PROFILE_LIMIT = 5;

export const ALLOWED_PROFILE_GENDERS = Object.freeze(['female', 'male']);

export const FAMILY_PROFILE_VALIDATION_ERRORS = Object.freeze({
  displayLabel: 'Enter a name for this profile.',
  ageMissing: 'Enter an age for this profile.',
  ageNumeric: 'Age must be a whole number.',
  ageRange: 'Age must be between 0 and 120.',
  gender: 'Choose a gender for this profile.',
});

export const FAMILY_ACCOUNT_ERRORS = Object.freeze({
  profileLimitReached: `You can manage up to ${FAMILY_PROFILE_LIMIT} profiles in one account.`,
  profileNotFound: 'This profile is not available in your account.',
  profileAlreadyExists: 'Your profile is already set up.',
  profileCreateFailed: 'We could not create this profile right now. Please try again.',
  planCreateFailed: 'We could not create this profile right now. Please try again.',
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
  if (!ALLOWED_PROFILE_GENDERS.includes(normalized)) {
    return null;
  }

  return normalized;
}

export function validateFamilyProfileInput(input) {
  const errors = {};

  const displayLabel = String(input?.displayLabel ?? '').trim();
  if (!displayLabel) {
    errors.displayLabel = FAMILY_PROFILE_VALIDATION_ERRORS.displayLabel;
  }

  const parsedAge = parseWholeAge(input?.age);
  if (!parsedAge.ok) {
    errors.age = FAMILY_PROFILE_VALIDATION_ERRORS[parsedAge.code];
  }

  const gender = normalizeGender(input?.gender);
  if (!gender) {
    errors.gender = FAMILY_PROFILE_VALIDATION_ERRORS.gender;
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

export function createHealthProfile(input, options = {}) {
  const validation = validateFamilyProfileInput(input);
  if (!validation.isValid) {
    const error = new Error('Health profile input is invalid.');
    error.validation = validation;
    throw error;
  }

  const nowValue = options.now instanceof Date
    ? new Date(options.now.getTime())
    : new Date(options.now ?? Date.now());

  const profileIdFactory = typeof options.profileIdFactory === 'function'
    ? options.profileIdFactory
    : (name) => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'family';
      const suffix = `${Math.floor(Math.random() * 100000)}`.padStart(5, '0');
      return `profile-${slug}-${suffix}`;
    };

  const displayLabel = validation.normalized.displayLabel;

  return {
    profileId: String(options.profileId ?? profileIdFactory(displayLabel)),
    displayLabel,
    name: displayLabel,
    age: validation.normalized.age,
    gender: validation.normalized.gender,
    createdAt: nowValue.toISOString(),
  };
}

export function buildSelfProfileFromOnboarding(input, options = {}) {
  const validation = validateFamilyProfileInput({
    displayLabel: 'Me',
    age: input?.age,
    gender: input?.gender,
  });

  if (!validation.isValid) {
    return validation;
  }

  const nowValue = options.now instanceof Date
    ? new Date(options.now.getTime())
    : new Date(options.now ?? Date.now());

  return {
    isValid: true,
    errors: {},
    normalized: {
      profileId: 'self',
      displayLabel: 'Me',
      name: 'Me',
      age: validation.normalized.age,
      gender: validation.normalized.gender,
      createdAt: nowValue.toISOString(),
    },
  };
}

export function formatProfileCountText(count, limit = FAMILY_PROFILE_LIMIT) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  return `${safeCount} of ${limit} profiles`;
}

export function canCreateAnotherProfile(profiles, limit = FAMILY_PROFILE_LIMIT) {
  const total = Array.isArray(profiles) ? profiles.length : 0;
  return total < limit;
}

export function toProfileDescriptor(profile) {
  if (!profile || typeof profile !== 'object') {
    return 'Age not set';
  }

  const age = Number.isInteger(profile.age) ? `Age ${profile.age}` : 'Age not set';
  const gender = ALLOWED_PROFILE_GENDERS.includes(profile.gender)
    ? `${profile.gender[0].toUpperCase()}${profile.gender.slice(1)}`
    : 'Gender not set';

  return `${age} - ${gender}`;
}
