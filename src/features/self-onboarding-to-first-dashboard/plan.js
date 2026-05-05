import { MVP_CATALOG_VERSION, MVP_PREVENTIVE_CATALOG } from './catalog.js';

const ALLOWED_CATEGORIES = new Set(['checkup', 'vaccination']);

function findMatchingRuleBand(ruleBands, profile) {
  return ruleBands.find((band) => (
    band.gender === profile.gender
    && profile.age >= band.minAge
    && profile.age <= band.maxAge
  ));
}

function comparePlanItems(a, b) {
  if (a.dashboardBucket !== b.dashboardBucket) {
    const bucketOrder = { today: 0, soon: 1, later: 2 };
    return bucketOrder[a.dashboardBucket] - bucketOrder[b.dashboardBucket];
  }

  if (a.targetAge !== b.targetAge) {
    return a.targetAge - b.targetAge;
  }

  return a.priorityOrder - b.priorityOrder;
}

export function generateInitialPlanSnapshot(profile, options = {}) {
  const nowIso = (options.now ?? new Date()).toISOString();
  const catalog = options.catalog ?? MVP_PREVENTIVE_CATALOG;
  const catalogVersion = options.catalogVersion ?? MVP_CATALOG_VERSION;

  const items = [];

  for (const catalogItem of catalog) {
    const matchedBand = findMatchingRuleBand(catalogItem.ruleBands, profile);

    if (!matchedBand) {
      continue;
    }

    if (!ALLOWED_CATEGORIES.has(catalogItem.category)) {
      throw new Error(`Unsupported category in catalog: ${catalogItem.category}`);
    }

    items.push({
      catalogItemId: catalogItem.itemId,
      name: catalogItem.name,
      category: catalogItem.category,
      cadenceLabel: catalogItem.cadenceLabel,
      whyItMatters: catalogItem.whyItMatters,
      dashboardBucket: matchedBand.dashboardBucket,
      targetAge: matchedBand.targetAge,
      priorityOrder: matchedBand.priorityOrder,
      status: matchedBand.dashboardBucket === 'today' ? 'due' : 'planned',
    });
  }

  items.sort(comparePlanItems);

  return {
    planId: `plan-${profile.profileId}`,
    profileId: profile.profileId,
    catalogVersion,
    generatedAt: nowIso,
    items,
  };
}

export async function generateInitialPlanSnapshotAsync(profile, options = {}) {
  const delayMs = options.delayMs ?? 250;
  const timeoutDelay = Math.max(0, Number(delayMs));

  await new Promise((resolve) => {
    setTimeout(resolve, timeoutDelay);
  });

  return generateInitialPlanSnapshot(profile, options);
}
