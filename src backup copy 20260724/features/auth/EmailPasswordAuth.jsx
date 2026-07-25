import React, { useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';

function validate(input, mode) {
  const errors = {};
  const email = String(input.email ?? '').trim();
  const password = String(input.password ?? '');

  if (!email || !email.includes('@')) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (mode === 'sign_up') {
    const confirmPassword = String(input.confirmPassword ?? '');
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
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
    const validation = validate(form, mode);
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
      <div className="sl001-onboarding-stack">
        <section className="sl001-summary-card sl001-onboarding-intro" aria-label="Sign in">
          <h1 className="sl001-summary-title">{isSignUp ? 'Create account' : 'Sign in'}</h1>
          {isSignUp ? <p className="sl001-summary-meta">Create your account to manage live user plans.</p> : null}
        </section>

        <section className="sl001-summary-card sl001-onboarding-form-card" aria-label="Email and password auth">
          <form className="sl001-form sl001-onboarding-form" onSubmit={handleSubmit} noValidate>
            {errorMessage ? <p className="sl001-error-banner" role="alert">{errorMessage}</p> : null}
            {infoMessage ? <p className="sl001-summary-meta" role="status">{infoMessage}</p> : null}

            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              readOnly={pending}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <p className="sl001-field-error" role="alert">{errors.email}</p> : null}

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={(event) => handleChange('password', event.target.value)}
              readOnly={pending}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? <p className="sl001-field-error" role="alert">{errors.password}</p> : null}

            {isSignUp ? (
              <>
                <label htmlFor="auth-confirm-password">Confirm password</label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) => handleChange('confirmPassword', event.target.value)}
                  readOnly={pending}
                  aria-invalid={Boolean(errors.confirmPassword)}
                />
                {errors.confirmPassword ? <p className="sl001-field-error" role="alert">{errors.confirmPassword}</p> : null}
              </>
            ) : null}

            <button className="sl001-primary-action" type="submit" disabled={pending}>
              {pending ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
            </button>

            <button
              type="button"
              className="sl003-quiet-button"
              onClick={onSwitchMode}
              disabled={pending}
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
