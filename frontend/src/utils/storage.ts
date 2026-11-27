/** Persistance locale : jeton JWT, identifiant de panier invité, jetons de suivi de commande. */

const TOKEN_KEY = 'novatech_token';
const CART_ID_KEY = 'novatech_cart_id';
const ORDER_TOKENS_KEY = 'novatech_order_tokens';
const ASSISTANT_GUEST_KEY = 'novatech.assistant.guestId';

const safeLocalStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* stockage indisponible (mode privé) : ignorance silencieuse */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
};

export const getToken = () => safeLocalStorage.get(TOKEN_KEY);

export const setToken = (token: string) => safeLocalStorage.set(TOKEN_KEY, token);

export const clearToken = () => safeLocalStorage.remove(TOKEN_KEY);

/** Identifiant de panier invité, généré une seule fois par navigateur. */
export const getCartId = (): string => {
  let cartId = safeLocalStorage.get(CART_ID_KEY);
  if (!cartId) {
    cartId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `cart-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    safeLocalStorage.set(CART_ID_KEY, cartId);
  }
  return cartId;
};

/** À la déconnexion : le panier invité repart de zéro. */
export const resetCartId = () => safeLocalStorage.remove(CART_ID_KEY);

/** Jetons de suivi des commandes invité : { [orderId]: token }. */
const readOrderTokens = (): Record<string, string> => {
  try {
    return JSON.parse(safeLocalStorage.get(ORDER_TOKENS_KEY) || '{}');
  } catch {
    return {};
  }
};

export const getOrderToken = (orderId: string): string | undefined => readOrderTokens()[orderId];

/** Identifiant anonyme pour rattacher les conversations d'assistant d'un visiteur. */
export const getAssistantGuestId = (): string => {
  let guestId = safeLocalStorage.get(ASSISTANT_GUEST_KEY);
  if (!guestId) {
    guestId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `assistant-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    safeLocalStorage.set(ASSISTANT_GUEST_KEY, guestId);
  }
  return guestId;
};

export const setOrderToken = (orderId: string, token: string) => {
  const tokens = readOrderTokens();
  tokens[orderId] = token;
  safeLocalStorage.set(ORDER_TOKENS_KEY, JSON.stringify(tokens));
};
