import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Exports CSV réservés à l'administration.
 * Séparateur « ; » et BOM UTF-8 pour une ouverture directe dans Excel FR.
 */

const escapeCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  const clean = text.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${clean}"`;
};

const toCsv = (headers, rows) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(';')).join('\r\n');

const sendCsv = (res, filename, headers, rows) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${toCsv(headers, rows)}`);
};

const PAID_STATUSES = ['paid', 'shipped', 'delivered'];

/** GET /api/admin/export/orders.csv */
export const exportOrdersCsv = asyncHandler(async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).populate('user', 'name email');

  const rows = orders.map((order) => [
    order._id.toString(),
    order.createdAt.toISOString(),
    order.user ? order.user.name : 'Invité',
    order.user ? order.user.email : '',
    order.status,
    order.totalAmount.toFixed(2),
    order.items.reduce((sum, item) => sum + item.quantity, 0),
    order.stripePaymentIntentId || ''
  ]);

  sendCsv(
    res,
    'novatech-commandes.csv',
    ['Commande', 'Date', 'Client', 'Email', 'Statut', 'Montant (EUR)', 'Articles', 'Paiement Stripe'],
    rows
  );
});

/** GET /api/admin/export/products.csv */
export const exportProductsCsv = asyncHandler(async (_req, res) => {
  const products = await Product.find().sort({ category: 1, name: 1 });

  const rows = products.map((product) => [
    product._id.toString(),
    product.name,
    product.category,
    product.subcategory || '',
    product.price.toFixed(2),
    product.stock,
    (product.price * product.stock).toFixed(2),
    product.imageUrl || ''
  ]);

  sendCsv(
    res,
    'novatech-produits.csv',
    ['Référence', 'Nom', 'Famille', 'Sous-famille', 'Prix (EUR)', 'Stock', 'Valeur du stock', 'Image'],
    rows
  );
});

/** GET /api/admin/export/users.csv */
export const exportUsersCsv = asyncHandler(async (_req, res) => {
  const [users, spendAgg] = await Promise.all([
    User.find().sort({ createdAt: -1 }).select('name email role createdAt'),
    Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, user: { $ne: null } } },
      { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$totalAmount' } } }
    ])
  ]);

  const stats = new Map(spendAgg.map((entry) => [String(entry._id), entry]));

  const rows = users.map((user) => {
    const stat = stats.get(String(user._id));
    return [
      user.name,
      user.email,
      user.role,
      stat?.orders || 0,
      (stat?.spent || 0).toFixed(2),
      user.createdAt.toISOString()
    ];
  });

  sendCsv(
    res,
    'novatech-clients.csv',
    ['Nom', 'Email', 'Rôle', 'Commandes', 'Total dépensé (EUR)', 'Inscription'],
    rows
  );
});
