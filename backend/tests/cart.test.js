import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { createProduct, guestCartId, registerUser } from './helpers.js';

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('Panier invité (X-Cart-Id)', () => {
  it('retourne un panier vide par défaut', async () => {
    const res = await request(app).get('/api/cart').set('X-Cart-Id', guestCartId());

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('ajoute un article puis incrémente la quantité si réajouté', async () => {
    const product = await createProduct();
    const cartId = guestCartId();

    const first = await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 1 });

    expect(first.statusCode).toBe(200);
    expect(first.body.items).toHaveLength(1);
    expect(first.body.items[0].quantity).toBe(1);
    expect(first.body.items[0].product.name).toBe('Produit Test');

    const second = await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 2 });

    expect(second.statusCode).toBe(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].quantity).toBe(3);
  });

  it('retourne 404 pour un produit inexistant', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', guestCartId())
      .send({ productId: '64b0000000000000000000ff', quantity: 1 });

    expect(res.statusCode).toBe(404);
  });

  it('retourne 409 si la quantité dépasse le stock', async () => {
    const product = await createProduct({ stock: 2 });
    const res = await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', guestCartId())
      .send({ productId: product._id.toString(), quantity: 5 });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/Stock insuffisant/);
  });

  it('met à jour la quantité d\'un article (PUT)', async () => {
    const product = await createProduct({ stock: 10 });
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 1 });

    const res = await request(app)
      .put(`/api/cart/items/${product._id}`)
      .set('X-Cart-Id', cartId)
      .send({ quantity: 4 });

    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].quantity).toBe(4);
  });

  it('refuse une quantité invalide (PUT)', async () => {
    const product = await createProduct();
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 1 });

    const res = await request(app)
      .put(`/api/cart/items/${product._id}`)
      .set('X-Cart-Id', cartId)
      .send({ quantity: 0 });

    expect(res.statusCode).toBe(400);
  });

  it('supprime un article du panier (DELETE)', async () => {
    const product = await createProduct();
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 1 });

    const res = await request(app)
      .delete(`/api/cart/items/${product._id}`)
      .set('X-Cart-Id', cartId);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('retourne 404 si l\'article à supprimer n\'est pas dans le panier', async () => {
    const product = await createProduct();
    const res = await request(app)
      .delete(`/api/cart/items/${product._id}`)
      .set('X-Cart-Id', guestCartId());

    expect(res.statusCode).toBe(404);
  });

  it('vide le panier (DELETE /api/cart)', async () => {
    const product = await createProduct();
    const cartId = guestCartId();

    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 3 });

    const res = await request(app).delete('/api/cart').set('X-Cart-Id', cartId);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('retourne 400 pour un X-Cart-Id mal formé', async () => {
    const res = await request(app).get('/api/cart').set('X-Cart-Id', '!!');

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/X-Cart-Id/);
  });
});

describe('Panier utilisateur authentifié (JWT)', () => {
  it('lie le panier au compte via le jeton JWT', async () => {
    const product = await createProduct();
    const registered = await registerUser(app);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${registered.body.token}`)
      .send({ productId: product._id.toString(), quantity: 2 });

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.user._id ?? res.body.user).toBeTruthy();
  });

  it('isole strictement les paniers de deux utilisateurs', async () => {
    const product = await createProduct();
    const alice = await registerUser(app, { name: 'Alice' });
    const bob = await registerUser(app, { name: 'Bob' });

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${alice.body.token}`)
      .send({ productId: product._id.toString(), quantity: 1 });

    const bobCart = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${bob.body.token}`);

    expect(bobCart.statusCode).toBe(200);
    expect(bobCart.body.items).toHaveLength(0);
  });
});
