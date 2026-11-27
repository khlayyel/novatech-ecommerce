import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';

/** Marque NovaTech : monogramme dégradé + nom. */
const Logo = ({ compact = false }: { compact?: boolean }) => (
  <Link to="/" className="logo" aria-label={`${APP_NAME} — retour à l'accueil`}>
    <svg className="logo__mark" viewBox="0 0 64 64" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#logo-gradient)" />
      <path d="M20 46V18h6l12 19V18h6v28h-6L26 27v19z" fill="#fff" />
    </svg>
    {!compact && (
      <span className="logo__word">
        Nova<em>Tech</em>
      </span>
    )}
  </Link>
);

export default Logo;
