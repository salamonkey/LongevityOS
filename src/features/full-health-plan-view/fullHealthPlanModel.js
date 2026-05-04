import {
  HEALTH_ITEM_STATUS,
  groupHealthItemsForDashboard,
} from '../health-item-detail-and-completion/healthItemsModel.js';

const HORIZON_ORDER = Object.freeze({
  Today: 0,
  Soon: 1,
  Later: 2,
});

export function sortHealthPlanItems(items) {
  return [...items].sort((left, right) => {
    const leftHorizonRank = HORIZON_ORDER[left.priorityHorizon] ?? Number.MAX_SAFE_INTEGER;
    const rightHorizonRank = HORIZON_ORDER[right.priorityHorizon] ?? Number.MAX_SAFE_INTEGER;
    if (leftHorizonRank !== rightHorizonRank) {
      return leftHorizonRank - rightHorizonRank;
    }

    const leftOrder = Number.isFinite(left.displayOrder) ? left.displayOrder : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.displayOrder) ? right.displayOrder : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.title ?? '').localeCompare(String(right.title ?? ''));
  });
}

export function calculatePlanTotals(healthItems) {
  const dueCount = healthItems.filter((item) => item.status === HEALTH_ITEM_STATUS.DUE).length;
  const plannedCount = healthItems.filter((item) => item.status === HEALTH_ITEM_STATUS.PLANNED).length;
  const doneCount = healthItems.filter((item) => item.status === HEALTH_ITEM_STATUS.DONE).length;
  const grouped = groupHealthItemsForDashboard(healthItems);
  const dashboardOpenCount = grouped.Today.length + grouped.Soon.length + grouped.Later.length;

  return {
    totalCount: healthItems.length,
    dueCount,
    plannedCount,
    doneCount,
    dashboardOpenCount,
  };
}

export function hasUniqueHealthItemsById(healthItems) {
  return new Set(healthItems.map((item) => item.id)).size === healthItems.length;
}
