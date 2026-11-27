import type { ReactNode } from 'react';

/** État vide réutilisable (panier vide, aucune commande, aucun résultat…). */
interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: string;
}

const EmptyState = ({ title, message, action, icon = '🛍️' }: EmptyStateProps) => (
  <div className="empty-state">
    <div className="empty-state__icon" aria-hidden="true">{icon}</div>
    <h2 className="empty-state__title">{title}</h2>
    {message && <p className="empty-state__message">{message}</p>}
    {action && <div className="empty-state__action">{action}</div>}
  </div>
);

export default EmptyState;
