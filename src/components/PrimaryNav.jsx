import React from 'react';
import { TabBar } from '../design-system/components/index.js';
import { useTranslation } from '../lib/i18n/index.js';

const TAB_VIEWS = ['start', 'timeline', 'checkups', 'safe'];

const TAB_ICON_BY_VIEW = {
  start: 'layout-grid',
  timeline: 'trending-up',
  checkups: 'shield-check',
  safe: 'lock',
};

const TAB_LABEL_KEY_BY_VIEW = {
  start: 'nav.start',
  timeline: 'nav.timeline',
  checkups: 'nav.checkups',
  safe: 'nav.documents',
};

export default function PrimaryNav({
  activeView,
  onNavigate,
  navLocked = false,
  showActiveSelection = true,
}) {
  const { t } = useTranslation();

  const tabItems = TAB_VIEWS.map((view) => ({
    key: view,
    label: t(TAB_LABEL_KEY_BY_VIEW[view]),
    icon: TAB_ICON_BY_VIEW[view],
  }));

  const navigate = (view) => {
    if (navLocked) return;
    onNavigate(view);
  };

  return (
    <TabBar
      items={tabItems}
      active={showActiveSelection ? activeView : undefined}
      onChange={navigate}
      className={navLocked ? 'vds-tabbar--locked' : ''}
      aria-label={t('nav.primaryNavigationAriaLabel')}
    />
  );
}
