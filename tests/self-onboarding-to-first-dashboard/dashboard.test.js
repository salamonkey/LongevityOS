import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardProjection,
  calculateHealthScore,
  groupItemsByPriority,
  hasPopulatedDashboard,
  selectHighlightedItem,
} from '../../src/features/self-onboarding-to-first-dashboard/dashboard.js';
import { generateInitialPlanSnapshot } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';

const SAMPLE_ITEMS = [
  {
    catalogItemId: 'a',
    name: 'Item A',
    category: 'checkup',
    cadenceLabel: 'Every year',
    recurrence: { intervalDays: 365 },
    whyItMatters: 'Why A',
    nextDueDate: '2026-06-01',
    targetAge: 40,
    priorityOrder: 2,
    status: 'pending',
  },
  {
    catalogItemId: 'b',
    name: 'Item B',
    category: 'vaccination',
    cadenceLabel: 'Every year',
    recurrence: { intervalDays: 365 },
    whyItMatters: 'Why B',
    nextDueDate: '2026-05-01',
    targetAge: 38,
    priorityOrder: 1,
    status: 'due',
  },
  {
    catalogItemId: 'c',
    name: 'Item C',
    category: 'checkup',
    cadenceLabel: 'Every 3 years',
    recurrence: { intervalDays: 1095 },
    whyItMatters: 'Why C',
    nextDueDate: '2027-05-01',
    targetAge: 50,
    priorityOrder: 1,
    status: 'pending',
  },
];

function buildUrgentDueItems(count) {
  return Array.from({ length: count }, (_, index) => ({
    catalogItemId: `urgent-${index + 1}`,
    name: `Urgent ${index + 1}`,
    category: 'checkup',
    cadenceLabel: 'Every year',
    recurrence: { intervalDays: 365 },
    whyItMatters: `Why ${index + 1}`,
    nextDueDate: '2026-05-01',
    targetAge: 30 + index,
    priorityOrder: index + 1,
    status: 'due',
  }));
}

test('groupItemsByPriority returns Today/Soon/Later groups with sorted items', () => {
  const bucketed = groupItemsByPriority(SAMPLE_ITEMS, { today: new Date('2026-05-05T08:00:00.000Z') });

  assert.equal(bucketed.today.length, 1);
  assert.equal(bucketed.soon.length, 1);
  assert.equal(bucketed.later.length, 1);
  assert.equal(bucketed.today[0].name, 'Item B');
});

test('highlight rule prefers today item, then soon, then later', () => {
  const bucketed = groupItemsByPriority(SAMPLE_ITEMS, { today: new Date('2026-05-05T08:00:00.000Z') });
  const highlighted = selectHighlightedItem(bucketed);

  assert.equal(highlighted.name, 'Item B');

  const fallbackHighlighted = selectHighlightedItem({ today: [], soon: bucketed.soon, later: bucketed.later });
  assert.equal(fallbackHighlighted.name, 'Item A');
});

test('health readiness score uses category share, urgency multipliers, and status credits', () => {
  const score = calculateHealthScore(SAMPLE_ITEMS, { today: new Date('2026-05-05T08:00:00.000Z') });
  assert.equal(score, 21);
});

test('health readiness score is unavailable when no applicable plan items exist', () => {
  const score = calculateHealthScore([], { today: new Date('2026-05-05T08:00:00.000Z') });
  const projection = buildDashboardProjection(
    { items: [], generatedAt: '2026-05-05T08:00:00.000Z' },
    { name: 'Child' },
  );

  assert.equal(score, null);
  assert.equal(projection.healthScore, null);
  assert.equal(projection.highlightedItem, null);
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

test('done items move between Later/Soon/Today based on time remaining to next due date', () => {
  const doneItem = {
    catalogItemId: 'done-item',
    name: 'Completed item',
    category: 'checkup',
    cadenceLabel: 'Every year',
    whyItMatters: 'Why',
    recurrence: { intervalDays: 365 },
    targetAge: 40,
    priorityOrder: 1,
    status: 'done',
    completedOn: '2026-01-01',
  };

  const projectionLater = buildDashboardProjection(
    { items: [doneItem], generatedAt: '2026-05-05T08:00:00.000Z' },
    { name: 'You' },
    { today: new Date('2026-05-05T08:00:00.000Z') },
  );
  assert.equal(projectionLater.sections.find((section) => section.priority === 'later')?.items.length, 1);

  const projectionSoon = buildDashboardProjection(
    { items: [doneItem], generatedAt: '2026-11-20T08:00:00.000Z' },
    { name: 'You' },
    { today: new Date('2026-11-20T08:00:00.000Z') },
  );
  assert.equal(projectionSoon.sections.find((section) => section.priority === 'soon')?.items.length, 1);

  const projectionToday = buildDashboardProjection(
    { items: [doneItem], generatedAt: '2027-01-02T08:00:00.000Z' },
    { name: 'You' },
    { today: new Date('2027-01-02T08:00:00.000Z') },
  );
  assert.equal(projectionToday.sections.find((section) => section.priority === 'today')?.items.length, 1);
});

test('overdue queue is staged into Today, Soon, and Later buckets by lowest-friction priority', () => {
  const urgentItems = buildUrgentDueItems(10);
  const projection = buildDashboardProjection(
    { items: urgentItems, generatedAt: '2026-05-05T08:00:00.000Z' },
    { name: 'You' },
    { today: new Date('2026-05-05T08:00:00.000Z') },
  );

  const today = projection.sections.find((section) => section.priority === 'today')?.items ?? [];
  const soon = projection.sections.find((section) => section.priority === 'soon')?.items ?? [];
  const later = projection.sections.find((section) => section.priority === 'later')?.items ?? [];

  assert.equal(today.length, 3);
  assert.equal(soon.length, 6);
  assert.equal(later.length, 1);
  assert.deepEqual(today.map((item) => item.catalogItemId), ['urgent-1', 'urgent-2', 'urgent-3']);
  assert.deepEqual(soon.map((item) => item.catalogItemId), ['urgent-4', 'urgent-5', 'urgent-6', 'urgent-7', 'urgent-8', 'urgent-9']);
  assert.deepEqual(later.map((item) => item.catalogItemId), ['urgent-10']);
});

test('completing a Today item promotes the next urgent item into Today', () => {
  const itemsBefore = buildUrgentDueItems(5);
  const itemsAfter = itemsBefore.map((item, index) => (
    index === 0
      ? {
        ...item,
        status: 'done',
        completedOn: '2026-05-05',
        nextDueDate: undefined,
        initialDueDate: undefined,
      }
      : item
  ));

  const before = buildDashboardProjection(
    { items: itemsBefore, generatedAt: '2026-05-05T08:00:00.000Z' },
    { name: 'You' },
    { today: new Date('2026-05-05T08:00:00.000Z') },
  );
  const after = buildDashboardProjection(
    { items: itemsAfter, generatedAt: '2026-05-06T08:00:00.000Z' },
    { name: 'You' },
    { today: new Date('2026-05-06T08:00:00.000Z') },
  );

  const beforeToday = before.sections.find((section) => section.priority === 'today')?.items ?? [];
  const afterToday = after.sections.find((section) => section.priority === 'today')?.items ?? [];

  assert.deepEqual(beforeToday.map((item) => item.catalogItemId), ['urgent-1', 'urgent-2', 'urgent-3']);
  assert.deepEqual(afterToday.map((item) => item.catalogItemId), ['urgent-2', 'urgent-3', 'urgent-4']);
});

test('low-effort blood pressure check is surfaced in Today immediately after onboarding', () => {
  const profile = { profileId: 'self', age: 45, gender: 'female', name: 'You' };
  const snapshot = generateInitialPlanSnapshot(profile, { now: new Date('2026-05-05T08:00:00.000Z') });
  const projection = buildDashboardProjection(snapshot, profile, { today: new Date('2026-05-05T08:00:00.000Z') });
  const todayItems = projection.sections.find((section) => section.priority === 'today')?.items ?? [];

  assert.equal(todayItems.some((item) => item.catalogItemId === 'blood-pressure-check'), true);
  assert.equal(todayItems[0]?.catalogItemId, 'blood-pressure-check');
});
