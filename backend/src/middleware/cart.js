import { optionalAuth } from './auth.js';
import { ApiError } from './error.js';

// Identifiant de panier invité : UUID ou chaîne alphanumérique raisonnable.
const CART_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Résout le "propriétaire" du panier :
 *  - utilisateur authentifié (JWT) → { user: id }
 *  - sinon, identifiant de panier invité (en-tête X-Cart-Id) → { sessionId }
 *
 * req.cartOwner vaut null si aucun des deux n'est disponible.
 */
export const attachCartOwner = (req, _res, next) => {
  optionalAuth(req, _res, (err) => {
    if (err) return next(err);

    if (req.user) {
      req.cartOwner = { user: req.user.id };
      return next();
    }

    const cartId = req.headers['x-cart-id'];
    if (cartId) {
      const value = String(cartId).trim();
      if (!CART_ID_PATTERN.test(value)) {
        return next(new ApiError(400, "Identifiant de panier invité invalide (en-tête X-Cart-Id)"));
      }
      req.cartOwner = { sessionId: value };
    } else {
      req.cartOwner = null;
    }
    next();
  });
};

/**
 * Exige la présence d'un propriétaire de panier pour les mutations.
 */
export const requireCartOwner = (req, _res, next) => {
  if (!req.cartOwner) {
    return next(new ApiError(400, "Aucun panier identifié : connectez-vous ou fournissez l'en-tête X-Cart-Id"));
  }
  next();
};
