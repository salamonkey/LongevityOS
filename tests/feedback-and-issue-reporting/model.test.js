import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_FEEDBACK_CATEGORIES,
  FEEDBACK_DESCRIPTION_MAX_LENGTH,
  isValidFeedbackCategory,
  normalizeFeedbackDescription,
  validateFeedbackReportInput,
} from '../../src/features/feedback-and-issue-reporting/model.js';

test('isValidFeedbackCategory accepts only the fixed category set', () => {
  for (const category of ALLOWED_FEEDBACK_CATEGORIES) {
    assert.equal(isValidFeedbackCategory(category), true);
  }
  assert.equal(isValidFeedbackCategory('urgent'), false);
  assert.equal(isValidFeedbackCategory(''), false);
});

test('normalizeFeedbackDescription trims whitespace and coerces non-strings', () => {
  assert.equal(normalizeFeedbackDescription('  hi  '), 'hi');
  assert.equal(normalizeFeedbackDescription(null), '');
  assert.equal(normalizeFeedbackDescription(undefined), '');
});

test('validateFeedbackReportInput rejects a missing category', () => {
  const { valid, errors } = validateFeedbackReportInput({ category: '', description: 'x' });
  assert.equal(valid, false);
  assert.equal(errors.category, 'errorCategoryRequired');
});

test('validateFeedbackReportInput rejects an empty description', () => {
  const { valid, errors } = validateFeedbackReportInput({ category: 'bug', description: '   ' });
  assert.equal(valid, false);
  assert.equal(errors.description, 'errorDescriptionRequired');
});

test('validateFeedbackReportInput rejects a description over the max length', () => {
  const tooLong = 'a'.repeat(FEEDBACK_DESCRIPTION_MAX_LENGTH + 1);
  const { valid, errors } = validateFeedbackReportInput({ category: 'bug', description: tooLong });
  assert.equal(valid, false);
  assert.equal(errors.description, 'errorDescriptionTooLong');
});

test('validateFeedbackReportInput accepts a valid report', () => {
  const { valid, errors } = validateFeedbackReportInput({ category: 'idea', description: 'Add dark mode' });
  assert.equal(valid, true);
  assert.deepEqual(errors, {});
});
