import mongoose from 'mongoose';
import crypto from 'node:crypto';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { createPaymentIntent, retrievePaymentIntent, constructWebhookEvent } from '../services/stripe.service.js';
import { markOrderPaid, markOrderFailed } from '../services/order.service.js';

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Vérifie que la commande appartient à l'utilisateur connecté
 * OU qu'un jeton de suivi valide est fourni (commande invité).
 */
const canAccessOrder = (order, req) => {
  if (order.user && req.user && order.user.toString() === req.user.id) return true;
  const token = req.headers['x-order-token'];
  return Boolean(token && order.trackingToken && String(token) === order.trackingToken);
};

/**
 * POST /api/orders/checkout
 * Crée l'intention de paiement Stripe ET la commande en statut "pending".
 * Sécurité : le montant est recalculé côté serveur à partir des prix en base,
 * le stock est revérifié, aucune donnée de prix envoyée par le client n'est utilisée.
 */
export const checkout = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne(req.cartOwner).populate('items.product');
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Votre panier est vide');
  }

  // Vérification de chaque article (produit existant + stock disponible).
  const insufficient = [];
  const snapshotItems = [];

  for (const item of cart.items) {
    const product = item.product;
    if (!product) {
      throw new ApiError(400, 'Un produit de votre panier n\'existe plus, veuillez le retirer');
    }
    if (item.quantity > product.stock) {
      insufficient.push({ product: product.name, requested: item.quantity, available: product.stock });
      continue;
    }
    snapshotItems.push({
      product: product._id,
      name: product.name,
      imageUrl: product.imageUrl,
      priceAtPurchase: product.price,
      quantity: item.quantity
    });
  }

  if (insufficient.length > 0) {
    throw new ApiError(409, 'Stock insuffisant pour un ou plusieurs articles', { insufficient });
  }

  // Recalcul serveur du montant total (source de vérité : la base de données).
  const totalAmount = round2(snapshotItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0));
  if (totalAmount <= 0) {
    throw new ApiError(400, 'Montant de commande invalide');
  }

  const paymentIntent = await createPaymentIntent(totalAmount);

  const order = new Order({
    user: req.user?.id || null,
    sessionId: req.cartOwner.sessionId || null,
    items: snapshotItems,
    totalAmount,
    stripePaymentIntentId: paymentIntent.id,
    trackingToken: crypto.randomBytes(20).toString('hex'),
    status: 'pending'
  });
  await order.save();

  res.status(201).json({
    orderId: order._id,
    clientSecret: paymentIntent.client_secret,
    totalAmount,
    trackingToken: order.trackingToken
  });
});

/**
 * POST /api/orders/:id/confirm
 * Appelée par le frontend après un paiement réussi côté client :
 * l'état réel est revérifié auprès de Stripe, puis la commande passe
 * en "paid" (idempotent) — complément du webhook pour les environnements
 * où le webhook n'est pas encore configuré (développement local).
 */
export const confirmOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Identifiant de commande invalide');
  }

  const order = await Order.findById(id);
  if (!order || !canAccessOrder(order, req)) {
    throw new ApiError(404, 'Commande introuvable');
  }

  const paymentIntent = await retrievePaymentIntent(order.stripePaymentIntentId);

  if (paymentIntent.status === 'succeeded') {
    const updated = (await markOrderPaid(paymentIntent.id)) || order;
    return res.json({ order: updated });
  }

  if (['requires_payment_method', 'canceled'].includes(paymentIntent.status)) {
    const updated = (await markOrderFailed(paymentIntent.id)) || order;
    return res.json({ order: updated });
  }

  // Paiement encore en cours (requires_confirmation, processing...)
  res.json({ order });
});

/**
 * GET /api/orders/mine — historique des commandes de l'utilisateur connecté.
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
});

/**
 * GET /api/orders/:id — suivi de commande (propriétaire ou jeton de suivi).
 */
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Identifiant de commande invalide');
  }

  const order = await Order.findById(id);
  if (!order || !canAccessOrder(order, req)) {
    throw new ApiError(404, 'Commande introuvable');
  }

  res.json(order);
});

/**
 * POST /api/orders/webhook (corps brut)
 * Reçoit les événements Stripe, vérifie la signature, puis met à jour
 * la commande : payment_intent.succeeded → paid (+ stock −, panier vidé),
 * payment_intent.payment_failed / canceled → failed.
 */
export const stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    const status = err.statusCode || 400;
    console.error('[webhook] Signature Stripe invalide :', err.message);
    return res.status(status).json({ message: `Webhook Error: ${err.message}` });
  }

  const paymentIntentId = event.data?.object?.id;

  switch (event.type) {
    case 'payment_intent.succeeded':
      await markOrderPaid(paymentIntentId);
      break;
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled':
      await markOrderFailed(paymentIntentId);
      break;
    default:
      // Événement ignoré (non lié au paiement d'une commande).
      break;
  }

  res.json({ received: true });
};
