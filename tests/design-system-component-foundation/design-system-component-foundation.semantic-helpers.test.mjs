import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolvePrioritySemantics,
  resolveStatusSemantics,
  toPriorityKey,
} from '../../src/features/design-system-component-foundation/semanticPresentation.js';

test('status semantics resolve to user-facing labels and token references', () => {
  const due = resolveStatusSemantics('due');
  assert.equal(due.label, 'Due');
  assert.equal(due.token, 'color.status.due');

  const overdue = resolveStatusSemantics('OVERDUE');
  assert.equal(overdue.label, 'Overdue');
  assert.equal(overdue.token, 'color.status.overdue');

  const unknown = resolveStatusSemantics('not-a-status');
  assert.equal(unknown.label, 'Status unavailable');
  assert.equal(unknown.token, 'color.status.planned');
});

test('priority semantics resolve to approved Today/Soon/Later set', () => {
  const today = resolvePrioritySemantics('today');
  assert.equal(today.label, 'Today');
  assert.equal(today.token, 'color.priority.today');

  const soon = resolvePrioritySemantics('Soon');
  assert.equal(soon.label, 'Soon');
  assert.equal(soon.token, 'color.priority.soon');

  const fallback = resolvePrioritySemantics('unknown-priority');
  assert.equal(fallback.label, 'Priority unavailable');
  assert.equal(fallback.token, 'color.priority.later');
});

test('priority horizon mapping normalizes dashboard groups', () => {
  assert.equal(toPriorityKey('Today'), 'today');
  assert.equal(toPriorityKey('Soon'), 'soon');
  assert.equal(toPriorityKey('Later'), 'later');
  assert.equal(toPriorityKey('unexpected'), 'later');
});
