import test from 'node:test';
import assert from 'node:assert/strict';

import { validateSelfProfileInput, validationMessages } from '../../src/features/self-onboarding-to-first-dashboard/validation.js';

test('validation requires age and gender', () => {
  const result = validateSelfProfileInput({ age: '', gender: '' });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.age, validationMessages.AGE_REQUIRED);
  assert.equal(result.errors.gender, validationMessages.GENDER_REQUIRED);
});

test('validation rejects non-integer age input', () => {
  const result = validateSelfProfileInput({ age: '27.5', gender: 'female' });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.age, validationMessages.AGE_WHOLE_NUMBER);
});

test('validation rejects age outside 0 to 120', () => {
  const result = validateSelfProfileInput({ age: '121', gender: 'male' });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.age, validationMessages.AGE_RANGE);
});

test('validation accepts age and gender with supported values', () => {
  const result = validateSelfProfileInput({ age: '42', gender: 'female' });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});
