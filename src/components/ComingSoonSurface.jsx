import React from 'react';
import { AppShell } from '../features/self-onboarding-to-first-dashboard/components.jsx';
import { Card, Icon } from '../design-system/components/index.js';
import { useTranslation } from '../lib/i18n/index.js';

export default function ComingSoonSurface() {
  const { t } = useTranslation();

  return (
    <AppShell title={null}>
      <Card padding={16} className="vitalis-hero" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="vitalis-hero-glow" aria-hidden="true" />
        <div className="vitalis-hero-row">
          <div>
            <p className="vitalis-hero-eyebrow">{t('safe.heroSubtitle')}</p>
            <p className="vitalis-hero-title">{t('safe.heroTitle')}</p>
          </div>
          <span className="vitalis-hero-icon-chip" style={{ background: 'var(--status-done-soft)', color: 'var(--status-done)' }}>
            <Icon name="shield-check" size={18} />
          </span>
        </div>
      </Card>

      <Card padding={20} style={{ textAlign: 'center', marginTop: 24 }}>
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          {t('comingSoon.title')}
        </p>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('comingSoon.body')}
        </p>
      </Card>
    </AppShell>
  );
}
