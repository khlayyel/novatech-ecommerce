import { Router } from 'express';
import { listCategoryGroups } from '../controllers/category-group.controller.js';

const router = Router();

// Visuels des catégories de niveau 1.
router.get('/', listCategoryGroups);

export default router;
