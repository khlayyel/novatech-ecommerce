import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import AdminIcon from '../../components/admin/AdminIcon';
import type { AdminIconName } from '../../components/admin/AdminIcon';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminFooter from '../../components/admin/AdminFooter';
import LocaleSwitcher from '../../components/ui/LocaleSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

interface NavItem {
  to: string;
  labelKey: string;
  icon: AdminIconName;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', labelKey: 'admin.nav.dashboard', icon: 'dashboard', end: true },
  { to: '/admin/products', labelKey: 'admin.nav.products', icon: 'products' },
  { to: '/admin/categories', labelKey: 'admin.nav.categories', icon: 'categories' },
  { to: '/admin/stock', labelKey: 'admin.nav.stock', icon: 'stock' },
  { to: '/admin/orders', labelKey: 'admin.nav.orders', icon: 'orders' },
  { to: '/admin/users', labelKey: 'admin.nav.users', icon: 'users' },
  { to: '/admin/security', labelKey: 'admin.nav.security', icon: 'security' }
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/products': 'admin.pages.products',
  '/admin/categories': 'admin.pages.categories',
  '/admin/stock': 'admin.pages.stock',
  '/admin/orders': 'admin.pages.orders',
  '/admin/users': 'admin.pages.users',
  '/admin/security': 'admin.pages.security',
  '/admin': 'admin.pages.dashboard'
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
  const { t } = useI18n();
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

  const matchedPath =
    Object.keys(PAGE_TITLES)
      .sort((left, right) => right.length - left.length)
      .find((path) => location.pathname.startsWith(path)) ?? '/admin';
  const title = t(PAGE_TITLES[matchedPath]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={`admin-shell${collapsed ? ' admin-shell--collapsed' : ''}`}>
      <aside className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <Logo compact={collapsed} />
          <span className="admin-sidebar__tag">{t('admin.tag')}</span>
        </div>

        <nav className="admin-sidebar__nav" aria-label={t('admin.eyebrow')}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={t(item.labelKey)}
              aria-label={t(item.labelKey)}
              className={({ isActive }) => `admin-nav-link${isActive ? ' admin-nav-link--active' : ''}`}
            >
              <AdminIcon name={item.icon} />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <Link to="/" className="admin-nav-link" title={t('admin.store')} aria-label={t('admin.store')}>
            <AdminIcon name="store" />
            <span>{t('admin.store')}</span>
          </Link>
          <button type="button" className="admin-nav-link" title={t('admin.logout')} aria-label={t('admin.logout')} onClick={handleLogout}>
            <AdminIcon name="logout" />
            <span>{t('admin.logout')}</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="admin-overlay" aria-label={t('common.close')} onClick={() => setSidebarOpen(false)} />}

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
            aria-label={sidebarOpen ? t('common.close') : t('admin.eyebrow')}
            title={sidebarOpen ? t('common.close') : t('admin.eyebrow')}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <AdminIcon name={sidebarOpen ? 'close' : 'menu'} size={20} />
          </button>

          <span className="admin-topbar__brand">{t('admin.eyebrow')}</span>

          <div className="admin-topbar__user">
            <LocaleSwitcher />
            <span className="admin-avatar" aria-hidden="true">{user?.name?.slice(0, 1).toUpperCase()}</span>
            <span className="admin-topbar__identity">
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </span>
          </div>
        </header>

        <main className="admin-content">
          <AdminPageHeader title={title} />
          <Outlet />
        </main>

        <AdminFooter />
      </div>
    </div>
  );
};

export default AdminPage;
