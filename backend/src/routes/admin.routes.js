import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  getAdminStats,
  listAdminOrders,
  updateOrderStatus
} from '../controllers/admin.controller.js';
import {
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.js';

const router = Router();

// Toutes les routes d'administration exigent un jeton valide + le rôle admin.
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/orders', listAdminOrders);
router.patch('/orders/:id/status', updateOrderStatus);

router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

export default router;
