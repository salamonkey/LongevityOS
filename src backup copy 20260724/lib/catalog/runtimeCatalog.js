const EMPTY_CATALOG = Object.freeze([]);

let runtimeCatalog = EMPTY_CATALOG;
let runtimeCatalogVersion = 'uninitialized';

export function setRuntimeCatalog(catalog, catalogVersion = 'hosted-supabase') {
  runtimeCatalog = Array.isArray(catalog) ? Object.freeze([...catalog]) : EMPTY_CATALOG;
  runtimeCatalogVersion = String(catalogVersion ?? '').trim() || 'hosted-supabase';
}

export function getRuntimeCatalog() {
  return runtimeCatalog;
}

export function getRuntimeCatalogVersion() {
  return runtimeCatalogVersion;
}

export function hasRuntimeCatalog() {
  return runtimeCatalog.length > 0;
}
