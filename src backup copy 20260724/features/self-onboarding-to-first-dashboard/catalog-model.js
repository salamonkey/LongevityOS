export const INTERVENTION_TYPE_LABELS = Object.freeze({
  'preventive-visit': 'Preventive visit',
  screening: 'Screening',
  counseling: 'Counseling',
  'shared-decision': 'Shared decision',
  vaccination: 'Vaccination',
  preventive: 'Preventive care',
});

export const EFFORT_LEVELS = Object.freeze({
  low: 'low',
  medium: 'medium',
  high: 'high',
});

function normalizeCatalogText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

export function resolveInterventionTypeForCatalogItem(catalogItem = {}) {
  const category = normalizeCatalogText(catalogItem.category);
  const itemId = normalizeCatalogText(catalogItem.itemId);

  if (category === 'vaccination') {
    return 'vaccination';
  }

  if (itemId === 'annual-wellness-visit') {
    return 'preventive-visit';
  }

  if (
    itemId.includes('screening')
    || itemId === 'blood-pressure-check'
  ) {
    return 'screening';
  }

  if (
    itemId.includes('discussion')
    || itemId.includes('cessation')
    || itemId.includes('alcohol-use')
  ) {
    return itemId.includes('discussion') ? 'shared-decision' : 'counseling';
  }

  return 'preventive';
}

export function getInterventionTypeLabel(interventionType) {
  return INTERVENTION_TYPE_LABELS[normalizeCatalogText(interventionType)] ?? INTERVENTION_TYPE_LABELS.preventive;
}
