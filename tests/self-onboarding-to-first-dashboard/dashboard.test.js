import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardProjection,
  calculateHealthScore,
  groupItemsByPriority,
  hasPopulatedDashboard,
  selectHighlightedItem,
} from '../../src/features/self-onboarding-to-first-dashboard/dashboard.js';

const SAMPLE_ITEMS = [
  {
    catalogItemId: 'a',
    name: 'Item A',
    category: 'checkup',
    cadenceLabel: 'Every year',
    whyItMatters: 'Why A',
    dashboardBucket: 'soon',
    targetAge: 40,
    priorityOrder: 2,
    status: 'planned',
  },
  {
    catalogItemId: 'b',
    name: 'Item B',
    category: 'vaccination',
    cadenceLabel: 'Every year',
    whyItMatters: 'Why B',
    dashboardBucket: 'today',
    targetAge: 38,
    priorityOrder: 1,
    status: 'due',
  },
  {
    catalogItemId: 'c',
    name: 'Item C',
    category: 'checkup',
    cadenceLabel: 'Every 3 years',
    whyItMatters: 'Why C',
    dashboardBucket: 'later',
    targetAge: 50,
    priorityOrder: 1,
    status: 'planned',
  },
];

test('groupItemsByPriority returns Today/Soon/Later groups with sorted items', () => {
  const bucketed = groupItemsByPriority(SAMPLE_ITEMS);

  assert.equal(bucketed.today.length, 1);
  assert.equal(bucketed.soon.length, 1);
  assert.equal(bucketed.later.length, 1);
  assert.equal(bucketed.today[0].name, 'Item B');
});

test('highlight rule prefers today item, then soon, then later', () => {
  const bucketed = groupItemsByPriority(SAMPLE_ITEMS);
  const highlighted = selectHighlightedItem(bucketed);

  assert.equal(highlighted.name, 'Item B');

  const fallbackHighlighted = selectHighlightedItem({ today: [], soon: bucketed.soon, later: bucketed.later });
  assert.equal(fallbackHighlighted.name, 'Item A');
});

test('health score uses bucket weights and due/planned status', () => {
  const score = calculateHealthScore(SAMPLE_ITEMS);
  assert.equal(score, 50);
});

test('projection returns one highlighted item and populated sections', () => {
  const projection = buildDashboardProjection(
    { items: SAMPLE_ITEMS, generatedAt: '2026-05-05T08:00:00.000Z' },
    { name: 'You' },
  );

  assert.equal(projection.highlightedItem.name, 'Item B');
  assert.equal(projection.sections.length, 3);
  assert.equal(hasPopulatedDashboard(projection), true);
});
