import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MVP_PREVENTIVE_CATALOG,
  MVP_CATALOG_VERSION,
} from '../../src/features/self-onboarding-to-first-dashboard/catalog.js';
import {
  buildDashboardProjection,
  hasPopulatedDashboard,
} from '../../src/features/self-onboarding-to-first-dashboard/dashboard.js';
import {
  generateInitialPlanSnapshot,
  generateInitialPlanSnapshotAsync,
} from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  validateSelfProfileInput,
} from '../../src/features/self-onboarding-to-first-dashboard/validation.js';

const CATALOG_IDS = new Set(MVP_PREVENTIVE_CATALOG.map((item) => item.itemId));

test('[SL-001] onboarding input validation keeps the two required self fields', () => {
  const invalid = validateSelfProfileInput({ age: '', gender: '' });
  const valid = validateSelfProfileInput({ age: '42', gender: 'female' });

  assert.equal(invalid.isValid, false);
  assert.equal(Boolean(invalid.errors.age), true);
  assert.equal(Boolean(invalid.errors.gender), true);
  assert.equal(valid.isValid, true);
});

test('[SL-001] first health plan generation completes within 5 seconds', async () => {
  const start = Date.now();

  await generateInitialPlanSnapshotAsync(
    { profileId: 'self', age: 38, gender: 'female' },
    { delayMs: 120, now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const elapsedMs = Date.now() - start;
  assert.ok(elapsedMs < 5000, `Plan generation took ${elapsedMs}ms`);
});

test('[SL-001] generated items only come from locked MVP catalog and approved categories', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'male' },
    { now: new Date('2026-05-05T08:00:00.000Z') },
  );

  assert.equal(snapshot.catalogVersion, MVP_CATALOG_VERSION);
  assert.ok(snapshot.items.length > 0);

  for (const item of snapshot.items) {
    assert.equal(CATALOG_IDS.has(item.catalogItemId), true);
    assert.equal(['checkup', 'vaccination'].includes(item.category), true);
  }
});

test('[SL-001] dashboard projection preserves Today/Soon/Later, highlighted next item, and health score', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female' },
    { now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const projection = buildDashboardProjection(snapshot, { name: 'You' });

  assert.equal(projection.sections.length, 3);
  assert.deepEqual(projection.sections.map((section) => section.priority), ['today', 'soon', 'later']);
  assert.equal(Boolean(projection.highlightedItem), true);
  assert.equal(Number.isFinite(projection.healthScore), true);
  assert.equal(hasPopulatedDashboard(projection), true);
});

test('[SL-001] onboarding-to-populated-dashboard pipeline completes well within 60 seconds', async () => {
  const start = Date.now();

  const snapshot = await generateInitialPlanSnapshotAsync(
    { profileId: 'self', age: 33, gender: 'male' },
    { delayMs: 200, now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const projection = buildDashboardProjection(snapshot, { name: 'You' });
  const elapsedMs = Date.now() - start;

  assert.equal(hasPopulatedDashboard(projection), true);
  assert.ok(elapsedMs < 60000, `Flow took ${elapsedMs}ms`);
});
