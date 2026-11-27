import { LOCALES, useI18n } from '../../i18n';
import type { Locale } from '../../i18n';

/** Sélecteur de langue (FR / EN / AR) utilisé dans la boutique et l'admin. */
const LocaleSwitcher = () => {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      className="input input--select locale-switcher"
      aria-label={t('common.language')}
      title={t('common.language')}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
    >
      {LOCALES.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
};

export default LocaleSwitcher;
