const AGE_REQUIRED = 'Age is required.';
const AGE_WHOLE_NUMBER = 'Enter a whole number.';
const AGE_RANGE = 'Enter an age from 0 to 120.';
const GENDER_REQUIRED = 'Select a gender to continue.';

export function validateSelfProfileInput(input) {
  const errors = {};
  const ageValue = (input?.age ?? '').toString().trim();
  const genderValue = input?.gender;

  if (!ageValue) {
    errors.age = AGE_REQUIRED;
  } else if (!/^\d+$/.test(ageValue)) {
    errors.age = AGE_WHOLE_NUMBER;
  } else {
    const age = Number(ageValue);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.age = AGE_RANGE;
    }
  }

  if (genderValue !== 'female' && genderValue !== 'male') {
    errors.gender = GENDER_REQUIRED;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeSelfProfileInput(input) {
  return {
    age: Number((input?.age ?? '').toString().trim()),
    gender: input?.gender,
  };
}

export const validationMessages = {
  AGE_REQUIRED,
  AGE_WHOLE_NUMBER,
  AGE_RANGE,
  GENDER_REQUIRED,
};
