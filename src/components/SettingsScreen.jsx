import React, { useEffect, useState } from 'react';
import { AppShell } from '../features/self-onboarding-to-first-dashboard/components.jsx';
import { Card, Input, Button, Avatar, Icon } from '../design-system/components/index.js';
import { useTranslation } from '../lib/i18n/index.js';
import './settings-screen.css';

const COUNTRY_LABEL_KEY_BY_CODE = Object.freeze({
  DE: 'enrollment.countryGermany',
  AT: 'enrollment.countryAustria',
  CH: 'enrollment.countrySwitzerland',
  OTHER: 'enrollment.countryOther',
});

const COUNTRY_CODES = Object.freeze(['DE', 'AT', 'CH', 'OTHER']);

function SettingsRow({ icon, label, onClick, trailing }) {
  return (
    <button type="button" className="vitalis-settings-row" onClick={onClick}>
      <span className="vitalis-settings-row-icon">
        <Icon name={icon} size={19} />
      </span>
      <span className="vitalis-settings-row-label">{label}</span>
      {trailing ?? <Icon name="chevron-right" size={18} color="var(--text-muted)" />}
    </button>
  );
}

function buildFormFromProfile(profile) {
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    birthdate: profile?.birthdate ?? '',
    countryCode: profile?.countryCode ?? '',
    gender: profile?.gender ?? '',
  };
}

export default function SettingsScreen({
  profile,
  locale,
  onSetLocale,
  onOpenProfiles,
  onSignOut,
  onBack,
  signOutPending = false,
  onSaveProfileDetails,
  profileDetailsPending = false,
  profileDetailsError = '',
}) {
  const { t } = useTranslation();
  const displayName = profile?.name || profile?.displayLabel || '';
  const [form, setForm] = useState(() => buildFormFromProfile(profile));
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    setForm(buildFormFromProfile(profile));
  }, [profile]);

  const isDirty = profile ? (
    form.firstName !== (profile.firstName ?? '')
    || form.lastName !== (profile.lastName ?? '')
    || form.birthdate !== (profile.birthdate ?? '')
    || form.countryCode !== (profile.countryCode ?? '')
    || form.gender !== (profile.gender ?? '')
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

    const succeeded = await onSaveProfileDetails(updates);
    if (succeeded) {
      setSavedAt(Date.now());
    }
  };

  return (
    <AppShell title={t('dashboard.settingsLabel')} onBack={onBack} backLabel={t('common.back')}>
      <div className="vitalis-settings-profile">
        <Avatar name={displayName} size={56} />
        <p className="vitalis-settings-profile-name">{displayName}</p>
      </div>

      <p className="sec-label">{t('settings.personalData')}</p>
      <form className="vitalis-settings-personal" onSubmit={handleSave}>
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

        {profileDetailsError ? <p className="sl001-field-error" role="alert">{profileDetailsError}</p> : null}
        {isDirty ? (
          <Button type="submit" variant="primary" disabled={profileDetailsPending}>
            {profileDetailsPending ? t('settings.saving') : t('common.save')}
          </Button>
        ) : (savedAt ? <p className="vitalis-settings-saved" role="status">{t('settings.savedConfirmation')}</p> : null)}
      </form>

      <p className="sec-label">{t('settings.preferences')}</p>
      <Card padding={14} className="vitalis-settings-language-card">
        <div className="vitalis-settings-language-header">
          <span className="vitalis-settings-row-icon vitalis-settings-row-icon--teal">
            <Icon name="languages" size={19} />
          </span>
          <span className="vitalis-settings-row-label">{t('settings.language')}</span>
        </div>
        <div className="vitalis-seg">
          <button type="button" className={locale === 'de' ? 'is-active' : ''} onClick={() => onSetLocale('de')}>
            {t('settings.languageGerman')}
          </button>
          <button type="button" className={locale === 'en' ? 'is-active' : ''} onClick={() => onSetLocale('en')}>
            {t('settings.languageEnglish')}
          </button>
        </div>
      </Card>

      <div className="rows vitalis-settings-rows">
        <SettingsRow icon="users" label={t('settings.manageProfiles')} onClick={onOpenProfiles} />
        <SettingsRow icon="bell" label={t('settings.notifications')} onClick={() => {}} />
        <SettingsRow icon="shield" label={t('settings.privacy')} onClick={() => {}} />
      </div>

      <Button
        variant="ghost"
        size="lg"
        fullWidth
        iconLeft="log-out"
        onClick={onSignOut}
        disabled={signOutPending}
        className="vitalis-settings-signout"
      >
        {signOutPending ? t('enrollment.signingOut') : t('enrollment.signOut')}
      </Button>
    </AppShell>
  );
}
