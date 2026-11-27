import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import type { User } from '../types';

const mockUseAuth = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const adminUser: User = { id: 'a1', name: 'Admin', email: 'admin@novatech.fr', role: 'admin' };
const customerUser: User = { id: 'c1', name: 'Client', email: 'demo@novatech.fr', role: 'customer' };

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <div>ADMIN</div>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute (adminOnly)', () => {
  it('redirige un visiteur non connecté vers la connexion', () => {
    mockUseAuth.mockReturnValue({ user: null, initializing: false, token: null });

    renderAt('/admin');

    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('renvoie un client connecté vers l\'accueil', () => {
    mockUseAuth.mockReturnValue({ user: customerUser, initializing: false, token: 'jwt' });

    renderAt('/admin');

    expect(screen.getByText('HOME')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
  });

  it('laisse passer un administrateur', () => {
    mockUseAuth.mockReturnValue({ user: adminUser, initializing: false, token: 'jwt' });

    renderAt('/admin');

    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
});
