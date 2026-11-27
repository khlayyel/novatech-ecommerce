import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useCart, CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import * as cartApi from '../api/cart';
import type { Cart } from '../types';

jest.mock('../api/cart');

const mockedCartApi = jest.mocked(cartApi);

const product = {
  _id: 'p1',
  name: 'NovaSound 7.1',
  description: 'Casque gaming circum-aural.',
  price: 159,
  category: 'Périphériques',
  stock: 22,
  imageUrl: '/images/products/novasound-71.svg',
  createdAt: '',
  updatedAt: ''
};

const cartWithItem: Cart = { items: [{ product, quantity: 2 }] };

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  </MemoryRouter>
);

describe('CartContext', () => {
  beforeEach(() => {
    mockedCartApi.getCart.mockResolvedValue({ items: [] });
  });

  it('calcule totalItems et subtotal à partir des articles', async () => {
    mockedCartApi.getCart.mockResolvedValue(cartWithItem);

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    expect(result.current.totalItems).toBe(2);
    expect(result.current.subtotal).toBe(318); // 159 € × 2
  });

  it('addToCart met à jour l\'état avec la réponse de l\'API', async () => {
    mockedCartApi.addToCart.mockResolvedValue(cartWithItem);

    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addToCart('p1', 2);
    });

    expect(mockedCartApi.addToCart).toHaveBeenCalledWith('p1', 2);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.totalItems).toBe(2);
  });

  it('updateQuantity reflète la modification d\'une quantité', async () => {
    mockedCartApi.updateCartItem.mockResolvedValue({ items: [{ product, quantity: 5 }] });

    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.updateQuantity('p1', 5);
    });

    expect(mockedCartApi.updateCartItem).toHaveBeenCalledWith('p1', 5);
    expect(result.current.items[0].quantity).toBe(5);
  });

  it('removeItem vide l\'article du panier', async () => {
    mockedCartApi.removeCartItem.mockResolvedValue({ items: [] });

    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.removeItem('p1');
    });

    expect(mockedCartApi.removeCartItem).toHaveBeenCalledWith('p1');
    expect(result.current.items).toHaveLength(0);
  });
});
