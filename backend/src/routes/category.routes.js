import { Router } from 'express';
import { listCategories } from '../controllers/category.controller.js';

const router = Router();

// Arbre public des familles / sous-familles (utilisé par les filtres).
router.get('/', listCategories);

export default router;
