import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { createProduct, loginAdmin } from './helpers.js';

const { default: Order } = await import('../src/models/Order.js');

const GUEST = 'guest-test-1234';

const reply = (parts) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts } }] })
});

const textPart = (text) => ({ text });
const callPart = (name, args) => ({ functionCall: { name, args } });

const send = (text, { conversationId, guest = GUEST, token } = {}) => {
  let req = request(app).post('/api/assistant/chat').set('X-Assistant-Guest', guest);
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  return req.send({ text, conversationId });
};

const secondFetchBody = (mockFetch) => JSON.parse(mockFetch.mock.calls[1][1].body);

let mockFetch;

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  mockFetch = jest.fn();
  globalThis.fetch = mockFetch;
});

describe('Assistant IA — conversation et outils', () => {
  it('répond avec les données réelles et persiste les messages', async () => {
    await createProduct({ name: 'NovaBook Pro 14', price: 1299, stock: 5, category: 'Ordinateurs' });

    mockFetch
      .mockResolvedValueOnce(reply([callPart('search_products', { query: 'NovaBook' })]))
      .mockResolvedValueOnce(reply([textPart('Le NovaBook Pro 14 est à 1299 €.')]));

    const res = await send('Avez-vous un NovaBook ?');

    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('customer');
    expect(res.body.reply).toContain('NovaBook');
    expect(res.body.conversationId).toBeTruthy();
    expect(res.body.messages).toHaveLength(2);

    const toolResponse = JSON.stringify(secondFetchBody(mockFetch));
    expect(toolResponse).toContain('NovaBook Pro 14');
  });

  it('répond au produit le plus cher via l’outil dédié', async () => {
    await createProduct({ name: 'Entrée', price: 100 });
    await createProduct({ name: 'Haut de gamme', price: 2200 });

    mockFetch
      .mockResolvedValueOnce(reply([callPart('get_most_expensive_product', {})]))
      .mockResolvedValueOnce(reply([textPart('Le plus cher est Haut de gamme à 2200 €.')]));

    const res = await send('le plus cher produit chez nous');

    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toContain('Haut de gamme');
    const toolResponse = JSON.stringify(secondFetchBody(mockFetch));
    expect(toolResponse).toContain('Haut de gamme');
    expect(toolResponse).toContain('2200');
  });

  it('refuse les outils analytiques à un visiteur', async () => {
    mockFetch
      .mockResolvedValueOnce(reply([callPart('get_sales_stats', { days: 7 })]))
      .mockResolvedValueOnce(reply([textPart('Information réservée à l’administration.')]));

    const res = await send('Quel est le chiffre d’affaires ?');

    expect(res.statusCode).toBe(200);
    const toolResponse = JSON.stringify(secondFetchBody(mockFetch));
    expect(toolResponse).toContain('administration');
  });

  it('autorise les outils analytiques à un administrateur', async () => {
    const admin = await loginAdmin(app);

    mockFetch
      .mockResolvedValueOnce(reply([callPart('get_sales_stats', { days: 7 })]))
      .mockResolvedValueOnce(reply([textPart('CA sur 7 jours calculé.')]));

    const res = await send('CA des 7 derniers jours ?', { token: admin.body.token });

    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(JSON.stringify(secondFetchBody(mockFetch))).toContain('revenue');
  });

  it('protège le suivi de commande (jeton requis pour un invité)', async () => {
    const product = await createProduct();
    const order = await Order.create({
      items: [{ product: product._id, name: 'Produit', priceAtPurchase: 100, quantity: 1 }],
      totalAmount: 100,
      status: 'paid',
      trackingToken: 'jeton-secret-123',
      sessionId: 'guest-abc-1234'
    });
    const reference = order._id.toString().slice(-8);

    mockFetch
      .mockResolvedValueOnce(reply([callPart('get_order_status', { orderId: reference })]))
      .mockResolvedValueOnce(reply([textPart('Commande introuvable.')]));
    await send(`Où est la commande ${reference} ?`);
    expect(JSON.stringify(secondFetchBody(mockFetch))).toContain('"found":false');

    mockFetch
      .mockReset()
      .mockResolvedValueOnce(
        reply([callPart('get_order_status', { orderId: reference, trackingToken: 'jeton-secret-123' })])
      )
      .mockResolvedValueOnce(reply([textPart('Votre commande est payée.')]));
    await send(`Commande ${reference} avec jeton`);
    expect(JSON.stringify(secondFetchBody(mockFetch))).toContain('"found":true');
  });

  it('exige un identifiant de conversation (400)', async () => {
    const res = await request(app).post('/api/assistant/chat').send({ text: 'bonjour' });
    expect(res.statusCode).toBe(400);
  });

  it('restaure la conversation et l’isole par propriétaire', async () => {
    mockFetch
      .mockResolvedValueOnce(reply([textPart('Bonjour !')]))
      .mockResolvedValueOnce(reply([textPart('Avec plaisir.')]));

    const first = await send('bonjour');
    const conversationId = first.body.conversationId;

    const second = await send('merci', { conversationId });
    expect(second.statusCode).toBe(200);

    const restored = await request(app)
      .get('/api/assistant/conversation')
      .set('X-Assistant-Guest', GUEST);

    expect(restored.statusCode).toBe(200);
    expect(restored.body.conversation.id).toBe(conversationId);
    expect(restored.body.conversation.messages).toHaveLength(4);

    const other = await request(app)
      .get(`/api/assistant/conversation?id=${conversationId}`)
      .set('X-Assistant-Guest', 'guest-other-9876');

    expect(other.body.conversation).toBeNull();
  });

  it('démarre une nouvelle conversation vierge', async () => {
    const created = await request(app)
      .post('/api/assistant/conversation')
      .set('X-Assistant-Guest', GUEST);

    expect(created.statusCode).toBe(201);
    expect(created.body.conversation.messages).toHaveLength(0);
  });
});
