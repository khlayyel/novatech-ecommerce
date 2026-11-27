import axios from 'axios';
import type { AxiosError } from 'axios';
import { API_URL } from '../config';
import { getCartId, getToken, setOrderToken } from './storage';

/**
 * Client HTTP central : toutes les requêtes passent ici.
 * Intercepteurs :
 *  - X-Cart-Id : identifie le panier invité
 *  - Authorization : jeton JWT si l'utilisateur est connecté
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const cartId = getCartId();
  if (cartId) {
    config.headers['X-Cart-Id'] = cartId;
  }
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

/** Extrait un message d'erreur lisible d'une réponse axios. */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message || axiosError.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

/** Mémorise le jeton de suivi d'une commande (accès invité au suivi). */
export const rememberTrackingToken = (orderId: string, token: string) => setOrderToken(orderId, token);
