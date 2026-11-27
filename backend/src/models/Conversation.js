import mongoose from 'mongoose';

/** Message d'une conversation avec l'assistant. */
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true, maxlength: 4000 }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false }, _id: true }
);

/**
 * Conversation persistée (utilisateur connecté ou visiteur identifié par
 * un identifiant local). Permet de restaurer l'historique après refresh.
 */
const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    guestId: { type: String, trim: true, default: null },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    messages: { type: [messageSchema], default: [] }
  },
  { timestamps: true }
);

conversationSchema.index({ user: 1, updatedAt: -1 });
conversationSchema.index({ guestId: 1, updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
