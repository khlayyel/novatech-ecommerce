import mongoose from 'mongoose';

/**
 * Commande créée au moment du paiement.
 * Le montant est TOUJOURS recalculé côté serveur à partir des prix en base :
 * les items stockés sont un instantané (nom, image, prix) au moment de l'achat.
 * `status` : pending → paid (webhook/confirmation) → shipped → delivered.
 */
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: '' },
  priceAtPurchase: {
    type: Number,
    required: true,
    min: [0.01, 'Le prix doit être supérieur à zéro']
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

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Panier invité à l'origine de la commande (pour le nettoyage après paiement).
    sessionId: { type: String, trim: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'La commande doit contenir au moins un article'
      }
    },
    totalAmount: {
      type: Number,
      required: [true, 'Le montant total est requis'],
      min: [0.01, 'Le montant total doit être supérieur à zéro']
    },
    currency: { type: String, default: 'eur' },
    stripePaymentIntentId: { type: String, index: true },
    // Jeton permettant à un visiteur de suivre sa commande sans compte.
    trackingToken: { type: String, index: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'shipped', 'delivered'],
      default: 'pending'
    },
    paidAt: { type: Date }
  },
  { timestamps: true }
);

// Recherche rapide d'une commande depuis le webhook Stripe.
orderSchema.index({ stripePaymentIntentId: 1, status: 1 });

export default mongoose.model('Order', orderSchema);
