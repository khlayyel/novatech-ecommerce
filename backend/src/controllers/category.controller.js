import Category from '../models/Category.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { logAdminAction } from '../services/audit.service.js';
import { deleteMediaByUrls } from '../services/media.service.js';

const normalizeName = (value) => String(value ?? '').trim();

const normalizeSubcategories = (input) => {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) {
    throw new ApiError(400, 'Les sous-catégories doivent être une liste');
  }

  const seen = new Set();
  const result = [];
  for (const raw of input) {
    const value = normalizeName(raw);
    if (!value) continue;
    if (value.length > 60) {
      throw new ApiError(400, 'Une sous-catégorie ne peut pas dépasser 60 caractères');
    }
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  if (result.length > 30) {
    throw new ApiError(400, '30 sous-catégories maximum par famille');
  }
  return result;
};

const normalizeImageMap = (input) => {
  if (input === undefined) return undefined;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Images de sous-familles invalides');
  }

  const result = {};
  for (const [key, value] of Object.entries(input)) {
    const name = normalizeName(key);
    const url = normalizeName(value);
    if (name && url) result[name] = url;
  }
  return result;
};

const pruneImageMap = (map, subcategories) => {
  if (!map) return {};
  const allowed = new Set(subcategories.map((name) => name.toLowerCase()));
  return Object.fromEntries(
    Object.entries(map).filter(([key]) => allowed.has(key.toLowerCase()))
  );
};

/**
 * GET /api/categories — arbre des familles et sous-familles (public).
 */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

/** GET /api/admin/categories/:id — détail d'une famille (préremplissage du formulaire). */
export const getCategoryById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Identifiant de catégorie invalide');
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Catégorie introuvable');
  }

  res.json(category);
});

/** POST /api/admin/categories */
export const createCategory = asyncHandler(async (req, res) => {
  const name = normalizeName(req.body.name);
  if (name.length < 2) {
    throw new ApiError(400, 'Le nom de la catégorie est requis (2 caractères minimum)');
  }

  const subcategories = normalizeSubcategories(req.body.subcategories) ?? [];
  const images = normalizeImageMap(req.body.subcategoryImages) ?? {};

  const category = await Category.create({
    group: normalizeName(req.body.group),
    name,
    description: normalizeName(req.body.description),
    subcategories,
    imageUrl: normalizeName(req.body.imageUrl),
    subcategoryImages: pruneImageMap(images, subcategories)
  });

  await logAdminAction(req, 'category.create', category.name);

  res.status(201).json(category);
});

/**
 * PUT /api/admin/categories/:id
 * Renommer une famille met à jour les produits qui la référencent.
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Catégorie introuvable');
  }

  const previousName = category.name;
  const name = req.body.name !== undefined ? normalizeName(req.body.name) : previousName;
  if (name.length < 2) {
    throw new ApiError(400, 'Le nom de la catégorie est requis (2 caractères minimum)');
  }

  category.name = name;
  if (req.body.group !== undefined) {
    category.group = normalizeName(req.body.group);
  }
  if (req.body.description !== undefined) {
    category.description = normalizeName(req.body.description);
  }
  const subcategories = normalizeSubcategories(req.body.subcategories);
  if (subcategories !== undefined) {
    category.subcategories = subcategories;
  }
  if (req.body.imageUrl !== undefined) {
    category.imageUrl = normalizeName(req.body.imageUrl);
  }
  const incomingImages = normalizeImageMap(req.body.subcategoryImages);
  if (incomingImages !== undefined) {
    category.subcategoryImages = pruneImageMap(
      incomingImages,
      subcategories ?? category.subcategories
    );
  }
  await category.save();

  if (name !== previousName) {
    await Product.updateMany({ category: previousName }, { $set: { category: name } });
  }

  await logAdminAction(req, 'category.update', name, { previousName });

  res.json(category);
});

/**
 * DELETE /api/admin/categories/:id
 * Refusé si des produits utilisent encore la famille.
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Catégorie introuvable');
  }

  const used = await Product.countDocuments({ category: category.name });
  if (used > 0) {
    throw new ApiError(409, `Catégorie utilisée par ${used} produit(s) : réaffectez-les avant de la supprimer.`);
  }

  await category.deleteOne();
  await logAdminAction(req, 'category.delete', category.name);

  const subImages = category.subcategoryImages ? [...category.subcategoryImages.values()] : [];
  await deleteMediaByUrls([category.imageUrl, ...subImages]);

  res.json({ deleted: true, id: category._id });
});
