import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { createCatalog, createProduct } from './helpers.js';

const { default: Category } = await import('../src/models/Category.js');

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('GET /api/health', () => {
  it('répond ok avec la base connectée', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });
});

describe('GET /api/products', () => {
  it('retourne la liste paginée du catalogue', async () => {
    await createCatalog();

    const res = await request(app).get('/api/products');

    expect(res.statusCode).toBe(200);
    expect(res.body.products).toHaveLength(4);
    expect(res.body.total).toBe(4);
    expect(res.body.page).toBe(1);
    expect(res.body.pages).toBe(1);
    expect(res.body.products[0]).toMatchObject({
      name: expect.any(String),
      price: expect.any(Number),
      category: expect.any(String),
      stock: expect.any(Number)
    });
  });

  it('filtre par catégorie', async () => {
    await createCatalog();

    const res = await request(app).get('/api/products?category=Périphériques');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(2);
    res.body.products.forEach((product) => {
      expect(product.category).toBe('Périphériques');
    });
  });

  it('filtre par sous-famille', async () => {
    await createProduct({ name: 'Portable A', category: 'Ordinateurs', subcategory: 'Portables' });
    await createProduct({ name: 'Tour B', category: 'Ordinateurs', subcategory: 'Bureaux' });

    const res = await request(app).get('/api/products?subcategory=Portables');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.products[0].name).toBe('Portable A');
  });

  it('filtre par catégorie de premier niveau (group)', async () => {
    await Category.create({ group: 'Matériel', name: 'Ordinateurs' });
    await Category.create({ group: 'Réseau', name: 'Réseau' });
    await createProduct({ name: 'PC Group', category: 'Ordinateurs' });
    await createProduct({ name: 'Switch Group', category: 'Réseau' });

    const res = await request(app).get('/api/products?group=Matériel');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.products[0].name).toBe('PC Group');
  });

  it('recherche par nom (insensible à la casse)', async () => {
    await createCatalog();

    const res = await request(app).get('/api/products?search=souris');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(2);
    res.body.products.forEach((product) => {
      expect(product.name.toLowerCase()).toContain('souris');
    });
  });

  it('trie par prix croissant', async () => {
    await createCatalog();

    const res = await request(app).get('/api/products?sort=price-asc');

    const prices = res.body.products.map((product) => product.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('pagine correctement', async () => {
    await createCatalog();

    const res = await request(app).get('/api/products?limit=2&page=2');

    expect(res.statusCode).toBe(200);
    expect(res.body.products).toHaveLength(2);
    expect(res.body.page).toBe(2);
    expect(res.body.pages).toBe(2);
  });
});

describe('GET /api/products/categories', () => {
  it('retourne les catégories distinctes triées', async () => {
    await createCatalog();

    const res = await request(app).get('/api/products/categories');

    expect(res.statusCode).toBe(200);
    expect(res.body.categories).toEqual(
      expect.arrayContaining(['Périphériques', 'Écrans', 'Ordinateurs'])
    );
  });
});

describe('GET /api/products/:id', () => {
  it('retourne le détail d\'un produit existant', async () => {
    const product = await createProduct({ name: 'Produit Détaillé' });

    const res = await request(app).get(`/api/products/${product._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Produit Détaillé');
    expect(res.body._id).toBe(product._id.toString());
  });

  it('retourne 400 pour un identifiant invalide', async () => {
    const res = await request(app).get('/api/products/pas-un-id');

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Identifiant de produit invalide');
  });

  it('retourne 404 pour un produit inexistant', async () => {
    const res = await request(app).get(`/api/products/${new mongoose.Types.ObjectId()}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Produit introuvable');
  });
});

describe('Route inconnue', () => {
  it('retourne 404 avec un message JSON', async () => {
    const res = await request(app).get('/api/inexistant');

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('Route introuvable');
  });
});
