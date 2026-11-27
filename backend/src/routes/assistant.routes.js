import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { assistantLimiter } from '../middleware/rateLimits.js';
import {
  chat,
  getConversation,
  newConversation,
  deleteConversation
} from '../controllers/assistant.controller.js';

const router = Router();

// Limitation dédiée pour préserver le quota de l'API IA.
router.post('/chat', assistantLimiter, optionalAuth, chat);

router.get('/conversation', optionalAuth, getConversation);
router.post('/conversation', optionalAuth, newConversation);
router.delete('/conversation/:id', optionalAuth, deleteConversation);

export default router;
