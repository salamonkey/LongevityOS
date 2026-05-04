import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const INDEX_SOURCE = fs.readFileSync(
  new URL('../../src/features/design-system-component-foundation/components/index.js', import.meta.url),
  'utf8',
);

const SEMANTICS_SOURCE = fs.readFileSync(
  new URL('../../src/features/design-system-component-foundation/semanticPresentation.js', import.meta.url),
  'utf8',
);

test('shared SL-004B component exports are present', () => {
  assert.match(INDEX_SOURCE, /AppShell/);
  assert.match(INDEX_SOURCE, /StatusPill/);
  assert.match(INDEX_SOURCE, /HealthPlanItem/);
  assert.match(INDEX_SOURCE, /PrioritySection/);
  assert.match(INDEX_SOURCE, /HealthScoreCard/);
  assert.match(INDEX_SOURCE, /ReminderSelector/);
  assert.match(INDEX_SOURCE, /FamilyProfileCard/);
});

test('semantic helpers cover approved status and priority keys', () => {
  assert.match(SEMANTICS_SOURCE, /done/);
  assert.match(SEMANTICS_SOURCE, /due/);
  assert.match(SEMANTICS_SOURCE, /soon/);
  assert.match(SEMANTICS_SOURCE, /planned/);
  assert.match(SEMANTICS_SOURCE, /overdue/);
  assert.match(SEMANTICS_SOURCE, /today/);
  assert.match(SEMANTICS_SOURCE, /later/);
  assert.match(SEMANTICS_SOURCE, /color\.status\.done/);
  assert.match(SEMANTICS_SOURCE, /color\.priority\.today/);
});
