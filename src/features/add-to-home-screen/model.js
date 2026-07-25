const IOS_UA_PATTERN = /iphone|ipad|ipod/i;
const ANDROID_UA_PATTERN = /android/i;

export const ADD_TO_HOME_SCREEN_VARIANT = Object.freeze({
  IOS_INSTRUCTIONS: 'ios-instructions',
  NATIVE_PROMPT: 'native-prompt',
  HIDDEN: 'hidden',
});

export function detectPlatform(userAgent) {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  if (IOS_UA_PATTERN.test(ua)) {
    return 'ios';
  }
  if (ANDROID_UA_PATTERN.test(ua)) {
    return 'android';
  }
  return 'other';
}

export function isStandaloneDisplayMode(mediaQueryList, navigatorStandalone) {
  return Boolean(mediaQueryList?.matches) || navigatorStandalone === true;
}

export function resolveAddToHomeScreenVariant({ platform, isStandalone, hasDeferredPrompt }) {
  if (isStandalone) {
    return ADD_TO_HOME_SCREEN_VARIANT.HIDDEN;
  }
  if (platform === 'ios') {
    return ADD_TO_HOME_SCREEN_VARIANT.IOS_INSTRUCTIONS;
  }
  if (hasDeferredPrompt) {
    return ADD_TO_HOME_SCREEN_VARIANT.NATIVE_PROMPT;
  }
  return ADD_TO_HOME_SCREEN_VARIANT.HIDDEN;
}
