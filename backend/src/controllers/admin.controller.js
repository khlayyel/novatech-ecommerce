import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { logAdminAction } from '../services/audit.service.js';

/**
 * Administration (rôle `admin`) : tableau de bord, gestion des commandes
 * et des produits. Toutes les routes sont protégées par `requireAdmin`.
 */
const PAID_STATUSES = ['paid', 'shipped', 'delivered'];
const FULFILLMENT_STATUSES = ['paid', 'shipped', 'delivered'];
const NEXT_STATUS = { paid: 'shipped', shipped: 'delivered' };
const MAX_LIMIT = 200;
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
  await logAdminAction(req, 'order.status', id, { from: order.status, to: status });
  res.json(updated);
});

/**
 * GET /api/admin/analytics?days=14 — séries temporelles, répartition,
 * meilleures ventes et valeur du stock par famille.
 */
export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const fromParam = parseDate(req.query.from);
  const toParam = parseDate(req.query.to);

  let since;
  let until;
  let days;

  if (fromParam && toParam && toParam >= fromParam) {
    since = fromParam;
    until = new Date(toParam);
    until.setUTCHours(23, 59, 59, 999);
    days = Math.floor((until.getTime() - since.getTime()) / 86400000) + 1;
    days = Math.min(90, Math.max(1, days));
  } else {
    days = Math.min(90, Math.max(1, Number.parseInt(req.query.days, 10) || 14));
    until = new Date();
    until.setUTCHours(23, 59, 59, 999);
    since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));
  }

  const paidMatch = {
    status: { $in: PAID_STATUSES },
    createdAt: { $gte: since, $lte: until }
  };

  const [daily, statusAgg, topAgg, categoryAgg, totalsAgg] = await Promise.all([
    Order.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: paidMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.priceAtPurchase', '$items.quantity'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]),
    Product.aggregate([
      {
        $group: {
          _id: '$category',
          products: { $sum: 1 },
          stock: { $sum: '$stock' },
          value: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      },
      { $sort: { value: -1 } }
    ]),
    Order.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          averageBasket: { $avg: '$totalAmount' }
        }
      }
    ])
  ]);

  const dailyMap = new Map(daily.map((entry) => [entry._id, entry]));
  const series = [];
  for (let index = 0; index < days; index += 1) {
    const day = new Date(since.getTime());
    day.setUTCDate(since.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    series.push({
      date: key,
      revenue: Math.round((entry?.revenue || 0) * 100) / 100,
      orders: entry?.orders || 0
    });
  }

  const totals = totalsAgg[0] || {};

  res.json({
    days,
    from: since.toISOString().slice(0, 10),
    to: until.toISOString().slice(0, 10),
    series,
    statusBreakdown: Object.fromEntries(statusAgg.map((entry) => [entry._id, entry.count])),
    topProducts: topAgg.map((entry) => ({
      name: entry._id,
      quantity: entry.quantity,
      revenue: Math.round(entry.revenue * 100) / 100
    })),
    categories: categoryAgg.map((entry) => ({
      category: entry._id,
      products: entry.products,
      stock: entry.stock,
      value: Math.round(entry.value * 100) / 100
    })),
    totals: {
      revenue: Math.round((totals.revenue || 0) * 100) / 100,
      orders: totals.orders || 0,
      averageBasket: Math.round((totals.averageBasket || 0) * 100) / 100
    }
  });
});

/** GET /api/admin/users?search=&role=&page= */
export const listAdminUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

  const filter = {};
  if (req.query.search) {
    const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }];
  }
  if (['customer', 'admin'].includes(req.query.role)) {
    filter.role = req.query.role;
  }

  const [users, total, spendAgg] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('name email role createdAt'),
    User.countDocuments(filter),
    Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, user: { $ne: null } } },
      { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$totalAmount' } } }
    ])
  ]);

  const spendByUser = new Map(spendAgg.map((entry) => [String(entry._id), entry]));

  res.json({
    users: users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      orders: spendByUser.get(String(user._id))?.orders || 0,
      spent: Math.round((spendByUser.get(String(user._id))?.spent || 0) * 100) / 100
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit))
  });
});

/**
 * PATCH /api/admin/users/:id/role { role }
 * Garde-fous : pas d'auto-rétrogradation, toujours au moins un admin.
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Identifiant utilisateur invalide');
  }

  const { role } = req.body;
  if (!['customer', 'admin'].includes(role)) {
    throw new ApiError(400, 'Rôle invalide : customer ou admin attendu');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'Utilisateur introuvable');
  }

  if (user.role === role) {
    return res.json({ id: user._id, name: user.name, email: user.email, role });
  }

  if (role !== 'admin' && String(user._id) === String(req.user.id)) {
    throw new ApiError(409, 'Vous ne pouvez pas retirer votre propre rôle administrateur');
  }

  if (role !== 'admin' && user.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) {
      throw new ApiError(409, 'Au moins un administrateur doit rester actif');
    }
  }

  user.role = role;
  await user.save();
  await logAdminAction(req, 'user.role', user.email, { role });

  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

/** GET /api/admin/audit?page=&limit= — journal des actions d'administration. */
export const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));

  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments()
  ]);

  res.json({
    logs,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit))
  });
});
