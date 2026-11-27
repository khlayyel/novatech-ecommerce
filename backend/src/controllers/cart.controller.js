import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';

const EMPTY_CART = { items: [] };

const parseQuantity = (value, fallback = 1) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) return null;
  return parsed;
};

const respondCart = async (res, cart) => {
  if (!cart) return res.json(EMPTY_CART);
  await cart.populate('items.product');
  res.json(cart);
};

/**
 * GET /api/cart — panier de l'utilisateur connecté ou du visiteur (X-Cart-Id).
 */
export const getCart = asyncHandler(async (req, res) => {
  if (!req.cartOwner) return respondCart(res, null);
  const cart = await Cart.findOne(req.cartOwner);
  respondCart(res, cart);
});

/**
 * POST /api/cart { productId, quantity } — ajoute un article (ou incrémente).
 */
export const addToCart = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const quantity = parseQuantity(req.body.quantity);

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Identifiant de produit invalide');
  }
  if (quantity === null) {
    throw new ApiError(400, 'La quantité doit être un entier entre 1 et 99');
  }

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Produit introuvable');

  let cart = await Cart.findOne(req.cartOwner);
  if (!cart) {
    cart = new Cart({ ...req.cartOwner, items: [] });
  }

  const existing = cart.items.find((item) => item.product.toString() === productId);
  const newQuantity = (existing ? existing.quantity : 0) + quantity;

  if (newQuantity > product.stock) {
    throw new ApiError(409, `Stock insuffisant pour "${product.name}" (disponible : ${product.stock})`, {
      product: product.name,
      requested: newQuantity,
      available: product.stock
    });
  }

  if (existing) {
    existing.quantity = newQuantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  respondCart(res, cart);
});

/**
 * PUT /api/cart/items/:productId { quantity } — met à jour la quantité d'un article.
 */
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const quantity = parseQuantity(req.body.quantity, null);

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Identifiant de produit invalide');
  }
  if (quantity === null) {
    throw new ApiError(400, 'La quantité doit être un entier entre 1 et 99');
  }

  const cart = await Cart.findOne(req.cartOwner);
  if (!cart) throw new ApiError(404, 'Panier introuvable');

  const item = cart.items.find((entry) => entry.product.toString() === productId);
  if (!item) throw new ApiError(404, 'Article introuvable dans le panier');

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Produit introuvable');
  if (quantity > product.stock) {
    throw new ApiError(409, `Stock insuffisant pour "${product.name}" (disponible : ${product.stock})`, {
      product: product.name,
      requested: quantity,
      available: product.stock
    });
  }

  item.quantity = quantity;
  await cart.save();
  respondCart(res, cart);
});

/**
 * DELETE /api/cart/items/:productId — retire un article du panier.
 */
export const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Identifiant de produit invalide');
  }

  const cart = await Cart.findOne(req.cartOwner);
  if (!cart) throw new ApiError(404, 'Panier introuvable');

  const hadItem = cart.items.some((entry) => entry.product.toString() === productId);
  if (!hadItem) throw new ApiError(404, 'Article introuvable dans le panier');

  cart.items = cart.items.filter((entry) => entry.product.toString() !== productId);
  await cart.save();
  respondCart(res, cart);
});

/**
 * DELETE /api/cart — vide entièrement le panier.
 */
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne(req.cartOwner);
  if (!cart) return respondCart(res, null);

  cart.items = [];
  await cart.save();
  respondCart(res, cart);
});
