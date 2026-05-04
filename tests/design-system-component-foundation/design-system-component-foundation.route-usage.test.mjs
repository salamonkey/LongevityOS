import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const APP_SOURCE = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const ROUTE_SOURCE = fs.readFileSync(
  new URL('../../src/routes/design-system-component-foundation.jsx', import.meta.url),
  'utf8',
);

test('app is wired to the SL-004B design-system route for plan and dashboard-detail views', () => {
  assert.match(APP_SOURCE, /DesignSystemComponentFoundationRoute/);
  assert.match(APP_SOURCE, /view="plan"/);
  assert.match(APP_SOURCE, /view="dashboard-detail"/);
});

test('route composes required design-system primitives in dashboard, plan, detail, and reminder paths', () => {
  assert.match(ROUTE_SOURCE, /HealthScoreCard/);
  assert.match(ROUTE_SOURCE, /FamilyProfileCard/);
  assert.match(ROUTE_SOURCE, /PrioritySection/);
  assert.match(ROUTE_SOURCE, /HealthPlanItem/);
  assert.match(ROUTE_SOURCE, /StatusPill/);
  assert.match(ROUTE_SOURCE, /ReminderSelector/);
  assert.match(ROUTE_SOURCE, /Back to dashboard/);
  assert.match(ROUTE_SOURCE, /Mark as Done/);
  assert.match(ROUTE_SOURCE, /Set reminder/);
});
