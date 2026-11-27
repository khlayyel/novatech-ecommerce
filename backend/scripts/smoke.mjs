/**
 * SMOKE TEST — Test de bout en bout de l'application démarrée.
 *
 * Prérequis :
 *   1. backend/.env configuré (MongoDB réel + clés Stripe MODE TEST)
 *   2. Catalogue initialisé : npm run seed
 *   3. API démarrée : npm run dev (ou npm start)
 *
 * Usage : npm run smoke   (dans backend/)
 * URL de l'API surchargée : SMOKE_API_URL=https://... npm run smoke
 *
 * Le script déroule le parcours complet attendu par l'examen :
 *   santé → catalogue → authentification → panier (CRUD complet) →
 *   checkout → PAIEMENT RÉEL avec carte de test Stripe → confirmation →
 *   décrément du stock → panier vidé → WEBHOOK SIGNÉ (vraie vérification
 *   HMAC) → idempotence → suivi de commande.
 *
 * ⚠️ Le script écrit dans la base cible (commandes, stock, utilisateur de test) :
 *    à utiliser sur une base de développement/démonstration uniquement.
 */
import crypto from 'node:crypto';
import 'dotenv/config';
import Stripe from 'stripe';

const BASE = (process.env.SMOKE_API_URL || `http://127.0.0.1:${process.env.PORT || 5000}`).replace(/\/$/, '');
const MASK = (value) => (typeof value === 'string' && value.length > 24 ? `${value.slice(0, 24)}…` : value);

const results = [];

async function call(label, method, path, { body, headers = {}, expect = [200], json = true } = {}) {
  const started = Date.now();
  let status = 0;
  let payload = null;
  let error = null;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    status = res.status;
    const text = await res.text();
    try {
      payload = json ? JSON.parse(text) : text;
    } catch {
      payload = text;
    }
  } catch (err) {
    error = err.message;
  }

  const ok = !error && expect.includes(status);
  results.push({ label, method, path, expected: expect.join('|'), status: error ? 'ERR' : status, ok });

  if (!ok) {
    console.log(`   ✗ ${label} — attendu ${expect.join('|')}, reçu ${error || status}`);
    if (payload?.message) console.log(`     message : ${payload.message}`);
    if (payload?.details) console.log(`     détails : ${JSON.stringify(payload.details)}`);
  }
  return { ok, status, body: payload, ms: Date.now() - started };
}

function check(label, condition, detail = '') {
  results.push({ label, method: 'CHECK', path: detail, expected: 'vrai', status: condition ? 'vrai' : 'faux', ok: condition });
  return condition;
}

async function rawPost(path, rawBody, headers) {
  return fetch(`${BASE}${path}`, { method: 'POST', headers, body: rawBody });
}

/** Fabrique un événement webhook avec une VRAIE signature Stripe (HMAC SHA-256). */
function signedWebhookHeaders(payloadString, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadString}`, 'utf8')
    .digest('hex');
  return {
    'Content-Type': 'application/json',
    'stripe-signature': `t=${timestamp},v1=${signature}`
  };
}

const summary = () => {
  console.log('\n──────────────────────────── RÉSULTATS DU SMOKE TEST ────────────────────────────');
  const width = [6, 58, 7, 10, 6];
  console.log(
    `${'#'.padEnd(width[0])} ${'Test'.padEnd(width[1])} ${'Méthode'.padEnd(width[2])} ${'Attendu'.padEnd(width[3])} ${'Reçu'.padEnd(width[4])} OK`
  );
  results.forEach((r, i) => {
    console.log(
      `${String(i + 1).padEnd(width[0])} ${r.label.slice(0, 56).padEnd(width[1])} ${r.method.padEnd(width[2])} ${String(r.expected).padEnd(width[3])} ${String(r.status).padEnd(width[4])} ${r.ok ? '✓' : '✗'}`
    );
  });

  const failed = results.filter((r) => !r.ok);
  console.log('─────────────────────────────────────────────────────────────────────────────────');
  console.log(`Total : ${results.length} vérifications — ${results.length - failed.length} réussies, ${failed.length} échouées`);
  console.log(failed.length === 0 ? '✅ SMOKE TEST : SUCCÈS COMPLET' : `❌ SMOKE TEST : ${failed.length} ÉCHEC(S)`);
  process.exit(failed.length === 0 ? 0 : 1);
};

const run = async () => {
  console.log(`Smoke test de l'API : ${BASE}`);
  console.log(`Environnement Stripe : ${process.env.STRIPE_SECRET_KEY ? 'clé configurée' : '❌ STRIPE_SECRET_KEY absente'}\n`);

  const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;
  const cartId = `smoke-${crypto.randomUUID()}`;
  const email = `smoke-${Date.now()}@novatech.test`;

  // ── 1. Sonde de santé ────────────────────────────────────────────────
  const health = await call('Sonde de santé', 'GET', '/api/health', { expect: [200] });
  if (!health.ok || health.body.database !== 'connected') {
    check('Base de données connectée', false, 'health.database != connected');
    return summary();
  }
  check('Base de données connectée', true);

  // ── 2. Catalogue ─────────────────────────────────────────────────────
  const catalog = await call('Liste des produits', 'GET', '/api/products?limit=48', { expect: [200] });
  if (!catalog.ok || !catalog.body.products?.length) {
    check('Catalogue initialisé (lancez npm run seed)', false);
    return summary();
  }
  const products = catalog.body.products;
  check(`Catalogue non vide (${products.length} produits)`, products.length >= 10);

  const target = products.find((p) => p.stock >= 3) || products[0];
  await call('Détail produit', 'GET', `/api/products/${target._id}`, { expect: [200] });
  await call('Détail produit — id invalide', 'GET', '/api/products/xyz', { expect: [400] });
  await call('Détail produit — id inconnu', 'GET', '/api/products/64b0000000000000000000ff', { expect: [404] });

  const categories = await call('Liste des catégories', 'GET', '/api/products/categories', { expect: [200] });
  check('Catégories retournées', Array.isArray(categories.body.categories) && categories.body.categories.length > 0);

  await call('Filtre par catégorie', 'GET', `/api/products?category=${encodeURIComponent(target.category)}`, { expect: [200] });
  await call('Recherche par nom', 'GET', `/api/products?search=${encodeURIComponent(target.name.split(' ')[0])}`, { expect: [200] });

  // ── 3. Authentification (bonus JWT) ──────────────────────────────────
  const register = await call('Inscription utilisateur', 'POST', '/api/auth/register', {
    body: { name: 'Smoke Test', email, password: 'Password123!' },
    headers: { 'X-Cart-Id': cartId },
    expect: [201]
  });
  const token = register.body?.token;
  check('Jeton JWT reçu à l\'inscription', Boolean(token));
  const authHeaders = { Authorization: `Bearer ${token}` };

  const login = await call('Connexion utilisateur', 'POST', '/api/auth/login', {
    body: { email, password: 'Password123!' },
    expect: [200]
  });
  check('Jeton JWT reçu à la connexion', Boolean(login.body?.token));

  await call('Profil /me', 'GET', '/api/auth/me', { headers: authHeaders, expect: [200] });
  await call('Profil /me sans jeton (401)', 'GET', '/api/auth/me', { expect: [401] });
  await call('Connexion avec mauvais mot de passe', 'POST', '/api/auth/login', {
    body: { email, password: 'FauxMotDePasse99' },
    expect: [401]
  });

  // ── 4. Panier : CRUD complet ─────────────────────────────────────────
  const cartHeaders = { 'X-Cart-Id': cartId };
  const emptyCart = await call('Panier vide au départ', 'GET', '/api/cart', { headers: cartHeaders, expect: [200] });
  check('Panier vide', emptyCart.body?.items?.length === 0);

  await call('Ajout au panier (invité)', 'POST', '/api/cart', {
    body: { productId: target._id, quantity: 2 },
    headers: cartHeaders,
    expect: [200]
  });

  const second = products.find((p) => p._id !== target._id && p.stock >= 1);
  await call('Ajout d\'un 2e article', 'POST', '/api/cart', {
    body: { productId: second._id, quantity: 1 },
    headers: cartHeaders,
    expect: [200]
  });

  const updated = await call('Modification de quantité (PUT)', 'PUT', `/api/cart/items/${second._id}`, {
    body: { quantity: 3 },
    headers: cartHeaders,
    expect: [200]
  });
  check('Quantité mise à jour à 3', updated.body?.items?.some((i) => i.quantity === 3));

  await call('Quantité invalide rejetée (PUT)', 'PUT', `/api/cart/items/${second._id}`, {
    body: { quantity: 0 },
    headers: cartHeaders,
    expect: [400]
  });

  await call('Suppression d\'un article (DELETE)', 'DELETE', `/api/cart/items/${second._id}`, {
    headers: cartHeaders,
    expect: [200]
  });

  await call('Dépassement de stock refusé (409)', 'POST', '/api/cart', {
    body: { productId: target._id, quantity: Math.min(99, target.stock + 5) },
    headers: cartHeaders,
    expect: [409]
  });

  const finalCart = await call('Panier final avant paiement', 'GET', '/api/cart', {
    headers: cartHeaders,
    expect: [200]
  });
  const cartItems = finalCart.body?.items || [];
  check('Panier contient l\'article cible', cartItems.some((i) => i.product?._id === target._id));

  // Montant attendu recalculé à partir des prix affichés (source : l'API).
  const expectedTotal =
    Math.round(cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0) * 100) / 100;
  const stockBefore = target.stock;

  // ── 5. Checkout + paiement RÉEL (carte de test Stripe) ────────────────
  const checkout = await call('Checkout (PaymentIntent + commande pending)', 'POST', '/api/orders/checkout', {
    headers: cartHeaders,
    body: {},
    expect: [201]
  });
  const { orderId, clientSecret, totalAmount, trackingToken } = checkout.body || {};
  check('Client secret Stripe reçu', Boolean(clientSecret), MASK(clientSecret));
  check('Montant recalculé côté serveur', totalAmount === expectedTotal, `attendu ${expectedTotal}, reçu ${totalAmount}`);
  check('Jeton de suivi reçu', Boolean(trackingToken));

  if (!stripe || !orderId) {
    console.log('\n⚠️  Impossible de poursuivre le paiement sans clé Stripe ou orderId.');
    return summary();
  }

  const paymentIntentId = clientSecret.split('_secret')[0];
  const confirmCard = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: 'pm_card_visa'
  });
  check('Paiement réel confirmé avec carte de test (pm_card_visa)', confirmCard.status === 'succeeded', confirmCard.status);

  const confirm = await call('Confirmation de commande (revérifiée côté Stripe)', 'POST', `/api/orders/${orderId}/confirm`, {
    headers: { 'X-Order-Token': trackingToken },
    body: {},
    expect: [200]
  });
  check('Commande marquée payée', confirm.body?.order?.status === 'paid');

  const after = await call('Stock décrémenté après paiement', 'GET', `/api/products/${target._id}`, { expect: [200] });
  const boughtQty = cartItems.find((i) => i.product?._id === target._id)?.quantity || 0;
  check(
    `Stock passé de ${stockBefore} à ${stockBefore - boughtQty}`,
    after.body?.stock === stockBefore - boughtQty,
    `reçu ${after.body?.stock}`
  );

  const clearedCart = await call('Panier vidé après paiement', 'GET', '/api/cart', {
    headers: cartHeaders,
    expect: [200]
  });
  check('Panier vide après paiement', clearedCart.body?.items?.length === 0);

  // ── 6. Webhook signé (vérification HMAC réelle) + idempotence ─────────
  const cartId2 = `smoke-${crypto.randomUUID()}`;
  const target2 = products.find((p) => p._id !== target._id && p.stock >= 1) || products[0];
  await call('Ajout au panier (2e commande)', 'POST', '/api/cart', {
    body: { productId: target2._id, quantity: 1 },
    headers: { 'X-Cart-Id': cartId2 },
    expect: [200]
  });

  const checkout2 = await call('2e checkout pour le test webhook', 'POST', '/api/orders/checkout', {
    headers: { 'X-Cart-Id': cartId2 },
    body: {},
    expect: [201]
  });
  const pi2 = (checkout2.body?.clientSecret || '').split('_secret')[0];
  const stock2Before = target2.stock;

  if (process.env.STRIPE_WEBHOOK_SECRET && pi2) {
    // Événement synthétique complet : signature HMAC réelle + champs Stripe.
    const payloadString = JSON.stringify({
      id: pi2,
      object: 'payment_intent',
      type: 'payment_intent.succeeded',
      data: { object: { id: pi2 } }
    });

    const webhookRes = await rawPost(
      '/api/orders/webhook',
      payloadString,
      signedWebhookHeaders(payloadString, process.env.STRIPE_WEBHOOK_SECRET)
    );
    check('Webhook signé accepté (200)', webhookRes.status === 200, String(webhookRes.status));

    const order2Res = await fetch(`${BASE}/api/orders/${checkout2.body.orderId}`, {
      headers: { 'X-Order-Token': checkout2.body.trackingToken }
    });
    const order2 = await order2Res.json();
    check('2e commande marquée payée par le webhook', order2.status === 'paid', order2.status);

    const product2After = await (await fetch(`${BASE}/api/products/${target2._id}`)).json();
    check(`Stock 2e article décrémenté (${stock2Before} → ${stock2Before - 1})`, product2After.stock === stock2Before - 1, String(product2After.stock));

    // Rejeu du même événement : idempotence.
    const replayRes = await rawPost(
      '/api/orders/webhook',
      payloadString,
      signedWebhookHeaders(payloadString, process.env.STRIPE_WEBHOOK_SECRET)
    );
    const product2AfterReplay = await (await fetch(`${BASE}/api/products/${target2._id}`)).json();
    check(
      'Rejeu du webhook idempotent (stock inchangé)',
      replayRes.status === 200 && product2AfterReplay.stock === stock2Before - 1,
      String(product2AfterReplay.stock)
    );

    const badSignature = await rawPost('/api/orders/webhook', payloadString, {
      'Content-Type': 'application/json',
      'stripe-signature': 't=123,v1=signatureinvalide'
    });
    check('Webhook à signature invalide rejeté (400)', badSignature.status === 400, String(badSignature.status));
  } else {
    console.log('\n⚠️  STRIPE_WEBHOOK_SECRET absent : étapes webhook signé ignorées.');
  }

  // ── 7. Commande passée avec le compte connecté + suivi ──────────────
  await call('Ajout au panier (compte connecté)', 'POST', '/api/cart', {
    body: { productId: target._id, quantity: 1 },
    headers: authHeaders,
    expect: [200]
  });

  await call('Checkout en tant qu\'utilisateur connecté', 'POST', '/api/orders/checkout', {
    headers: authHeaders,
    body: {},
    expect: [201]
  });

  const mine = await call('Historique /orders/mine (auth)', 'GET', '/api/orders/mine', {
    headers: authHeaders,
    expect: [200]
  });
  check('L\'historique contient les commandes de test', Array.isArray(mine.body) && mine.body.length >= 1);

  const noAccess = await fetch(`${BASE}/api/orders/${orderId}`);
  check('Commande inaccessible sans jeton ni compte (404)', noAccess.status === 404, String(noAccess.status));

  const withToken = await call('Suivi de commande avec jeton invité', 'GET', `/api/orders/${orderId}`, {
    headers: { 'X-Order-Token': trackingToken },
    expect: [200]
  });
  check('Détail de commande lisible', withToken.body?.status === 'paid');

  await call('Commande inexistante (404)', 'GET', '/api/orders/64b0000000000000000000ff', {
    headers: authHeaders,
    expect: [404]
  });

  return summary();
};

run().catch((err) => {
  console.error('Smoke test interrompu :', err.message);
  process.exit(1);
});
