import test from 'node:test';
import assert from 'node:assert/strict';

import { MVP_PREVENTIVE_CATALOG, MVP_CATALOG_VERSION } from '../../src/features/self-onboarding-to-first-dashboard/catalog.js';
import { generateInitialPlanSnapshot, generateInitialPlanSnapshotAsync } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';

const CATALOG_ITEM_IDS = new Set(MVP_PREVENTIVE_CATALOG.map((item) => item.itemId));

test('generated items come from locked catalog and have approved categories', () => {
  const profile = { profileId: 'self', age: 38, gender: 'female' };
  const snapshot = generateInitialPlanSnapshot(profile, { now: new Date('2026-05-05T08:00:00.000Z') });

  assert.equal(snapshot.catalogVersion, MVP_CATALOG_VERSION);
  assert.ok(snapshot.items.length > 0);

  for (const item of snapshot.items) {
    assert.equal(CATALOG_ITEM_IDS.has(item.catalogItemId), true);
    assert.equal(['checkup', 'vaccination'].includes(item.category), true);
  }
});

test('plan generation is deterministic for same profile and generation timestamp', () => {
  const profile = { profileId: 'self', age: 52, gender: 'male' };
  const now = new Date('2026-05-05T08:00:00.000Z');

  const first = generateInitialPlanSnapshot(profile, { now });
  const second = generateInitialPlanSnapshot(profile, { now });

  assert.deepEqual(first, second);
});

test('female and male paths both generate at least one item', () => {
  const female = generateInitialPlanSnapshot({ profileId: 'self-f', age: 30, gender: 'female' }, { now: new Date('2026-05-05T08:00:00.000Z') });
  const male = generateInitialPlanSnapshot({ profileId: 'self-m', age: 30, gender: 'male' }, { now: new Date('2026-05-05T08:00:00.000Z') });

  assert.ok(female.items.length > 0);
  assert.ok(male.items.length > 0);
});

test('async generation completes within 5 seconds under normal conditions', async () => {
  const profile = { profileId: 'self', age: 30, gender: 'female' };
  const start = Date.now();

  await generateInitialPlanSnapshotAsync(profile, {
    delayMs: 100,
    now: new Date('2026-05-05T08:00:00.000Z'),
  });

  const elapsed = Date.now() - start;
  assert.ok(elapsed < 5000);
});

test('hiv screening is not included by default without explicit risk context', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female' },
    { now: new Date('2026-05-05T08:00:00.000Z') },
  );

  assert.equal(
    snapshot.items.some((item) => item.catalogItemId === 'hiv-screening'),
    false,
  );
});

test('hiv screening is included when hiv risk context is explicitly present', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female', riskFlags: ['hiv'] },
    { now: new Date('2026-05-05T08:00:00.000Z') },
  );

  assert.equal(
    snapshot.items.some((item) => item.catalogItemId === 'hiv-screening'),
    true,
  );
});

test('items with recurrence longer than one year are not initialized in Today at onboarding', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female' },
    { now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const violatingItems = snapshot.items.filter((item) => (
    item.initialBucket === 'today'
    && Number.isFinite(Number(item?.recurrence?.intervalDays))
    && Number(item.recurrence.intervalDays) > 365
  ));

  assert.equal(violatingItems.length, 0);
});
