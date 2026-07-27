import { resolveEffectiveItemStatus } from '../self-onboarding-to-first-dashboard/dashboard.js';
import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';
import { BODY_REGIONS, resolveRegionIdForItemKey } from '../self-onboarding-to-first-dashboard/bodyRegions.js';
import { PLAN_CATEGORIES } from '../health-plan-browsing-and-item-detail/model.js';

const ALREADY_DUE_STATUSES = new Set(['due', 'overdue']);

// The question set is exactly the plan's own due/overdue items at generation
// time -- the same resolveEffectiveItemStatus computation the dashboard
// already trusts, not a separate "what should this person have by now"
// calculation. Grouped by the app's own 5 clinical regions, not an invented
// taxonomy for this one screen. Pulled out of StatusQuoStep.jsx (a plain,
// JSX-free module) so it can be unit-tested directly with the Node test
// runner, which can't parse JSX.
export function buildStatusQuoGroups(planSnapshot, options = {}) {
  const today = options.today instanceof Date ? options.today : new Date();
  const items = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];

  const dueItems = items
    .filter((item) => ALREADY_DUE_STATUSES.has(resolveEffectiveItemStatus(item, { today })))
    .map((item) => {
      const liveCopy = resolveCatalogCopyForItemKey(item.catalogItemId);
      return {
        itemKey: item.catalogItemId,
        category: item.category,
        name: liveCopy?.name || item.name || item.catalogItemId,
        cadenceLabel: liveCopy?.cadenceLabel || item.cadenceLabel || '',
        requiresSharedDecision: Boolean(item.requiresSharedDecision),
        regionId: item.clinicalRegion || resolveRegionIdForItemKey(item.catalogItemId),
      };
    });

  const byRegion = new Map();
  for (const item of dueItems) {
    if (!byRegion.has(item.regionId)) {
      byRegion.set(item.regionId, []);
    }
    byRegion.get(item.regionId).push(item);
  }

  return BODY_REGIONS
    .map((region) => ({
      regionId: region.id,
      titleKey: region.labelKey,
      icon: region.icon,
      options: byRegion.get(region.id) ?? [],
    }))
    .filter((group) => group.options.length > 0);
}

export function resolveDateLabelKey(option) {
  if (option.category === PLAN_CATEGORIES.vaccination) return 'statusQuo.dateLabelVaccination';
  if (option.requiresSharedDecision) return 'statusQuo.dateLabelSharedDecision';
  return 'statusQuo.dateLabelDefault';
}

export function resolveGroupQuestionKey(group) {
  return group.regionId === 'immunizations' ? 'statusQuo.questionVaccination' : 'statusQuo.questionDefault';
}
