import React, { useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Input, Button } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { validateAcceptInviteInput } from './model.js';
import '../auth/auth.css';

export default function AcceptInviteScreen({ token, email, pending, errorMessage, onAccept }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateAcceptInviteInput(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    await onAccept({ token, email, password: form.password });
  };

  return (
    <AppShell title={null}>
      <div className="vitalis-auth-stack">
        <div className="vitalis-auth-intro">
          <h1>{t('invite.acceptTitle')}</h1>
        </div>

        <Card padding={20} className="vitalis-auth-form-card" aria-label={t('invite.acceptFormAriaLabel')}>
          <form className="vitalis-auth-form" onSubmit={handleSubmit} noValidate>
            {errorMessage ? <p className="vitalis-auth-notice vitalis-auth-notice--error" role="alert">{errorMessage}</p> : null}

            <Input
              id="invite-accept-email"
              label={t('auth.email')}
              icon="mail"
              type="email"
              value={email}
              disabled
              readOnly
            />

            <Input
              id="invite-accept-password"
              label={t('auth.password')}
              icon="lock"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => handleChange('password', event.target.value)}
              disabled={pending}
              error={errors.password ? t(`invite.${errors.password}`) : undefined}
            />

            <Input
              id="invite-accept-confirm-password"
              label={t('auth.confirmPassword')}
              icon="lock"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => handleChange('confirmPassword', event.target.value)}
              disabled={pending}
              error={errors.confirmPassword ? t(`invite.${errors.confirmPassword}`) : undefined}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
              {pending ? t('invite.accepting') : t('invite.acceptSubmit')}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
