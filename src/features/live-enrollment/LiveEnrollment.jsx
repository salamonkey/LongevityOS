import React, { useMemo, useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Input, Button, Logo, Icon } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import './live-enrollment.css';

const GENDER_OPTION_KEYS = Object.freeze([
  { value: 'female', labelKey: 'enrollment.genderFemale' },
  { value: 'male', labelKey: 'enrollment.genderMale' },
]);

const COUNTRY_OPTION_KEYS = Object.freeze([
  { value: 'DE', labelKey: 'enrollment.countryGermany' },
  { value: 'AT', labelKey: 'enrollment.countryAustria' },
  { value: 'CH', labelKey: 'enrollment.countrySwitzerland' },
  { value: 'OTHER', labelKey: 'enrollment.countryOther' },
]);

const STEP_FIELDS = Object.freeze([
  Object.freeze(['firstName', 'lastName']),
  Object.freeze(['birthdate', 'gender', 'countryCode']),
  Object.freeze(['heightCm', 'weightKg']),
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
    countryCode: '',
    heightCm: '',
    weightKg: '',
  };
}

function validateEnrollment(form, { requireAdult, t }) {
  const errors = {};
  const adultBirthdateMax = getAdultBirthdateMax();

  if (!String(form.firstName ?? '').trim()) {
    errors.firstName = t('enrollment.errorFirstNameRequired');
  }

  if (!String(form.lastName ?? '').trim()) {
    errors.lastName = t('enrollment.errorLastNameRequired');
  }

  const birthdate = String(form.birthdate ?? '').trim();
  if (!birthdate) {
    errors.birthdate = t('enrollment.errorBirthdateRequired');
  } else {
    const parsed = new Date(`${birthdate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      errors.birthdate = t('enrollment.errorBirthdateInvalid');
    } else if (requireAdult && birthdate > adultBirthdateMax) {
      errors.birthdate = t('enrollment.errorMustBeAdult');
    }
  }

  if (!['female', 'male'].includes(String(form.gender ?? '').trim().toLowerCase())) {
    errors.gender = t('enrollment.errorChooseGender');
  }

  const countryCode = String(form.countryCode ?? '').trim().toUpperCase();
  if (!COUNTRY_OPTION_KEYS.some((option) => option.value === countryCode)) {
    errors.countryCode = t('enrollment.errorChooseCountry');
  }

  const height = Number(form.heightCm);
  if (!Number.isFinite(height) || height < 140 || height > 210) {
    errors.heightCm = t('enrollment.errorHeightRange');
  }

  const weight = Number(form.weightKg);
  if (!Number.isFinite(weight) || weight < 50 || weight > 150) {
    errors.weightKg = t('enrollment.errorWeightRange');
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
  submitLabel = '',
  heading = '',
  description = '',
  ctaLabel = '',
  ctaPending = false,
  onCtaClick = null,
  requireAdult = true,
}) {
  const { t } = useTranslation();
  const resolvedHeading = heading || t('enrollment.headingEnroll');
  const resolvedSubmitLabel = submitLabel || t('enrollment.submitCreatePlan');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => createEmptyForm(requireAdult));
  const [errors, setErrors] = useState({});
  const adultBirthdateMax = useMemo(() => getAdultBirthdateMax(), []);

  const showCta = typeof onCtaClick === 'function' && String(ctaLabel).trim().length > 0;
  const isLastStep = step === STEP_FIELDS.length - 1;

  const stepHeadings = [
    { title: resolvedHeading, description },
    { title: t('enrollment.stepDetailsTitle'), description: t('enrollment.stepDetailsDescription') },
    { title: t('enrollment.stepBodyTitle'), description: t('enrollment.stepBodyDescription') },
  ];
  const currentHeading = stepHeadings[step];

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

  const handleAdvance = async (event) => {
    event.preventDefault();
    const validation = validateEnrollment(form, { requireAdult, t });
    const stepFields = STEP_FIELDS[step];
    const stepErrors = stepFields.filter((field) => validation.errors[field]);

    if (stepErrors.length > 0) {
      setErrors((previous) => ({
        ...previous,
        ...Object.fromEntries(stepFields.map((field) => [field, validation.errors[field]])),
      }));
      return;
    }

    setErrors((previous) => {
      const next = { ...previous };
      stepFields.forEach((field) => { next[field] = undefined; });
      return next;
    });

    if (!isLastStep) {
      setStep(step + 1);
      return;
    }

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    await onSubmit({
      firstName: String(form.firstName).trim(),
      lastName: String(form.lastName).trim(),
      birthdate: String(form.birthdate).trim(),
      gender: String(form.gender).trim().toLowerCase(),
      countryCode: String(form.countryCode).trim().toUpperCase(),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
    });

    setErrors({});
    setForm(createEmptyForm(requireAdult));
    setStep(0);
  };

  return (
    <AppShell title={null} shellClassName={requireAdult ? 'vitalis-enrollment-shell' : ''}>
      <div className="vitalis-enrollment-stack">
        <div className="vitalis-enrollment-title-standalone">
          <Logo size={30} word={false} />
          <h1>{currentHeading.title}</h1>
          {currentHeading.description ? <p className="vitalis-enrollment-description">{currentHeading.description}</p> : null}
        </div>

        <Card padding={20} className="vitalis-enrollment-form-card" aria-label={t('enrollment.formAriaLabel')}>
          <form className="vitalis-enrollment-form" onSubmit={handleAdvance} noValidate>
            {errorMessage ? <p className="vitalis-form-error-banner" role="alert">{errorMessage}</p> : null}

            {step === 0 ? (
              <>
                <Input
                  id="live-enrollment-first-name"
                  label={t('enrollment.firstName')}
                  icon="user"
                  type="text"
                  value={form.firstName}
                  onChange={(event) => handleChange('firstName', event.target.value)}
                  disabled={pending}
                  error={errors.firstName}
                  aria-invalid={Boolean(errors.firstName)}
                />

                <Input
                  id="live-enrollment-last-name"
                  label={t('enrollment.lastName')}
                  icon="user"
                  type="text"
                  value={form.lastName}
                  onChange={(event) => handleChange('lastName', event.target.value)}
                  disabled={pending}
                  error={errors.lastName}
                  aria-invalid={Boolean(errors.lastName)}
                />
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Input
                  id="live-enrollment-birthdate"
                  label={t('enrollment.birthdate')}
                  icon="calendar"
                  type="date"
                  max={requireAdult ? adultBirthdateMax : undefined}
                  value={form.birthdate}
                  onChange={(event) => handleChange('birthdate', event.target.value)}
                  disabled={pending}
                  error={errors.birthdate}
                  aria-invalid={Boolean(errors.birthdate)}
                />

                <div className="vds-input" role="radiogroup" aria-label={t('enrollment.gender')}>
                  <span className="vds-input-label">{t('enrollment.gender')}</span>
                  <div className="vitalis-seg">
                    {GENDER_OPTION_KEYS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={form.gender === option.value ? 'is-active' : ''}
                        onClick={() => handleChange('gender', option.value)}
                        disabled={pending}
                        role="radio"
                        aria-checked={form.gender === option.value}
                      >
                        {t(option.labelKey)}
                      </button>
                    ))}
                  </div>
                  {errors.gender ? <span className="vds-input-note vds-input-note--error">{errors.gender}</span> : null}
                </div>

                <label className="vds-input" htmlFor="live-enrollment-country">
                  <span className="vds-input-label">{t('enrollment.countryOfResidence')}</span>
                  <span className={`vds-input-field${errors.countryCode ? ' vds-input-field--error' : ''}${pending ? ' vds-input-field--disabled' : ''}`}>
                    <Icon name="map-pin" size={18} color="var(--text-muted)" />
                    <select
                      id="live-enrollment-country"
                      value={form.countryCode}
                      onChange={(event) => handleChange('countryCode', event.target.value)}
                      disabled={pending}
                      aria-invalid={Boolean(errors.countryCode)}
                    >
                      <option value="" disabled>{t('enrollment.selectCountry')}</option>
                      {COUNTRY_OPTION_KEYS.map((option) => (
                        <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </span>
                  {errors.countryCode ? <span className="vds-input-note vds-input-note--error">{errors.countryCode}</span> : null}
                </label>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Input
                  id="live-enrollment-height"
                  label={t('enrollment.heightCm')}
                  icon="ruler"
                  type="number"
                  min="140"
                  max="210"
                  step="0.1"
                  value={form.heightCm}
                  onChange={(event) => handleChange('heightCm', event.target.value)}
                  disabled={pending}
                  error={errors.heightCm}
                  aria-invalid={Boolean(errors.heightCm)}
                />

                <Input
                  id="live-enrollment-weight"
                  label={t('enrollment.weightKg')}
                  icon="scale"
                  type="number"
                  min="50"
                  max="150"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(event) => handleChange('weightKg', event.target.value)}
                  disabled={pending}
                  error={errors.weightKg}
                  aria-invalid={Boolean(errors.weightKg)}
                />
              </>
            ) : null}

            <div className="vitalis-enrollment-dots" aria-hidden="true">
              {STEP_FIELDS.map((_, index) => (
                <span key={index} className={index === step ? 'is-active' : ''} />
              ))}
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
              {pending ? t('enrollment.creatingUser') : (isLastStep ? resolvedSubmitLabel : t('common.continue'))}
            </Button>
          </form>
        </Card>
        {showCta ? (
          <Button variant="ghost" fullWidth onClick={onCtaClick} disabled={ctaPending || pending}>
            {ctaPending ? t('enrollment.signingOut') : ctaLabel}
          </Button>
        ) : null}
      </div>
    </AppShell>
  );
}
