import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BODY_REGIONS,
  REGION_ID_BY_ITEM_KEY,
  buildBodyMapPoints,
  resolveRegionIdForItemKey,
  resolveRegionRouteForRegionId,
} from '../../src/features/self-onboarding-to-first-dashboard/bodyRegions.js';

const CURRENT_CATALOG_ITEM_KEYS = [
  'annual-wellness-visit',
  'blood-pressure-check',
  'cholesterol-screening',
  'diabetes-screening',
  'cervical-cancer-screening',
  'prostate-health-discussion',
  'influenza-vaccine',
  'tdap-booster',
  'shingles-vaccine',
  'covid-19-booster',
  'hepatitis-b-vaccine',
  'colorectal-cancer-screening',
  'breast-cancer-screening',
  'lung-cancer-screening',
  'osteoporosis-screening',
  'abdominal-aortic-aneurysm-screening',
  'depression-screening',
  'hiv-screening',
  'hepatitis-c-screening',
  'tobacco-cessation-support',
  'alcohol-use-screening',
  'pneumococcal-vaccine',
  'rsv-vaccine',
  'hpv-vaccine',
  'mmr-vaccine',
  'varicella-vaccine',
  'hepatitis-a-vaccine',
  'meningococcal-vaccine',
  'polio-vaccine',
  'illicit-drug-use-counseling',
  'physical-activity-counseling',
  'nutrition-counseling',
  'sexual-behavior-counseling',
  'sun-exposure-counseling',
  'weight-bmi-screening',
  'syphilis-screening',
  'chlamydia-gonorrhea-screening',
  'hepatitis-b-screening',
  'domestic-violence-screening',
];

test('every current catalog item has an explicit body-region mapping', () => {
  assert.equal(CURRENT_CATALOG_ITEM_KEYS.length, 39);
  for (const itemKey of CURRENT_CATALOG_ITEM_KEYS) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(REGION_ID_BY_ITEM_KEY, itemKey),
      `expected an explicit region mapping for ${itemKey}`,
    );
    const regionId = resolveRegionIdForItemKey(itemKey);
    assert.ok(
      BODY_REGIONS.some((region) => region.id === regionId),
      `mapped region ${regionId} for ${itemKey} is not a declared region`,
    );
  }
});

test('an unmapped item key falls back to lifestyle-general', () => {
  assert.equal(resolveRegionIdForItemKey('some-future-item'), 'lifestyle-general');
});

test('immunizations region routes to the vaccinations tab, others to checkups', () => {
  assert.equal(resolveRegionRouteForRegionId('immunizations'), 'vaccinations');
  assert.equal(resolveRegionRouteForRegionId('heart-metabolic'), 'checkups');
  assert.equal(resolveRegionRouteForRegionId('mental-social'), 'checkups');
});

function makeItem(overrides) {
  return {
    catalogItemId: 'blood-pressure-check',
    name: 'Blood pressure check',
    category: 'checkup',
    cadenceLabel: 'Every year',
    recurrence: { intervalDays: 365 },
    nextDueDate: '2026-07-24',
    status: 'due',
    ...overrides,
  };
}

test('a region with a due item today is flagged action, with that item as the note', () => {
  const today = new Date('2026-07-24T08:00:00.000Z');
  const points = buildBodyMapPoints([
    makeItem({ catalogItemId: 'blood-pressure-check', name: 'Blood pressure check', status: 'due', nextDueDate: '2026-07-24' }),
    makeItem({ catalogItemId: 'cholesterol-screening', name: 'Cholesterol screening', status: 'pending', nextDueDate: '2027-01-01' }),
  ], { today });

  const heartPoint = points.find((point) => point.id === 'heart-metabolic');
  assert.ok(heartPoint);
  assert.equal(heartPoint.status, 'action');
  assert.equal(heartPoint.note, 'Blood pressure check');
});

test('a region with only a near-term item is flagged soon', () => {
  const today = new Date('2026-07-24T08:00:00.000Z');
  const points = buildBodyMapPoints([
    makeItem({ catalogItemId: 'cholesterol-screening', name: 'Cholesterol screening', status: 'pending', nextDueDate: '2026-08-01' }),
  ], { today });

  const heartPoint = points.find((point) => point.id === 'heart-metabolic');
  assert.ok(heartPoint);
  assert.equal(heartPoint.status, 'soon');
});

test('a region with only done/far-future items is flagged ok', () => {
  const today = new Date('2026-07-24T08:00:00.000Z');
  const points = buildBodyMapPoints([
    makeItem({
      catalogItemId: 'blood-pressure-check',
      name: 'Blood pressure check',
      status: 'done',
      completedOn: '2026-07-01',
      nextDueDate: '2027-07-01',
      recurrence: { intervalDays: 365 },
    }),
  ], { today });

  const heartPoint = points.find((point) => point.id === 'heart-metabolic');
  assert.ok(heartPoint);
  assert.equal(heartPoint.status, 'ok');
});

test('a completed one-time item does not keep flagging its region as action via a stale pre-completion initialDueDate', () => {
  const today = new Date('2026-07-27T08:00:00.000Z');
  const points = buildBodyMapPoints([
    makeItem({
      catalogItemId: 'mmr-vaccine',
      name: 'MMR catch-up dose',
      category: 'vaccination',
      cadenceLabel: 'One-time catch-up dose',
      status: 'done',
      completedOn: '2020-03-15',
      initialDueDate: '2020-01-01',
      recurrence: undefined,
      nextDueDate: undefined,
    }),
  ], { today });

  const immunizationsPoint = points.find((point) => point.id === 'immunizations');
  assert.ok(immunizationsPoint);
  assert.equal(immunizationsPoint.status, 'ok');
});

test('regions with no plan items are omitted from the returned points', () => {
  const points = buildBodyMapPoints([], {});
  assert.deepEqual(points, []);
});

test('labels are translated via the provided t function', () => {
  const points = buildBodyMapPoints([makeItem({})], {
    t: (key) => `translated:${key}`,
    today: new Date('2026-07-24T08:00:00.000Z'),
  });
  const heartPoint = points.find((point) => point.id === 'heart-metabolic');
  assert.equal(heartPoint.label, 'translated:bodyRegions.heartMetabolic');
});
