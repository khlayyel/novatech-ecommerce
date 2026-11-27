import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';

const MAX_LIMIT = 48;

const SORTS = {
  recent: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 }
};

/**
 * GET /api/products
 * Liste paginée du catalogue avec filtres : ?category= &search= &sort= &page= &limit=
 */
export const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const sortKey = Object.keys(SORTS).includes(req.query.sort) ? req.query.sort : 'recent';

  const filter = {};
  if (req.query.category) {
    filter.category = String(req.query.category);
  }
  if (req.query.search) {
    const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = new RegExp(escaped, 'i');
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sortKey]).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter)
  ]);

  res.json({
    products,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit))
  });
});

/**
 * GET /api/products/:id — détail d'un produit.
 */
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Identifiant de produit invalide');
  }

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Produit introuvable');
  }

  res.json(product);
});

/**
 * GET /api/products/categories — catégories disponibles pour les filtres.
 */
export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await Product.distinct('category');
  res.json({ categories: categories.sort() });
});
