import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { createProduct, loginAdmin, registerUser } from './helpers.js';

const { default: Product } = await import('../src/models/Product.js');
const { default: Order } = await import('../src/models/Order.js');
const { default: User } = await import('../src/models/User.js');

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const orderPayload = (overrides = {}) => ({
  items: [
    {
      product: overrides.productId,
      name: 'Produit commandé',
      priceAtPurchase: 100,
      quantity: 1
    }
  ],
  totalAmount: 100,
  status: 'paid',
  ...overrides
});

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('Contrôle d\'accès à l\'administration', () => {
  it('refuse l\'accès sans jeton (401)', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.statusCode).toBe(401);
  });

  it('refuse un client authentifié (403)', async () => {
    const customer = await registerUser(app);
    const res = await request(app).get('/api/admin/stats').set(bearer(customer.body.token));
    expect(res.statusCode).toBe(403);
  });

  it('expose le rôle dans le profil et la connexion', async () => {
    const admin = await loginAdmin(app);
    expect(admin.statusCode).toBe(200);
    expect(admin.body.user.role).toBe('admin');

    const me = await request(app).get('/api/auth/me').set(bearer(admin.body.token));
    expect(me.body.user.role).toBe('admin');
  });

  it('n\'accorde jamais le rôle admin à l\'inscription publique', async () => {
    const res = await registerUser(app, { role: 'admin' });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe('customer');

    const created = await User.findOne({ email: res.body.user.email });
    expect(created.role).toBe('customer');
  });
});

describe('GET /api/admin/stats', () => {
  it('renvoie les indicateurs de la boutique', async () => {
    const product = await createProduct({ stock: 2, price: 100 });
    await Order.create({
      ...orderPayload({ productId: product._id }),
      status: 'paid',
      totalAmount: 240
    });
    await Order.create({
      ...orderPayload({ productId: product._id }),
      status: 'pending',
      totalAmount: 60
    });

    const admin = await loginAdmin(app);
    const res = await request(app).get('/api/admin/stats').set(bearer(admin.body.token));

    expect(res.statusCode).toBe(200);
    expect(res.body.revenue).toBe(240);
    expect(res.body.paidOrders).toBe(1);
    expect(res.body.orders.total).toBe(2);
    expect(res.body.orders.pending).toBe(1);
    expect(res.body.products.total).toBe(1);
    expect(res.body.products.lowStock).toBe(1);
    expect(res.body.recentOrders).toHaveLength(2);
  });
});

describe('CRUD produits (admin)', () => {
  it('crée un produit', async () => {
    const admin = await loginAdmin(app);
    const res = await request(app)
      .post('/api/admin/products')
      .set(bearer(admin.body.token))
      .send({
        name: 'NovaTest 27',
        description: 'Écran de test administrateur.',
        price: 349.9,
        category: 'Écrans',
        stock: 12,
        imageUrl: '/images/products/test.svg'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('NovaTest 27');
    expect(await Product.countDocuments()).toBe(1);
  });

  it('rejette une charge invalide (400)', async () => {
    const admin = await loginAdmin(app);
    const res = await request(app)
      .post('/api/admin/products')
      .set(bearer(admin.body.token))
      .send({ name: 'Sans prix', description: 'Invalide', category: 'Écrans', price: -5 });

    expect(res.statusCode).toBe(400);
  });

  it('refuse la création par un client (403)', async () => {
    const customer = await registerUser(app);
    const res = await request(app)
      .post('/api/admin/products')
      .set(bearer(customer.body.token))
      .send({ name: 'Interdit', description: 'Non autorisé', price: 10, category: 'Écrans' });

    expect(res.statusCode).toBe(403);
    expect(await Product.countDocuments()).toBe(0);
  });

  it('met à jour un produit', async () => {
    const product = await createProduct({ price: 100 });
    const admin = await loginAdmin(app);

    const res = await request(app)
      .put(`/api/admin/products/${product._id}`)
      .set(bearer(admin.body.token))
      .send({ price: 89.5, stock: 3 });

    expect(res.statusCode).toBe(200);
    expect(res.body.price).toBe(89.5);
    expect(res.body.stock).toBe(3);
    expect(res.body.name).toBe(product.name);
  });

  it('renvoie 404 pour un produit inconnu', async () => {
    const admin = await loginAdmin(app);
    const res = await request(app)
      .put(`/api/admin/products/${new mongoose.Types.ObjectId()}`)
      .set(bearer(admin.body.token))
      .send({ price: 10 });

    expect(res.statusCode).toBe(404);
  });

  it('supprime un produit', async () => {
    const product = await createProduct();
    const admin = await loginAdmin(app);

    const res = await request(app)
      .delete(`/api/admin/products/${product._id}`)
      .set(bearer(admin.body.token));

    expect(res.statusCode).toBe(200);
    expect(await Product.countDocuments()).toBe(0);

    const after = await request(app).get(`/api/products/${product._id}`);
    expect(after.statusCode).toBe(404);
  });
});

describe('Gestion des commandes (admin)', () => {
  it('liste toutes les commandes avec le client', async () => {
    const product = await createProduct();
    const customer = await registerUser(app);
    await Order.create({
      ...orderPayload({ productId: product._id }),
      user: customer.body.user.id
    });

    const admin = await loginAdmin(app);
    const res = await request(app).get('/api/admin/orders').set(bearer(admin.body.token));

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.orders[0].user.email).toBe(customer.body.user.email);
  });

  it('filtre par statut', async () => {
    const product = await createProduct();
    await Order.create(orderPayload({ productId: product._id, status: 'paid' }));
    await Order.create(orderPayload({ productId: product._id, status: 'shipped' }));

    const admin = await loginAdmin(app);
    const res = await request(app)
      .get('/api/admin/orders?status=shipped')
      .set(bearer(admin.body.token));

    expect(res.body.total).toBe(1);
    expect(res.body.orders[0].status).toBe('shipped');
  });

  it('fait progresser une commande payée → expédiée → livrée', async () => {
    const product = await createProduct();
    const order = await Order.create(orderPayload({ productId: product._id, status: 'paid' }));
    const admin = await loginAdmin(app);

    const shipped = await request(app)
      .patch(`/api/admin/orders/${order._id}/status`)
      .set(bearer(admin.body.token))
      .send({ status: 'shipped' });

    expect(shipped.statusCode).toBe(200);
    expect(shipped.body.status).toBe('shipped');
    expect(shipped.body.shippedAt).toBeTruthy();

    const delivered = await request(app)
      .patch(`/api/admin/orders/${order._id}/status`)
      .set(bearer(admin.body.token))
      .send({ status: 'delivered' });

    expect(delivered.statusCode).toBe(200);
    expect(delivered.body.status).toBe('delivered');
    expect(delivered.body.deliveredAt).toBeTruthy();
  });

  it('refuse une transition invalide (409)', async () => {
    const product = await createProduct();
    const order = await Order.create(orderPayload({ productId: product._id, status: 'pending' }));
    const admin = await loginAdmin(app);

    const res = await request(app)
      .patch(`/api/admin/orders/${order._id}/status`)
      .set(bearer(admin.body.token))
      .send({ status: 'delivered' });

    expect(res.statusCode).toBe(409);
  });

  it('refuse un statut inconnu (400)', async () => {
    const product = await createProduct();
    const order = await Order.create(orderPayload({ productId: product._id }));
    const admin = await loginAdmin(app);

    const res = await request(app)
      .patch(`/api/admin/orders/${order._id}/status`)
      .set(bearer(admin.body.token))
      .send({ status: 'teleported' });

    expect(res.statusCode).toBe(400);
  });
});
