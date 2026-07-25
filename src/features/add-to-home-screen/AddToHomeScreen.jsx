import React, { useEffect, useState } from 'react';
import { Button, Icon, Sheet } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import {
  hasDeferredInstallPrompt,
  subscribeToInstallPromptState,
  triggerInstallPrompt,
} from '../../lib/installPrompt/index.js';
import {
  ADD_TO_HOME_SCREEN_VARIANT,
  detectPlatform,
  isStandaloneDisplayMode,
  resolveAddToHomeScreenVariant,
} from './model.js';
import './add-to-home-screen.css';

export default function AddToHomeScreen() {
  const { t } = useTranslation();
  const [hasPrompt, setHasPrompt] = useState(() => hasDeferredInstallPrompt());
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(
    () => subscribeToInstallPromptState((state) => setHasPrompt(state.hasDeferredInstallPrompt)),
    [],
  );

  if (typeof window === 'undefined') {
    return null;
  }

  const platform = detectPlatform(window.navigator?.userAgent);
  const isStandalone = isStandaloneDisplayMode(
    window.matchMedia?.('(display-mode: standalone)'),
    window.navigator?.standalone,
  );
  const variant = resolveAddToHomeScreenVariant({ platform, isStandalone, hasDeferredPrompt: hasPrompt });

  if (variant === ADD_TO_HOME_SCREEN_VARIANT.HIDDEN) {
    return null;
  }

  const handleClick = () => {
    if (variant === ADD_TO_HOME_SCREEN_VARIANT.NATIVE_PROMPT) {
      triggerInstallPrompt();
      return;
    }
    setSheetOpen(true);
  };

  return (
    <>
      <Button variant="ghost" size="md" fullWidth iconLeft="square-plus" onClick={handleClick}>
        {t('addToHomeScreen.cta')}
      </Button>
      {variant === ADD_TO_HOME_SCREEN_VARIANT.IOS_INSTRUCTIONS ? (
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t('addToHomeScreen.iosSheetTitle')}>
          <ol className="vitalis-a2hs-steps">
            <li>
              <Icon name="share" size={20} />
              <span>{t('addToHomeScreen.iosStep1')}</span>
            </li>
            <li>
              <Icon name="square-plus" size={20} />
              <span>{t('addToHomeScreen.iosStep2')}</span>
            </li>
            <li>
              <Icon name="check" size={20} />
              <span>{t('addToHomeScreen.iosStep3')}</span>
            </li>
          </ol>
        </Sheet>
      ) : null}
    </>
  );
}
