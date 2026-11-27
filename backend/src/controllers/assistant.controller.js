import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { runAssistant } from '../services/assistant.service.js';
import { isAssistantConfigured } from '../services/gemini.service.js';

/**
 * POST /api/assistant/chat { messages: [{ role, text }] }
 * Assistant boutique pour tous ; outils analytiques réservés aux admins.
 */
export const chat = asyncHandler(async (req, res) => {
  if (!isAssistantConfigured()) {
    throw new ApiError(503, "L'assistant IA n'est pas encore configuré sur ce serveur.");
  }

  const { messages } = req.body ?? {};
  if (!Array.isArray(messages)) {
    throw new ApiError(400, 'Messages invalides');
  }

  let role = 'customer';
  if (req.user?.id) {
    const user = await User.findById(req.user.id).select('role');
    if (user?.role === 'admin') role = 'admin';
  }

  const reply = await runAssistant({
    role,
    userId: req.user?.id ?? null,
    messages
  });

  res.json({ reply, mode: role });
});
