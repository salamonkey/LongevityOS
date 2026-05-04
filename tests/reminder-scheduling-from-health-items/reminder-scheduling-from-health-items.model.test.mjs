import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REMINDER_TIMING_TYPE,
  addCalendarMonthsAsDateOnly,
  applyReminderProjection,
  resolveReminderDate,
  upsertReminderRecord,
} from '../../src/features/reminder-scheduling-from-health-items/reminderSchedulingModel.js';

function makeHealthItem(id = 'bp-check') {
  return {
    id,
    profileId: 'profile-42-female',
    title: 'Check blood pressure',
    actionLabel: 'Check blood pressure',
    recommendationFrequency: 'This week',
    whyItMatters: 'Catch trend changes early.',
    priorityHorizon: 'Today',
    displayOrder: 1,
    status: 'Due',
  };
}

test('calendar-month preset calculation clamps to last valid day when needed', () => {
  const oneMonth = addCalendarMonthsAsDateOnly('2026-01-31T08:00:00.000Z', 1);
  const threeMonths = addCalendarMonthsAsDateOnly('2026-01-31T08:00:00.000Z', 3);

  assert.equal(oneMonth, '2026-02-28');
  assert.equal(threeMonths, '2026-04-30');
});

test('custom reminder date rejects past values', () => {
  assert.throws(() => {
    resolveReminderDate({
      timingType: REMINDER_TIMING_TYPE.CUSTOM_DATE,
      customDate: '2026-04-01',
      now: new Date('2026-05-02T10:00:00.000Z'),
    });
  }, /Choose today or a future date\./);
});

test('upserting a reminder replaces timing and date for the same item instead of duplicating', () => {
  const item = makeHealthItem();
  const created = upsertReminderRecord({
    profileId: item.profileId,
    healthItem: item,
    reminderRecords: [],
    timingType: REMINDER_TIMING_TYPE.ONE_MONTH,
    customDate: '',
    now: new Date('2026-05-02T10:00:00.000Z'),
  });

  const updated = upsertReminderRecord({
    profileId: item.profileId,
    healthItem: item,
    reminderRecords: created,
    timingType: REMINDER_TIMING_TYPE.CUSTOM_DATE,
    customDate: '2026-07-15',
    now: new Date('2026-05-03T10:00:00.000Z'),
  });

  assert.equal(created.length, 1);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].timingType, REMINDER_TIMING_TYPE.CUSTOM_DATE);
  assert.equal(updated[0].remindOnDate, '2026-07-15');
  assert.equal(updated[0].createdAt, created[0].createdAt);
  assert.notEqual(updated[0].updatedAt, created[0].updatedAt);
});

test('reminder projection marks reminder presence and display labels on matching items', () => {
  const items = [makeHealthItem('bp-check'), makeHealthItem('dental-cleaning')];
  const projected = applyReminderProjection(items, [
    {
      profileId: 'profile-42-female',
      healthItemId: 'dental-cleaning',
      timingType: REMINDER_TIMING_TYPE.THREE_MONTHS,
      remindOnDate: '2026-08-02',
      createdAt: '2026-05-02T10:00:00.000Z',
      updatedAt: '2026-05-02T10:00:00.000Z',
    },
  ]);

  assert.equal(projected[0].hasReminder, false);
  assert.equal(projected[1].hasReminder, true);
  assert.match(projected[1].reminderDateLabel, /2026/);
});
