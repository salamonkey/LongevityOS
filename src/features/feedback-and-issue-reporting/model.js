export const FEEDBACK_CATEGORY = Object.freeze({
  BUG: 'bug',
  FEEDBACK: 'feedback',
  IDEA: 'idea',
  OTHER: 'other',
});

export const ALLOWED_FEEDBACK_CATEGORIES = Object.freeze(Object.values(FEEDBACK_CATEGORY));

export const FEEDBACK_DESCRIPTION_MAX_LENGTH = 2000;

export function isValidFeedbackCategory(value) {
  return ALLOWED_FEEDBACK_CATEGORIES.includes(value);
}

export function normalizeFeedbackDescription(value) {
  return String(value ?? '').trim();
}

// errors values are i18n key suffixes (e.g. `feedback.${errors.category}`),
// mirrored server-side in supabase/functions/report-feedback/index.ts since
// that Deno function can't import this module.
export function validateFeedbackReportInput(input = {}) {
  const errors = {};
  const category = String(input.category ?? '').trim();
  const description = normalizeFeedbackDescription(input.description);

  if (!isValidFeedbackCategory(category)) {
    errors.category = 'errorCategoryRequired';
  }
  if (!description) {
    errors.description = 'errorDescriptionRequired';
  } else if (description.length > FEEDBACK_DESCRIPTION_MAX_LENGTH) {
    errors.description = 'errorDescriptionTooLong';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
