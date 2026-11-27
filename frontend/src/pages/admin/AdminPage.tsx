import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import AdminIcon from '../../components/admin/AdminIcon';
import type { AdminIconName } from '../../components/admin/AdminIcon';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: AdminIconName;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Tableau de bord', icon: 'dashboard', end: true },
  { to: '/admin/products', label: 'Produits', icon: 'products' },
  { to: '/admin/categories', label: 'Catégories', icon: 'categories' },
  { to: '/admin/stock', label: 'Stocks', icon: 'stock' },
  { to: '/admin/orders', label: 'Commandes', icon: 'orders' },
  { to: '/admin/users', label: 'Clients', icon: 'users' },
  { to: '/admin/security', label: 'Sécurité', icon: 'security' }
];

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Tableau de bord',
  '/admin/products': 'Produits',
  '/admin/categories': 'Catégories & sous-catégories',
  '/admin/stock': 'Gestion des stocks',
  '/admin/orders': 'Commandes',
  '/admin/users': 'Clients & rôles',
  '/admin/security': 'Sécurité & journal'
};

const COLLAPSE_KEY = 'novatech.admin.sidebar-collapsed';

const readCollapsed = () => {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Coquille de l'espace d'administration : barre latérale repliable (rail
 * d'icônes), en-tête, zone de contenu et pied de page. Sur mobile, la barre
 * devient un tiroir. La protection (rôle admin) est assurée par ProtectedRoute.
 */
const AdminPage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // Stockage indisponible : l'état reste valable pour la session.
      }
      return next;
    });
  };

  const title = PAGE_TITLES[location.pathname] || 'Administration';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={`admin-shell${collapsed ? ' admin-shell--collapsed' : ''}`}>
      <aside className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <Logo compact={collapsed} />
          <span className="admin-sidebar__tag">Admin</span>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Navigation administration">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) => `admin-nav-link${isActive ? ' admin-nav-link--active' : ''}`}
            >
              <AdminIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <Link to="/" className="admin-nav-link" title="Voir la boutique" aria-label="Voir la boutique">
            <AdminIcon name="store" />
            <span>Voir la boutique</span>
          </Link>
          <button type="button" className="admin-nav-link" title="Déconnexion" aria-label="Déconnexion" onClick={handleLogout}>
            <AdminIcon name="logout" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="admin-overlay" aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-topbar__collapse"
            aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            aria-pressed={collapsed}
            title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            onClick={toggleCollapsed}
          >
            <AdminIcon name={collapsed ? 'expand' : 'collapse'} size={20} />
          </button>

          <button
            type="button"
            className="admin-topbar__burger"
            aria-label={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            title={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <AdminIcon name={sidebarOpen ? 'close' : 'menu'} size={20} />
          </button>

          <div className="admin-topbar__title">
            <span className="admin-topbar__eyebrow">Administration</span>
            <h1>{title}</h1>
          </div>

          <div className="admin-topbar__user">
            <span className="admin-avatar" aria-hidden="true">{user?.name?.slice(0, 1).toUpperCase()}</span>
            <span className="admin-topbar__identity">
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </span>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          NovaTech Admin — React · Node.js · MongoDB · Stripe
        </footer>
      </div>
    </div>
  );
};

export default AdminPage;
