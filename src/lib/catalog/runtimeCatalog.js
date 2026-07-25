const EMPTY_CATALOG = Object.freeze([]);

let runtimeCatalog = EMPTY_CATALOG;
let runtimeCatalogVersion = 'uninitialized';
let runtimeCatalogIndex = null;
let runtimeCatalogIndexSource = null;

export function setRuntimeCatalog(catalog, catalogVersion = 'hosted-supabase') {
  runtimeCatalog = Array.isArray(catalog) ? Object.freeze([...catalog]) : EMPTY_CATALOG;
  runtimeCatalogVersion = String(catalogVersion ?? '').trim() || 'hosted-supabase';
  runtimeCatalogIndex = null;
  runtimeCatalogIndexSource = null;
}

export function getRuntimeCatalog() {
  return runtimeCatalog;
}

// Copy fields only (name/cadence/why-it-matters/recommendation) for the
// currently cached catalog, keyed by itemId — used to overlay live,
// locale-aware catalog copy onto plan items whose display fields were
// snapshotted at plan-generation time. Returns null when the item isn't in
// the current catalog (e.g. a retired item), so callers can fall back to
// the snapshot's own copy.
export function resolveCatalogCopyForItemKey(itemKey) {
  if (!itemKey) {
    return null;
  }

  if (runtimeCatalogIndex === null || runtimeCatalogIndexSource !== runtimeCatalog) {
    runtimeCatalogIndex = new Map(runtimeCatalog.map((item) => [item.itemId, item]));
    runtimeCatalogIndexSource = runtimeCatalog;
  }

  const catalogItem = runtimeCatalogIndex.get(itemKey);
  if (!catalogItem) {
    return null;
  }

  return {
    name: catalogItem.name,
    cadenceLabel: catalogItem.cadenceLabel,
    whyItMatters: catalogItem.whyItMatters,
    recommendationText: catalogItem.recommendationText,
  };
}

export function getRuntimeCatalogVersion() {
  return runtimeCatalogVersion;
}

export function hasRuntimeCatalog() {
  return runtimeCatalog.length > 0;
}
