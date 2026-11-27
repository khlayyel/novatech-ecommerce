import { useState } from 'react';
import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  defaultOpen?: boolean;
  /** Mémorise l'état ouvert/fermé dans le navigateur. */
  storageKey?: string;
  /** Un tableau ne se replie pas : en-tête statique, contenu toujours visible. */
  collapsible?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

const readStored = (key: string | null): boolean | null => {
  if (!key) return null;
  try {
    const value = window.localStorage.getItem(key);
    if (value === '1') return true;
    if (value === '0') return false;
  } catch {
    return null;
  }
  return null;
};

/**
 * Panneau repliable standard : en-tête cliquable (titre + actions) et corps
 * masquable. Utilisé pour les cartes de filtres et les tableaux de l'admin.
 */
const Panel = ({
  title,
  subtitle,
  actions,
  defaultOpen = true,
  storageKey,
  collapsible = true,
  className = '',
  bodyClassName = '',
  children
}: PanelProps) => {
  const storage = collapsible && storageKey ? `novatech.panel.${storageKey}` : null;
  const [open, setOpen] = useState(() => (collapsible ? readStored(storage) ?? defaultOpen : true));

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      if (storage) {
        try {
          window.localStorage.setItem(storage, next ? '1' : '0');
        } catch {
          // Stockage indisponible : l'état reste local à la page.
        }
      }
      return next;
    });
  };

  return (
    <section className={`card panel${collapsible && !open ? ' panel--closed' : ''}${className ? ` ${className}` : ''}`}>
      <div className="panel__head">
        {collapsible ? (
          <button type="button" className="panel__toggle" onClick={toggle} aria-expanded={open}>
            <span className={`panel__chevron${open ? ' panel__chevron--open' : ''}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
            <span className="panel__titles">
              <strong>{title}</strong>
              {subtitle && <small>{subtitle}</small>}
            </span>
          </button>
        ) : (
          <div className="panel__toggle panel__toggle--static">
            <span className="panel__titles">
              <strong>{title}</strong>
              {subtitle && <small>{subtitle}</small>}
            </span>
          </div>
        )}

        {actions && <div className="panel__actions">{actions}</div>}
      </div>

      {(open || !collapsible) && <div className={`panel__body${bodyClassName ? ` ${bodyClassName}` : ''}`}>{children}</div>}
    </section>
  );
};

export default Panel;
