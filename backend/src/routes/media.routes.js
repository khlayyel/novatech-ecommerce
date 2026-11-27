import { Router } from 'express';
import { getMedia } from '../controllers/media.controller.js';

const router = Router();

// Images publiques (produits, familles) — identifiant opaque, cache long.
router.get('/:id', getMedia);

export default router;
