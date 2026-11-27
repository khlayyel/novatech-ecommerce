import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Réserve la page aux administrateurs (rôle vérifié en plus du jeton). */
  adminOnly?: boolean;
}

/**
 * Protège une route : redirige vers /login si l'utilisateur
 * n'est pas authentifié, en mémorisant la page demandée.
 * Avec `adminOnly`, un client connecté est renvoyé vers l'accueil.
 */
const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="page-center">
        <Spinner label="Vérification de la session…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
