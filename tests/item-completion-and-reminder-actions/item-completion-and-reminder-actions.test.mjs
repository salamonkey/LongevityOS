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
  return snapshot.items.find((item) => item.dashboardBucket === 'today') ?? snapshot.items[0];
}

test('marking an item done updates detail, dashboard, and plan views in the same session', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);

  const result = markItemDoneInSnapshot(snapshot, profile.profileId, target.catalogItemId);
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
});

test('scheduling reminder accepts one month, three months, and custom date and returns planned status', () => {
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

  assert.equal(oneMonth.item.status, 'planned');
  assert.equal(oneMonth.reminder.scheduledFor, '2026-06-05');
  assert.ok(oneMonth.reminder.createdAt.startsWith('2026-05-05T10:15:00.000Z'));

  assert.equal(threeMonths.item.status, 'planned');
  assert.equal(threeMonths.reminder.scheduledFor, '2026-08-05');

  assert.equal(customDate.item.status, 'planned');
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

test('reminder creation is reflected as planned status across plan and dashboard read models', () => {
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

  assert.equal(detail.status, 'planned');
  assert.equal(dashboardItem.status, 'planned');
  assert.equal(detail.reminderDate, '2026-06-05');
  assert.ok(detail.reminderDateLabel.length > 0);
});

test('highlighted next item recomputes with Today-then-Soon and health score uses done vs outstanding only', () => {
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
        whyItMatters: 'Reason',
        dashboardBucket: 'today',
        targetAge: 40,
        priorityOrder: 1,
        status: 'due',
      },
      {
        catalogItemId: 'soon-one',
        name: 'Soon one',
        category: 'checkup',
        cadenceLabel: 'Every year',
        whyItMatters: 'Reason',
        dashboardBucket: 'soon',
        targetAge: 41,
        priorityOrder: 1,
        status: 'pending',
      },
    ],
  };

  const initialHighlighted = selectHighlightedItemTodayThenSoon(baseSnapshot);
  assert.equal(initialHighlighted.catalogItemId, 'today-one');
  assert.equal(calculateHealthScoreDoneVsOutstanding(baseSnapshot), 0);

  const afterDone = markItemDoneInSnapshot(baseSnapshot, profile.profileId, 'today-one').planSnapshot;
  const nextHighlighted = selectHighlightedItemTodayThenSoon(afterDone);
  const projection = buildDashboardProjectionForSlice(afterDone, profile);

  assert.equal(nextHighlighted.catalogItemId, 'soon-one');
  assert.equal(projection.highlightedItem.catalogItemId, 'soon-one');
  assert.equal(calculateHealthScoreDoneVsOutstanding(afterDone), 50);
});
