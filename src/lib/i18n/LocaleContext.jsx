import React, { createContext, useCallback, useMemo, useState } from 'react';
import en from './locales/en.json';
import de from './locales/de.json';

export const CATALOGS = Object.freeze({ en, de });
export const DEFAULT_LOCALE = 'en';
const STORAGE_KEY = 'vitalis.locale';

function resolveInitialLocale() {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && CATALOGS[stored]) {
      return stored;
    }
  } catch {
    // Ignore storage access failures (private browsing, etc.) and fall through.
  }

  const browserLocale = String(window.navigator?.language ?? '').slice(0, 2).toLowerCase();
  return CATALOGS[browserLocale] ? browserLocale : DEFAULT_LOCALE;
}

export const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(resolveInitialLocale);

  const setLocale = useCallback((nextLocale) => {
    if (!CATALOGS[nextLocale]) {
      return;
    }

    setLocaleState(nextLocale);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, nextLocale);
      } catch {
        // Ignore storage access failures.
      }
    }
  }, []);

  const t = useCallback((key, vars = {}) => {
    const catalog = CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
    const template = catalog[key] ?? CATALOGS[DEFAULT_LOCALE][key] ?? key;

    return Object.keys(vars).reduce(
      (text, varName) => text.replaceAll(`{${varName}}`, String(vars[varName])),
      template,
    );
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    availableLocales: Object.keys(CATALOGS),
    t,
  }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}
