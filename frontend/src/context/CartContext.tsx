import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as cartApi from '../api/cart';
import { useAuth } from './AuthContext';
import type { Cart, CartItem } from '../types';

/**
 * Contexte du panier : état partagé entre la navbar (badge),
 * le catalogue (ajout) et la page panier (modification/suppression).
 * Le panier fonctionne pour les visiteurs (X-Cart-Id) ET les connectés (JWT) ;
 * la fusion est assurée côté serveur à la connexion.
 */
const EMPTY_CART: Cart = { items: [] };

interface CartContextValue {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  totalItems: number;
  subtotal: number;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cartApi.getCart();
      setCart({ items: (data.items || []).filter((item) => item.product) });
    } catch {
      setError('Impossible de charger le panier.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recharge le panier au montage et à chaque changement d'identité
  // (connexion → panier fusionné ; déconnexion → nouveau panier invité).
  useEffect(() => {
    refresh();
  }, [refresh, token]);

  const addToCart = useCallback(async (productId: string, quantity = 1) => {
    setError(null);
    const data = await cartApi.addToCart(productId, quantity);
    setCart({ items: (data.items || []).filter((item) => item.product) });
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    setError(null);
    try {
      const data = await cartApi.updateCartItem(productId, quantity);
      setCart({ items: (data.items || []).filter((item) => item.product) });
    } catch {
      setError('Impossible de modifier la quantité.');
      throw new Error('Impossible de modifier la quantité.');
    }
  }, []);

  const removeItem = useCallback(async (productId: string) => {
    setError(null);
    try {
      const data = await cartApi.removeCartItem(productId);
      setCart({ items: (data.items || []).filter((item) => item.product) });
    } catch {
      setError('Impossible de retirer l\'article.');
    }
  }, []);

  const clear = useCallback(async () => {
    setError(null);
    try {
      const data = await cartApi.clearCart();
      setCart({ items: (data.items || []).filter((item) => item.product) });
    } catch {
      setError('Impossible de vider le panier.');
    }
  }, []);

  const totalItems = useMemo(() => cart.items.reduce((sum, item) => sum + item.quantity, 0), [cart.items]);

  const subtotal = useMemo(
    () => Math.round(cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 100) / 100,
    [cart.items]
  );

  const value = useMemo(
    () => ({ items: cart.items, loading, error, totalItems, subtotal, addToCart, updateQuantity, removeItem, clear, refresh }),
    [cart.items, loading, error, totalItems, subtotal, addToCart, updateQuantity, removeItem, clear, refresh]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé dans un CartProvider');
  }
  return context;
};
