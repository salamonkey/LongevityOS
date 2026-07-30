export function isValidInviteEmail(value) {
  const email = String(value ?? '').trim();
  return Boolean(email) && email.includes('@');
}

export function normalizeInviteEmail(value) {
  return String(value ?? '').trim();
}

export function isValidInvitePassword(value) {
  return String(value ?? '').length >= 8;
}

// errors are i18n key suffixes, mirrored server-side in
// accept-invite/index.ts (that Deno function can't import this module),
// same convention as feedback-and-issue-reporting/model.js.
export function validateSendInviteInput(input = {}) {
  const errors = {};
  const email = normalizeInviteEmail(input.email);
  if (!isValidInviteEmail(email)) {
    errors.email = 'errorEmailInvalid';
  }
  return { valid: Object.keys(errors).length === 0, errors, email };
}

export function validateAcceptInviteInput(input = {}) {
  const errors = {};
  const password = String(input.password ?? '');
  const confirmPassword = String(input.confirmPassword ?? '');

  if (!password || password.length < 8) {
    errors.password = 'errorPasswordTooShort';
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'errorConfirmPasswordRequired';
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'errorPasswordsDoNotMatch';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export const INVITE_STATUS = Object.freeze({ SENT: 'sent', ACCEPTED: 'accepted' });

export function inviteStatusLabelKey(status) {
  return status === INVITE_STATUS.ACCEPTED ? 'invite.statusAccepted' : 'invite.statusSent';
}
