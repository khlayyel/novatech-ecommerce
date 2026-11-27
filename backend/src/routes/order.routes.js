import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { attachCartOwner, requireCartOwner } from '../middleware/cart.js';
import { checkoutLimiter } from '../middleware/rateLimits.js';
import {
  checkout,
  confirmOrder,
  getMyOrders,
  getOrderById
} from '../controllers/order.controller.js';

const router = Router();

// NB : le webhook Stripe est monté dans app.js AVANT express.json()
// car Stripe exige la lecture du corps brut pour vérifier la signature.

// Créer une commande + intention de paiement (utilisateur OU invité).
router.post('/checkout', checkoutLimiter, attachCartOwner, requireCartOwner, checkout);

// Confirmation côté client après paiement (revérifiée auprès de Stripe).
router.post('/:id/confirm', optionalAuth, confirmOrder);

// Suivi des commandes.
router.get('/mine', requireAuth, getMyOrders);
router.get('/:id', optionalAuth, getOrderById);

export default router;
