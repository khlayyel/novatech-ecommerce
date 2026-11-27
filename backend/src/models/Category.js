import mongoose from 'mongoose';

/**
 * Famille de produits (niveau 1) avec ses sous-familles (niveau 2).
 * Les produits référencent la catégorie par son nom : renommer une
 * catégorie met à jour le catalogue en cascade (voir admin.controller).
 */
const categorySchema = new mongoose.Schema(
  {
    group: {
      type: String,
      trim: true,
      maxlength: [60, 'La catégorie ne peut pas dépasser 60 caractères'],
      default: ''
    },
    name: {
      type: String,
      required: [true, 'Le nom de la catégorie est requis'],
      unique: true,
      trim: true,
      minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
      maxlength: [60, 'Le nom ne peut pas dépasser 60 caractères']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [240, 'La description ne peut pas dépasser 240 caractères'],
      default: ''
    },
    subcategories: {
      type: [String],
      default: []
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    subcategoryImages: {
      type: Map,
      of: String,
      default: {}
    }
  },
  { timestamps: true }
);

// Tri et filtrage par catégorie puis famille.
categorySchema.index({ group: 1, name: 1 });

export default mongoose.model('Category', categorySchema);
