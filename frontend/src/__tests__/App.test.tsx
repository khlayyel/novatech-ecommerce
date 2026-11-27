import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import * as productsApi from '../api/products';
import * as cartApi from '../api/cart';

jest.mock('../api/products');
jest.mock('../api/cart');
jest.mock('../api/auth');

const mockedProductsApi = jest.mocked(productsApi);
const mockedCartApi = jest.mocked(cartApi);

const renderApp = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );

describe('App — routage global (smoke test)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedProductsApi.listProducts.mockResolvedValue({ products: [], total: 0, page: 1, pages: 1 });
    mockedProductsApi.listCategories.mockResolvedValue([]);
    mockedProductsApi.listCategoryTree.mockResolvedValue([]);
    mockedCartApi.getCart.mockResolvedValue({ items: [] });
  });

  it('affiche l\'accueil (héro + catalogue) sur "/"', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { name: /Le matériel informatique/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Notre catalogue' })).toBeInTheDocument();
  });

  it('affiche le panier vide sur "/cart"', async () => {
    renderApp('/cart');

    expect(await screen.findByText('Votre panier est vide')).toBeInTheDocument();
  });

  it('affiche la page de connexion sur "/login"', () => {
    renderApp('/login');

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });

  it('redirige "/orders" vers la connexion quand non authentifié (route protégée)', async () => {
    renderApp('/orders');

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });

  it('affiche la page 404 pour une route inconnue', () => {
    renderApp('/page-inexistante');

    expect(screen.getByText('Page introuvable (404)')).toBeInTheDocument();
  });
});
