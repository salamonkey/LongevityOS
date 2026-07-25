import {
  getInterventionTypeLabel,
  resolveInterventionTypeForCatalogItem,
} from '../self-onboarding-to-first-dashboard/catalog-model.js';
import {
  getRuntimeCatalog,
} from '../../lib/catalog/runtimeCatalog.js';

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function toDefinition(catalogItem = {}) {
  const interventionType = resolveInterventionTypeForCatalogItem(catalogItem);
  // ruleBands[0] is a best-effort fallback for evidence tier/SDM display when an item is
  // opened outside its plan context (see fallbackDefinition in ItemCompletionAndReminderActions.jsx);
  // the authoritative, profile-matched values come from the generated plan item instead.
  const defaultBand = Array.isArray(catalogItem.ruleBands) ? catalogItem.ruleBands[0] : null;

  return {
    itemKey: catalogItem.itemId,
    displayName: normalizeText(catalogItem.name),
    category: normalizeText(catalogItem.category),
    interventionType: normalizeText(interventionType),
    interventionTypeLabel: normalizeText(getInterventionTypeLabel(interventionType)),
    cadenceText: normalizeText(catalogItem.cadenceLabel),
    recommendationText: normalizeText(catalogItem.recommendationText ?? catalogItem.whyItMatters),
    whyItMattersText: normalizeText(catalogItem.whyItMatters),
    evidenceTier: defaultBand?.evidenceTier ?? null,
    requiresSharedDecision: Boolean(defaultBand?.requiresSharedDecision),
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
