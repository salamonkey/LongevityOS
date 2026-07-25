import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

let supabaseClient = null;
let cachedCatalog = null;

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

function normalizeRuleBand(row) {
  const gender = assertText(row?.gender, 'rule_band.gender').toLowerCase();
  const minAge = Number(row?.min_age);
  const maxAge = Number(row?.max_age);
  const targetAge = Number(row?.target_age);
  const priorityOrder = Number(row?.priority_order);

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
  };
}

function normalizeCatalogItem(row) {
  const itemId = assertText(row?.item_id, 'item_id');
  const category = assertText(row?.category, 'category').toLowerCase();
  const effortLevel = assertText(row?.effort_level, 'effort_level').toLowerCase();

  const ruleBands = Array.isArray(row?.preventive_catalog_rule_bands)
    ? row.preventive_catalog_rule_bands.map(normalizeRuleBand)
    : [];

  if (ruleBands.length === 0) {
    throw new Error(`Catalog item is missing rule bands: ${itemId}`);
  }

  ruleBands.sort((a, b) => {
    if (a.priorityOrder !== b.priorityOrder) return a.priorityOrder - b.priorityOrder;
    if (a.targetAge !== b.targetAge) return a.targetAge - b.targetAge;
    return a.gender.localeCompare(b.gender);
  });

  return {
    itemId,
    name: assertText(row?.name, `name (${itemId})`),
    category,
    effortLevel,
    cadenceLabel: assertText(row?.cadence_label, `cadence_label (${itemId})`),
    whyItMatters: assertText(row?.why_it_matters, `why_it_matters (${itemId})`),
    requiredRiskFlags: normalizeRiskFlags(row?.required_risk_flags),
    ruleBands,
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
  cachedCatalog = null;
}

export async function loadPreventiveCatalogFromSupabase(options = {}) {
  const useCache = options.useCache !== false;
  if (useCache && cachedCatalog) {
    return cachedCatalog;
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
      required_risk_flags,
      updated_at,
      preventive_catalog_rule_bands (
        gender,
        min_age,
        max_age,
        target_age,
        priority_order
      )
    `)
    .order('item_id', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];
  const catalog = rows.map(normalizeCatalogItem);

  if (catalog.length === 0) {
    throw new Error('Supabase preventive catalog is empty.');
  }

  const result = {
    catalog,
    catalogVersion: resolveCatalogVersionFromRows(rows),
  };

  cachedCatalog = result;
  return result;
}
