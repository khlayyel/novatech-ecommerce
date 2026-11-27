import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  getAdminStats,
  getAdminAnalytics,
  listAdminOrders,
  updateOrderStatus,
  listAdminUsers,
  updateUserRole,
  listAuditLogs
} from '../controllers/admin.controller.js';
import {
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/category.controller.js';
import {
  exportOrdersCsv,
  exportProductsCsv,
  exportUsersCsv
} from '../controllers/export.controller.js';

const router = Router();

// Toutes les routes d'administration exigent un jeton valide + le rôle admin.
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/analytics', getAdminAnalytics);

router.get('/orders', listAdminOrders);
router.patch('/orders/:id/status', updateOrderStatus);

router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/users', listAdminUsers);
router.patch('/users/:id/role', updateUserRole);

router.get('/audit', listAuditLogs);

router.get('/export/orders.csv', exportOrdersCsv);
router.get('/export/products.csv', exportProductsCsv);
router.get('/export/users.csv', exportUsersCsv);

export default router;
