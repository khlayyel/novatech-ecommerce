import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * En-tête de page de l'administration : premier élément du contenu,
 * sous la barre supérieure fixe. Il défile avec la page (non fixe).
 */
const AdminPageHeader = ({ title, subtitle, actions }: AdminPageHeaderProps) => (
  <header className="admin-page-head">
    <div>
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
    {actions && <div className="admin-page-head__actions">{actions}</div>}
  </header>
);

export default AdminPageHeader;
