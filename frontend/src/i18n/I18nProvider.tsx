import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  I18nContext,
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  translate
} from './core';
import type { I18nValue, Locale, TranslationParams } from './core';

/** Fournit la langue courante, le sens de lecture et la fonction de traduction. */
export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Stockage indisponible : le choix reste valable pour la session.
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => translate(locale, key, params),
    [locale]
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, dir: locale === 'ar' ? 'rtl' : 'ltr', setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
