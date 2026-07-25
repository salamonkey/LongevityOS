import { PLAN_CATEGORIES, PLAN_STATUSES } from './model.js';

// Presentation-only mapping from a plan item's status/category to the new
// design-system's ListRow tone and Badge status vocabulary. Deliberately
// separate from model.js's STATUS_LABELS/CATEGORY_LABELS (the domain-level
// English label maps other code and tests assert against) — this file only
// decides colors/icons, never copy.
const TONE_BY_STATUS = Object.freeze({
  [PLAN_STATUSES.done]: 'green',
  [PLAN_STATUSES.due]: 'primary',
  [PLAN_STATUSES.pending]: 'neutral',
  [PLAN_STATUSES.planned]: 'teal',
  soon: 'amber',
  overdue: 'red',
});

const BADGE_STATUS_BY_STATUS = Object.freeze({
  [PLAN_STATUSES.done]: 'done',
  [PLAN_STATUSES.due]: 'due',
  [PLAN_STATUSES.pending]: 'neutral',
  [PLAN_STATUSES.planned]: 'neutral',
  soon: 'upcoming',
  overdue: 'overdue',
});

const TONE_COLORS = Object.freeze({
  primary: ['var(--color-primary-soft)', 'var(--color-primary)'],
  teal: ['var(--color-secondary-soft)', 'var(--color-secondary)'],
  green: ['var(--status-done-soft)', 'var(--status-done)'],
  amber: ['var(--status-upcoming-soft)', 'var(--status-upcoming)'],
  red: ['var(--status-overdue-soft)', 'var(--status-overdue)'],
  neutral: ['var(--surface-sunken)', 'var(--slate-500)'],
});

const ICON_BY_CATEGORY = Object.freeze({
  [PLAN_CATEGORIES.checkup]: 'stethoscope',
  [PLAN_CATEGORIES.vaccination]: 'syringe',
  [PLAN_CATEGORIES.counseling]: 'shield-check',
});

const LABEL_KEY_BY_STATUS = Object.freeze({
  [PLAN_STATUSES.done]: 'status.done',
  [PLAN_STATUSES.due]: 'status.due',
  [PLAN_STATUSES.pending]: 'status.pending',
  [PLAN_STATUSES.planned]: 'status.planned',
  soon: 'status.soon',
  overdue: 'status.overdue',
});

const LABEL_KEY_BY_CATEGORY = Object.freeze({
  [PLAN_CATEGORIES.checkup]: { singular: 'category.checkupSingular', plural: 'category.checkupPlural' },
  [PLAN_CATEGORIES.vaccination]: { singular: 'category.vaccinationSingular', plural: 'category.vaccinationPlural' },
  [PLAN_CATEGORIES.counseling]: { singular: 'category.counselingSingular', plural: 'category.counselingPlural' },
});

const LABEL_KEY_BY_INTERVENTION_TYPE = Object.freeze({
  'preventive-visit': 'interventionType.preventiveVisit',
  screening: 'interventionType.screening',
  counseling: 'interventionType.counseling',
  'shared-decision': 'interventionType.sharedDecision',
  vaccination: 'interventionType.vaccination',
  preventive: 'interventionType.preventive',
});

export function getStatusTone(status) {
  return TONE_BY_STATUS[status] ?? 'neutral';
}

export function getToneColors(tone) {
  return TONE_COLORS[tone] ?? TONE_COLORS.neutral;
}

export function getStatusBadgeStatus(status) {
  return BADGE_STATUS_BY_STATUS[status] ?? 'neutral';
}

export function getCategoryIcon(category) {
  return ICON_BY_CATEGORY[category] ?? 'stethoscope';
}

export function getStatusLabelKey(status) {
  return LABEL_KEY_BY_STATUS[status] ?? 'status.pending';
}

export function getCategoryLabelKey(category, mode = 'plural') {
  const keys = LABEL_KEY_BY_CATEGORY[category] ?? LABEL_KEY_BY_CATEGORY[PLAN_CATEGORIES.checkup];
  return keys[mode] ?? keys.plural;
}

export function getInterventionTypeLabelKey(interventionType) {
  return LABEL_KEY_BY_INTERVENTION_TYPE[interventionType] ?? 'interventionType.preventive';
}
