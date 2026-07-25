import React from 'react';
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

export default function SettingsScreen({
  profile,
  locale,
  onSetLocale,
  onOpenProfiles,
  onSignOut,
  onBack,
  signOutPending = false,
}) {
  const { t } = useTranslation();
  const displayName = profile?.name || profile?.displayLabel || '';
  const countryLabel = profile?.countryCode
    ? t(COUNTRY_LABEL_KEY_BY_CODE[profile.countryCode] ?? 'enrollment.countryOther')
    : '';

  return (
    <AppShell title={t('dashboard.settingsLabel')} onBack={onBack} backLabel={t('common.back')}>
      <div className="vitalis-settings-profile">
        <Avatar name={displayName} size={56} />
        <p className="vitalis-settings-profile-name">{displayName}</p>
      </div>

      <p className="sec-label">{t('settings.personalData')}</p>
      <div className="vitalis-settings-personal">
        <Input label={t('enrollment.firstName')} icon="user" value={displayName} disabled onChange={() => {}} />
        <Input label={t('enrollment.birthdate')} icon="calendar" value={profile?.birthdate ?? ''} disabled onChange={() => {}} />
        <Input label={t('enrollment.countryOfResidence')} icon="map-pin" value={countryLabel} disabled onChange={() => {}} />
        <div className="vds-input">
          <span className="vds-input-label">{t('enrollment.gender')}</span>
          <div className="vitalis-seg">
            <button type="button" className={profile?.gender === 'female' ? 'is-active' : ''} disabled>
              {t('enrollment.genderFemale')}
            </button>
            <button type="button" className={profile?.gender === 'male' ? 'is-active' : ''} disabled>
              {t('enrollment.genderMale')}
            </button>
          </div>
        </div>
      </div>

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
            Deutsch
          </button>
          <button type="button" className={locale === 'en' ? 'is-active' : ''} onClick={() => onSetLocale('en')}>
            English
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
