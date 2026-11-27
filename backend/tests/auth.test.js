import request from 'supertest';
import app from '../src/app.js';
import Cart from '../src/models/Cart.js';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { createProduct, guestCartId, registerUser, uniqueEmail } from './helpers.js';

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('POST /api/auth/register', () => {
  it('crée un compte et retourne un jeton + un utilisateur public', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Nouvel Utilisateur', email, password: 'Password123!' });

    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ name: 'Nouvel Utilisateur', email });
    // Le mot de passe ne doit JAMAIS fuiter dans la réponse.
    expect(JSON.stringify(res.body)).not.toContain('Password123!');
  });

  it('refuse un mot de passe trop court', async () => {
    const res = await registerUser(app, { password: 'court' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/8 caractères/);
  });

  it('refuse des champs manquants', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Nom, email et mot de passe sont requis');
  });

  it('refuse un email déjà utilisé (409)', async () => {
    const email = uniqueEmail();
    await registerUser(app, { email });

    const res = await registerUser(app, { email });

    expect(res.statusCode).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('authentifie un utilisateur valide', async () => {
    const email = uniqueEmail();
    await registerUser(app, { email });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(email);
  });

  it('rejette un mauvais mot de passe (401, message générique)', async () => {
    const email = uniqueEmail();
    await registerUser(app, { email });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'MauvaisMotDePasse1!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Identifiants incorrects');
  });

  it('rejette des champs manquants', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.c' });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('retourne le profil avec un jeton valide', async () => {
    const email = uniqueEmail();
    const registered = await registerUser(app, { email });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registered.body.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it('retourne 401 sans jeton', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
  });

  it('retourne 401 avec un jeton falsifié', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer jeton.factice.invalide');

    expect(res.statusCode).toBe(401);
  });
});

describe('Bonus JWT : fusion du panier invité à la connexion', () => {
  it('transfère le panier invité vers le compte créé', async () => {
    const product = await createProduct();
    const cartId = guestCartId();

    // 1. Le visiteur remplit son panier.
    await request(app)
      .post('/api/cart')
      .set('X-Cart-Id', cartId)
      .send({ productId: product._id.toString(), quantity: 2 });

    // 2. Il crée un compte (le même X-Cart-Id est envoyé).
    const registered = await request(app)
      .post('/api/auth/register')
      .set('X-Cart-Id', cartId)
      .send({ name: 'Visiteur', email: uniqueEmail(), password: 'Password123!' });

    expect(registered.statusCode).toBe(201);

    // 3. Le panier connecté contient les articles du panier invité...
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${registered.body.token}`);

    expect(cartRes.statusCode).toBe(200);
    expect(cartRes.body.items).toHaveLength(1);
    expect(cartRes.body.items[0].product._id).toBe(product._id.toString());
    expect(cartRes.body.items[0].quantity).toBe(2);

    // 4. ...et l'ancien panier invité a bien été supprimé.
    const guestCart = await Cart.findOne({ sessionId: cartId });
    expect(guestCart).toBeNull();
  });
});
