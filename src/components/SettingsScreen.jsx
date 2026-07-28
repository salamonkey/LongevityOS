import React, { useEffect, useState } from 'react';
import { AppShell } from '../features/self-onboarding-to-first-dashboard/components.jsx';
import { Card, Input, Button, Avatar, Icon } from '../design-system/components/index.js';
import { useTranslation } from '../lib/i18n/index.js';
import './settings-screen.css';

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

function buildAccountFormFromProfile(profile) {
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
  };
}

const RISK_REVIEW_CADENCE_OPTIONS = Object.freeze([
  { value: 6, labelKey: 'settings.riskReviewCadence6Months' },
  { value: 12, labelKey: 'settings.riskReviewCadence12Months' },
  { value: 0, labelKey: 'settings.riskReviewCadenceNever' },
]);

export default function SettingsScreen({
  profile,
  locale,
  onSetLocale,
  riskReviewCadenceMonths = 12,
  onSetRiskReviewCadence,
  onOpenProfiles,
  onOpenProfileOverview,
  onSaveAccountDetails,
  accountDetailsPending = false,
  accountDetailsError = '',
  onSignOut,
  onBack,
  signOutPending = false,
}) {
  const { t } = useTranslation();
  const displayName = profile?.name || profile?.displayLabel || '';
  const [accountForm, setAccountForm] = useState(() => buildAccountFormFromProfile(profile));
  const [accountSavedAt, setAccountSavedAt] = useState(0);

  useEffect(() => {
    setAccountForm(buildAccountFormFromProfile(profile));
  }, [profile]);

  const accountIsDirty = profile ? (
    accountForm.firstName !== (profile.firstName ?? '')
    || accountForm.lastName !== (profile.lastName ?? '')
  ) : false;

  const setAccountField = (field) => (value) => {
    setAccountForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSaveAccount = async (event) => {
    event.preventDefault();
    if (!accountIsDirty || typeof onSaveAccountDetails !== 'function') {
      return;
    }

    const updates = {};
    if (accountForm.firstName !== (profile.firstName ?? '')) updates.firstName = accountForm.firstName;
    if (accountForm.lastName !== (profile.lastName ?? '')) updates.lastName = accountForm.lastName;

    const succeeded = await onSaveAccountDetails(updates);
    if (succeeded) {
      setAccountSavedAt(Date.now());
    }
  };

  return (
    <AppShell title={t('dashboard.settingsLabel')} onBack={onBack} backLabel={t('common.back')} showVersion>
      <div className="vitalis-settings-profile">
        <Avatar name={displayName} size={56} />
        <p className="vitalis-settings-profile-name">{displayName}</p>
      </div>

      <div className="rows vitalis-settings-rows">
        <SettingsRow icon="user" label={t('profileOverview.title')} onClick={onOpenProfileOverview} />
      </div>

      <p className="sec-label">{t('settings.account')}</p>
      <Card padding={14} className="vitalis-settings-account-card">
        <form className="vitalis-settings-account-form" onSubmit={handleSaveAccount}>
          <Input
            label={t('enrollment.firstName')}
            icon="user"
            value={accountForm.firstName}
            onChange={(event) => setAccountField('firstName')(event.target.value)}
          />
          <Input
            label={t('enrollment.lastName')}
            icon="user"
            value={accountForm.lastName}
            onChange={(event) => setAccountField('lastName')(event.target.value)}
          />
          {accountDetailsError ? <p className="sl001-field-error" role="alert">{accountDetailsError}</p> : null}
          {accountIsDirty ? (
            <Button type="submit" variant="primary" disabled={accountDetailsPending}>
              {accountDetailsPending ? t('settings.saving') : t('common.save')}
            </Button>
          ) : (accountSavedAt ? <p className="vitalis-settings-saved" role="status">{t('settings.savedConfirmation')}</p> : null)}
        </form>
      </Card>

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

      <Card padding={14} className="vitalis-settings-language-card">
        <div className="vitalis-settings-language-header">
          <span className="vitalis-settings-row-icon vitalis-settings-row-icon--teal">
            <Icon name="clock" size={19} />
          </span>
          <span className="vitalis-settings-row-label">{t('settings.riskReviewCadence')}</span>
        </div>
        <p className="vitalis-settings-row-sub">{t('settings.riskReviewCadenceSub')}</p>
        <div className="vitalis-seg">
          {RISK_REVIEW_CADENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={riskReviewCadenceMonths === option.value ? 'is-active' : ''}
              onClick={() => onSetRiskReviewCadence(option.value)}
            >
              {t(option.labelKey)}
            </button>
          ))}
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
