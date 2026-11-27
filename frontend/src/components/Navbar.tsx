import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import LocaleSwitcher from './ui/LocaleSwitcher';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../i18n';

/** Barre de navigation : liens, sélecteur de langue, badge panier, session, menu mobile. */
const Navbar = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };

  const navLinks = (
    <>
      <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
        {t('nav.catalog')}
      </NavLink>
      {user && (
        <NavLink to="/orders" onClick={closeMenu} className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
          {t('nav.orders')}
        </NavLink>
      )}
      {user?.role === 'admin' && (
        <NavLink to="/admin" onClick={closeMenu} className={({ isActive }) => `nav-link nav-link--admin${isActive ? ' nav-link--active' : ''}`}>
          {t('nav.admin')}
        </NavLink>
      )}
    </>
  );

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Logo />

        <nav className="navbar__links" aria-label="Navigation principale">
          {navLinks}
        </nav>

        <div className="navbar__actions">
          <LocaleSwitcher />

          <Link to="/cart" className="cart-button" aria-label={t('nav.cartLabel', { count: totalItems })}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 4h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20.5" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="17.5" cy="20.5" r="1.4" fill="currentColor" stroke="none" />
            </svg>
            {totalItems > 0 && <span className="cart-button__badge">{totalItems}</span>}
          </Link>

          {user ? (
            <div className="navbar__user">
              <span className="navbar__welcome" title={user.email}>
                {user.name}
                {user.role === 'admin' && <em className="navbar__role">admin</em>}
              </span>
              <button type="button" className="button button--ghost button--sm" onClick={handleLogout}>
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="navbar__user">
              <Link to="/login" className="button button--ghost button--sm" onClick={closeMenu}>
                {t('nav.login')}
              </Link>
              <Link to="/register" className="button button--primary button--sm" onClick={closeMenu}>
                {t('nav.register')}
              </Link>
            </div>
          )}

          <button
            type="button"
            className="navbar__burger"
            aria-expanded={menuOpen}
            aria-label="Ouvrir le menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="navbar__drawer" aria-label="Menu mobile">
          {navLinks}
          {!user && (
            <Link to="/login" className="nav-link" onClick={closeMenu}>
              {t('nav.login')}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
