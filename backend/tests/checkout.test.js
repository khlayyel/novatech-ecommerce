import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { createProduct, guestCartId, registerUser } from './helpers.js';

/**
 * Tests d'intégration du tunnel de commande.
 * Le service Stripe est MOQUÉ (jest.unstable_mockModule) : les tests
 * valident la logique métier sans appeler l'API réelle.
 */
const mockCreatePaymentIntent = jest.fn();
const mockRetrievePaymentIntent = jest.fn();

jest.unstable_mockModule('../src/services/stripe.service.js', () => ({
  createPaymentIntent: mockCreatePaymentIntent,
  retrievePaymentIntent: mockRetrievePaymentIntent,
  constructWebhookEvent: jest.fn()
}));

const { default: app } = await import('../src/app.js');
const { default: Order } = await import('../src/models/Order.js');
const { default: Product } = await import('../src/models/Product.js');

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  mockCreatePaymentIntent.mockReset();
  mockRetrievePaymentIntent.mockReset();
  mockCreatePaymentIntent.mockResolvedValue({ id: 'pi_test_123', client_secret: 'pi_test_123_secret' });
});

describe('POST /api/orders/checkout', () => {
  it('crée une intention de paiement et une commande pending', async () => {
    const product = await createProduct({ price: 100, stock: 10 });
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 2 });

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('X-Cart-Id', cartId)
      // Tentative de falsification : le corps est IGNORÉ, le serveur recalcule.
      .send({ items: [], totalAmount: 0 });

    expect(res.statusCode).toBe(201);
    expect(res.body.clientSecret).toBe('pi_test_123_secret');
    expect(res.body.orderId).toBeDefined();
    expect(res.body.trackingToken).toBeDefined();

    // Le montant est recalculé côté serveur : 100 € x 2 = 200 €.
    expect(res.body.totalAmount).toBe(200);

    const order = await Order.findById(res.body.orderId);
    expect(order.status).toBe('pending');
    expect(order.stripePaymentIntentId).toBe('pi_test_123');
    expect(order.totalAmount).toBe(200);
    expect(order.items[0]).toMatchObject({
      name: 'Produit Test',
      priceAtPurchase: 100,
      quantity: 2
    });
  });

  it('refuse un panier vide', async () => {
    const res = await request(app)
      .post('/api/orders/checkout')
      .set('X-Cart-Id', guestCartId())
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/panier est vide/);
  });

  it('refuse une requête sans panier identifié', async () => {
    const res = await request(app).post('/api/orders/checkout').send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/X-Cart-Id/);
  });

  it('retourne 409 avec le détail si le stock est devenu insuffisant', async () => {
    const product = await createProduct({ stock: 5 });
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 3 });

    // Vente concurrente simulée : le stock baisse après l'ajout au panier.
    await Product.findByIdAndUpdate(product._id, { $set: { stock: 1 } });

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('X-Cart-Id', cartId)
      .send({});

    expect(res.statusCode).toBe(409);
    expect(res.body.details.insufficient[0]).toMatchObject({
      product: 'Produit Test',
      requested: 3,
      available: 1
    });
  });

  it('ne vide pas le panier tant que le paiement n\'est pas confirmé', async () => {
    const product = await createProduct();
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 1 });

    await request(app).post('/api/orders/checkout').set('X-Cart-Id', cartId).send({});

    const cart = await request(app).get('/api/cart').set('X-Cart-Id', cartId);
    expect(cart.body.items).toHaveLength(1);
  });
});

describe('POST /api/orders/:id/confirm', () => {
  it('confirme une commande payée, décrémente le stock et vide le panier', async () => {
    const product = await createProduct({ stock: 10 });
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 3 });

    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('X-Cart-Id', cartId)
      .send({});

    mockRetrievePaymentIntent.mockResolvedValue({ id: 'pi_test_123', status: 'succeeded' });

    const res = await request(app)
      .post(`/api/orders/${checkoutRes.body.orderId}/confirm`)
      .set('X-Order-Token', checkoutRes.body.trackingToken)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.order.status).toBe('paid');
    expect(res.body.order.paidAt).toBeDefined();

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(7);

    const cart = await request(app).get('/api/cart').set('X-Cart-Id', cartId);
    expect(cart.body.items).toHaveLength(0);
  });

  it('est idempotent : une double confirmation ne décrémente pas deux fois', async () => {
    const product = await createProduct({ stock: 10 });
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 2 });

    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('X-Cart-Id', cartId)
      .send({});

    mockRetrievePaymentIntent.mockResolvedValue({ id: 'pi_test_123', status: 'succeeded' });

    const first = await request(app)
      .post(`/api/orders/${checkoutRes.body.orderId}/confirm`)
      .set('X-Order-Token', checkoutRes.body.trackingToken)
      .send({});
    const second = await request(app)
      .post(`/api/orders/${checkoutRes.body.orderId}/confirm`)
      .set('X-Order-Token', checkoutRes.body.trackingToken)
      .send({});

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.body.order.status).toBe('paid');

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(8); // 10 - 2, pas 10 - 4
  });

  it('marque la commande failed si le paiement a été refusé', async () => {
    const product = await createProduct();
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 1 });

    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('X-Cart-Id', cartId)
      .send({});

    mockRetrievePaymentIntent.mockResolvedValue({
      id: 'pi_test_123',
      status: 'requires_payment_method',
      last_payment_error: { message: 'Carte refusée' }
    });

    const res = await request(app)
      .post(`/api/orders/${checkoutRes.body.orderId}/confirm`)
      .set('X-Order-Token', checkoutRes.body.trackingToken)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.order.status).toBe('failed');

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(product.stock); // aucun décrément
  });

  it('retourne 404 sans jeton de suivi pour un visiteur', async () => {
    const product = await createProduct();
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 1 });

    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('X-Cart-Id', cartId)
      .send({});

    const res = await request(app)
      .post(`/api/orders/${checkoutRes.body.orderId}/confirm`)
      .send({});

    expect(res.statusCode).toBe(404);
  });

  it('retourne 404 pour une commande inexistante', async () => {
    const res = await request(app)
      .post(`/api/orders/${new mongoose.Types.ObjectId()}/confirm`)
      .send({});

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/orders/mine et GET /api/orders/:id', () => {
  it('liste uniquement les commandes de l\'utilisateur connecté', async () => {
    const alice = await registerUser(app, { name: 'Alice' });
    const bob = await registerUser(app, { name: 'Bob' });
    const product = await createProduct();

    // Alice commande un article.
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${alice.body.token}`)
      .send({ productId: product._id.toString(), quantity: 1 });
    const aliceCheckout = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${alice.body.token}`)
      .send({});

    // Bob consulte son historique : il ne doit rien voir.
    const bobOrders = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${bob.body.token}`);

    expect(bobOrders.statusCode).toBe(200);
    expect(bobOrders.body).toHaveLength(0);

    const aliceOrders = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${alice.body.token}`);

    expect(aliceOrders.statusCode).toBe(200);
    expect(aliceOrders.body).toHaveLength(1);
    expect(aliceOrders.body[0]._id).toBe(aliceCheckout.body.orderId);

    // Le propriétaire accède au détail, Bob reçoit 404 (aucune fuite d'information).
    const detailOk = await request(app)
      .get(`/api/orders/${aliceCheckout.body.orderId}`)
      .set('Authorization', `Bearer ${alice.body.token}`);
    const detailForbidden = await request(app)
      .get(`/api/orders/${aliceCheckout.body.orderId}`)
      .set('Authorization', `Bearer ${bob.body.token}`);

    expect(detailOk.statusCode).toBe(200);
    expect(detailForbidden.statusCode).toBe(404);
  });

  it('retourne 401 sans authentification pour /mine', async () => {
    const res = await request(app).get('/api/orders/mine');

    expect(res.statusCode).toBe(401);
  });
});
