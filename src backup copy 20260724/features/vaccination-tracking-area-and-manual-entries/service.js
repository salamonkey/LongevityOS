import {
  buildManualVaccinationCatalogOptions,
  createManualVaccinationEntry,
  sortManualVaccinationEntries,
} from './model.js';

function cloneEntry(entry) {
  return {
    ...entry,
  };
}

export function createVaccinationTrackingSession({
  profileId = 'self',
  planSnapshot,
  initialManualEntries = [],
  now = () => new Date(),
  idFactory,
} = {}) {
  let manualEntries = sortManualVaccinationEntries(initialManualEntries).map(cloneEntry);

  const allowedVaccinationKeys = buildManualVaccinationCatalogOptions(planSnapshot)
    .map((option) => option.value);

  return {
    getManualEntries() {
      return manualEntries.map(cloneEntry);
    },

    addManualEntry(input) {
      const entry = createManualVaccinationEntry(input, {
        profileId,
        allowedVaccinationKeys,
        now: now(),
        idFactory,
      });

      manualEntries = sortManualVaccinationEntries([...manualEntries, entry]);
      return {
        entry: cloneEntry(entry),
        entries: manualEntries.map(cloneEntry),
      };
    },

    getAllowedVaccinationKeys() {
      return [...allowedVaccinationKeys];
    },
  };
}
