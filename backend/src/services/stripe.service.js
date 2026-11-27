import Stripe from 'stripe';
import config from '../config/env.js';
import { ApiError } from '../middleware/error.js';

/**
 * Intégration Stripe (mode TEST).
 * Le client est initialisé paresseusement pour que l'application puisse
 * démarrer (et être testée) même sans clé configurée.
 */
let stripeClient = null;

export function getStripe() {
  if (!stripeClient) {
    if (!config.stripeSecretKey) {
      throw new ApiError(503, 'Stripe non configuré : STRIPE_SECRET_KEY manquante.');
    }
    stripeClient = new Stripe(config.stripeSecretKey);
  }
  return stripeClient;
}

/**
 * Crée une intention de paiement pour un montant en euros.
 * Stripe manipule des centimes : le montant est converti et arrondi.
 */
export async function createPaymentIntent(amountInEuros, metadata = {}) {
  try {
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(amountInEuros * 100),
      currency: config.currency,
      // allow_redirects: 'never' — le paiement se fait intégralement sur la
      // page (Stripe Elements) : les méthodes avec redirection sont exclues,
      // ce qui dispense de fournir un return_url (exigence des versions
      // récentes de l'API Stripe sinon).
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata
    });
    return paymentIntent;
  } catch (err) {
    console.error('[stripe] Échec de création du PaymentIntent :', err.message);
    if (err.type === 'StripeAuthenticationError') {
      throw new ApiError(502, 'Configuration Stripe invalide (clé refusée).');
    }
    throw new ApiError(502, 'Impossible de communiquer avec Stripe, veuillez réessayer.');
  }
}

/**
 * Récupère une intention de paiement depuis Stripe (état réel du paiement).
 */
export async function retrievePaymentIntent(paymentIntentId) {
  try {
    return await getStripe().paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    console.error('[stripe] Échec de récupération du PaymentIntent :', err.message);
    throw new ApiError(502, 'Impossible de vérifier le paiement auprès de Stripe.');
  }
}

/**
 * Vérifie la signature d'un événement webhook (corps brut + en-tête stripe-signature).
 */
export function constructWebhookEvent(rawBody, signature) {
  if (!config.stripeWebhookSecret) {
    throw new ApiError(503, 'Webhook Stripe non configuré : STRIPE_WEBHOOK_SECRET manquante.');
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
}
