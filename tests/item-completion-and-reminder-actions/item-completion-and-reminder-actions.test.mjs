import test from 'node:test';
import assert from 'node:assert/strict';

import { generateInitialPlanSnapshot, resolveNonApplicableCatalogItems } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  buildDashboardProjectionForSlice,
  buildPlanReadModelForSlice,
  calculateHealthScoreDoneVsOutstanding,
  selectHighlightedItemTodayThenSoon,
} from '../../src/features/item-completion-and-reminder-actions/selectors.js';
import {
  adoptCatalogItemToSnapshot,
  clearItemOptOutInSnapshot,
  markItemDoneInSnapshot,
  scheduleItemReminderInSnapshot,
  setItemOptOutInSnapshot,
} from '../../src/features/item-completion-and-reminder-actions/actions.js';
import {
  OPT_OUT_PRESETS,
  REMINDER_TIMING_TYPES,
} from '../../src/features/item-completion-and-reminder-actions/model.js';
import {
  withTestCatalogOptions,
} from '../fixtures/catalogOptions.js';

function createProfile() {
  return { profileId: 'self', age: 45, gender: 'female', name: 'You' };
}

function createSnapshot() {
  return generateInitialPlanSnapshot(createProfile(), {
    ...withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  });
}

function pickTargetItem(snapshot) {
  return snapshot.items.find((item) => item.status === 'due') ?? snapshot.items[0];
}

test('marking an item done updates detail, dashboard, and plan views in the same session', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);
  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  const result = markItemDoneInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    {},
    fixedNow,
  );
  const readModel = buildPlanReadModelForSlice(result.planSnapshot, { today: fixedNow() });
  const detail = readModel.byItemKey[target.catalogItemId];
  const dashboard = buildDashboardProjectionForSlice(result.planSnapshot, profile, { today: fixedNow() });
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

test('reminder creation is reflected as planned status across plan and dashboard read models', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);
  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  const result = scheduleItemReminderInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { timingType: REMINDER_TIMING_TYPES.one_month },
    fixedNow,
  );

  const readModel = buildPlanReadModelForSlice(result.planSnapshot, { today: fixedNow() });
  const detail = readModel.byItemKey[target.catalogItemId];
  const dashboard = buildDashboardProjectionForSlice(result.planSnapshot, profile, { today: fixedNow() });
  const dashboardItem = dashboard.sections
    .flatMap((section) => section.items)
    .find((item) => item.catalogItemId === target.catalogItemId);

  assert.equal(detail.status, 'planned');
  assert.equal(dashboardItem.status, 'planned');
  assert.equal(detail.reminderDate, '2026-06-05');
  assert.ok(detail.reminderDateLabel.length > 0);
});

test('opting out of an item for a season removes it from the due dashboard bucket without penalizing the health score', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);
  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  const beforeDashboard = buildDashboardProjectionForSlice(snapshot, profile, { today: fixedNow() });
  const beforeScore = beforeDashboard.healthScore;

  const result = setItemOptOutInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { preset: OPT_OUT_PRESETS.one_season },
    fixedNow,
  );

  const readModel = buildPlanReadModelForSlice(result.planSnapshot, { today: fixedNow() });
  const detail = readModel.byItemKey[target.catalogItemId];
  const dashboard = buildDashboardProjectionForSlice(result.planSnapshot, profile, { today: fixedNow() });
  const dashboardItemKeys = dashboard.sections.flatMap((section) => section.items.map((item) => item.catalogItemId));

  assert.equal(detail.status, 'opted_out');
  assert.equal(result.item.optOut.preset, OPT_OUT_PRESETS.one_season);
  assert.equal(result.item.optOut.until, '2026-08-05');
  // Regression: the read model DetailView actually renders from must carry
  // optOut.until through too, not just the raw mutation result -- a timed
  // opt-out that doesn't reach the UI layer would always render as "skipped
  // forever" regardless of which preset was chosen.
  assert.equal(detail.optOut.preset, OPT_OUT_PRESETS.one_season);
  assert.equal(detail.optOut.until, '2026-08-05');
  assert.ok(!dashboardItemKeys.includes(target.catalogItemId), 'opted-out item must not appear in any Today/Soon/Later bucket');
  assert.ok(
    dashboard.healthScore >= beforeScore,
    `opting out must not lower the health score (before ${beforeScore}, after ${dashboard.healthScore})`,
  );
});

test('opting out forever stores a null until date that never lapses', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);
  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  const result = setItemOptOutInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { preset: OPT_OUT_PRESETS.forever },
    fixedNow,
  );

  assert.equal(result.item.optOut.until, null);

  const readModel = buildPlanReadModelForSlice(result.planSnapshot, { today: new Date('2035-01-01T00:00:00.000Z') });
  assert.equal(readModel.byItemKey[target.catalogItemId].status, 'opted_out');
});

test('reactivating an opted-out item clears the opt-out and restores normal status', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);
  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  const optedOut = setItemOptOutInSnapshot(
    snapshot,
    profile.profileId,
    target.catalogItemId,
    { preset: OPT_OUT_PRESETS.forever },
    fixedNow,
  );
  const reactivated = clearItemOptOutInSnapshot(
    optedOut.planSnapshot,
    profile.profileId,
    target.catalogItemId,
    fixedNow,
  );

  assert.equal(reactivated.item.optOut, undefined);
  const readModel = buildPlanReadModelForSlice(reactivated.planSnapshot, { today: fixedNow() });
  assert.notEqual(readModel.byItemKey[target.catalogItemId].status, 'opted_out');
});

test('setting an opt-out without a recognized preset throws instead of silently no-op', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const target = pickTargetItem(snapshot);

  assert.throws(() => setItemOptOutInSnapshot(snapshot, profile.profileId, target.catalogItemId, { preset: 'not-a-real-preset' }));
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

  const fixedNow = () => new Date('2026-05-05T10:15:00.000Z');

  const initialHighlighted = selectHighlightedItemTodayThenSoon(baseSnapshot, { today: fixedNow() });
  assert.equal(initialHighlighted.catalogItemId, 'today-one');
  assert.equal(calculateHealthScoreDoneVsOutstanding(baseSnapshot, { today: fixedNow() }), 18);

  const afterDone = markItemDoneInSnapshot(baseSnapshot, profile.profileId, 'today-one', {}, fixedNow).planSnapshot;
  const nextHighlighted = selectHighlightedItemTodayThenSoon(afterDone, { today: fixedNow() });
  const projection = buildDashboardProjectionForSlice(afterDone, profile, { today: fixedNow() });

  assert.equal(nextHighlighted.catalogItemId, 'soon-one');
  assert.equal(projection.highlightedItem.catalogItemId, 'soon-one');
  assert.equal(calculateHealthScoreDoneVsOutstanding(afterDone, { today: fixedNow() }), 67);
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
        name: 'Cholesterol screening',
        category: 'checkup',
        cadenceLabel: 'Every 4 to 6 years',
        recurrence: { intervalDays: 1460 },
        nextDueDate: '2028-05-05',
        targetAge: 50,
        priorityOrder: 3,
        status: 'pending',
      },
      {
        catalogItemId: 'annual-wellness-visit',
        name: 'Annual wellness visit',
        category: 'checkup',
        cadenceLabel: 'Every year',
        recurrence: { intervalDays: 365 },
        nextDueDate: '2026-05-01',
        targetAge: 40,
        priorityOrder: 1,
        status: 'due',
      },
      {
        catalogItemId: 'diabetes-screening',
        name: 'Diabetes screening',
        category: 'checkup',
        cadenceLabel: 'Every 3 years',
        recurrence: { intervalDays: 1095 },
        nextDueDate: '2026-09-01',
        targetAge: 45,
        priorityOrder: 2,
        status: 'pending',
      },
      {
        catalogItemId: 'tdap-booster',
        name: 'Tetanus, diphtheria, and pertussis booster',
        category: 'vaccination',
        cadenceLabel: 'Every 10 years',
        recurrence: { intervalDays: 3650 },
        nextDueDate: '2030-05-05',
        targetAge: 45,
        priorityOrder: 3,
        status: 'pending',
      },
      {
        catalogItemId: 'influenza-vaccine',
        name: 'Flu vaccine',
        category: 'vaccination',
        cadenceLabel: 'Every year',
        recurrence: { intervalDays: 365 },
        nextDueDate: '2026-05-02',
        targetAge: 40,
        priorityOrder: 1,
        status: 'due',
      },
      {
        catalogItemId: 'shingles-vaccine',
        name: 'Shingles vaccine',
        category: 'vaccination',
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

test('adopting a non-applicable catalog item adds it with its real catalog copy, tagged manually-adopted', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const options = withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') });

  const nonApplicable = resolveNonApplicableCatalogItems(profile, options);
  const hiv = nonApplicable.find((entry) => entry.catalogItemId === 'hiv-screening');
  assert.ok(hiv, 'hiv-screening should be non-applicable for a profile with no hiv risk flag');

  const result = adoptCatalogItemToSnapshot(snapshot, profile.profileId, hiv);
  const adopted = result.planSnapshot.items.find((item) => item.catalogItemId === 'hiv-screening');

  assert.ok(adopted);
  assert.equal(adopted.source, 'manually-adopted');
  assert.equal(adopted.name, hiv.name);
  assert.equal(adopted.whyItMatters, hiv.whyItMatters);
  assert.equal(adopted.sourceRef, hiv.sourceRef);
  assert.equal(adopted.status, 'pending');
});

test('adopting an item already in the plan throws instead of creating a duplicate', () => {
  const profile = createProfile();
  const snapshot = createSnapshot();
  const existingItem = snapshot.items[0];

  assert.throws(() => (
    adoptCatalogItemToSnapshot(snapshot, profile.profileId, {
      catalogItemId: existingItem.catalogItemId,
      name: existingItem.name,
      category: existingItem.category,
    })
  ));
});
