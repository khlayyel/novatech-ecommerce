import mongoose from 'mongoose';

/**
 * Produit vendu par la boutique (matériel informatique).
 * Le prix est stocké en euros (Number) et converti en centimes pour Stripe.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom du produit est requis'],
      trim: true,
      maxlength: [120, 'Le nom ne peut pas dépasser 120 caractères']
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      trim: true,
      maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères']
    },
    price: {
      type: Number,
      required: [true, 'Le prix est requis'],
      min: [0.01, 'Le prix doit être supérieur à zéro']
    },
    category: {
      type: String,
      required: [true, 'La catégorie est requise'],
      enum: ['Ordinateurs', 'Écrans', 'Périphériques', 'Composants', 'Réseau', 'Impression']
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Le stock ne peut pas être négatif'],
      validate: {
        validator: Number.isInteger,
        message: 'Le stock doit être un nombre entier'
      }
    },
    imageUrl: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// Index pour le filtrage par catégorie et le tri par nouveauté.
productSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model('Product', productSchema);
