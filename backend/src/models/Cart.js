import mongoose from 'mongoose';
import config from '../config/env.js';

/**
 * Panier d'achat.
 * Un panier appartient soit à un utilisateur authentifié (bonus JWT),
 * soit à un visiteur identifié par un `sessionId` envoyé via l'en-tête X-Cart-Id.
 * Le panier expire automatiquement après `cartTtlDays` jours d'inactivité (index TTL).
 */
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Le produit est requis']
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'La quantité minimale est 1'],
    max: [99, 'La quantité maximale est 99'],
    validate: {
      validator: Number.isInteger,
      message: 'La quantité doit être un nombre entier'
    }
  }
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true
    },
    sessionId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    items: [cartItemSchema],
    expiresAt: {
      type: Date,
      required: true,
      // Valeur initiale — la validation Mongoose s'exécute AVANT les hooks pre('save'),
      // c'est donc le default qui garantit la présence, le hook qui la rafraîchit ensuite.
      default: () => new Date(Date.now() + config.cartTtlDays * 24 * 60 * 60 * 1000)
    }
  },
  { timestamps: true }
);

// Expiration automatique des paniers inactifs (TTL MongoDB).
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// À chaque sauvegarde, la durée de vie du panier est prolongée.
cartSchema.pre('save', function setExpiry(next) {
  this.expiresAt = new Date(Date.now() + config.cartTtlDays * 24 * 60 * 60 * 1000);
  next();
});

export default mongoose.model('Cart', cartSchema);
