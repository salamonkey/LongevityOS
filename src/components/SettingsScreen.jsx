import React from 'react';
import { AppShell } from '../features/self-onboarding-to-first-dashboard/components.jsx';
import { Card, Button, Avatar, Icon } from '../design-system/components/index.js';
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

export default function SettingsScreen({
  profile,
  locale,
  onSetLocale,
  onOpenProfiles,
  onOpenProfileOverview,
  onSignOut,
  onBack,
  signOutPending = false,
}) {
  const { t } = useTranslation();
  const displayName = profile?.name || profile?.displayLabel || '';

  return (
    <AppShell title={t('dashboard.settingsLabel')} onBack={onBack} backLabel={t('common.back')}>
      <div className="vitalis-settings-profile">
        <Avatar name={displayName} size={56} />
        <p className="vitalis-settings-profile-name">{displayName}</p>
      </div>

      <div className="rows vitalis-settings-rows">
        <SettingsRow icon="user" label={t('profileOverview.title')} onClick={onOpenProfileOverview} />
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
