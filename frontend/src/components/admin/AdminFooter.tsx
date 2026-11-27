import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import type { Locale } from '../../i18n';

const LOCALE_TAGS: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  ar: 'ar'
};

/**
 * Pied de page de l'administration : copyright, lien vers la boutique et
 * date/heure système mise à jour chaque seconde.
 */
const AdminFooter = () => {
  const { locale } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const tag = LOCALE_TAGS[locale];
  const date = now.toLocaleDateString(tag, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const time = now.toLocaleTimeString(tag, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <footer className="admin-footer">
      <div className="admin-footer__brand">
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M14.6 9.3a3.4 3.4 0 1 0 0 5.4" />
        </svg>
        <span>{now.getFullYear()}</span>
        <Link to="/" title="NovaTech — retour à la boutique">NovaTech</Link>
      </div>

      <div className="admin-footer__clock">
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <time dateTime={now.toISOString()}>{date} · {time}</time>
      </div>
    </footer>
  );
};

export default AdminFooter;
