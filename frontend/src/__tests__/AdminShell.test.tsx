import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminPage from '../pages/admin/AdminPage';

const mockUseAuth = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

beforeEach(() => {
  window.localStorage.clear();
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

  it('replie la barre latérale en rail d\'icônes et mémorise l\'état', async () => {
    const { container } = renderShell();
    const shell = container.querySelector('.admin-shell');

    expect(shell).not.toHaveClass('admin-shell--collapsed');

    await userEvent.click(screen.getByRole('button', { name: /Replier le menu/i }));

    expect(shell).toHaveClass('admin-shell--collapsed');
    expect(screen.getByRole('button', { name: /Déplier le menu/i })).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('novatech.admin.sidebar-collapsed')).toBe('1');

    await userEvent.click(screen.getByRole('button', { name: /Déplier le menu/i }));

    expect(shell).not.toHaveClass('admin-shell--collapsed');
    expect(window.localStorage.getItem('novatech.admin.sidebar-collapsed')).toBe('0');
  });
});
