import { MVP_PREVENTIVE_CATALOG } from '../self-onboarding-to-first-dashboard/catalog.js';

const RECOMMENDATION_TEXT_BY_ITEM_KEY = Object.freeze({
  'annual-wellness-visit': 'Schedule a yearly wellness visit so you and your clinician can review your preventive plan and update it as your needs change.',
  'blood-pressure-check': 'Check your blood pressure at least once a year, or sooner if your clinician recommends closer follow-up.',
  'cholesterol-screening': 'Repeat cholesterol screening every 4 to 6 years for most adults, with shorter intervals when personal risk is higher.',
  'diabetes-screening': 'Plan diabetes screening about every 3 years starting in adulthood, and discuss earlier or more frequent checks if risk factors apply.',
  'cervical-cancer-screening': 'Follow routine cervical screening on the recommended interval for your age group, usually every 3 to 5 years.',
  'prostate-health-discussion': 'Start a prostate health conversation around age 50 so screening decisions can match your values and personal risk.',
  'influenza-vaccine': 'Get a flu vaccine every year, ideally before each flu season begins.',
  'tdap-booster': 'Get a tetanus, diphtheria, and pertussis booster every 10 years to keep protection current.',
  'shingles-vaccine': "Complete the 2-dose shingles vaccine series after age 50, spaced according to your clinician's timing guidance.",
});

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export const LOCKED_PREVENTIVE_ITEM_DEFINITIONS = Object.freeze(
  MVP_PREVENTIVE_CATALOG.map((catalogItem) => ({
    itemKey: catalogItem.itemId,
    displayName: normalizeText(catalogItem.name),
    category: normalizeText(catalogItem.category),
    cadenceText: normalizeText(catalogItem.cadenceLabel),
    recommendationText: normalizeText(RECOMMENDATION_TEXT_BY_ITEM_KEY[catalogItem.itemId]),
    whyItMattersText: normalizeText(catalogItem.whyItMatters),
  })),
);

export const PREVENTIVE_ITEM_DEFINITION_INDEX = Object.freeze(
  LOCKED_PREVENTIVE_ITEM_DEFINITIONS.reduce((index, definition) => {
    index[definition.itemKey] = definition;
    return index;
  }, {}),
);

export function isCompletePreventiveItemDefinition(definition) {
  return Boolean(
    definition
      && normalizeText(definition.itemKey)
      && normalizeText(definition.displayName)
      && normalizeText(definition.category)
      && normalizeText(definition.cadenceText)
      && normalizeText(definition.recommendationText)
      && normalizeText(definition.whyItMattersText),
  );
}

export function assertCompletePreventiveDefinitions(definitions = LOCKED_PREVENTIVE_ITEM_DEFINITIONS) {
  const incompleteKeys = definitions
    .filter((definition) => !isCompletePreventiveItemDefinition(definition))
    .map((definition) => definition?.itemKey ?? 'unknown');

  if (incompleteKeys.length > 0) {
    throw new Error(`Preventive item definitions are incomplete: ${incompleteKeys.join(', ')}`);
  }

  return true;
}

assertCompletePreventiveDefinitions();
