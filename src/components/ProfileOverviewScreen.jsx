import React, { useEffect, useState } from 'react';
import { AppShell } from '../features/self-onboarding-to-first-dashboard/components.jsx';
import { Card, Input, Button, Avatar, Icon, ProgressRing } from '../design-system/components/index.js';
import { RISK_PROFILE_OPTION_KEYS } from '../features/live-enrollment/RiskProfileStep.jsx';
import { useTranslation } from '../lib/i18n/index.js';
import './profile-overview-screen.css';

const COUNTRY_LABEL_KEY_BY_CODE = Object.freeze({
  DE: 'enrollment.countryGermany',
  AT: 'enrollment.countryAustria',
  CH: 'enrollment.countrySwitzerland',
  OTHER: 'enrollment.countryOther',
});

const COUNTRY_CODES = Object.freeze(['DE', 'AT', 'CH', 'OTHER']);

const RISK_FLAG_LABEL_KEY_BY_VALUE = Object.freeze(
  RISK_PROFILE_OPTION_KEYS.reduce((index, option) => {
    index[option.value] = option.labelKey;
    return index;
  }, {}),
);

function buildFormFromProfile(profile) {
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    birthdate: profile?.birthdate ?? '',
    countryCode: profile?.countryCode ?? '',
    gender: profile?.gender ?? '',
    heightCm: profile?.heightCm ? String(profile.heightCm) : '',
    weightKg: profile?.weightKg ? String(profile.weightKg) : '',
  };
}

export default function ProfileOverviewScreen({
  profile,
  onBack,
  onSaveProfileDetails,
  profileDetailsPending = false,
  profileDetailsError = '',
  onReviewRiskProfile,
}) {
  const { t } = useTranslation();
  const displayName = profile?.name || profile?.displayLabel || '';
  const [form, setForm] = useState(() => buildFormFromProfile(profile));
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    setForm(buildFormFromProfile(profile));
  }, [profile]);

  // See the matching note on the dashboard chip: an empty riskFlags array
  // can't be told apart from "never opened the step" without a dedicated
  // reviewed-at column, so this treats "no flags saved" as not-reviewed.
  const riskFlags = Array.isArray(profile?.riskFlags) ? profile.riskFlags : [];
  const riskProfileReviewed = riskFlags.length > 0;
  const strengthPercent = riskProfileReviewed ? 100 : 75;

  const isDirty = profile ? (
    form.firstName !== (profile.firstName ?? '')
    || form.lastName !== (profile.lastName ?? '')
    || form.birthdate !== (profile.birthdate ?? '')
    || form.countryCode !== (profile.countryCode ?? '')
    || form.gender !== (profile.gender ?? '')
    || form.heightCm !== (profile.heightCm ? String(profile.heightCm) : '')
    || form.weightKg !== (profile.weightKg ? String(profile.weightKg) : '')
  ) : false;

  const setField = (field) => (value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!isDirty || typeof onSaveProfileDetails !== 'function') {
      return;
    }

    const updates = {};
    if (form.firstName !== (profile.firstName ?? '')) updates.firstName = form.firstName;
    if (form.lastName !== (profile.lastName ?? '')) updates.lastName = form.lastName;
    if (form.birthdate !== (profile.birthdate ?? '')) updates.birthdate = form.birthdate;
    if (form.countryCode !== (profile.countryCode ?? '')) updates.countryCode = form.countryCode;
    if (form.gender !== (profile.gender ?? '')) updates.gender = form.gender;
    if (form.heightCm !== (profile.heightCm ? String(profile.heightCm) : '')) updates.heightCm = Number(form.heightCm);
    if (form.weightKg !== (profile.weightKg ? String(profile.weightKg) : '')) updates.weightKg = Number(form.weightKg);

    const succeeded = await onSaveProfileDetails(updates);
    if (succeeded) {
      setSavedAt(Date.now());
    }
  };

  return (
    <AppShell title={t('profileOverview.title')} onBack={onBack} backLabel={t('common.back')}>
      <div className="vitalis-profile-head">
        <Avatar name={displayName} size={48} />
        <div>
          <p className="vitalis-profile-head-name">{displayName}</p>
          <p className="vitalis-profile-head-sub">{t('profileOverview.subtitle')}</p>
        </div>
      </div>

      <Card padding={13} className="vitalis-profile-strength">
        <ProgressRing
          value={strengthPercent}
          size={44}
          stroke={5}
          color="var(--color-secondary)"
          label={<span className="vitalis-profile-strength-pct">{strengthPercent}%</span>}
        />
        <div className="vitalis-profile-strength-copy">
          <p className="vitalis-profile-strength-t1">
            {riskProfileReviewed ? t('profileOverview.strengthGood') : t('profileOverview.strengthPartial')}
          </p>
          <p className="vitalis-profile-strength-t2">
            {riskProfileReviewed
              ? t('profileOverview.strengthCopyReviewed')
              : t('profileOverview.strengthCopyUnreviewed')}
          </p>
        </div>
      </Card>

      <p className="sec-label">{t('settings.personalData')}</p>
      <form className="vitalis-profile-personal" onSubmit={handleSave}>
        <Input
          label={t('enrollment.firstName')}
          icon="user"
          value={form.firstName}
          onChange={(event) => setField('firstName')(event.target.value)}
        />
        <Input
          label={t('enrollment.lastName')}
          icon="user"
          value={form.lastName}
          onChange={(event) => setField('lastName')(event.target.value)}
        />
        <Input
          label={t('enrollment.birthdate')}
          icon="calendar"
          type="date"
          value={form.birthdate}
          onChange={(event) => setField('birthdate')(event.target.value)}
        />
        <label className="vds-input">
          <span className="vds-input-label">{t('enrollment.countryOfResidence')}</span>
          <span className="vds-input-field">
            <Icon name="map-pin" size={18} color="var(--text-muted)" />
            <select value={form.countryCode} onChange={(event) => setField('countryCode')(event.target.value)}>
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>{t(COUNTRY_LABEL_KEY_BY_CODE[code])}</option>
              ))}
            </select>
          </span>
        </label>
        <div className="vds-input">
          <span className="vds-input-label">{t('enrollment.gender')}</span>
          <div className="vitalis-seg">
            <button
              type="button"
              className={form.gender === 'female' ? 'is-active' : ''}
              onClick={() => setField('gender')('female')}
            >
              {t('enrollment.genderFemale')}
            </button>
            <button
              type="button"
              className={form.gender === 'male' ? 'is-active' : ''}
              onClick={() => setField('gender')('male')}
            >
              {t('enrollment.genderMale')}
            </button>
          </div>
        </div>
        <Input
          label={t('enrollment.heightCm')}
          icon="ruler"
          type="number"
          min="140"
          max="210"
          step="0.1"
          value={form.heightCm}
          onChange={(event) => setField('heightCm')(event.target.value)}
        />
        <Input
          label={t('enrollment.weightKg')}
          icon="scale"
          type="number"
          min="50"
          max="150"
          step="0.1"
          value={form.weightKg}
          onChange={(event) => setField('weightKg')(event.target.value)}
        />

        {profileDetailsError ? <p className="sl001-field-error" role="alert">{profileDetailsError}</p> : null}
        {isDirty ? (
          <Button type="submit" variant="primary" disabled={profileDetailsPending}>
            {profileDetailsPending ? t('settings.saving') : t('common.save')}
          </Button>
        ) : (savedAt ? <p className="vitalis-settings-saved" role="status">{t('settings.savedConfirmation')}</p> : null)}
      </form>

      <p className="sec-label">{t('profileOverview.riskSectionTitle')}</p>
      <Card padding={14} className="vitalis-profile-risk">
        {riskFlags.length > 0 ? (
          <div className="vitalis-profile-risk-tags">
            {riskFlags.map((value) => (
              <span key={value} className="vitalis-profile-risk-tag">
                {RISK_FLAG_LABEL_KEY_BY_VALUE[value] ? t(RISK_FLAG_LABEL_KEY_BY_VALUE[value]) : value}
              </span>
            ))}
          </div>
        ) : (
          <p className="vitalis-profile-risk-empty">{t('profileOverview.riskEmpty')}</p>
        )}
        <Button type="button" variant="ghost" fullWidth onClick={onReviewRiskProfile}>
          {t('profileOverview.reviewRiskFactors')}
        </Button>
      </Card>

      <div className="vitalis-profile-explain">
        <Icon name="info" size={15} color="var(--color-primary-ink)" />
        <p>{t('profileOverview.explainNote')}</p>
      </div>
    </AppShell>
  );
}
