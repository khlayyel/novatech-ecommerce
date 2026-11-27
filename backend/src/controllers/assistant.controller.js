import mongoose from 'mongoose';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { runAssistant } from '../services/assistant.service.js';
import { isAssistantConfigured } from '../services/gemini.service.js';

const GUEST_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

const ownerFromRequest = (req) => {
  const userId = req.user?.id ?? null;
  const header = req.headers['x-assistant-guest'];
  const value = header ? String(header).trim() : '';
  const guestId = GUEST_PATTERN.test(value) ? value : null;
  return { userId, guestId };
};

const ownsConversation = (conversation, { userId, guestId }) =>
  Boolean(
    (conversation.user && userId && conversation.user.toString() === String(userId)) ||
      (conversation.guestId && guestId && conversation.guestId === guestId)
  );

const roleFor = async (userId) => {
  if (!userId) return 'customer';
  const user = await User.findById(userId).select('role');
  return user?.role === 'admin' ? 'admin' : 'customer';
};

/**
 * POST /api/assistant/chat { conversationId?, text }
 * Persiste la conversation en base et renvoie la réponse de l'assistant.
 */
export const chat = asyncHandler(async (req, res) => {
  if (!isAssistantConfigured()) {
    throw new ApiError(503, "L'assistant IA n'est pas encore configuré sur ce serveur.");
  }

  const owner = ownerFromRequest(req);
  if (!owner.userId && !owner.guestId) {
    throw new ApiError(400, 'Identifiant de conversation invité requis');
  }

  const { conversationId, text } = req.body ?? {};
  const content = String(text ?? '').trim();

  if (!content) throw new ApiError(400, 'Message requis');
  if (content.length > 2000) throw new ApiError(400, 'Message trop long (2000 caractères maximum)');

  const role = await roleFor(owner.userId);

  let conversation;
  if (conversationId) {
    if (!mongoose.isValidObjectId(conversationId)) {
      throw new ApiError(400, 'Identifiant de conversation invalide');
    }
    conversation = await Conversation.findById(conversationId);
    if (!conversation || !ownsConversation(conversation, owner)) {
      throw new ApiError(404, 'Conversation introuvable');
    }
  } else {
    conversation = new Conversation({
      user: owner.userId,
      guestId: owner.guestId,
      role,
      title: content.slice(0, 80)
    });
  }

  conversation.role = role;

  const history = conversation.messages.slice(-10).map((message) => ({
    role: message.role,
    text: message.text
  }));
  history.push({ role: 'user', text: content });

  const reply = await runAssistant({ role, userId: owner.userId, messages: history });

  conversation.messages.push({ role: 'user', text: content });
  conversation.messages.push({ role: 'model', text: reply });
  if (conversation.messages.length > 200) {
    conversation.messages = conversation.messages.slice(-200);
  }
  if (!conversation.title) conversation.title = content.slice(0, 80);

  await conversation.save();

  res.json({
    conversationId: conversation._id,
    reply,
    role,
    messages: conversation.messages.map((message) => ({
      role: message.role,
      text: message.text,
      createdAt: message.createdAt
    }))
  });
});

/** GET /api/assistant/conversation?id= — restaure la conversation active. */
export const getConversation = asyncHandler(async (req, res) => {
  const owner = ownerFromRequest(req);
  if (!owner.userId && !owner.guestId) {
    return res.json({ conversation: null });
  }

  let conversation;
  if (req.query.id) {
    if (!mongoose.isValidObjectId(req.query.id)) {
      throw new ApiError(400, 'Identifiant de conversation invalide');
    }
    conversation = await Conversation.findById(req.query.id);
    if (conversation && !ownsConversation(conversation, owner)) conversation = null;
  } else {
    const filter = owner.userId ? { user: owner.userId } : { guestId: owner.guestId };
    conversation = await Conversation.findOne(filter).sort({ updatedAt: -1 });
  }

  res.json({
    conversation: conversation
      ? {
          id: conversation._id,
          role: conversation.role,
          title: conversation.title,
          messages: conversation.messages.map((message) => ({
            role: message.role,
            text: message.text,
            createdAt: message.createdAt
          }))
        }
      : null
  });
});

/** POST /api/assistant/conversation — démarre une conversation vierge. */
export const newConversation = asyncHandler(async (req, res) => {
  const owner = ownerFromRequest(req);
  if (!owner.userId && !owner.guestId) {
    throw new ApiError(400, 'Identifiant de conversation invité requis');
  }

  const role = await roleFor(owner.userId);
  const conversation = await Conversation.create({
    user: owner.userId,
    guestId: owner.guestId,
    role,
    title: ''
  });

  res.status(201).json({
    conversation: { id: conversation._id, role, title: '', messages: [] }
  });
});

/** DELETE /api/assistant/conversation/:id — efface une conversation. */
export const deleteConversation = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Identifiant de conversation invalide');
  }

  const owner = ownerFromRequest(req);
  const conversation = await Conversation.findById(req.params.id);

  if (!conversation || !ownsConversation(conversation, owner)) {
    throw new ApiError(404, 'Conversation introuvable');
  }

  await conversation.deleteOne();
  res.json({ deleted: true });
});
