import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const APP_SOURCE = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const ROUTE_SOURCE = fs.readFileSync(
  new URL('../../src/routes/full-health-plan-view.jsx', import.meta.url),
  'utf8',
);

test('app wiring includes full health plan entry and route', () => {
  assert.match(APP_SOURCE, /FullHealthPlanViewRoute/);
  assert.match(APP_SOURCE, /View full health plan/);
  assert.match(APP_SOURCE, /setHashRoute\('#\/plan'\)/);
  assert.match(APP_SOURCE, /setHashRoute\(`#\/health-item\/\$\{encodeURIComponent\(itemId\)\}\?from=plan`\)/);
  assert.match(APP_SOURCE, /readRouteStateFromHash/);
  assert.match(ROUTE_SOURCE, /FullHealthPlanViewPage/);
});
