import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/admin', label: 'Tableau de bord', end: true },
  { to: '/admin/products', label: 'Produits', end: false },
  { to: '/admin/orders', label: 'Commandes', end: false }
];

/**
 * Espace d'administration (rôle `admin`) : tableau de bord, catalogue, commandes.
 * La protection est assurée par ProtectedRoute (adminOnly) dans App.tsx ;
 * le backend revérifie le rôle à chaque requête.
 */
const AdminPage = () => (
  <div className="container admin">
    <header className="page-head">
      <h1>Administration</h1>
      <p className="muted">Pilotez le catalogue, les stocks et le suivi des commandes.</p>
    </header>

    <nav className="admin-tabs" aria-label="Sections d'administration">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `admin-tabs__link${isActive ? ' admin-tabs__link--active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>

    <Outlet />
  </div>
);

export default AdminPage;
