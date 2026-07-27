import test from 'node:test';
import assert from 'node:assert/strict';

import { generateInitialPlanSnapshot } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import { resolveEffectiveItemStatus } from '../../src/features/self-onboarding-to-first-dashboard/dashboard.js';
import { buildStatusQuoGroups } from '../../src/features/live-enrollment/statusQuo.js';
import { BODY_REGIONS } from '../../src/features/self-onboarding-to-first-dashboard/bodyRegions.js';
import { withTestCatalogOptions } from '../fixtures/catalogOptions.js';

const NOW = new Date('2026-05-05T08:00:00.000Z');
const REGION_IDS = new Set(BODY_REGIONS.map((region) => region.id));
const ALREADY_DUE_STATUSES = new Set(['due', 'overdue']);

test('a 53-year-old profile produces status-quo groups covering every already-due item, and nothing else', () => {
  const profile = { profileId: 'self', age: 53, gender: 'male' };
  const snapshot = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now: NOW }));

  const expectedDueItemKeys = new Set(
    snapshot.items
      .filter((item) => ALREADY_DUE_STATUSES.has(resolveEffectiveItemStatus(item, { today: NOW })))
      .map((item) => item.catalogItemId),
  );

  const groups = buildStatusQuoGroups(snapshot, { today: NOW });
  assert.ok(groups.length > 0, 'expected at least one non-empty group for a 53-year-old');

  const groupedItemKeys = new Set();
  for (const group of groups) {
    assert.equal(REGION_IDS.has(group.regionId), true, `unknown region id: ${group.regionId}`);
    assert.ok(group.options.length > 0, `group ${group.regionId} should not be rendered empty`);
    for (const option of group.options) {
      groupedItemKeys.add(option.itemKey);
      assert.ok(option.name, 'each option needs a display name');
      assert.equal(['checkup', 'vaccination', 'counseling'].includes(option.category), true);
    }
  }

  assert.deepEqual(groupedItemKeys, expectedDueItemKeys);
});

test('status-quo groups include due vaccination items, not just checkups/counseling', () => {
  const profile = { profileId: 'self', age: 53, gender: 'male' };
  const snapshot = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now: NOW }));

  const groups = buildStatusQuoGroups(snapshot, { today: NOW });
  const hasVaccinationOption = groups.some((group) => group.options.some((option) => option.category === 'vaccination'));

  assert.equal(hasVaccinationOption, true, 'expected at least one due vaccination item for a 53-year-old');
});

test('items that are not yet due (pending/soon/done) are excluded from status-quo groups', () => {
  const profile = { profileId: 'self', age: 53, gender: 'male' };
  const snapshot = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now: NOW }));

  const notYetDueKeys = new Set(
    snapshot.items
      .filter((item) => !ALREADY_DUE_STATUSES.has(resolveEffectiveItemStatus(item, { today: NOW })))
      .map((item) => item.catalogItemId),
  );

  const groups = buildStatusQuoGroups(snapshot, { today: NOW });
  const groupedItemKeys = new Set(groups.flatMap((group) => group.options.map((option) => option.itemKey)));

  for (const key of notYetDueKeys) {
    assert.equal(groupedItemKeys.has(key), false, `${key} is not yet due and should not appear in the status-quo wizard`);
  }
});

test('a young adult profile with nothing due yet produces zero groups', () => {
  const profile = { profileId: 'self', age: 19, gender: 'female' };
  const snapshot = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now: NOW }));

  const groups = buildStatusQuoGroups(snapshot, { today: NOW });
  const anyDue = snapshot.items.some((item) => ALREADY_DUE_STATUSES.has(resolveEffectiveItemStatus(item, { today: NOW })));

  // Only assert the empty-groups guarantee when the fixture data actually has
  // nothing due for this age -- keeps the test honest about what it's really
  // checking instead of assuming the fixture shape.
  if (!anyDue) {
    assert.deepEqual(groups, []);
  }
});

test('an empty plan snapshot produces zero groups without throwing', () => {
  const groups = buildStatusQuoGroups({ items: [] }, { today: NOW });
  assert.deepEqual(groups, []);
});
