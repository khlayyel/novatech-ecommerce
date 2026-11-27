import { LOCALES, useI18n } from '../../i18n';
import type { Locale } from '../../i18n';

/**
 * Sélecteur de langue compact : icône globe + liste déroulante native
 * (le select est superposé, transparent, pour garder l'accessibilité).
 */
const LocaleSwitcher = () => {
  const { locale, setLocale, t } = useI18n();

  return (
    <span className="locale-switcher" title={t('common.language')}>
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
      </svg>

      <select
        className="locale-switcher__control"
        aria-label={t('common.language')}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {LOCALES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </span>
  );
};

export default LocaleSwitcher;
