import { Router } from 'express';
import { attachCartOwner } from '../middleware/cart.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimits.js';
import { register, login, getMe } from '../controllers/auth.controller.js';

const router = Router();

// Protection contre les tentatives de connexion en rafale.
router.use(authLimiter);

// attachCartOwner : permet de fusionner le panier invité au moment de
// l'inscription / de la connexion (bonus JWT).
router.post('/register', attachCartOwner, register);
router.post('/login', attachCartOwner, login);
router.get('/me', requireAuth, getMe);

export default router;
