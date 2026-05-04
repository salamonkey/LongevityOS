import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const APP_SOURCE = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const ROUTE_SOURCE = fs.readFileSync(
  new URL('../../src/routes/reminder-scheduling-from-health-items.jsx', import.meta.url),
  'utf8',
);

test('app wiring includes SL-004 reminder scheduling route for plan and detail/dashboard surfaces', () => {
  assert.match(APP_SOURCE, /ReminderSchedulingFromHealthItemsRoute/);
  assert.match(APP_SOURCE, /view="plan"/);
  assert.match(APP_SOURCE, /view="dashboard-detail"/);
  assert.match(APP_SOURCE, /setHashRoute\('#\/plan'\)/);
  assert.match(APP_SOURCE, /setHashRoute\(`#\/health-item\/\$\{encodeURIComponent\(itemId\)\}\?from=plan`\)/);
});

test('route delegates to reminder scheduling full-plan and dashboard-detail pages', () => {
  assert.match(ROUTE_SOURCE, /ReminderSchedulingDashboardDetailPage/);
  assert.match(ROUTE_SOURCE, /ReminderSchedulingFullHealthPlanPage/);
  assert.match(ROUTE_SOURCE, /if \(view === 'plan'\)/);
});
