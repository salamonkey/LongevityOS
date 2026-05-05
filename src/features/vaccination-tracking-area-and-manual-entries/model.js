import { MVP_PREVENTIVE_CATALOG } from '../self-onboarding-to-first-dashboard/catalog.js';
import { buildPlanReadModelForSlice } from '../item-completion-and-reminder-actions/selectors.js';
import { parseIsoDateInput } from '../item-completion-and-reminder-actions/model.js';

export const MANUAL_ENTRY_STATUS_CONTEXT = Object.freeze({
  completed: 'completed',
  planned: 'planned',
});

export const ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS = Object.freeze(
  Object.values(MANUAL_ENTRY_STATUS_CONTEXT),
);

export const MANUAL_ENTRY_STATUS_LABELS = Object.freeze({
  completed: 'Completed',
  planned: 'Planned',
});

export const MANUAL_ENTRY_VALIDATION_ERRORS = Object.freeze({
  vaccinationKey: 'Choose a vaccination item.',
  statusContext: 'Choose whether this entry is completed or planned.',
  entryDateMissing: 'Choose a date for this vaccination entry.',
  entryDateInvalid: 'Enter a valid calendar date.',
  entryDateFutureForCompleted: 'Completed vaccinations cannot use a future date.',
  entryDateFutureForPlanned: 'Planned vaccinations require a future date.',
  saveFailed: 'We could not save this vaccination entry. Please try again.',
});

const MANUAL_STATUS_TO_PLAN_STATUS = Object.freeze({
  [MANUAL_ENTRY_STATUS_CONTEXT.completed]: 'done',
  [MANUAL_ENTRY_STATUS_CONTEXT.planned]: 'planned',
});

const VACCINATION_DEFINITION_INDEX = Object.freeze(
  MVP_PREVENTIVE_CATALOG
    .filter((item) => item.category === 'vaccination')
    .reduce((index, item) => {
      index[item.itemId] = item;
      return index;
    }, {}),
);

function resolveNow(options = {}) {
  const now = options.now instanceof Date ? new Date(options.now.getTime()) : new Date(options.now ?? Date.now());

  if (Number.isNaN(now.getTime())) {
    return new Date();
  }

  return now;
}

export function formatVaccinationEntryDate(isoDate, locale = 'en-US') {
  const normalized = parseIsoDateInput(isoDate);

  if (!normalized) {
    return 'Date not available';
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function toAllowedVaccinationKeys(planSnapshot) {
  // Manual-entry options should remain stable even when a profile's current
  // plan only surfaces a subset of vaccination items.
  return Object.keys(VACCINATION_DEFINITION_INDEX);
}

export function buildManualVaccinationCatalogOptions(planSnapshot) {
  return toAllowedVaccinationKeys(planSnapshot).map((itemKey) => {
    const catalogItem = VACCINATION_DEFINITION_INDEX[itemKey];
    return {
      value: itemKey,
      label: catalogItem?.name ?? 'Vaccination item',
    };
  });
}

export function buildVaccinationDueGuidance(planSnapshot) {
  const readModel = buildPlanReadModelForSlice(planSnapshot);

  return readModel.vaccinations.map((item) => ({
    itemKey: item.itemKey,
    name: item.displayName,
    category: 'vaccination',
    categoryLabel: item.categoryLabel,
    cadenceLabel: item.cadenceText,
    whyItMatters: item.whyItMattersText,
    status: item.status,
    statusLabel: item.statusLabel,
    recommendation: item.recommendationText,
    reminderDateLabel: item.reminderDateLabel,
  }));
}

export function validateManualVaccinationEntryInput(input, options = {}) {
  const errors = {};
  const allowedVaccinationKeys = options.allowedVaccinationKeys ?? [];

  const vaccinationKey = String(input?.vaccinationKey ?? '').trim();
  const statusContext = String(input?.statusContext ?? '').trim();
  const entryDate = String(input?.entryDate ?? '').trim();

  if (!vaccinationKey || !allowedVaccinationKeys.includes(vaccinationKey)) {
    errors.vaccinationKey = MANUAL_ENTRY_VALIDATION_ERRORS.vaccinationKey;
  }

  if (!ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS.includes(statusContext)) {
    errors.statusContext = MANUAL_ENTRY_VALIDATION_ERRORS.statusContext;
  }

  if (!entryDate) {
    errors.entryDate = MANUAL_ENTRY_VALIDATION_ERRORS.entryDateMissing;
  }

  const normalizedDate = parseIsoDateInput(entryDate);
  if (entryDate && !normalizedDate) {
    errors.entryDate = MANUAL_ENTRY_VALIDATION_ERRORS.entryDateInvalid;
  }

  const now = resolveNow(options);
  const todayIso = now.toISOString().slice(0, 10);

  if (
    statusContext === MANUAL_ENTRY_STATUS_CONTEXT.completed
    && normalizedDate
    && normalizedDate > todayIso
  ) {
    errors.entryDate = MANUAL_ENTRY_VALIDATION_ERRORS.entryDateFutureForCompleted;
  }

  if (
    statusContext === MANUAL_ENTRY_STATUS_CONTEXT.planned
    && normalizedDate
    && normalizedDate <= todayIso
  ) {
    errors.entryDate = MANUAL_ENTRY_VALIDATION_ERRORS.entryDateFutureForPlanned;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      vaccinationKey,
      statusContext,
      entryDate: normalizedDate,
    },
  };
}

export function createManualVaccinationEntry(input, options = {}) {
  const profileId = String(options.profileId ?? 'self').trim() || 'self';
  const now = resolveNow(options);
  const createdAt = now.toISOString();

  const validation = validateManualVaccinationEntryInput(input, {
    allowedVaccinationKeys: options.allowedVaccinationKeys ?? [],
    now,
  });

  if (!validation.isValid) {
    const error = new Error('Manual vaccination entry is invalid.');
    error.validation = validation;
    throw error;
  }

  const idFactory = typeof options.idFactory === 'function'
    ? options.idFactory
    : () => `manual-vaccination-${now.getTime()}-${Math.floor(Math.random() * 1000000)}`;

  return {
    id: idFactory(),
    profileId,
    vaccinationKey: validation.normalized.vaccinationKey,
    statusContext: validation.normalized.statusContext,
    entryDate: validation.normalized.entryDate,
    createdAt,
  };
}

export function sortManualVaccinationEntries(entries = []) {
  const cloned = Array.isArray(entries) ? [...entries] : [];

  cloned.sort((left, right) => {
    const leftDate = parseIsoDateInput(left?.entryDate) ?? '0000-00-00';
    const rightDate = parseIsoDateInput(right?.entryDate) ?? '0000-00-00';

    if (leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate);
    }

    const leftCreatedAt = String(left?.createdAt ?? '');
    const rightCreatedAt = String(right?.createdAt ?? '');
    return rightCreatedAt.localeCompare(leftCreatedAt);
  });

  return cloned;
}

function resolveVaccinationName(vaccinationKey, guidanceIndex) {
  if (guidanceIndex[vaccinationKey]?.name) {
    return guidanceIndex[vaccinationKey].name;
  }

  return VACCINATION_DEFINITION_INDEX[vaccinationKey]?.name ?? 'Vaccination item';
}

export function buildManualVaccinationRows(entries, planSnapshot, options = {}) {
  const locale = options.locale ?? 'en-US';
  const guidance = buildVaccinationDueGuidance(planSnapshot);
  const guidanceIndex = guidance.reduce((index, item) => {
    index[item.itemKey] = item;
    return index;
  }, {});

  return sortManualVaccinationEntries(entries).map((entry) => {
    const statusContext = ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS.includes(entry?.statusContext)
      ? entry.statusContext
      : MANUAL_ENTRY_STATUS_CONTEXT.planned;

    const statusLabel = MANUAL_ENTRY_STATUS_LABELS[statusContext];
    const planStatus = MANUAL_STATUS_TO_PLAN_STATUS[statusContext];
    const relatedItem = guidanceIndex[entry.vaccinationKey] ?? null;

    return {
      id: entry.id,
      vaccinationKey: entry.vaccinationKey,
      vaccineName: resolveVaccinationName(entry.vaccinationKey, guidanceIndex),
      statusContext,
      statusLabel,
      planStatus,
      entryDate: parseIsoDateInput(entry.entryDate),
      entryDateLabel: formatVaccinationEntryDate(entry.entryDate, locale),
      relatedItemKey: relatedItem?.itemKey ?? null,
    };
  });
}

export function createInitialManualEntryForm(options = {}) {
  return {
    vaccinationKey: String(options.vaccinationKey ?? ''),
    statusContext: MANUAL_ENTRY_STATUS_CONTEXT.completed,
    entryDate: '',
  };
}
