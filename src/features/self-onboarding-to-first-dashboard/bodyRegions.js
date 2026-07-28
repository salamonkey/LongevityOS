import { resolveDashboardBucketForDisplay, resolveEffectiveItemStatus } from './dashboard.js';
import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';

// Five real clinical-domain regions covering every current EviPrev catalog
// item, positioned on the body-silhouette using the design system's own dot
// coordinates. Immunizations maps 1:1 with the vaccination category; the
// other four group checkup/counseling items by clinical domain, not literal
// anatomy (e.g. mental health -> head, activity/lifestyle -> legs), since the
// catalog has no per-item body-part data to draw on.
export const BODY_REGIONS = Object.freeze([
  { id: 'mental-social', labelKey: 'bodyRegions.mentalSocial', icon: 'brain', x: 50.6, y: 5.7 },
  { id: 'immunizations', labelKey: 'bodyRegions.immunizations', icon: 'syringe', x: 11.5, y: 21.8 },
  { id: 'heart-metabolic', labelKey: 'bodyRegions.heartMetabolic', icon: 'heart-pulse', x: 58.9, y: 23.8 },
  { id: 'cancer-organ-screening', labelKey: 'bodyRegions.cancerOrganScreening', icon: 'shield-check', x: 51.1, y: 41.6 },
  { id: 'lifestyle-general', labelKey: 'bodyRegions.lifestyleGeneral', icon: 'activity', x: 38.3, y: 76.7 },
]);

const FALLBACK_REGION_ID = 'lifestyle-general';

// Explicit, auditable item -> region map (not fuzzy matching) covering all
// 40 current catalog items. An item added to the catalog later without an
// entry here falls back to lifestyle-general.
export const REGION_ID_BY_ITEM_KEY = Object.freeze({
  // Immunizations (vaccination category, 1:1)
  'influenza-vaccine': 'immunizations',
  'tdap-booster': 'immunizations',
  'shingles-vaccine': 'immunizations',
  'covid-19-booster': 'immunizations',
  'hepatitis-b-vaccine': 'immunizations',
  'pneumococcal-vaccine': 'immunizations',
  'rsv-vaccine': 'immunizations',
  'hpv-vaccine': 'immunizations',
  'mmr-vaccine': 'immunizations',
  'varicella-vaccine': 'immunizations',
  'hepatitis-a-vaccine': 'immunizations',
  'meningococcal-vaccine': 'immunizations',
  'polio-vaccine': 'immunizations',
  // Heart & metabolic
  'blood-pressure-check': 'heart-metabolic',
  'cholesterol-screening': 'heart-metabolic',
  'diabetes-screening': 'heart-metabolic',
  'weight-bmi-screening': 'heart-metabolic',
  'abdominal-aortic-aneurysm-screening': 'heart-metabolic',
  // Cancer & organ screening
  'cervical-cancer-screening': 'cancer-organ-screening',
  'colorectal-cancer-screening': 'cancer-organ-screening',
  'breast-cancer-screening': 'cancer-organ-screening',
  'prostate-health-discussion': 'cancer-organ-screening',
  'lung-cancer-screening': 'cancer-organ-screening',
  'osteoporosis-screening': 'cancer-organ-screening',
  'hiv-screening': 'cancer-organ-screening',
  'hepatitis-c-screening': 'cancer-organ-screening',
  'hepatitis-b-screening': 'cancer-organ-screening',
  'syphilis-screening': 'cancer-organ-screening',
  'chlamydia-gonorrhea-screening': 'cancer-organ-screening',
  // Mental & social health
  'depression-screening': 'mental-social',
  'domestic-violence-screening': 'mental-social',
  'illicit-drug-use-counseling': 'mental-social',
  'alcohol-use-screening': 'mental-social',
  'tobacco-cessation-support': 'mental-social',
  'sexual-behavior-counseling': 'mental-social',
  // Lifestyle & general
  'annual-wellness-visit': 'lifestyle-general',
  'physical-activity-counseling': 'lifestyle-general',
  'nutrition-counseling': 'lifestyle-general',
  'sun-exposure-counseling': 'lifestyle-general',
});

export function resolveRegionIdForItemKey(itemKey) {
  return REGION_ID_BY_ITEM_KEY[itemKey] ?? FALLBACK_REGION_ID;
}

export function resolveRegionRouteForRegionId(regionId) {
  return regionId === 'immunizations' ? 'vaccinations' : 'checkups';
}

function groupItemsByRegion(planItems) {
  const items = Array.isArray(planItems) ? planItems : [];
  const itemsByRegion = new Map();
  for (const item of items) {
    const regionId = item?.clinicalRegion || resolveRegionIdForItemKey(item?.catalogItemId);
    if (!itemsByRegion.has(regionId)) {
      itemsByRegion.set(regionId, []);
    }
    itemsByRegion.get(regionId).push(item);
  }
  return itemsByRegion;
}

function toRegionDisplayItem(item, options = {}) {
  const liveCopy = resolveCatalogCopyForItemKey(item.catalogItemId);
  return {
    itemKey: item.catalogItemId,
    category: item.category,
    status: resolveEffectiveItemStatus(item, options),
    name: liveCopy?.name ?? item.name,
    cadenceLabel: liveCopy?.cadenceLabel ?? item.cadenceLabel,
  };
}

export function buildBodyMapPoints(planItems, { t, today } = {}) {
  const translate = typeof t === 'function' ? t : (key) => key;
  const itemsByRegion = groupItemsByRegion(planItems);

  const points = [];

  for (const region of BODY_REGIONS) {
    const regionItems = itemsByRegion.get(region.id);
    if (!regionItems || regionItems.length === 0) {
      continue;
    }

    let status = 'ok';
    let noteItem = null;

    for (const item of regionItems) {
      const bucket = resolveDashboardBucketForDisplay(item, { today });
      if (bucket === 'today') {
        status = 'action';
        noteItem = noteItem ?? item;
        break;
      }
      if (bucket === 'soon' && status !== 'action') {
        status = 'soon';
        noteItem = noteItem ?? item;
      }
    }

    const noteItemName = noteItem
      ? resolveCatalogCopyForItemKey(noteItem.catalogItemId)?.name ?? noteItem.name
      : null;

    points.push({
      id: region.id,
      label: translate(region.labelKey),
      icon: region.icon,
      x: region.x,
      y: region.y,
      status,
      note: noteItemName ?? translate('bodyRegions.upToDate'),
    });
  }

  return points;
}

// Full drill-down data for one region: real due/upcoming/history items (not
// just the dashboard dot's single note), for the region-detail screen.
export function buildRegionDetailData(regionId, planItems, { t, today } = {}) {
  const region = BODY_REGIONS.find((candidate) => candidate.id === regionId);
  if (!region) {
    return null;
  }

  const translate = typeof t === 'function' ? t : (key) => key;
  const itemsByRegion = groupItemsByRegion(planItems);
  const regionItems = itemsByRegion.get(regionId) ?? [];

  const dueItems = [];
  const soonItems = [];
  const historyItems = [];
  const skippedItems = [];

  for (const item of regionItems) {
    const bucket = resolveDashboardBucketForDisplay(item, { today });
    const liveStatus = resolveEffectiveItemStatus(item, { today });
    const displayItem = toRegionDisplayItem(item, { today });

    if (liveStatus === 'opted_out') {
      skippedItems.push(displayItem);
    } else if (bucket === 'today') {
      dueItems.push(displayItem);
    } else if (bucket === 'soon') {
      soonItems.push(displayItem);
    } else if (liveStatus === 'done') {
      historyItems.push(displayItem);
    }
  }

  const status = dueItems.length > 0 ? 'action' : soonItems.length > 0 ? 'soon' : 'ok';
  const statusText = dueItems.length > 0
    ? translate('bodyRegionDetail.statusDue', { count: dueItems.length })
    : soonItems.length > 0
      ? translate('bodyRegionDetail.statusSoon', { count: soonItems.length })
      : translate('bodyRegionDetail.statusOk');

  return {
    id: region.id,
    label: translate(region.labelKey),
    icon: region.icon,
    status,
    statusText,
    dueItems,
    soonItems,
    historyItems,
    skippedItems,
    hasItems: regionItems.length > 0,
  };
}
