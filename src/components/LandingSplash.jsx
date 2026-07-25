import React from 'react';
import { AppShell } from '../features/self-onboarding-to-first-dashboard/components.jsx';
import { Logo, Button } from '../design-system/components/index.js';
import { AddToHomeScreen } from '../features/add-to-home-screen/index.js';
import { useTranslation } from '../lib/i18n/index.js';
import './landing-splash.css';

export default function LandingSplash({ onGetStarted }) {
  const { t } = useTranslation();

  return (
    <AppShell title={null} centeredFooter>
      <div className="vitalis-landing">
        <div className="vitalis-landing-logo">
          <Logo size={46} wordSize={30} />
        </div>
        <h1 className="vitalis-landing-title">{t('landing.title')}</h1>
        <p className="vitalis-landing-subtitle">{t('landing.subtitle')}</p>
        <div className="vitalis-landing-cta">
          <Button variant="primary" size="lg" fullWidth iconRight="arrow-right" onClick={onGetStarted}>
            {t('landing.cta')}
          </Button>
          <AddToHomeScreen />
        </div>
      </div>
    </AppShell>
  );
}
