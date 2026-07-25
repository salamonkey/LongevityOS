import React, { useMemo, useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';

const GENDER_OPTIONS = Object.freeze([
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
]);

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAdultBirthdateMax() {
  const today = new Date();
  const latest = new Date(today.getTime());
  latest.setFullYear(latest.getFullYear() - 18);
  return formatDateInputValue(latest);
}

function createEmptyForm(requireAdult) {
  return {
    firstName: '',
    lastName: '',
    birthdate: requireAdult ? getAdultBirthdateMax() : '',
    gender: '',
    heightCm: '',
    weightKg: '',
  };
}

function validateEnrollment(form, { requireAdult }) {
  const errors = {};
  const adultBirthdateMax = getAdultBirthdateMax();

  if (!String(form.firstName ?? '').trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!String(form.lastName ?? '').trim()) {
    errors.lastName = 'Last name is required.';
  }

  const birthdate = String(form.birthdate ?? '').trim();
  if (!birthdate) {
    errors.birthdate = 'Birthdate is required.';
  } else {
    const parsed = new Date(`${birthdate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      errors.birthdate = 'Birthdate must be a valid date.';
    } else if (requireAdult && birthdate > adultBirthdateMax) {
      errors.birthdate = 'User must be at least 18 years old.';
    }
  }

  if (!['female', 'male'].includes(String(form.gender ?? '').trim().toLowerCase())) {
    errors.gender = 'Choose a gender.';
  }

  const height = Number(form.heightCm);
  if (!Number.isFinite(height) || height < 140 || height > 210) {
    errors.heightCm = 'Height must be between 140 and 210 cm.';
  }

  const weight = Number(form.weightKg);
  if (!Number.isFinite(weight) || weight < 50 || weight > 150) {
    errors.weightKg = 'Weight must be between 50 and 150 kg.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export default function LiveEnrollment({
  onSubmit,
  pending = false,
  errorMessage = '',
  submitLabel = 'Create user and plan',
  heading = 'Enroll a user',
  description = 'Create a user profile and hydrate a live plan from the hosted catalog.',
  hideIntroCard = false,
  ctaLabel = '',
  ctaPending = false,
  onCtaClick = null,
  ctaPlacement = 'intro',
  requireAdult = true,
}) {
  const [form, setForm] = useState(() => createEmptyForm(requireAdult));
  const [errors, setErrors] = useState({});
  const adultBirthdateMax = useMemo(() => getAdultBirthdateMax(), []);

  const canSubmit = useMemo(() => {
    return !pending && Object.values(form).every((value) => String(value ?? '').trim().length > 0);
  }, [form, pending]);
  const showCta = typeof onCtaClick === 'function' && String(ctaLabel).trim().length > 0;
  const showIntroCta = showCta && ctaPlacement !== 'bottom';
  const showBottomCta = showCta && ctaPlacement === 'bottom';

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateEnrollment(form, { requireAdult });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    await onSubmit({
      firstName: String(form.firstName).trim(),
      lastName: String(form.lastName).trim(),
      birthdate: String(form.birthdate).trim(),
      gender: String(form.gender).trim().toLowerCase(),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
    });

    setForm(createEmptyForm(requireAdult));
  };

  return (
    <AppShell title={null} shellClassName={hideIntroCard ? 'sl001-enrollment-shell' : ''}>
      <div className="sl001-onboarding-stack">
        {hideIntroCard ? (
          <h1 className="sl001-summary-title sl001-onboarding-title-standalone">{heading}</h1>
        ) : (
          <section className="sl001-summary-card sl001-onboarding-intro" aria-label="Enrollment overview">
            <h1 className="sl001-summary-title">{heading}</h1>
            {description ? <p className="sl001-summary-meta">{description}</p> : null}
            {showIntroCta ? (
              <button
                type="button"
                className="sl001-primary-action"
                onClick={onCtaClick}
                disabled={ctaPending || pending}
              >
                {ctaPending ? 'Signing out...' : ctaLabel}
              </button>
            ) : null}
          </section>
        )}

        <section className="sl001-summary-card sl001-onboarding-form-card" aria-label="User enrollment form">
          <form className="sl001-form sl001-onboarding-form" onSubmit={handleSubmit} noValidate>
            {errorMessage ? <p className="sl001-error-banner" role="alert">{errorMessage}</p> : null}

            <label htmlFor="live-enrollment-first-name">First name</label>
            <input
              id="live-enrollment-first-name"
              type="text"
              value={form.firstName}
              onChange={(event) => handleChange('firstName', event.target.value)}
              readOnly={pending}
              aria-invalid={Boolean(errors.firstName)}
            />
            {errors.firstName ? <p className="sl001-field-error" role="alert">{errors.firstName}</p> : null}

            <label htmlFor="live-enrollment-last-name">Last name</label>
            <input
              id="live-enrollment-last-name"
              type="text"
              value={form.lastName}
              onChange={(event) => handleChange('lastName', event.target.value)}
              readOnly={pending}
              aria-invalid={Boolean(errors.lastName)}
            />
            {errors.lastName ? <p className="sl001-field-error" role="alert">{errors.lastName}</p> : null}

            <label htmlFor="live-enrollment-birthdate">Birthdate</label>
            <input
              id="live-enrollment-birthdate"
              type="date"
              max={requireAdult ? adultBirthdateMax : undefined}
              value={form.birthdate}
              onChange={(event) => handleChange('birthdate', event.target.value)}
              readOnly={pending}
              aria-invalid={Boolean(errors.birthdate)}
            />
            {errors.birthdate ? <p className="sl001-field-error" role="alert">{errors.birthdate}</p> : null}

            <div className="sl001-gender-field" role="radiogroup" aria-label="Gender">
              <p className="sl001-form-field-title">Gender</p>
              {GENDER_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="live-enrollment-gender"
                    value={option.value}
                    checked={form.gender === option.value}
                    onChange={(event) => handleChange('gender', event.target.value)}
                    disabled={pending}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {errors.gender ? <p className="sl001-field-error" role="alert">{errors.gender}</p> : null}

            <label htmlFor="live-enrollment-height">Height (cm)</label>
            <input
              id="live-enrollment-height"
              type="number"
              min="140"
              max="210"
              step="0.1"
              value={form.heightCm}
              onChange={(event) => handleChange('heightCm', event.target.value)}
              readOnly={pending}
              aria-invalid={Boolean(errors.heightCm)}
            />
            {errors.heightCm ? <p className="sl001-field-error" role="alert">{errors.heightCm}</p> : null}

            <label htmlFor="live-enrollment-weight">Weight (kg)</label>
            <input
              id="live-enrollment-weight"
              type="number"
              min="50"
              max="150"
              step="0.1"
              value={form.weightKg}
              onChange={(event) => handleChange('weightKg', event.target.value)}
              readOnly={pending}
              aria-invalid={Boolean(errors.weightKg)}
            />
            {errors.weightKg ? <p className="sl001-field-error" role="alert">{errors.weightKg}</p> : null}

            <button className="sl001-primary-action" type="submit" disabled={!canSubmit}>
              {pending ? 'Creating user...' : submitLabel}
            </button>
          </form>
        </section>
        {showBottomCta ? (
          <button
            type="button"
            className="sl001-primary-action"
            onClick={onCtaClick}
            disabled={ctaPending || pending}
          >
            {ctaPending ? 'Signing out...' : ctaLabel}
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}
