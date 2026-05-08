import {
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  getCategoryLabel,
  getCategoryRouteKey,
  getStatusLabel,
  isAllowedPlanCategory,
  isAllowedPlanStatus,
} from './model.js';
import {
  LOCKED_PREVENTIVE_ITEM_DEFINITIONS,
  PREVENTIVE_ITEM_DEFINITION_INDEX,
} from './definitions.js';

function toDefinitionIndex(definitions) {
  if (!Array.isArray(definitions)) {
    return PREVENTIVE_ITEM_DEFINITION_INDEX;
  }

  return definitions.reduce((index, definition) => {
    if (!definition?.itemKey) {
      return index;
    }

    index[definition.itemKey] = definition;
    return index;
  }, {});
}

function toSafeStatus(status) {
  return isAllowedPlanStatus(status) ? status : 'pending';
}

function toViewItem(generatedItem, definition) {
  const status = toSafeStatus(generatedItem?.status);

  return {
    itemKey: definition.itemKey,
    displayName: definition.displayName,
    category: definition.category,
    categoryLabel: getCategoryLabel(definition.category, 'singular'),
    interventionType: definition.interventionType,
    interventionTypeLabel: definition.interventionTypeLabel,
    cadenceText: definition.cadenceText,
    status,
    statusLabel: getStatusLabel(status),
    recommendationText: definition.recommendationText,
    whyItMattersText: definition.whyItMattersText,
  };
}

export function buildHealthPlanReadModel(planSnapshot, options = {}) {
  const definitions = options.definitions ?? LOCKED_PREVENTIVE_ITEM_DEFINITIONS;
  const definitionIndex = toDefinitionIndex(definitions);
  const generatedItems = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];

  const checkups = [];
  const vaccinations = [];
  const byItemKey = {};
  const missingDefinitionKeys = [];
  const unavailableItemKeys = [];

  for (const generatedItem of generatedItems) {
    const itemKey = generatedItem?.catalogItemId;
    const definition = definitionIndex[itemKey];

    if (!definition) {
      missingDefinitionKeys.push(itemKey);
      continue;
    }

    if (!isAllowedPlanCategory(definition.category)) {
      unavailableItemKeys.push(itemKey);
      continue;
    }

    const item = toViewItem(generatedItem, definition);

    byItemKey[item.itemKey] = item;
    if (item.category === PLAN_CATEGORIES.checkup) {
      checkups.push(item);
    } else if (item.category === PLAN_CATEGORIES.vaccination) {
      vaccinations.push(item);
    }
  }

  return {
    generatedAt: planSnapshot?.generatedAt ?? null,
    checkups,
    vaccinations,
    allItems: [...checkups, ...vaccinations],
    byItemKey,
    missingDefinitionKeys,
    unavailableItemKeys,
  };
}

export function resolveItemDetail(readModel, itemKey) {
  if (!itemKey) {
    return null;
  }

  return readModel?.byItemKey?.[itemKey] ?? null;
}

export function buildCoverageSnapshot(readModel, sourcePlanSnapshot) {
  const generatedItems = Array.isArray(sourcePlanSnapshot?.items) ? sourcePlanSnapshot.items : [];
  const generatedKeys = generatedItems.map((item) => item.catalogItemId);
  const visibleKeys = readModel.allItems.map((item) => item.itemKey);

  return {
    generatedKeys,
    visibleKeys,
    generatedCount: generatedKeys.length,
    visibleCount: visibleKeys.length,
  };
}

export function resolveDetailBackTarget({ origin, detailItem }) {
  if (origin === DETAIL_ORIGIN.dashboard) {
    return { destination: DETAIL_ORIGIN.dashboard };
  }

  if (origin === DETAIL_ORIGIN.checkups || origin === DETAIL_ORIGIN.vaccinations) {
    return { destination: origin };
  }

  return {
    destination: getCategoryRouteKey(detailItem?.category),
  };
}

export function buildCategoryTabs(activeCategory) {
  return [
    {
      key: DETAIL_ORIGIN.checkups,
      category: PLAN_CATEGORIES.checkup,
      label: getCategoryLabel(PLAN_CATEGORIES.checkup),
      isActive: activeCategory === PLAN_CATEGORIES.checkup,
    },
    {
      key: DETAIL_ORIGIN.vaccinations,
      category: PLAN_CATEGORIES.vaccination,
      label: getCategoryLabel(PLAN_CATEGORIES.vaccination),
      isActive: activeCategory === PLAN_CATEGORIES.vaccination,
    },
  ];
}
