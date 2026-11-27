import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';

/**
 * Logique métier des commandes liée au paiement :
 * - passage de pending → paid de façon ATOMIQUE et IDEMPOTENTE
 *   (un webhook rejoué ou une double confirmation ne décrémente pas deux fois le stock)
 * - décrémentation du stock avec garde anti-négatif
 * - nettoyage du panier après paiement
 */

/**
 * Marque une commande comme payée si elle est encore en attente.
 * Retourne la commande mise à jour, ou null si elle était déjà traitée (idempotence).
 */
export async function markOrderPaid(paymentIntentId) {
  const order = await Order.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId, status: 'pending' },
    { $set: { status: 'paid', paidAt: new Date() } },
    { new: true }
  );

  if (!order) return null;

  await decrementStocks(order);
  await clearPurchasedCart(order);

  return order;
}

/**
 * Marque une commande en attente comme échouée (paiement refusé/annulé).
 */
export async function markOrderFailed(paymentIntentId) {
  return Order.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId, status: 'pending' },
    { $set: { status: 'failed' } },
    { new: true }
  );
}

/**
 * Décrémente le stock de chaque article acheté.
 * La condition `stock: { $gte: quantity }` garantit qu'un stock ne devient
 * jamais négatif, même en cas d'achats concurrents. Si la garde échoue
 * (vente simultanée), le stock restant est mis à zéro.
 */
async function decrementStocks(order) {
  for (const item of order.items) {
    const guarded = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );

    if (guarded.matchedCount === 0) {
      console.warn(`[order] Stock insuffisant pour ${item.name} : mise à zéro du stock restant.`);
      await Product.updateOne({ _id: item.product }, { $set: { stock: 0 } });
    }
  }
}

/** Supprime le panier (utilisateur ou invité) une fois la commande payée. */
async function clearPurchasedCart(order) {
  if (order.user) {
    await Cart.findOneAndDelete({ user: order.user });
  } else if (order.sessionId) {
    await Cart.findOneAndDelete({ sessionId: order.sessionId });
  }
}
