import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';

/**
 * Administration (rôle `admin`) : tableau de bord, gestion des commandes
 * et des produits. Toutes les routes sont protégées par `requireAdmin`.
 */
const PAID_STATUSES = ['paid', 'shipped', 'delivered'];
const FULFILLMENT_STATUSES = ['paid', 'shipped', 'delivered'];
const NEXT_STATUS = { paid: 'shipped', shipped: 'delivered' };
const MAX_LIMIT = 50;
const LOW_STOCK_THRESHOLD = 5;

/**
 * GET /api/admin/stats — indicateurs du tableau de bord.
 */
export const getAdminStats = asyncHandler(async (_req, res) => {
  const [revenueAgg, statusAgg, productCount, lowStockCount, userCount, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Product.countDocuments(),
    Product.countDocuments({ stock: { $lte: LOW_STOCK_THRESHOLD } }),
    User.countDocuments(),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email')
  ]);

  const byStatus = Object.fromEntries(statusAgg.map((entry) => [entry._id, entry.count]));
  const revenue = revenueAgg[0]?.total || 0;
  const totalOrders = statusAgg.reduce((sum, entry) => sum + entry.count, 0);

  res.json({
    revenue: Math.round(revenue * 100) / 100,
    paidOrders: revenueAgg[0]?.count || 0,
    orders: {
      total: totalOrders,
      pending: byStatus.pending || 0,
      paid: byStatus.paid || 0,
      failed: byStatus.failed || 0,
      shipped: byStatus.shipped || 0,
      delivered: byStatus.delivered || 0
    },
    products: { total: productCount, lowStock: lowStockCount },
    users: userCount,
    recentOrders
  });
});

/**
 * GET /api/admin/orders?status=&page=&limit=
 * Toutes les commandes, tous clients confondus.
 */
export const listAdminOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

  const filter = {};
  if (req.query.status) {
    const status = String(req.query.status);
    if (!['pending', 'paid', 'failed', 'shipped', 'delivered'].includes(status)) {
      throw new ApiError(400, 'Statut de commande inconnu');
    }
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email'),
    Order.countDocuments(filter)
  ]);

  res.json({
    orders,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit))
  });
});

/**
 * PATCH /api/admin/orders/:id/status { status: 'shipped' | 'delivered' }
 * Transitions autorisées uniquement : paid → shipped → delivered.
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Identifiant de commande invalide');
  }

  const { status } = req.body;
  if (!FULFILLMENT_STATUSES.includes(status)) {
    throw new ApiError(400, 'Statut invalide : paid, shipped ou delivered attendu');
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Commande introuvable');
  }

  if (order.status === status) {
    return res.json(order);
  }

  if (NEXT_STATUS[order.status] !== status) {
    throw new ApiError(409, `Transition impossible : ${order.status} → ${status}`);
  }

  const now = new Date();
  const update = { status };
  if (status === 'shipped') {
    update.shippedAt = now;
  }
  if (status === 'delivered') {
    update.shippedAt = order.shippedAt || now;
    update.deliveredAt = now;
  }

  const updated = await Order.findByIdAndUpdate(id, update, { new: true });
  res.json(updated);
});
