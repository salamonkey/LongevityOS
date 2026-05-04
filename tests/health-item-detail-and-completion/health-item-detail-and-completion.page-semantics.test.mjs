import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const DETAIL_SOURCE = fs.readFileSync(
  new URL(
    '../../src/features/health-item-detail-and-completion/HealthItemDetailAndCompletionPage.jsx',
    import.meta.url,
  ),
  'utf8',
);

test('detail page includes required user-facing detail sections and unified statuses', () => {
  assert.match(DETAIL_SOURCE, /h2>Action<\//);
  assert.match(DETAIL_SOURCE, /h2>Recommendation frequency<\//);
  assert.match(DETAIL_SOURCE, /h2>Why it matters<\//);
  assert.match(DETAIL_SOURCE, /h2>Current status<\//);
  assert.match(DETAIL_SOURCE, /Mark as Done/);
  assert.match(DETAIL_SOURCE, /HEALTH_ITEM_STATUS\.DONE/);
  assert.match(DETAIL_SOURCE, /status-\$\{activeItem\.status\.toLowerCase\(\)\}/);
});

test('detail load failure state uses required recovery copy and actions', () => {
  assert.match(DETAIL_SOURCE, /We couldn't load details for \$\{requestedItemTitle\} right now\./);
  assert.match(DETAIL_SOURCE, /We couldn't load this health item right now\./);
  assert.match(DETAIL_SOURCE, /Try again/);
  assert.match(DETAIL_SOURCE, /Back to dashboard/);
  assert.match(DETAIL_SOURCE, /Back to health plan/);
  assert.match(DETAIL_SOURCE, /Review this care step/);
  assert.match(DETAIL_SOURCE, /resolveRequestedItemTitle/);
});

test('completion failure copy and safe display fallbacks are present', () => {
  assert.match(DETAIL_SOURCE, /Couldn't mark this as done\. Try again\./);
  assert.match(DETAIL_SOURCE, /We don't have a clear next step for this item right now\./);
  assert.match(DETAIL_SOURCE, /No timing is listed right now\./);
  assert.match(DETAIL_SOURCE, /This action supports your preventive health plan\./);
  assert.match(DETAIL_SOURCE, /function toDisplayText\(/);
});

test('detail source avoids forbidden raw placeholder output tokens', () => {
  assert.doesNotMatch(DETAIL_SOURCE, /TODO/);
  assert.doesNotMatch(DETAIL_SOURCE, /TBD/);
  assert.doesNotMatch(DETAIL_SOURCE, /lorem ipsum/i);
});
