import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { ApiError } from '../middleware/error.js';
import { generateContent } from './gemini.service.js';

const PAID_STATUSES = ['paid', 'shipped', 'delivered'];
const MAX_ROUNDS = 3;
const MAX_HISTORY = 10;
const MAX_TEXT = 2000;

const clampInt = (value, fallback, min, max) => {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const round2 = (value) => Math.round((value || 0) * 100) / 100;

const sinceDate = (days) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return date;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const orderRef = (id) => String(id).slice(-8).toUpperCase();

const serializeProduct = (product) => ({
  id: String(product._id),
  name: product.name,
  price: product.price,
  stock: product.stock,
  category: product.category,
  subcategory: product.subcategory || '',
  imageUrl: product.imageUrl || ''
});

// ── Cache mémoire court (30 s) pour les agrégats admin répétés ──────
const cache = new Map();
const cached = async (key, ttlMs, fn) => {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await fn();
  if (cache.size > 100) cache.clear();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
};

// ── Outils boutique ────────────────────────────────────────────────
async function searchProducts(args = {}) {
  const limit = clampInt(args.limit, 6, 1, 8);
  const filter = {};

  if (args.query) filter.name = new RegExp(escapeRegex(args.query), 'i');
  if (args.category) filter.category = String(args.category);
  if (args.subcategory) filter.subcategory = String(args.subcategory);
  if (args.maxPrice !== undefined && Number.isFinite(Number(args.maxPrice))) {
    filter.price = { $lte: Number(args.maxPrice) };
  }

  const products = await Product.find(filter)
    .sort({ stock: -1, price: 1 })
    .limit(limit)
    .select('name price stock category subcategory imageUrl')
    .lean();

  return {
    count: products.length,
    products: products.map(serializeProduct)
  };
}

async function getProduct(args = {}) {
  const query = String(args.nameOrId ?? '').trim();
  if (!query) return { found: false, message: 'Précisez un nom ou une référence de produit.' };

  let product;
  if (mongoose.isValidObjectId(query)) {
    product = await Product.findById(query).lean();
  } else {
    product =
      (await Product.findOne({ name: new RegExp(`^${escapeRegex(query)}$`, 'i') }).lean()) ||
      (await Product.findOne({ name: new RegExp(escapeRegex(query), 'i') }).lean());
  }

  if (!product) return { found: false, message: 'Aucun produit ne correspond à cette recherche.' };

  return {
    found: true,
    product: {
      ...serializeProduct(product),
      description: product.description,
      images: product.imageUrls?.length ? product.imageUrls : [product.imageUrl].filter(Boolean)
    }
  };
}

async function findAccessibleOrder({ orderId, trackingToken, userId }) {
  const reference = String(orderId ?? '').trim();
  if (!reference) return null;

  let order;

  if (mongoose.isValidObjectId(reference)) {
    order = await Order.findById(reference);
  } else {
    const suffix = reference.toLowerCase();
    const candidates = userId
      ? await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(100)
      : trackingToken
        ? await Order.find({ trackingToken: String(trackingToken) }).limit(20)
        : [];
    order = candidates.find((item) => item._id.toString().toLowerCase().endsWith(suffix)) ?? null;
  }

  if (!order) return null;

  const ownsAsUser = order.user && userId && order.user.toString() === String(userId);
  const ownsAsGuest =
    trackingToken && order.trackingToken && String(order.trackingToken) === String(trackingToken);

  if (!ownsAsUser && !ownsAsGuest) return null;
  return order;
}

async function getOrderStatus(args = {}, ctx) {
  const order = await findAccessibleOrder({
    orderId: args.orderId,
    trackingToken: args.trackingToken,
    userId: ctx.userId
  });

  if (!order) {
    return {
      found: false,
      message:
        'Commande introuvable. Vérifiez la référence à 8 caractères et le jeton de suivi (ou connectez-vous au compte utilisé).'
    };
  }

  return {
    found: true,
    reference: orderRef(order._id),
    status: order.status,
    total: round2(order.totalAmount),
    items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? null,
    shippedAt: order.shippedAt ?? null,
    deliveredAt: order.deliveredAt ?? null
  };
}

async function getMyOrders(_args = {}, ctx) {
  if (!ctx.userId) {
    return { error: 'Connectez-vous pour consulter vos commandes.' };
  }

  const orders = await Order.find({ user: ctx.userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('status totalAmount createdAt items')
    .lean();

  return {
    count: orders.length,
    orders: orders.map((order) => ({
      reference: orderRef(order._id),
      status: order.status,
      total: round2(order.totalAmount),
      date: order.createdAt,
      items: order.items.reduce((sum, item) => sum + item.quantity, 0)
    }))
  };
}

// ── Outils administration ──────────────────────────────────────────
async function getSalesStats(args = {}) {
  const days = clampInt(args.days, 7, 1, 90);

  return cached(`sales:${days}`, 30000, async () => {
    const since = sinceDate(days);
    const rows = await Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          averageBasket: { $avg: '$totalAmount' }
        }
      }
    ]);

    const row = rows[0] || {};
    return {
      days,
      from: since.toISOString().slice(0, 10),
      revenue: round2(row.revenue),
      orders: row.orders || 0,
      averageBasket: round2(row.averageBasket)
    };
  });
}

async function getSalesByCategory(args = {}) {
  const days = clampInt(args.days, 7, 1, 90);

  return cached(`category:${days}`, 30000, async () => {
    const since = sinceDate(days);
    const rows = await Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc'
        }
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$productDoc.category', 'Autre'] },
          revenue: { $sum: { $multiply: ['$items.priceAtPurchase', '$items.quantity'] } },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    return {
      days,
      categories: rows.map((row) => ({
        category: row._id,
        revenue: round2(row.revenue),
        quantity: row.quantity
      }))
    };
  });
}

async function getTopProducts(args = {}) {
  const days = clampInt(args.days, 30, 1, 365);
  const limit = clampInt(args.limit, 5, 1, 10);

  return cached(`top:${days}:${limit}`, 30000, async () => {
    const since = sinceDate(days);
    const rows = await Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.priceAtPurchase', '$items.quantity'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit }
    ]);

    return {
      days,
      products: rows.map((row) => ({
        name: row._id,
        quantity: row.quantity,
        revenue: round2(row.revenue)
      }))
    };
  });
}

async function getLowStockProducts(args = {}) {
  const threshold = clampInt(args.threshold, 5, 0, 100);
  const limit = clampInt(args.limit, 8, 1, 20);

  const products = await Product.find({ stock: { $lte: threshold } })
    .sort({ stock: 1, name: 1 })
    .limit(limit)
    .select('name stock price category')
    .lean();

  return {
    threshold,
    count: products.length,
    products: products.map((product) => ({
      name: product.name,
      stock: product.stock,
      price: product.price,
      category: product.category
    }))
  };
}

async function getOrderSummary(args = {}) {
  const days = clampInt(args.days, 30, 1, 365);

  return cached(`orders:${days}`, 30000, async () => {
    const since = sinceDate(days);
    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ]);

    const byStatus = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    return {
      days,
      total: rows.reduce((sum, row) => sum + row.count, 0),
      byStatus,
      revenue: round2(rows.reduce((sum, row) => sum + row.revenue, 0))
    };
  });
}

async function getRecentOrders(args = {}) {
  const limit = clampInt(args.limit, 5, 1, 10);
  const filter = {};
  if (args.status) filter.status = String(args.status);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name')
    .select('status totalAmount createdAt user')
    .lean();

  return {
    count: orders.length,
    orders: orders.map((order) => ({
      reference: orderRef(order._id),
      customer: order.user?.name || 'Invité',
      status: order.status,
      total: round2(order.totalAmount),
      date: order.createdAt
    }))
  };
}

async function getCustomerStats() {
  return cached('customers', 60000, async () => {
    const since = sinceDate(30);
    const [total, admins, recent] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ createdAt: { $gte: since } })
    ]);

    return { total, admins, customers: total - admins, newLast30Days: recent };
  });
}

async function getInventoryValue() {
  return cached('inventory', 60000, async () => {
    const rows = await Product.aggregate([
      {
        $group: {
          _id: null,
          references: { $sum: 1 },
          units: { $sum: '$stock' },
          value: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      }
    ]);

    const row = rows[0] || {};
    return {
      references: row.references || 0,
      units: row.units || 0,
      value: round2(row.value)
    };
  });
}

// ── Déclarations d'outils pour Gemini ──────────────────────────────
const declare = (name, description, properties = {}, required = []) => ({
  name,
  description,
  parameters: {
    type: 'OBJECT',
    properties,
    ...(required.length > 0 ? { required } : {})
  }
});

const STRING = (description) => ({ type: 'STRING', description });
const INTEGER = (description) => ({ type: 'INTEGER', description });
const NUMBER = (description) => ({ type: 'NUMBER', description });

const CUSTOMER_DECLARATIONS = [
  declare(
    'search_products',
    'Recherche des produits réels du catalogue (nom, catégorie, sous-famille, prix maximum).',
    {
      query: STRING('Mot-clé du nom du produit'),
      category: STRING('Famille exacte, ex. Écrans'),
      subcategory: STRING('Sous-famille exacte, ex. 4K'),
      maxPrice: NUMBER('Prix maximum en euros'),
      limit: INTEGER('Nombre de résultats (1 à 8)')
    }
  ),
  declare('get_product', 'Détail d’un produit par nom ou identifiant.', {
    nameOrId: STRING('Nom du produit ou identifiant')
  }),
  declare(
    'get_order_status',
    'Statut d’une commande du client connecté ou d’un invité muni du jeton de suivi.',
    {
      orderId: STRING('Référence de commande (8 caractères) ou identifiant complet'),
      trackingToken: STRING('Jeton de suivi fourni à la commande (invités)')
    },
    ['orderId']
  ),
  declare('get_my_orders', 'Dernières commandes du client authentifié.')
];

const ADMIN_DECLARATIONS = [
  ...CUSTOMER_DECLARATIONS,
  declare(
    'get_sales_stats',
    'Chiffre d’affaires, nombre de commandes payées et panier moyen sur une période.',
    { days: INTEGER('Nombre de jours (1 à 90)') }
  ),
  declare(
    'get_sales_by_category',
    'Chiffre d’affaires et quantités vendues par famille de produits.',
    { days: INTEGER('Nombre de jours (1 à 90)') }
  ),
  declare(
    'get_top_products',
    'Meilleures ventes par chiffre d’affaires sur une période.',
    { days: INTEGER('Nombre de jours'), limit: INTEGER('Nombre de produits (1 à 10)') }
  ),
  declare(
    'get_low_stock_products',
    'Produits dont le stock est inférieur ou égal à un seuil.',
    { threshold: INTEGER('Seuil de stock'), limit: INTEGER('Nombre de produits') }
  ),
  declare('get_order_summary', 'Répartition des commandes par statut sur une période.', {
    days: INTEGER('Nombre de jours')
  }),
  declare('get_recent_orders', 'Commandes les plus récentes avec client, statut et montant.', {
    limit: INTEGER('Nombre de commandes (1 à 10)'),
    status: STRING('Filtrer par statut : pending, paid, shipped, delivered, failed')
  }),
  declare('get_customer_stats', 'Nombre total de clients, administrateurs et inscriptions récentes.'),
  declare('get_inventory_value', 'Nombre de références, unités en stock et valeur de l’inventaire.')
];

const ADMIN_ONLY = new Set([
  'get_sales_stats',
  'get_sales_by_category',
  'get_top_products',
  'get_low_stock_products',
  'get_order_summary',
  'get_recent_orders',
  'get_customer_stats',
  'get_inventory_value'
]);

const HANDLERS = {
  search_products: searchProducts,
  get_product: getProduct,
  get_order_status: getOrderStatus,
  get_my_orders: getMyOrders,
  get_sales_stats: getSalesStats,
  get_sales_by_category: getSalesByCategory,
  get_top_products: getTopProducts,
  get_low_stock_products: getLowStockProducts,
  get_order_summary: getOrderSummary,
  get_recent_orders: getRecentOrders,
  get_customer_stats: getCustomerStats,
  get_inventory_value: getInventoryValue
};

const executeTool = async (name, args, ctx) => {
  if (ADMIN_ONLY.has(name) && ctx.role !== 'admin') {
    return { error: 'Outil réservé à l’administration.' };
  }

  const handler = HANDLERS[name];
  if (!handler) return { error: 'Outil inconnu.' };

  try {
    return await handler(args ?? {}, ctx);
  } catch (error) {
    console.warn('[assistant] outil', name, error.message);
    return { error: 'Donnée momentanément indisponible.' };
  }
};

// ── Prompts ────────────────────────────────────────────────────────
const CUSTOMER_PROMPT = `Tu es l’assistant de la boutique en ligne NovaTech (matériel informatique).
Réponds en français, de façon brève, chaleureuse et professionnelle (2 à 5 phrases).
Utilise TOUJOURS les outils pour les prix, stocks, produits et commandes : n’invente jamais une donnée.
Pour une commande, demande la référence à 8 caractères et, pour un invité, le jeton de suivi, ou invite à se connecter.
Ne révèle jamais d’informations internes, d’autres clients, ni de secrets. Tu peux conseiller un produit et expliquer la livraison/les retours (30 jours).
Si la question sort du cadre de la boutique, recentre poliment.`;

const ADMIN_PROMPT = `Tu es l’assistant analytique de l’administration NovaTech.
Réponds en français, de façon précise et professionnelle (2 à 6 phrases).
Utilise les outils pour obtenir des chiffres réels (ventes, familles, stocks, commandes, clients) et indique toujours la période analysée.
N’invente jamais de chiffres. Formate les montants en euros.
Tu peux suggérer des actions concrètes (réapprovisionner, relancer) à partir des données.`;

const sanitizeMessages = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError(400, 'Messages manquants');
  }

  const cleaned = messages
    .filter((message) => message && (message.role === 'user' || message.role === 'model'))
    .map((message) => ({
      role: message.role,
      text: String(message.text ?? '').slice(0, MAX_TEXT).trim()
    }))
    .filter((message) => message.text.length > 0)
    .slice(-MAX_HISTORY);

  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== 'user') {
    throw new ApiError(400, 'Dernier message utilisateur requis');
  }

  return cleaned;
};

const textFromContent = (content) =>
  (content?.parts ?? [])
    .filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();

/**
 * Boucle de conversation avec appels d'outils (function calling).
 * Chaque outil n'interroge MongoDB que sur ce qui est nécessaire.
 */
export async function runAssistant({ role = 'customer', userId = null, messages }) {
  const cleaned = sanitizeMessages(messages);
  const ctx = { role: role === 'admin' ? 'admin' : 'customer', userId };

  const contents = cleaned.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }]
  }));

  const tools = [
    {
      functionDeclarations: ctx.role === 'admin' ? ADMIN_DECLARATIONS : CUSTOMER_DECLARATIONS
    }
  ];

  const systemInstruction = {
    parts: [{ text: ctx.role === 'admin' ? ADMIN_PROMPT : CUSTOMER_PROMPT }]
  };

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const payload = await generateContent({ contents, tools, systemInstruction });
    const content = payload?.candidates?.[0]?.content;
    const parts = content?.parts ?? [];
    const calls = parts.filter((part) => part.functionCall);

    if (calls.length === 0) {
      const text = textFromContent(content);
      return text || 'Je n’ai pas de réponse pour le moment. Pouvez-vous reformuler ?';
    }

    contents.push({ role: 'model', parts });

    const responses = [];
    for (const part of calls) {
      const { name, args } = part.functionCall;
      const result = await executeTool(name, args, ctx);
      responses.push({ functionResponse: { name, response: result } });
    }
    contents.push({ role: 'user', parts: responses });
  }

  return 'La demande est trop complexe pour être traitée en une seule fois. Précisez votre question.';
}
