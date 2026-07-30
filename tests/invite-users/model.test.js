import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidInviteEmail,
  normalizeInviteEmail,
  validateSendInviteInput,
  validateAcceptInviteInput,
  inviteStatusLabelKey,
  INVITE_STATUS,
} from '../../src/features/invite-users/model.js';

test('isValidInviteEmail requires an @ and non-empty value', () => {
  assert.equal(isValidInviteEmail('a@b.com'), true);
  assert.equal(isValidInviteEmail(''), false);
  assert.equal(isValidInviteEmail('no-at-sign'), false);
});

test('normalizeInviteEmail trims and coerces non-strings', () => {
  assert.equal(normalizeInviteEmail('  a@b.com  '), 'a@b.com');
  assert.equal(normalizeInviteEmail(null), '');
});

test('validateSendInviteInput rejects an invalid email', () => {
  const { valid, errors } = validateSendInviteInput({ email: 'not-an-email' });
  assert.equal(valid, false);
  assert.equal(errors.email, 'errorEmailInvalid');
});

test('validateSendInviteInput accepts a valid email', () => {
  const { valid, errors } = validateSendInviteInput({ email: 'a@b.com' });
  assert.equal(valid, true);
  assert.deepEqual(errors, {});
});

test('validateAcceptInviteInput rejects a short password', () => {
  const { valid, errors } = validateAcceptInviteInput({ password: 'short', confirmPassword: 'short' });
  assert.equal(valid, false);
  assert.equal(errors.password, 'errorPasswordTooShort');
});

test('validateAcceptInviteInput rejects mismatched passwords', () => {
  const { valid, errors } = validateAcceptInviteInput({ password: 'longenough1', confirmPassword: 'different1' });
  assert.equal(valid, false);
  assert.equal(errors.confirmPassword, 'errorPasswordsDoNotMatch');
});

test('validateAcceptInviteInput accepts matching, long-enough passwords', () => {
  const { valid, errors } = validateAcceptInviteInput({ password: 'longenough1', confirmPassword: 'longenough1' });
  assert.equal(valid, true);
  assert.deepEqual(errors, {});
});

test('inviteStatusLabelKey maps status to the right i18n key', () => {
  assert.equal(inviteStatusLabelKey(INVITE_STATUS.ACCEPTED), 'invite.statusAccepted');
  assert.equal(inviteStatusLabelKey(INVITE_STATUS.SENT), 'invite.statusSent');
  assert.equal(inviteStatusLabelKey('anything-else'), 'invite.statusSent');
});
