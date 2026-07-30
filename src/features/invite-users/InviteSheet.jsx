import React, { useCallback, useEffect, useState } from 'react';
import { Sheet, Button, Input } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { validateSendInviteInput, inviteStatusLabelKey } from './model.js';
import { listSentInvites } from './service.js';
import './invite-sheet.css';

export default function InviteSheet({ open = false, onClose, onSubmit, pending = false, errorMessage = '' }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submittedAt, setSubmittedAt] = useState(0);
  const [invites, setInvites] = useState([]);
  const [invitesError, setInvitesError] = useState('');

  const handleClose = useCallback(() => {
    if (pending) return;
    onClose?.();
  }, [pending, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setInvitesError('');
    listSentInvites()
      .then((rows) => {
        if (!cancelled) setInvites(rows);
      })
      .catch(() => {
        if (!cancelled) setInvitesError(t('appError.loadInvitesFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [open, submittedAt, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { valid, errors } = validateSendInviteInput({ email });
    setFieldErrors(errors);
    if (!valid) return;

    const succeeded = await onSubmit(email);
    if (succeeded) {
      setEmail('');
      setSubmittedAt(Date.now());
    }
  };

  return (
    <Sheet open={open} onClose={handleClose} title={t('invite.sheetTitle')} closeLabel={t('common.close')}>
      <form className="vitalis-invite-sheet-form" onSubmit={handleSubmit}>
        <Input
          id="invite-email"
          label={t('invite.emailLabel')}
          icon="mail"
          type="email"
          placeholder={t('invite.emailPlaceholder')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          error={fieldErrors.email ? t(`invite.${fieldErrors.email}`) : undefined}
        />
        {errorMessage ? <p className="sl001-field-error" role="alert">{errorMessage}</p> : null}
        {submittedAt ? <p className="vitalis-settings-saved" role="status">{t('invite.submitSuccess')}</p> : null}

        <Button type="submit" variant="primary" fullWidth disabled={pending}>
          {pending ? t('invite.submitting') : t('invite.submit')}
        </Button>
      </form>

      <div className="vitalis-invite-sheet-list">
        {invitesError ? <p className="sl001-field-error" role="alert">{invitesError}</p> : null}
        {invites.map((invite) => (
          <div key={invite.id} className="vitalis-invite-sheet-row">
            <span className="vitalis-invite-sheet-email">{invite.email}</span>
            <span className={`vitalis-invite-sheet-badge vitalis-invite-sheet-badge--${invite.status}`}>
              {t(inviteStatusLabelKey(invite.status))}
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
