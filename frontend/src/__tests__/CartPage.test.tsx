import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CartPage from '../pages/CartPage';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import * as cartApi from '../api/cart';
import { formatPrice } from '../utils/format';
import type { Cart } from '../types';

jest.mock('../api/cart');

const mockedCartApi = jest.mocked(cartApi);

/** Matcher exact de prix (espace insécable dans le formatage Intl). */
const priceText = (amount: number) => (_content: string, element: Element | null) =>
  element?.textContent === formatPrice(amount);

const product = {
  _id: 'p1',
  name: 'NovaKey TKL',
  description: 'Clavier mécanique sans fil.',
  price: 129,
  category: 'Périphériques',
  stock: 30,
  imageUrl: '/images/products/novakey-tkl.svg',
  createdAt: '',
  updatedAt: ''
};

const secondProduct = {
  _id: 'p2',
  name: 'NovaGlide Pro',
  description: 'Souris sans fil.',
  price: 79,
  category: 'Périphériques',
  stock: 40,
  imageUrl: '/images/products/novaglide-pro.svg',
  createdAt: '',
  updatedAt: ''
};

const fullCart: Cart = {
  items: [
    { product, quantity: 2 },
    { product: secondProduct, quantity: 1 }
  ]
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <CartPage />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );

describe('CartPage', () => {
  beforeEach(() => {
    mockedCartApi.getCart.mockResolvedValue({ items: [] });
    mockedCartApi.updateCartItem.mockReset();
    mockedCartApi.removeCartItem.mockReset();
    mockedCartApi.clearCart.mockReset();
  });

  it('affiche les articles avec leurs quantités et le total calculé', async () => {
    mockedCartApi.getCart.mockResolvedValue(fullCart);

    renderPage();

    expect(await screen.findByText('NovaKey TKL')).toBeInTheDocument();
    expect(screen.getByText('NovaGlide Pro')).toBeInTheDocument();

    // Total : 129 € × 2 + 79 € × 1 = 337 € — apparaît au sous-total ET au total.
    expect(screen.getAllByText(priceText(337))).toHaveLength(2);
    expect(screen.getByText('Sous-total')).toBeInTheDocument();
  });

  it('modifie la quantité via le sélecteur +/−', async () => {
    mockedCartApi.getCart.mockResolvedValue(fullCart);
    mockedCartApi.updateCartItem.mockResolvedValue(fullCart);

    renderPage();

    const increase = await screen.findAllByRole('button', { name: /Augmenter la quantité/i });
    await userEvent.click(increase[0]);

    await waitFor(() => {
      expect(mockedCartApi.updateCartItem).toHaveBeenCalledWith('p1', 3);
    });
  });

  it('supprime un article du panier', async () => {
    mockedCartApi.getCart.mockResolvedValue(fullCart);
    mockedCartApi.removeCartItem.mockResolvedValue({ items: [{ product: secondProduct, quantity: 1 }] });

    renderPage();

    const remove = await screen.findAllByRole('button', { name: /Retirer NovaKey TKL/i });
    await userEvent.click(remove[0]);

    await waitFor(() => {
      expect(mockedCartApi.removeCartItem).toHaveBeenCalledWith('p1');
    });
  });

  it('affiche un état vide quand le panier ne contient rien', async () => {
    mockedCartApi.getCart.mockResolvedValue({ items: [] });

    renderPage();

    expect(await screen.findByText('Votre panier est vide')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Découvrir le catalogue/i })).toBeInTheDocument();
  });

  it('affiche une bannière d\'erreur si l\'API échoue', async () => {
    mockedCartApi.getCart.mockRejectedValue(new Error('réseau coupé'));

    renderPage();

    expect(await screen.findByText('Impossible de charger le panier.')).toBeInTheDocument();
  });
});
