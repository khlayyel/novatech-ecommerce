import { createContext, useContext } from 'react';
import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

/**
 * Noyau d'internationalisation : ressources, résolution de clés et contexte.
 * Le provider React vit dans `I18nProvider.tsx` (règle fast-refresh).
 */

export type Locale = 'fr' | 'en' | 'ar';

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' }
];

const RESOURCES: Record<Locale, unknown> = { fr, en, ar };
const FALLBACK: Locale = 'fr';

export const LOCALE_STORAGE_KEY = 'novatech.locale';

export type TranslationParams = Record<string, string | number>;

const lookup = (dictionary: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, dictionary);

const interpolate = (template: string, params?: TranslationParams): string =>
  params
    ? template.replace(/\{(\w+)\}/g, (_match, key: string) =>
        params[key] !== undefined ? String(params[key]) : `{${key}}`
      )
    : template;

export const translate = (locale: Locale, key: string, params?: TranslationParams): string => {
  const value = lookup(RESOURCES[locale], key) ?? lookup(RESOURCES[FALLBACK], key);
  if (typeof value !== 'string') return key;
  return interpolate(value, params);
};

export const readStoredLocale = (): Locale => {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'fr' || stored === 'en' || stored === 'ar') return stored;
  } catch {
    // Stockage indisponible : on garde le français.
  }
  return FALLBACK;
};

export interface I18nValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

/** Valeur par défaut : français, pour que les composants isolés restent utilisables (tests). */
export const I18nContext = createContext<I18nValue>({
  locale: FALLBACK,
  dir: 'ltr',
  setLocale: () => undefined,
  t: (key, params) => translate(FALLBACK, key, params)
});

export const useI18n = (): I18nValue => useContext(I18nContext);
