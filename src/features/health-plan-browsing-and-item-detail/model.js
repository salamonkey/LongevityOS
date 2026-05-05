export const PLAN_CATEGORIES = Object.freeze({
  checkup: 'checkup',
  vaccination: 'vaccination',
});

export const PLAN_STATUSES = Object.freeze({
  due: 'due',
  planned: 'planned',
  done: 'done',
});

export const ALLOWED_PLAN_CATEGORIES = Object.freeze(Object.values(PLAN_CATEGORIES));
export const ALLOWED_PLAN_STATUSES = Object.freeze(Object.values(PLAN_STATUSES));

export const STATUS_LABELS = Object.freeze({
  due: 'Due now',
  planned: 'Plan',
  done: 'Done',
});

export const CATEGORY_LABELS = Object.freeze({
  checkup: {
    singular: 'Checkup',
    plural: 'Checkups',
  },
  vaccination: {
    singular: 'Vaccination',
    plural: 'Vaccinations',
  },
});

export const DETAIL_ORIGIN = Object.freeze({
  dashboard: 'dashboard',
  checkups: 'checkups',
  vaccinations: 'vaccinations',
  direct: 'direct',
});

export function isAllowedPlanCategory(value) {
  return ALLOWED_PLAN_CATEGORIES.includes(value);
}

export function isAllowedPlanStatus(value) {
  return ALLOWED_PLAN_STATUSES.includes(value);
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? STATUS_LABELS.planned;
}

export function getCategoryLabel(category, mode = 'plural') {
  const labels = CATEGORY_LABELS[category] ?? CATEGORY_LABELS.checkup;
  return labels[mode] ?? labels.plural;
}

export function getCategoryRouteKey(category) {
  return category === PLAN_CATEGORIES.vaccination ? DETAIL_ORIGIN.vaccinations : DETAIL_ORIGIN.checkups;
}
