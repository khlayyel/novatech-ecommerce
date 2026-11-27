import api from '../utils/request';
import type { Cart } from '../types';

export const getCart = async (): Promise<Cart> => {
  const { data } = await api.get<Cart>('/cart');
  return data;
};

export const addToCart = async (productId: string, quantity = 1): Promise<Cart> => {
  const { data } = await api.post<Cart>('/cart', { productId, quantity });
  return data;
};

export const updateCartItem = async (productId: string, quantity: number): Promise<Cart> => {
  const { data } = await api.put<Cart>(`/cart/items/${productId}`, { quantity });
  return data;
};

export const removeCartItem = async (productId: string): Promise<Cart> => {
  const { data } = await api.delete<Cart>(`/cart/items/${productId}`);
  return data;
};

export const clearCart = async (): Promise<Cart> => {
  const { data } = await api.delete<Cart>('/cart');
  return data;
};
