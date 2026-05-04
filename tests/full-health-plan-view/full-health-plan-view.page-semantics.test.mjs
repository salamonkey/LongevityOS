import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PLAN_PAGE_SOURCE = fs.readFileSync(
  new URL('../../src/features/full-health-plan-view/FullHealthPlanViewPage.jsx', import.meta.url),
  'utf8',
);

test('plan page contains required user-facing headings, actions, and status labels', () => {
  assert.match(PLAN_PAGE_SOURCE, /Active profile health plan/);
  assert.match(PLAN_PAGE_SOURCE, /Your complete preventive care plan for this profile/);
  assert.match(PLAN_PAGE_SOURCE, /Back to dashboard/);
  assert.match(PLAN_PAGE_SOURCE, /All recommended preventive care steps/);
  assert.match(PLAN_PAGE_SOURCE, /Recommendation frequency:/);
  assert.match(PLAN_PAGE_SOURCE, /Status summary for this profile: Due/);
  assert.match(PLAN_PAGE_SOURCE, /HEALTH_ITEM_STATUS\.DUE/);
  assert.match(PLAN_PAGE_SOURCE, /HEALTH_ITEM_STATUS\.PLANNED/);
  assert.match(PLAN_PAGE_SOURCE, /HEALTH_ITEM_STATUS\.DONE/);
});

test('plan page includes retryable load error and non-blocking detail-open failure copy', () => {
  assert.match(PLAN_PAGE_SOURCE, /We couldn't load your full health plan right now\./);
  assert.match(PLAN_PAGE_SOURCE, /Retry/);
  assert.match(PLAN_PAGE_SOURCE, /We couldn't open this item right now\. Please try again\./);
});

test('plan page source avoids forbidden placeholder tokens', () => {
  assert.doesNotMatch(PLAN_PAGE_SOURCE, /TODO/);
  assert.doesNotMatch(PLAN_PAGE_SOURCE, /TBD/);
  assert.doesNotMatch(PLAN_PAGE_SOURCE, /lorem ipsum/i);
});
