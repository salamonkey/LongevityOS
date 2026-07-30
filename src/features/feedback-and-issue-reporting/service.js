import { getSupabaseClient } from '../../lib/persistence/supabaseLivePlans.js';
import {
  isValidFeedbackCategory,
  normalizeFeedbackDescription,
  FEEDBACK_DESCRIPTION_MAX_LENGTH,
} from './model.js';

function resolveAppVersion() {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
}

export async function submitFeedbackReport(input = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const category = String(input.category ?? '').trim();
  if (!isValidFeedbackCategory(category)) {
    throw new Error('Choose a category.');
  }

  const description = normalizeFeedbackDescription(input.description);
  if (!description) {
    throw new Error('Description is required.');
  }
  if (description.length > FEEDBACK_DESCRIPTION_MAX_LENGTH) {
    throw new Error(`Keep it under ${FEEDBACK_DESCRIPTION_MAX_LENGTH} characters.`);
  }

  const { data, error } = await client.functions.invoke('report-feedback', {
    body: {
      category,
      description,
      route: String(input.route ?? '').trim(),
      appVersion: resolveAppVersion(),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
