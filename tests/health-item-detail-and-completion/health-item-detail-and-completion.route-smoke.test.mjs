import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const APP_SOURCE = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const ROUTE_SOURCE = fs.readFileSync(
  new URL('../../src/routes/health-item-detail-and-completion.jsx', import.meta.url),
  'utf8',
);
const DETAIL_SOURCE = fs.readFileSync(
  new URL(
    '../../src/features/health-item-detail-and-completion/HealthItemDetailAndCompletionPage.jsx',
    import.meta.url,
  ),
  'utf8',
);

test('app is wired to the health item detail and completion route', () => {
  assert.match(APP_SOURCE, /HealthItemDetailAndCompletionRoute/);
  assert.match(APP_SOURCE, /setScreen\('dashboard'\)/);
  assert.match(APP_SOURCE, /sl-002-active-profile/);
  assert.match(ROUTE_SOURCE, /HealthItemDetailAndCompletionPage/);
});

test('detail screen includes required content blocks and completion action', () => {
  assert.match(DETAIL_SOURCE, /Action/);
  assert.match(DETAIL_SOURCE, /Recommendation frequency/);
  assert.match(DETAIL_SOURCE, /Why it matters/);
  assert.match(DETAIL_SOURCE, /Current status/);
  assert.match(DETAIL_SOURCE, /Mark as Done/);
  assert.match(DETAIL_SOURCE, /Saving\.\.\./);
  assert.match(DETAIL_SOURCE, /Back to dashboard/);
  assert.match(DETAIL_SOURCE, /Back to health plan/);
  assert.match(DETAIL_SOURCE, /We couldn't load this health item right now\./);
  assert.match(DETAIL_SOURCE, /requestedItemTitle \?\? 'Review this care step'/);
  assert.match(DETAIL_SOURCE, /Try again/);
  assert.match(DETAIL_SOURCE, /Couldn't mark this as done\. Try again\./);
  assert.match(DETAIL_SOURCE, /globalThis\.location\.hash = nextHash/);
});
