import test from 'node:test';
import assert from 'node:assert/strict';

import { generateInitialPlanSnapshot } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  LOCKED_PREVENTIVE_ITEM_DEFINITIONS,
} from '../../src/features/health-plan-browsing-and-item-detail/definitions.js';
import {
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  ALLOWED_PLAN_STATUSES,
} from '../../src/features/health-plan-browsing-and-item-detail/model.js';
import {
  buildCoverageSnapshot,
  buildHealthPlanReadModel,
  resolveDetailBackTarget,
  resolveItemDetail,
} from '../../src/features/health-plan-browsing-and-item-detail/projection.js';

function createSnapshot() {
  return generateInitialPlanSnapshot(
    { profileId: 'self', age: 52, gender: 'female' },
    { now: new Date('2026-05-05T08:00:00.000Z') },
  );
}

test('every generated health item is visible exactly once in checkups or vaccinations', () => {
  const snapshot = createSnapshot();
  const readModel = buildHealthPlanReadModel(snapshot);
  const coverage = buildCoverageSnapshot(readModel, snapshot);

  const uniqueGeneratedKeys = new Set(coverage.generatedKeys);
  const uniqueVisibleKeys = new Set(coverage.visibleKeys);

  assert.equal(uniqueGeneratedKeys.size, coverage.generatedCount);
  assert.equal(uniqueVisibleKeys.size, coverage.visibleCount);
  assert.deepEqual(Array.from(uniqueVisibleKeys).sort(), Array.from(uniqueGeneratedKeys).sort());
});

test('every plan item exposes cadence and exactly one allowed status', () => {
  const snapshot = createSnapshot();
  const readModel = buildHealthPlanReadModel(snapshot);

  for (const item of readModel.allItems) {
    assert.ok(item.displayName.length > 0);
    assert.ok(item.cadenceText.length > 0);
    assert.equal(ALLOWED_PLAN_STATUSES.includes(item.status), true);
    assert.ok(item.statusLabel.length > 0);
  }
});

test('every generated item opens to detail with recommendation and plain-language why-it-matters text', () => {
  const snapshot = createSnapshot();
  const readModel = buildHealthPlanReadModel(snapshot);

  for (const generatedItem of snapshot.items) {
    const detail = resolveItemDetail(readModel, generatedItem.catalogItemId);

    assert.ok(detail, `Detail missing for ${generatedItem.catalogItemId}`);
    assert.equal(detail.itemKey, generatedItem.catalogItemId);
    assert.ok(detail.recommendationText.length > 0);
    assert.ok(detail.whyItMattersText.length > 0);
  }
});

test('unknown item keys resolve to not-found detail behavior', () => {
  const snapshot = createSnapshot();
  const readModel = buildHealthPlanReadModel(snapshot);

  assert.equal(resolveItemDetail(readModel, 'unknown-item-key'), null);
  assert.equal(resolveItemDetail(readModel, ''), null);
});

test('back target preserves dashboard or list origin context with safe fallback', () => {
  const vaccinationDetail = {
    category: PLAN_CATEGORIES.vaccination,
  };

  assert.deepEqual(
    resolveDetailBackTarget({ origin: DETAIL_ORIGIN.dashboard, detailItem: vaccinationDetail }),
    { destination: DETAIL_ORIGIN.dashboard },
  );

  assert.deepEqual(
    resolveDetailBackTarget({ origin: DETAIL_ORIGIN.checkups, detailItem: vaccinationDetail }),
    { destination: DETAIL_ORIGIN.checkups },
  );

  assert.deepEqual(
    resolveDetailBackTarget({ origin: DETAIL_ORIGIN.vaccinations, detailItem: vaccinationDetail }),
    { destination: DETAIL_ORIGIN.vaccinations },
  );

  assert.deepEqual(
    resolveDetailBackTarget({ origin: DETAIL_ORIGIN.direct, detailItem: vaccinationDetail }),
    { destination: DETAIL_ORIGIN.vaccinations },
  );
});

test('missing locked definition keeps item unavailable rather than partially rendering detail', () => {
  const snapshot = createSnapshot();
  const [first, ...rest] = LOCKED_PREVENTIVE_ITEM_DEFINITIONS;
  const readModel = buildHealthPlanReadModel(snapshot, {
    definitions: rest,
  });

  assert.equal(readModel.missingDefinitionKeys.includes(first.itemKey), true);
  assert.equal(resolveItemDetail(readModel, first.itemKey), null);
});

test('unsupported source status is normalized to a safe allowed status', () => {
  const snapshot = createSnapshot();
  const mutated = {
    ...snapshot,
    items: snapshot.items.map((item, index) => (
      index === 0 ? { ...item, status: 'soon' } : item
    )),
  };

  const readModel = buildHealthPlanReadModel(mutated);
  const detail = resolveItemDetail(readModel, mutated.items[0].catalogItemId);

  assert.equal(detail.status, 'pending');
  assert.equal(detail.statusLabel, 'Pending');
});
