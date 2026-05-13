import test from 'node:test';
import assert from 'node:assert/strict';

import { generateInitialPlanSnapshot } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  buildDashboardProjectionForSlice,
  buildPlanReadModelForSlice,
  calculateHealthScoreDoneVsOutstanding,
  selectHighlightedItemTodayThenSoon,
} from '../../src/features/item-completion-and-reminder-actions/selectors.js';
import {
  markItemDoneInSnapshot,
  scheduleItemReminderInSnapshot,
} from '../../src/features/item-completion-and-reminder-actions/actions.js';
import {
  REMINDER_TIMING_TYPES,
} from '../../src/features/item-completion-and-reminder-actions/model.js';

function createProfile() {
  return { profileId: 'self', age: 45, gender: 'female', name: 'You' };
}

function createSnapshot() {
  return generateInitialPlanSnapshot(createProfile(), {
    now: new Date('2026-05-05T08:00:00.000Z'),
  });
}

function pickTargetItem(snapshot) {
  return snapshot.items.find((item) => item.status === 'due') ?? snapshot.items[0];
}

test('marking an item done updates detail, dashboard, and plan views in the same session', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);

  const result = markItemDoneInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    {},
    () => new Date('2026-05-05T10:15:00.000Z'),
  );
  const readModel = buildPlanReadModelForSlice(result.planSnapshot);
  const detail = readModel.byItemKey[target.catalogItemId];
  const dashboard = buildDashboardProjectionForSlice(result.planSnapshot, profile);
  const dashboardItem = dashboard.sections
    .flatMap((section) => section.items)
    .find((item) => item.catalogItemId === target.catalogItemId);

  assert.equal(detail.status, 'done');
  assert.equal(dashboardItem.status, 'done');
  assert.equal(result.item.status, 'done');
  assert.equal(result.item.reminder, undefined);
  assert.equal(result.item.completedOn, '2026-05-05');
  assert.equal(detail.completedOnLabel.length > 0, true);
});

test('marking an item done accepts a custom past date and rejects future dates', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);
  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  const customDone = markItemDoneInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { customDate: '2026-04-20' },
    fixedNow,
  );
  assert.equal(customDone.item.completedOn, '2026-04-20');

  assert.throws(() => {
    markItemDoneInSnapshot(
      snapshot,
      profile.profileId,
      target.catalogItemId,
      { customDate: '2026-06-01' },
      fixedNow,
    );
  }, /today or a past date/i);
});

test('scheduling reminder accepts one month, three months, and custom date and returns pending status', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);
  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  const oneMonth = scheduleItemReminderInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { timingType: REMINDER_TIMING_TYPES.one_month },
    fixedNow,
  );

  const threeMonths = scheduleItemReminderInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { timingType: REMINDER_TIMING_TYPES.three_months },
    fixedNow,
  );

  const customDate = scheduleItemReminderInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { timingType: REMINDER_TIMING_TYPES.custom_date, customDate: '2026-07-12' },
    fixedNow,
  );

  assert.equal(oneMonth.item.status, 'pending');
  assert.equal(oneMonth.reminder.scheduledFor, '2026-06-05');
  assert.ok(oneMonth.reminder.createdAt.startsWith('2026-05-05T10:15:00.000Z'));

  assert.equal(threeMonths.item.status, 'pending');
  assert.equal(threeMonths.reminder.scheduledFor, '2026-08-05');

  assert.equal(customDate.item.status, 'pending');
  assert.equal(customDate.reminder.scheduledFor, '2026-07-12');
});

test('custom reminder date validation rejects missing and past dates', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);
  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  assert.throws(() => {
    scheduleItemReminderInSnapshot(
      snapshot,
      profile.profileId,
      target.catalogItemId,
      { timingType: REMINDER_TIMING_TYPES.custom_date, customDate: '' },
      fixedNow,
    );
  }, /choose a reminder date/i);

  assert.throws(() => {
    scheduleItemReminderInSnapshot(
      snapshot,
      profile.profileId,
      target.catalogItemId,
      { timingType: REMINDER_TIMING_TYPES.custom_date, customDate: '2026-05-01' },
      fixedNow,
    );
  }, /future date/i);
});

test('reminder creation is reflected as pending status across plan and dashboard read models', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);

  const result = scheduleItemReminderInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { timingType: REMINDER_TIMING_TYPES.one_month },
    () => new Date('2026-05-05T10:15:00.000Z'),
  );

  const readModel = buildPlanReadModelForSlice(result.planSnapshot);
  const detail = readModel.byItemKey[target.catalogItemId];
  const dashboard = buildDashboardProjectionForSlice(result.planSnapshot, profile);
  const dashboardItem = dashboard.sections
    .flatMap((section) => section.items)
    .find((item) => item.catalogItemId === target.catalogItemId);

  assert.equal(detail.status, 'pending');
  assert.equal(dashboardItem.status, 'pending');
  assert.equal(detail.reminderDate, '2026-06-05');
  assert.ok(detail.reminderDateLabel.length > 0);
});

test('highlighted next item recomputes with Today-then-Soon and health score uses readiness weighting', () => {
  const profile = createProfile();
  const baseSnapshot = {
    planId: 'plan-self',
    profileId: 'self',
    generatedAt: '2026-05-05T08:00:00.000Z',
    items: [
      {
        catalogItemId: 'today-one',
        name: 'Today one',
        category: 'checkup',
        cadenceLabel: 'Every year',
        recurrence: { intervalDays: 365 },
        whyItMatters: 'Reason',
        nextDueDate: '2026-05-05',
        initialDueDate: '2026-05-05',
        targetAge: 40,
        priorityOrder: 1,
        status: 'due',
      },
      {
        catalogItemId: 'soon-one',
        name: 'Soon one',
        category: 'checkup',
        cadenceLabel: 'Every year',
        recurrence: { intervalDays: 365 },
        whyItMatters: 'Reason',
        nextDueDate: '2026-07-01',
        initialDueDate: '2026-07-01',
        targetAge: 41,
        priorityOrder: 1,
        status: 'pending',
      },
    ],
  };

  const initialHighlighted = selectHighlightedItemTodayThenSoon(baseSnapshot);
  assert.equal(initialHighlighted.catalogItemId, 'today-one');
  assert.equal(calculateHealthScoreDoneVsOutstanding(baseSnapshot), 18);

  const afterDone = markItemDoneInSnapshot(baseSnapshot, profile.profileId, 'today-one').planSnapshot;
  const nextHighlighted = selectHighlightedItemTodayThenSoon(afterDone);
  const projection = buildDashboardProjectionForSlice(afterDone, profile);

  assert.equal(nextHighlighted.catalogItemId, 'soon-one');
  assert.equal(projection.highlightedItem.catalogItemId, 'soon-one');
  assert.equal(calculateHealthScoreDoneVsOutstanding(afterDone), 67);
});

test('slice dashboard also stages large overdue queues into Today, Soon, and Later', () => {
  const snapshot = {
    planId: 'plan-self',
    profileId: 'self',
    generatedAt: '2026-05-05T08:00:00.000Z',
    items: Array.from({ length: 10 }, (_, index) => ({
      catalogItemId: `urgent-${index + 1}`,
      name: `Urgent ${index + 1}`,
      category: 'checkup',
      cadenceLabel: 'Every year',
      recurrence: { intervalDays: 365 },
      whyItMatters: `Reason ${index + 1}`,
      nextDueDate: '2026-05-01',
      initialDueDate: '2026-05-01',
      targetAge: 30 + index,
      priorityOrder: index + 1,
      status: 'due',
    })),
  };

  const projection = buildDashboardProjectionForSlice(snapshot, createProfile());
  const today = projection.sections.find((section) => section.priority === 'today')?.items ?? [];
  const soon = projection.sections.find((section) => section.priority === 'soon')?.items ?? [];
  const later = projection.sections.find((section) => section.priority === 'later')?.items ?? [];

  assert.equal(today.length, 3);
  assert.equal(soon.length, 6);
  assert.equal(later.length, 1);
  assert.equal(projection.dueTodayCount, 3);
});

test('plan read model orders checkups and vaccinations by urgency', () => {
  const snapshot = {
    planId: 'plan-self',
    profileId: 'self',
    generatedAt: '2026-05-05T08:00:00.000Z',
    items: [
      {
        catalogItemId: 'cholesterol-screening',
        cadenceLabel: 'Every 4 to 6 years',
        recurrence: { intervalDays: 1460 },
        nextDueDate: '2028-05-05',
        targetAge: 50,
        priorityOrder: 3,
        status: 'pending',
      },
      {
        catalogItemId: 'annual-wellness-visit',
        cadenceLabel: 'Every year',
        recurrence: { intervalDays: 365 },
        nextDueDate: '2026-05-01',
        targetAge: 40,
        priorityOrder: 1,
        status: 'due',
      },
      {
        catalogItemId: 'diabetes-screening',
        cadenceLabel: 'Every 3 years',
        recurrence: { intervalDays: 1095 },
        nextDueDate: '2026-09-01',
        targetAge: 45,
        priorityOrder: 2,
        status: 'pending',
      },
      {
        catalogItemId: 'tdap-booster',
        cadenceLabel: 'Every 10 years',
        recurrence: { intervalDays: 3650 },
        nextDueDate: '2030-05-05',
        targetAge: 45,
        priorityOrder: 3,
        status: 'pending',
      },
      {
        catalogItemId: 'influenza-vaccine',
        cadenceLabel: 'Every year',
        recurrence: { intervalDays: 365 },
        nextDueDate: '2026-05-02',
        targetAge: 40,
        priorityOrder: 1,
        status: 'due',
      },
      {
        catalogItemId: 'shingles-vaccine',
        cadenceLabel: 'Every year',
        recurrence: { intervalDays: 365 },
        nextDueDate: '2026-07-10',
        targetAge: 50,
        priorityOrder: 2,
        status: 'pending',
      },
    ],
  };

  const readModel = buildPlanReadModelForSlice(snapshot);

  assert.deepEqual(
    readModel.checkups.map((item) => item.itemKey),
    ['annual-wellness-visit', 'diabetes-screening', 'cholesterol-screening'],
  );
  assert.deepEqual(
    readModel.vaccinations.map((item) => item.itemKey),
    ['influenza-vaccine', 'shingles-vaccine', 'tdap-booster'],
  );
});

test('done one-time item does not outrank reminder-scheduled pending item', () => {
  const snapshot = {
    planId: 'plan-self',
    profileId: 'self',
    generatedAt: '2026-05-05T08:00:00.000Z',
    items: [
      {
        catalogItemId: 'hepatitis-c-screening',
        name: 'Hepatitis C screening',
        category: 'checkup',
        cadenceLabel: 'At least once for ages 18 to 79',
        recurrence: { intervalDays: null },
        initialDueDate: '2026-05-01',
        status: 'done',
        completedOn: '2026-05-05',
      },
      {
        catalogItemId: 'blood-pressure-check',
        name: 'Blood pressure check',
        category: 'checkup',
        cadenceLabel: 'At least every year',
        recurrence: { intervalDays: 365 },
        status: 'pending',
        reminder: {
          timingType: REMINDER_TIMING_TYPES.one_month,
          scheduledFor: '2026-06-05',
          createdAt: '2026-05-05T10:15:00.000Z',
        },
      },
    ],
  };

  const readModel = buildPlanReadModelForSlice(snapshot);
  assert.deepEqual(
    readModel.checkups.map((item) => item.itemKey),
    ['blood-pressure-check', 'hepatitis-c-screening'],
  );
});
