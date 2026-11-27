import api, { rememberTrackingToken } from '../utils/request';
import { getOrderToken } from '../utils/storage';
import type { CheckoutResponse, Order } from '../types';

/**
 * Crée la commande et l'intention de paiement Stripe.
 * Le montant est calculé par le SERVEUR à partir des prix en base.
 */
export const checkout = async (): Promise<CheckoutResponse> => {
  const { data } = await api.post<CheckoutResponse>('/orders/checkout', {});
  rememberTrackingToken(data.orderId, data.trackingToken);
  return data;
};

/** Confirme une commande après un paiement réussi côté client (revérifié côté serveur). */
export const confirmOrder = async (orderId: string): Promise<Order> => {
  const headers: Record<string, string> = {};
  const token = getOrderToken(orderId);
  if (token) {
    headers['X-Order-Token'] = token;
  }
  const { data } = await api.post<{ order: Order }>(`/orders/${orderId}/confirm`, {}, { headers });
  return data.order;
};

/** Détail d'une commande : propriétaire (JWT) ou jeton de suivi invité. */
export const getOrder = async (orderId: string): Promise<Order> => {
  const headers: Record<string, string> = {};
  const token = getOrderToken(orderId);
  if (token) {
    headers['X-Order-Token'] = token;
  }
  const { data } = await api.get<Order>(`/orders/${orderId}`, { headers });
  return data;
};

/** Historique des commandes de l'utilisateur connecté. */
export const getMyOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<Order[]>('/orders/mine');
  return data;
};
