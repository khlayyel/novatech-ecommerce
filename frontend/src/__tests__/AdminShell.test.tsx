import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminPage from '../pages/admin/AdminPage';

const mockUseAuth = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: { id: 'a1', name: 'Admin', email: 'admin@novatech.fr', role: 'admin' },
    logout: jest.fn()
  });
});

const renderShell = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminPage />}>
          <Route index element={<p>CONTENU DU TABLEAU DE BORD</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('Coquille d\'administration', () => {
  it('affiche l\'en-tête, la navigation latérale et le contenu imbriqué', () => {
    renderShell();

    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('CONTENU DU TABLEAU DE BORD')).toBeInTheDocument();

    for (const label of ['Produits', 'Catégories', 'Stocks', 'Commandes', 'Clients', 'Sécurité']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('expose l\'identité de l\'administrateur connecté', () => {
    renderShell();

    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getByText('admin@novatech.fr')).toBeInTheDocument();
  });
});
