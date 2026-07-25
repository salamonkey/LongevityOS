import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const DEFAULT_CATALOG_LOCALE = 'en';

let supabaseClient = null;
const cachedCatalogByLocale = {};

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

function assertText(value, fieldName) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`Catalog row missing required text field: ${fieldName}`);
  }
  return normalized;
}

function normalizeRiskFlags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? '').trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEvidenceTier(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['strong', 'moderate', 'conditional'].includes(normalized) ? normalized : null;
}

function normalizeRuleBand(row) {
  const gender = assertText(row?.gender, 'rule_band.gender').toLowerCase();
  const minAge = Number(row?.min_age);
  const maxAge = Number(row?.max_age);
  const targetAge = Number(row?.target_age);
  const priorityOrder = Number(row?.priority_order);
  const recurrenceIntervalDays = Number(row?.recurrence_interval_days);

  if (!['female', 'male'].includes(gender)) {
    throw new Error(`Unsupported rule band gender: ${gender}`);
  }

  if (![minAge, maxAge, targetAge, priorityOrder].every((value) => Number.isFinite(value))) {
    throw new Error('Catalog rule band includes non-numeric age/priority fields.');
  }

  return {
    gender,
    minAge,
    maxAge,
    targetAge,
    priorityOrder,
    cadenceLabel: row?.cadence_label ? String(row.cadence_label).trim() || null : null,
    recurrenceIntervalDays: Number.isFinite(recurrenceIntervalDays) ? recurrenceIntervalDays : null,
    requiredRiskFlags: normalizeRiskFlags(row?.required_risk_flags),
    evidenceTier: normalizeEvidenceTier(row?.evidence_tier),
    uspstfGrade: row?.uspstf_grade ? String(row.uspstf_grade).trim() || null : null,
    requiresSharedDecision: Boolean(row?.requires_shared_decision),
  };
}

const ALLOWED_VACCINE_DOSE_GENDERS = ['female', 'male', 'both'];
const ALLOWED_VACCINE_DOSE_POPULATION_TYPES = ['general', 'risk_condition', 'exposure_group', 'pregnancy'];

function normalizeVaccineDose(row) {
  const gender = assertText(row?.gender, 'vaccine_dose.gender').toLowerCase();
  const ageMinMonths = Number(row?.age_min_months);
  const ageMaxMonths = Number(row?.age_max_months);
  const targetAgeMonths = Number(row?.target_age_months);
  const priorityOrder = Number(row?.priority_order);
  const doseNumber = Number(row?.dose_number);
  const dosesInSeries = Number(row?.doses_in_series);
  const minIntervalFromPreviousDoseDays = Number(row?.min_interval_from_previous_dose_days);
  const recurrenceIntervalDays = Number(row?.recurrence_interval_days);
  const populationType = assertText(row?.population_type, 'vaccine_dose.population_type').toLowerCase();

  if (!ALLOWED_VACCINE_DOSE_GENDERS.includes(gender)) {
    throw new Error(`Unsupported vaccine dose gender: ${gender}`);
  }

  if (![ageMinMonths, ageMaxMonths, targetAgeMonths, priorityOrder].every((value) => Number.isFinite(value))) {
    throw new Error('Catalog vaccine dose includes non-numeric age/priority fields.');
  }

  if (!ALLOWED_VACCINE_DOSE_POPULATION_TYPES.includes(populationType)) {
    throw new Error(`Unsupported vaccine dose population_type: ${populationType}`);
  }

  return {
    gender,
    ageMinMonths,
    ageMaxMonths,
    targetAgeMonths,
    priorityOrder,
    doseNumber: Number.isFinite(doseNumber) ? doseNumber : null,
    dosesInSeries: Number.isFinite(dosesInSeries) ? dosesInSeries : null,
    minIntervalFromPreviousDoseDays: Number.isFinite(minIntervalFromPreviousDoseDays) ? minIntervalFromPreviousDoseDays : null,
    recurrenceIntervalDays: Number.isFinite(recurrenceIntervalDays) ? recurrenceIntervalDays : null,
    cadenceLabel: row?.cadence_label ? String(row.cadence_label).trim() || null : null,
    populationType,
    requiredRiskFlags: normalizeRiskFlags(row?.required_risk_flags),
    sourceRef: row?.source_ref ? String(row.source_ref).trim() || null : null,
  };
}

function normalizeCatalogItem(row, translation) {
  const itemId = assertText(row?.item_id, 'item_id');
  const category = assertText(row?.category, 'category').toLowerCase();
  const effortLevel = assertText(row?.effort_level, 'effort_level').toLowerCase();

  const ruleBands = Array.isArray(row?.preventive_catalog_rule_bands)
    ? row.preventive_catalog_rule_bands.map(normalizeRuleBand)
    : [];

  // Vaccination items source their scheduling data from
  // preventive_catalog_vaccine_doses instead (see normalizeVaccineDose below) -- they
  // legitimately have zero preventive_catalog_rule_bands rows.
  if (ruleBands.length === 0 && category !== 'vaccination') {
    throw new Error(`Catalog item is missing rule bands: ${itemId}`);
  }

  ruleBands.sort((a, b) => {
    if (a.priorityOrder !== b.priorityOrder) return a.priorityOrder - b.priorityOrder;
    if (a.targetAge !== b.targetAge) return a.targetAge - b.targetAge;
    return a.gender.localeCompare(b.gender);
  });

  // Translated fields (per-locale, may be a partial override) fall back to the
  // base English column whenever the translation row or a specific field is
  // missing — see preventive_catalog_item_translations.
  const name = translation?.name
    ? String(translation.name).trim() || null
    : null;
  const cadenceLabel = translation?.cadence_label
    ? String(translation.cadence_label).trim() || null
    : null;
  const whyItMatters = translation?.why_it_matters
    ? String(translation.why_it_matters).trim() || null
    : null;
  const recommendationText = translation?.recommendation_text
    ? String(translation.recommendation_text).trim() || null
    : null;

  let vaccineDoses = [];
  if (category === 'vaccination') {
    vaccineDoses = Array.isArray(row?.preventive_catalog_vaccine_doses)
      ? row.preventive_catalog_vaccine_doses.map(normalizeVaccineDose)
      : [];

    if (vaccineDoses.length === 0) {
      throw new Error(`Vaccination catalog item is missing dose bands: ${itemId}`);
    }

    vaccineDoses.sort((a, b) => {
      if (a.priorityOrder !== b.priorityOrder) return a.priorityOrder - b.priorityOrder;
      if (a.targetAgeMonths !== b.targetAgeMonths) return a.targetAgeMonths - b.targetAgeMonths;
      return a.gender.localeCompare(b.gender);
    });
  }

  return {
    itemId,
    name: name || assertText(row?.name, `name (${itemId})`),
    category,
    effortLevel,
    cadenceLabel: cadenceLabel || assertText(row?.cadence_label, `cadence_label (${itemId})`),
    whyItMatters: whyItMatters || assertText(row?.why_it_matters, `why_it_matters (${itemId})`),
    recommendationText: recommendationText || assertText(row?.recommendation_text, `recommendation_text (${itemId})`),
    requiredRiskFlags: normalizeRiskFlags(row?.required_risk_flags),
    ruleBands,
    vaccineDoses,
  };
}

function resolveCatalogVersionFromRows(rows) {
  const latestUpdatedAt = rows
    .map((row) => String(row?.updated_at ?? '').trim())
    .filter(Boolean)
    .sort()
    .at(-1);

  if (latestUpdatedAt) {
    return `hosted-preventive-catalog:${latestUpdatedAt}`;
  }

  return 'hosted-preventive-catalog';
}

export function isSupabaseCatalogConfigured() {
  return Boolean(getSupabaseClient());
}

export function clearSupabaseCatalogCache() {
  for (const key of Object.keys(cachedCatalogByLocale)) {
    delete cachedCatalogByLocale[key];
  }
}

export async function loadPreventiveCatalogFromSupabase(options = {}) {
  const locale = String(options.locale ?? DEFAULT_CATALOG_LOCALE).trim().toLowerCase() || DEFAULT_CATALOG_LOCALE;
  const useCache = options.useCache !== false;
  if (useCache && cachedCatalogByLocale[locale]) {
    return cachedCatalogByLocale[locale];
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase catalog is not configured.');
  }

  const { data, error } = await client
    .from('preventive_catalog_items')
    .select(`
      item_id,
      name,
      category,
      effort_level,
      cadence_label,
      why_it_matters,
      recommendation_text,
      required_risk_flags,
      updated_at,
      preventive_catalog_rule_bands (
        gender,
        min_age,
        max_age,
        target_age,
        priority_order,
        cadence_label,
        recurrence_interval_days,
        required_risk_flags,
        evidence_tier,
        uspstf_grade,
        requires_shared_decision
      ),
      preventive_catalog_vaccine_doses (
        gender,
        age_min_months,
        age_max_months,
        target_age_months,
        priority_order,
        dose_number,
        doses_in_series,
        min_interval_from_previous_dose_days,
        recurrence_interval_days,
        cadence_label,
        population_type,
        required_risk_flags,
        source_ref
      )
    `)
    .order('item_id', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];

  let translationsByItemId = {};
  if (locale !== DEFAULT_CATALOG_LOCALE && rows.length > 0) {
    const { data: translationRows, error: translationError } = await client
      .from('preventive_catalog_item_translations')
      .select('item_id, name, cadence_label, why_it_matters, recommendation_text')
      .eq('locale', locale)
      .in('item_id', rows.map((row) => row.item_id));

    if (translationError) {
      throw translationError;
    }

    translationsByItemId = (translationRows ?? []).reduce((index, translationRow) => {
      index[translationRow.item_id] = translationRow;
      return index;
    }, {});
  }

  const catalog = rows.map((row) => normalizeCatalogItem(row, translationsByItemId[row.item_id]));

  if (catalog.length === 0) {
    throw new Error('Supabase preventive catalog is empty.');
  }

  const result = {
    catalog,
    catalogVersion: resolveCatalogVersionFromRows(rows),
  };

  cachedCatalogByLocale[locale] = result;
  return result;
}
