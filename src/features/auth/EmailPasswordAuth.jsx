import React, { useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Input, Button } from '../../design-system/components/index.js';
import InviteOnlyFaq from './InviteOnlyFaq.jsx';
import { useTranslation } from '../../lib/i18n/index.js';
import './auth.css';

function validate(input, t) {
  const errors = {};
  const email = String(input.email ?? '').trim();
  const password = String(input.password ?? '');

  if (!email || !email.includes('@')) {
    errors.email = t('auth.errorInvalidEmail');
  }

  if (!password || password.length < 8) {
    errors.password = t('auth.errorPasswordTooShort');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export default function EmailPasswordAuth({
  pending,
  errorMessage,
  infoMessage,
  onSignIn,
  onBack,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showInviteOnlyFaq, setShowInviteOnlyFaq] = useState(false);

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validate(form, t);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    await onSignIn({
      email: form.email,
      password: form.password,
    });
  };

  return (
    <AppShell title={null} onBack={onBack} backLabel={t('common.back')}>
      <div className="vitalis-auth-stack">
        <div className="vitalis-auth-intro">
          <h1>{t('auth.signIn')}</h1>
        </div>

        <Card padding={20} className="vitalis-auth-form-card" aria-label={t('auth.formAriaLabel')}>
          <form className="vitalis-auth-form" onSubmit={handleSubmit} noValidate>
            {errorMessage ? <p className="vitalis-auth-notice vitalis-auth-notice--error" role="alert">{errorMessage}</p> : null}
            {infoMessage ? <p className="vitalis-auth-notice" role="status">{infoMessage}</p> : null}

            <Input
              id="auth-email"
              label={t('auth.email')}
              icon="mail"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              disabled={pending}
              error={errors.email}
              aria-invalid={Boolean(errors.email)}
            />

            <Input
              id="auth-password"
              label={t('auth.password')}
              icon="lock"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => handleChange('password', event.target.value)}
              disabled={pending}
              error={errors.password}
              aria-invalid={Boolean(errors.password)}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
              {pending ? t('auth.signingIn') : t('auth.signIn')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => setShowInviteOnlyFaq(true)}
              disabled={pending}
            >
              {t('inviteOnlyFaq.trigger')}
            </Button>
          </form>
        </Card>
      </div>

      <InviteOnlyFaq open={showInviteOnlyFaq} onClose={() => setShowInviteOnlyFaq(false)} />
    </AppShell>
  );
}
