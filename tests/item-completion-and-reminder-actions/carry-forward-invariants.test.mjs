import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardProjection,
} from '../../src/features/self-onboarding-to-first-dashboard/dashboard.js';
import {
  MVP_CATALOG_VERSION,
  MVP_PREVENTIVE_CATALOG,
} from '../../src/features/self-onboarding-to-first-dashboard/catalog.js';
import {
  generateInitialPlanSnapshot,
  generateInitialPlanSnapshotAsync,
} from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  buildHealthPlanReadModel,
  resolveDetailBackTarget,
  resolveItemDetail,
} from '../../src/features/health-plan-browsing-and-item-detail/projection.js';
import {
  ALLOWED_PLAN_STATUSES,
} from '../../src/features/health-plan-browsing-and-item-detail/model.js';

const CATALOG_IDS = new Set(MVP_PREVENTIVE_CATALOG.map((item) => item.itemId));

function createProfile() {
  return { profileId: 'self', age: 52, gender: 'female', name: 'You' };
}

test('[SL-001] generated plan remains bounded to locked MVP catalog and approved categories', () => {
  const snapshot = generateInitialPlanSnapshot(createProfile(), {
    now: new Date('2026-05-05T08:00:00.000Z'),
  });

  assert.equal(snapshot.catalogVersion, MVP_CATALOG_VERSION);
  assert.ok(snapshot.items.length > 0);

  for (const item of snapshot.items) {
    assert.equal(CATALOG_IDS.has(item.catalogItemId), true);
    assert.equal(['checkup', 'vaccination'].includes(item.category), true);
  }
});

test('[SL-001] first plan generation still completes within 5 seconds', async () => {
  const startedAt = Date.now();

  await generateInitialPlanSnapshotAsync(createProfile(), {
    delayMs: 150,
    now: new Date('2026-05-05T08:00:00.000Z'),
  });

  const elapsedMs = Date.now() - startedAt;
  assert.ok(elapsedMs < 5000, `Plan generation took ${elapsedMs}ms`);
});

test('[SL-001] dashboard projection preserves Today/Soon/Later sections and highlighted next item', () => {
  const snapshot = generateInitialPlanSnapshot(createProfile(), {
    now: new Date('2026-05-05T08:00:00.000Z'),
  });

  const projection = buildDashboardProjection(snapshot, createProfile());

  assert.deepEqual(projection.sections.map((section) => section.priority), ['today', 'soon', 'later']);
  assert.equal(Boolean(projection.highlightedItem), true);
  assert.equal(Number.isFinite(projection.healthScore), true);
});

test('[SL-002] every generated item remains visible in plan and resolves to detail with rationale and stable back behavior', () => {
  const snapshot = generateInitialPlanSnapshot(createProfile(), {
    now: new Date('2026-05-05T08:00:00.000Z'),
  });

  const readModel = buildHealthPlanReadModel(snapshot);
  assert.equal(readModel.allItems.length, snapshot.items.length);

  for (const sourceItem of snapshot.items) {
    const detail = resolveItemDetail(readModel, sourceItem.catalogItemId);

    assert.ok(detail, `Detail not found for ${sourceItem.catalogItemId}`);
    assert.equal(ALLOWED_PLAN_STATUSES.includes(detail.status), true);
    assert.ok(detail.cadenceText.length > 0);
    assert.ok(detail.whyItMattersText.length > 0);

    const target = resolveDetailBackTarget({ origin: 'dashboard', detailItem: detail });
    assert.deepEqual(target, { destination: 'dashboard' });
  }
});
