import AdminIcon from './AdminIcon';
import type { AdminIconName } from './AdminIcon';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: AdminIconName;
}

/**
 * En-tête de page de l'administration : premier élément du contenu,
 * sous la barre supérieure fixe. Il défile avec la page (non fixe).
 */
const AdminPageHeader = ({ title, subtitle, icon }: AdminPageHeaderProps) => (
  <header className="admin-page-head">
    {icon && (
      <span className="admin-page-head__icon" aria-hidden="true">
        <AdminIcon name={icon} size={24} />
      </span>
    )}

    <div className="admin-page-head__text">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  </header>
);

export default AdminPageHeader;
