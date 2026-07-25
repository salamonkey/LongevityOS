import {
  TEST_CATALOG_VERSION,
  TEST_PREVENTIVE_CATALOG,
} from './preventiveCatalog.js';

export const TEST_CATALOG_IDS = new Set(TEST_PREVENTIVE_CATALOG.map((item) => item.itemId));

export const TEST_CATALOG_OPTIONS = Object.freeze({
  catalog: TEST_PREVENTIVE_CATALOG,
  catalogVersion: TEST_CATALOG_VERSION,
});

export function withTestCatalogOptions(options = {}) {
  return {
    ...TEST_CATALOG_OPTIONS,
    ...options,
  };
}
