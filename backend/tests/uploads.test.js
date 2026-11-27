import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { loginAdmin, registerUser } from './helpers.js';

const { default: Category } = await import('../src/models/Category.js');

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

// PNG 1×1 valide
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('Upload d\'images (admin)', () => {
  it('enregistre une image et la sert via /api/media', async () => {
    const admin = await loginAdmin(app);

    const upload = await request(app)
      .post('/api/admin/uploads')
      .set(bearer(admin.body.token))
      .send({ dataUrl: PNG, filename: 'pixel.png' });

    expect(upload.statusCode).toBe(201);
    expect(upload.body.url).toMatch(/^\/api\/media\//);

    const media = await request(app).get(upload.body.url);
    expect(media.statusCode).toBe(200);
    expect(media.headers['content-type']).toContain('image/png');
    expect(media.body.length).toBeGreaterThan(0);
  });

  it('refuse un format non supporté (SVG)', async () => {
    const admin = await loginAdmin(app);

    const res = await request(app)
      .post('/api/admin/uploads')
      .set(bearer(admin.body.token))
      .send({ dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' });

    expect(res.statusCode).toBe(400);
  });

  it('refuse un client non administrateur', async () => {
    const customer = await registerUser(app);

    const res = await request(app)
      .post('/api/admin/uploads')
      .set(bearer(customer.body.token))
      .send({ dataUrl: PNG });

    expect(res.statusCode).toBe(403);
  });
});

describe('Images des produits', () => {
  const payload = {
    name: 'Produit illustré',
    description: 'Produit avec plusieurs visuels.',
    price: 199,
    category: 'Écrans',
    stock: 4
  };

  it('accepte jusqu\'à 5 images et synchronise l\'image principale', async () => {
    const admin = await loginAdmin(app);

    const res = await request(app)
      .post('/api/admin/products')
      .set(bearer(admin.body.token))
      .send({ ...payload, imageUrls: ['/api/media/a', '/api/media/b', '/api/media/c'] });

    expect(res.statusCode).toBe(201);
    expect(res.body.imageUrls).toHaveLength(3);
    expect(res.body.imageUrl).toBe('/api/media/a');
  });

  it('refuse plus de 5 images (400)', async () => {
    const admin = await loginAdmin(app);

    const res = await request(app)
      .post('/api/admin/products')
      .set(bearer(admin.body.token))
      .send({
        ...payload,
        imageUrls: ['/1', '/2', '/3', '/4', '/5', '/6']
      });

    expect(res.statusCode).toBe(400);
  });

  it('supprime les médias lorsque le produit est supprimé', async () => {
    const admin = await loginAdmin(app);

    const upload = await request(app)
      .post('/api/admin/uploads')
      .set(bearer(admin.body.token))
      .send({ dataUrl: PNG });

    const created = await request(app)
      .post('/api/admin/products')
      .set(bearer(admin.body.token))
      .send({ ...payload, imageUrls: [upload.body.url] });

    const removed = await request(app)
      .delete(`/api/admin/products/${created.body._id}`)
      .set(bearer(admin.body.token));

    expect(removed.statusCode).toBe(200);

    const media = await request(app).get(upload.body.url);
    expect(media.statusCode).toBe(404);
  });
});

describe('Images des familles et catégories', () => {
  it('conserve l\'image de la famille et des sous-familles valides', async () => {
    const admin = await loginAdmin(app);

    const res = await request(app)
      .post('/api/admin/categories')
      .set(bearer(admin.body.token))
      .send({
        name: 'Écrans',
        subcategories: ['4K', 'Ultra-wide'],
        imageUrl: '/api/media/famille',
        subcategoryImages: { '4K': '/api/media/4k', Inconnue: '/api/media/x' }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.imageUrl).toBe('/api/media/famille');
    expect(res.body.subcategoryImages).toEqual({ '4K': '/api/media/4k' });

    const stored = await Category.findById(res.body._id);
    expect(stored.subcategoryImages.get('4K')).toBe('/api/media/4k');
  });

  it('enregistre le visuel d\'une catégorie de niveau 1', async () => {
    const admin = await loginAdmin(app);

    const res = await request(app)
      .put('/api/admin/category-groups')
      .set(bearer(admin.body.token))
      .send({ name: 'Affichage & périphériques', imageUrl: '/api/media/groupe' });

    expect(res.statusCode).toBe(200);
    expect(res.body.imageUrl).toBe('/api/media/groupe');

    const list = await request(app).get('/api/category-groups');
    expect(list.statusCode).toBe(200);
    expect(list.body[0].name).toBe('Affichage & périphériques');
  });
});
