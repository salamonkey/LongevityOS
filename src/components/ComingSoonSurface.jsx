import React from 'react';
import { AppShell } from '../features/self-onboarding-to-first-dashboard/components.jsx';
import { Card } from '../design-system/components/index.js';
import { useTranslation } from '../lib/i18n/index.js';

export default function ComingSoonSurface() {
  const { t } = useTranslation();

  return (
    <AppShell title={null}>
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
