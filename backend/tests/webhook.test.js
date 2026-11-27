import { jest } from '@jest/globals';
import request from 'supertest';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { createProduct, guestCartId } from './helpers.js';

/**
 * Tests du webhook Stripe (signature moquée) :
 * - confirmation du paiement → commande paid, stock décrémenté, panier vidé
 * - idempotence : un événement rejoué ne décrémente pas deux fois
 * - paiement refusé → commande failed
 * - signature invalide → 400
 */
const mockConstructEvent = jest.fn();

jest.unstable_mockModule('../src/services/stripe.service.js', () => ({
  createPaymentIntent: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  constructWebhookEvent: mockConstructEvent
}));

const { default: app } = await import('../src/app.js');
const { default: Order } = await import('../src/models/Order.js');
const { default: Product } = await import('../src/models/Product.js');
const { default: Cart } = await import('../src/models/Cart.js');

const postWebhook = (body) =>
  request(app)
    .post('/api/orders/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', 't=1234567890,v1=factice')
    .send(typeof body === 'string' ? body : JSON.stringify(body));

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  mockConstructEvent.mockReset();
});

describe('POST /api/orders/webhook', () => {
  it('confirme le paiement, décrémente le stock et vide le panier', async () => {
    const product = await createProduct({ stock: 10 });
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 2 });

    const order = await Order.create({
      sessionId: cartId,
      items: [{ product: product._id, name: product.name, priceAtPurchase: product.price, quantity: 2 }],
      totalAmount: 200,
      stripePaymentIntentId: 'pi_webhook_ok',
      trackingToken: 'token_webhook',
      status: 'pending'
    });

    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_webhook_ok' } }
    });

    const res = await postWebhook({ id: 'pi_webhook_ok' });

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);

    const paidOrder = await Order.findById(order._id);
    expect(paidOrder.status).toBe('paid');
    expect(paidOrder.paidAt).toBeDefined();

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(8);

    const cart = await Cart.findOne({ sessionId: cartId });
    expect(cart).toBeNull();
  });

  it('reste idempotent si Stripe rejoue le même événement', async () => {
    const product = await createProduct({ stock: 10 });

    await Order.create({
      items: [{ product: product._id, name: product.name, priceAtPurchase: product.price, quantity: 3 }],
      totalAmount: 300,
      stripePaymentIntentId: 'pi_webhook_replay',
      status: 'pending'
    });

    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_webhook_replay' } }
    });

    await postWebhook({ id: 'pi_webhook_replay' });
    const res = await postWebhook({ id: 'pi_webhook_replay' });

    expect(res.statusCode).toBe(200);

    // 10 - 3 = 7 après DEUX passages du webhook (pas 10 - 6).
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(7);
  });

  it('ne décrémente pas le stock si la commande n\'était plus en attente', async () => {
    const product = await createProduct({ stock: 10 });

    await Order.create({
      items: [{ product: product._id, name: product.name, priceAtPurchase: product.price, quantity: 1 }],
      totalAmount: 100,
      stripePaymentIntentId: 'pi_webhook_already',
      status: 'paid',
      paidAt: new Date()
    });

    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_webhook_already' } }
    });

    const res = await postWebhook({ id: 'pi_webhook_already' });

    expect(res.statusCode).toBe(200);
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(10);
  });

  it('marque la commande failed sur payment_intent.payment_failed', async () => {
    const product = await createProduct();

    const order = await Order.create({
      items: [{ product: product._id, name: product.name, priceAtPurchase: product.price, quantity: 1 }],
      totalAmount: 100,
      stripePaymentIntentId: 'pi_webhook_fail',
      status: 'pending'
    });

    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_webhook_fail' } }
    });

    const res = await postWebhook({ id: 'pi_webhook_fail' });

    expect(res.statusCode).toBe(200);
    const failedOrder = await Order.findById(order._id);
    expect(failedOrder.status).toBe('failed');

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(product.stock);
  });

  it('ignore un événement lié à une intention de paiement inconnue', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_inconnu' } }
    });

    const res = await postWebhook({ id: 'pi_inconnu' });

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('rejette une signature invalide avec un 400', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Signature de webhook invalide');
    });

    const res = await postWebhook({ hello: 'world' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Webhook Error/);
  });
});
