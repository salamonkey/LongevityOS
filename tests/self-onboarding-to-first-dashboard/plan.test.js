import test from 'node:test';
import assert from 'node:assert/strict';

import { generateInitialPlanSnapshot, generateInitialPlanSnapshotAsync } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  TEST_CATALOG_IDS,
  TEST_CATALOG_OPTIONS,
  withTestCatalogOptions,
} from '../fixtures/catalogOptions.js';

const CATALOG_ITEM_IDS = TEST_CATALOG_IDS;

test('generated items come from locked catalog and have approved categories', () => {
  const profile = { profileId: 'self', age: 38, gender: 'female' };
  const snapshot = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }));

  assert.equal(snapshot.catalogVersion, TEST_CATALOG_OPTIONS.catalogVersion);
  assert.ok(snapshot.items.length > 0);

  for (const item of snapshot.items) {
    assert.equal(CATALOG_ITEM_IDS.has(item.catalogItemId), true);
    assert.equal(['checkup', 'vaccination', 'counseling'].includes(item.category), true);
  }
});

test('plan generation is deterministic for same profile and generation timestamp', () => {
  const profile = { profileId: 'self', age: 52, gender: 'male' };
  const now = new Date('2026-05-05T08:00:00.000Z');

  const first = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now }));
  const second = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now }));

  assert.deepEqual(first, second);
});

test('female and male paths both generate at least one item', () => {
  const female = generateInitialPlanSnapshot({ profileId: 'self-f', age: 30, gender: 'female' }, withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }));
  const male = generateInitialPlanSnapshot({ profileId: 'self-m', age: 30, gender: 'male' }, withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }));

  assert.ok(female.items.length > 0);
  assert.ok(male.items.length > 0);
});

test('async generation completes within 5 seconds under normal conditions', async () => {
  const profile = { profileId: 'self', age: 30, gender: 'female' };
  const start = Date.now();

  await generateInitialPlanSnapshotAsync(profile, {
    delayMs: 100,
    now: new Date('2026-05-05T08:00:00.000Z'),
    ...TEST_CATALOG_OPTIONS,
  });

  const elapsed = Date.now() - start;
  assert.ok(elapsed < 5000);
});

test('hiv screening is not included by default without explicit risk context', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female' },
    withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  );

  assert.equal(
    snapshot.items.some((item) => item.catalogItemId === 'hiv-screening'),
    false,
  );
});

test('hiv screening is included when hiv risk context is explicitly present', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female', riskFlags: ['hiv'] },
    withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  );

  assert.equal(
    snapshot.items.some((item) => item.catalogItemId === 'hiv-screening'),
    true,
  );
});

test('a rule band cadence overrides the item-level cadence when present', () => {
  const catalog = [{
    itemId: 'synthetic-band-cadence-item',
    name: 'Synthetic band cadence item',
    category: 'checkup',
    effortLevel: 'low',
    cadenceLabel: 'Every 3 years',
    whyItMatters: 'Test fixture.',
    requiredRiskFlags: [],
    ruleBands: [{
      gender: 'female',
      minAge: 18,
      maxAge: 120,
      targetAge: 18,
      priorityOrder: 1,
      cadenceLabel: 'Every year',
      recurrenceIntervalDays: 365,
    }],
  }];

  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 30, gender: 'female' },
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const item = snapshot.items.find((entry) => entry.catalogItemId === 'synthetic-band-cadence-item');
  assert.ok(item);
  assert.equal(item.cadenceLabel, 'Every year');
  assert.equal(item.recurrence.intervalDays, 365);
});

test('band-level required risk flags let one item auto-include for one band and stay risk-gated for another', () => {
  const catalog = [{
    itemId: 'synthetic-band-risk-item',
    name: 'Synthetic band risk item',
    category: 'checkup',
    effortLevel: 'low',
    cadenceLabel: 'By recommendation',
    whyItMatters: 'Test fixture.',
    requiredRiskFlags: [],
    ruleBands: [
      {
        gender: 'female', minAge: 18, maxAge: 24, targetAge: 18, priorityOrder: 1,
      },
      {
        gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 2, requiredRiskFlags: ['sti_risk_behavior'],
      },
      {
        gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 2, requiredRiskFlags: ['sti_risk_behavior'],
      },
    ],
  }];

  const hasItem = (profile) => generateInitialPlanSnapshot(
    profile,
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  ).items.some((entry) => entry.catalogItemId === 'synthetic-band-risk-item');

  assert.equal(hasItem({ profileId: 'a', age: 20, gender: 'female' }), true, 'young woman auto-includes with no risk flag');
  assert.equal(hasItem({ profileId: 'b', age: 30, gender: 'female' }), false, 'older woman without the risk flag is excluded');
  assert.equal(hasItem({ profileId: 'c', age: 30, gender: 'female', riskFlags: ['sti_risk_behavior'] }), true, 'older woman with the risk flag is included');
  assert.equal(hasItem({ profileId: 'd', age: 30, gender: 'male' }), false, 'man without the risk flag is excluded');
});

test('items with recurrence longer than one year are not initialized in Today at onboarding', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female' },
    withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  );

  const violatingItems = snapshot.items.filter((item) => (
    item.initialBucket === 'today'
    && Number.isFinite(Number(item?.recurrence?.intervalDays))
    && Number(item.recurrence.intervalDays) > 365
  ));

  assert.equal(violatingItems.length, 0);
});
