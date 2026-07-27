import React, { useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Input, Button, Logo } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import './auth.css';

function validate(input, mode, t) {
  const errors = {};
  const email = String(input.email ?? '').trim();
  const password = String(input.password ?? '');

  if (!email || !email.includes('@')) {
    errors.email = t('auth.errorInvalidEmail');
  }

  if (!password || password.length < 8) {
    errors.password = t('auth.errorPasswordTooShort');
  }

  if (mode === 'sign_up') {
    const confirmPassword = String(input.confirmPassword ?? '');
    if (!confirmPassword) {
      errors.confirmPassword = t('auth.errorConfirmPasswordRequired');
    } else if (confirmPassword !== password) {
      errors.confirmPassword = t('auth.errorPasswordsDoNotMatch');
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export default function EmailPasswordAuth({
  mode,
  pending,
  errorMessage,
  infoMessage,
  onSignIn,
  onSignUp,
  onSwitchMode,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const isSignUp = mode === 'sign_up';

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validate(form, mode, t);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    if (isSignUp) {
      await onSignUp({
        email: form.email,
        password: form.password,
      });
    } else {
      await onSignIn({
        email: form.email,
        password: form.password,
      });
    }
  };

  return (
    <AppShell title={null}>
      <div className="vitalis-auth-stack">
        <Card padding={20} className="vitalis-auth-intro" aria-label={t('auth.signIn')}>
          <Logo size={30} word={false} />
          <h1>{isSignUp ? t('auth.createAccount') : t('auth.signIn')}</h1>
          {isSignUp ? <p className="vitalis-auth-notice">{t('auth.createAccountDescription')}</p> : null}
        </Card>

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
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={(event) => handleChange('password', event.target.value)}
              disabled={pending}
              error={errors.password}
              aria-invalid={Boolean(errors.password)}
            />

            {isSignUp ? (
              <Input
                id="auth-confirm-password"
                label={t('auth.confirmPassword')}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(event) => handleChange('confirmPassword', event.target.value)}
                disabled={pending}
                error={errors.confirmPassword}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
            ) : null}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
              {pending ? (isSignUp ? t('auth.creatingAccount') : t('auth.signingIn')) : (isSignUp ? t('auth.createAccount') : t('auth.signIn'))}
            </Button>

            <Button type="button" variant="ghost" size="lg" fullWidth onClick={onSwitchMode} disabled={pending}>
              {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.needAccount')}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
