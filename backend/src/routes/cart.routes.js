import { Router } from 'express';
import { attachCartOwner, requireCartOwner } from '../middleware/cart.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} from '../controllers/cart.controller.js';

const router = Router();

// Résolution du propriétaire du panier (utilisateur JWT ou invité X-Cart-Id).
router.use(attachCartOwner);

router.get('/', getCart);
router.post('/', requireCartOwner, addToCart);
router.put('/items/:productId', requireCartOwner, updateCartItem);
router.delete('/items/:productId', requireCartOwner, removeCartItem);
router.delete('/', requireCartOwner, clearCart);

export default router;
