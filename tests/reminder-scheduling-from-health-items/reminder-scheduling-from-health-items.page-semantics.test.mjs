import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const DASHBOARD_DETAIL_SOURCE = fs.readFileSync(
  new URL(
    '../../src/features/reminder-scheduling-from-health-items/ReminderSchedulingDashboardDetailPage.jsx',
    import.meta.url,
  ),
  'utf8',
);

const FULL_PLAN_SOURCE = fs.readFileSync(
  new URL(
    '../../src/features/reminder-scheduling-from-health-items/ReminderSchedulingFullHealthPlanPage.jsx',
    import.meta.url,
  ),
  'utf8',
);

test('item detail reminder flow includes required actions, options, and recovery copy', () => {
  assert.match(DASHBOARD_DETAIL_SOURCE, /Set reminder/);
  assert.match(DASHBOARD_DETAIL_SOURCE, /Change reminder/);
  assert.match(DASHBOARD_DETAIL_SOURCE, /In 1 month/);
  assert.match(DASHBOARD_DETAIL_SOURCE, /In 3 months/);
  assert.match(DASHBOARD_DETAIL_SOURCE, /Custom date/);
  assert.match(DASHBOARD_DETAIL_SOURCE, /Save reminder/);
  assert.match(DASHBOARD_DETAIL_SOURCE, /Update reminder/);
  assert.match(DASHBOARD_DETAIL_SOURCE, /Choose today or a future date\./);
  assert.match(DASHBOARD_DETAIL_SOURCE, /Couldn't save reminder\. Try again\./);
});

test('dashboard and full plan surfaces include reminder state indicators', () => {
  assert.match(DASHBOARD_DETAIL_SOURCE, /Reminder: \{item\.reminderDateLabel\}/);
  assert.match(FULL_PLAN_SOURCE, /Reminder: \{item\.reminderDateLabel\}/);
});

test('slice-local reminder sources avoid forbidden placeholder tokens', () => {
  assert.doesNotMatch(DASHBOARD_DETAIL_SOURCE, /TODO/);
  assert.doesNotMatch(DASHBOARD_DETAIL_SOURCE, /TBD/);
  assert.doesNotMatch(DASHBOARD_DETAIL_SOURCE, /lorem ipsum/i);
  assert.doesNotMatch(FULL_PLAN_SOURCE, /TODO/);
  assert.doesNotMatch(FULL_PLAN_SOURCE, /TBD/);
  assert.doesNotMatch(FULL_PLAN_SOURCE, /lorem ipsum/i);
});
