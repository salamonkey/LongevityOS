import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateHealthScore,
  groupItemsByPriority,
  resolveDashboardBucketForDisplay,
  resolveEffectiveItemStatus,
} from '../../src/features/self-onboarding-to-first-dashboard/dashboard.js';

test('resolveEffectiveItemStatus treats an item with optOut.until = null as opted_out forever', () => {
  const item = {
    catalogItemId: 'covid-19-booster',
    category: 'vaccination',
    nextDueDate: '2020-01-01',
    optOut: { preset: 'forever', until: null, decidedOn: '2026-01-01' },
  };

  const status = resolveEffectiveItemStatus(item, { today: new Date('2035-01-01T00:00:00.000Z') });
  assert.equal(status, 'opted_out');
});

test('resolveEffectiveItemStatus treats an item with a future optOut.until as opted_out', () => {
  const item = {
    catalogItemId: 'influenza-vaccine',
    category: 'vaccination',
    nextDueDate: '2026-01-01',
    optOut: { preset: 'one_season', until: '2026-08-01', decidedOn: '2026-05-01' },
  };

  const status = resolveEffectiveItemStatus(item, { today: new Date('2026-06-01T00:00:00.000Z') });
  assert.equal(status, 'opted_out');
});

test('resolveEffectiveItemStatus lapses an expired opt-out back to normal due-date logic', () => {
  const item = {
    catalogItemId: 'influenza-vaccine',
    category: 'vaccination',
    nextDueDate: '2026-01-01',
    optOut: { preset: 'one_season', until: '2026-03-01', decidedOn: '2025-12-01' },
  };

  const status = resolveEffectiveItemStatus(item, { today: new Date('2026-06-01T00:00:00.000Z') });
  assert.notEqual(status, 'opted_out');
  assert.equal(status, 'overdue');
});

test('resolveDashboardBucketForDisplay excludes an actively opted-out item from every urgency bucket', () => {
  const item = {
    catalogItemId: 'covid-19-booster',
    category: 'vaccination',
    nextDueDate: '2020-01-01',
    optOut: { preset: 'forever', until: null, decidedOn: '2026-01-01' },
  };

  const bucket = resolveDashboardBucketForDisplay(item, { today: new Date('2026-06-01T00:00:00.000Z') });
  assert.equal(bucket, null);
});

test('groupItemsByPriority never places an actively opted-out item into Today/Soon/Later', () => {
  const today = new Date('2026-06-01T00:00:00.000Z');
  const items = [
    { catalogItemId: 'a', category: 'checkup', nextDueDate: '2020-01-01', priorityOrder: 1, targetAge: 40, status: 'pending' },
    {
      catalogItemId: 'b',
      category: 'vaccination',
      nextDueDate: '2020-01-01',
      priorityOrder: 1,
      targetAge: 40,
      optOut: { preset: 'forever', until: null, decidedOn: '2026-01-01' },
    },
  ];

  const grouped = groupItemsByPriority(items, { today });
  const allIds = [...grouped.today, ...grouped.soon, ...grouped.later].map((entry) => entry.catalogItemId);

  assert.ok(allIds.includes('a'), 'the still-overdue item should surface');
  assert.ok(!allIds.includes('b'), 'the opted-out item must not surface in any bucket');
});

test('calculateHealthScore gives an opted-out item the same full credit as a done item, never the overdue penalty', () => {
  const today = new Date('2026-05-05T08:00:00.000Z');
  const base = {
    catalogItemId: 'x',
    category: 'checkup',
    recurrence: { intervalDays: 365 },
    nextDueDate: '2020-01-01',
    targetAge: 40,
    priorityOrder: 1,
  };

  const overdueScore = calculateHealthScore([{ ...base }], { today });
  const optedOutScore = calculateHealthScore(
    [{ ...base, optOut: { preset: 'forever', until: null, decidedOn: '2026-01-01' } }],
    { today },
  );
  const doneScore = calculateHealthScore(
    [{ ...base, completedOn: '2026-01-01', nextDueDate: '2026-12-31' }],
    { today },
  );

  assert.equal(overdueScore, 0);
  assert.equal(optedOutScore, 100);
  assert.equal(doneScore, 100);
});
