import {
  getInterventionTypeLabel,
  resolveInterventionTypeForCatalogItem,
} from '../self-onboarding-to-first-dashboard/catalog-model.js';
import {
  getRuntimeCatalog,
} from '../../lib/catalog/runtimeCatalog.js';

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
  'covid-19-booster': 'Follow current booster guidance with your clinician to maintain protection against severe COVID-19 outcomes.',
  'hepatitis-b-vaccine': 'Complete the hepatitis B vaccination series when indicated by your age, history, or risk profile.',
});

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function toDefinition(catalogItem = {}) {
  const interventionType = resolveInterventionTypeForCatalogItem(catalogItem);
  return {
    itemKey: catalogItem.itemId,
    displayName: normalizeText(catalogItem.name),
    category: normalizeText(catalogItem.category),
    interventionType: normalizeText(interventionType),
    interventionTypeLabel: normalizeText(getInterventionTypeLabel(interventionType)),
    cadenceText: normalizeText(catalogItem.cadenceLabel),
    recommendationText: normalizeText(
      RECOMMENDATION_TEXT_BY_ITEM_KEY[catalogItem.itemId] ?? catalogItem.whyItMatters,
    ),
    whyItMattersText: normalizeText(catalogItem.whyItMatters),
  };
}

export function buildPreventiveItemDefinitionsFromCatalog(catalog = getRuntimeCatalog()) {
  if (!Array.isArray(catalog)) {
    return [];
  }

  return catalog.map(toDefinition);
}

export function buildPreventiveItemDefinitionIndex(definitions = buildPreventiveItemDefinitionsFromCatalog()) {
  return definitions.reduce((index, definition) => {
    if (!definition?.itemKey) {
      return index;
    }

    index[definition.itemKey] = definition;
    return index;
  }, {});
}

export const LOCKED_PREVENTIVE_ITEM_DEFINITIONS = Object.freeze(buildPreventiveItemDefinitionsFromCatalog());

export const PREVENTIVE_ITEM_DEFINITION_INDEX = Object.freeze(
  buildPreventiveItemDefinitionIndex(LOCKED_PREVENTIVE_ITEM_DEFINITIONS),
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
