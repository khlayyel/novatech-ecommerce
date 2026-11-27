import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './testDb.js';
import { createProduct, loginAdmin } from './helpers.js';

const { default: Order } = await import('../src/models/Order.js');

const reply = (parts) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts } }] })
});

const textPart = (text) => ({ text });
const callPart = (name, args) => ({ functionCall: { name, args } });

const send = (body) =>
  request(app).post('/api/assistant/chat').send(body);

const messages = (text) => [{ role: 'user', text }];

const secondFetchBody = (mockFetch) => {
  const call = mockFetch.mock.calls[1];
  return JSON.parse(call[1].body);
};

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

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Assistant IA — boutique', () => {
  it('exécute un outil de recherche puis répond avec les données réelles', async () => {
    await createProduct({ name: 'NovaBook Pro 14', price: 1299, stock: 5, category: 'Ordinateurs' });

    mockFetch
      .mockResolvedValueOnce(reply([callPart('search_products', { query: 'NovaBook' })]))
      .mockResolvedValueOnce(reply([textPart('Le NovaBook Pro 14 est à 1299 €.')]));

    const res = await send({ messages: messages('Avez-vous un NovaBook ?') });

    expect(res.statusCode).toBe(200);
    expect(res.body.mode).toBe('customer');
    expect(res.body.reply).toContain('NovaBook Pro 14');

    const toolResponse = JSON.stringify(secondFetchBody(mockFetch));
    expect(toolResponse).toContain('NovaBook Pro 14');
    expect(toolResponse).toContain('1299');
  });

  it('refuse les outils analytiques à un visiteur', async () => {
    mockFetch
      .mockResolvedValueOnce(reply([callPart('get_sales_stats', { days: 7 })]))
      .mockResolvedValueOnce(reply([textPart('Cette information est réservée à l’administration.')]));

    const res = await send({ messages: messages('Quel est le chiffre d’affaires ?') });

    expect(res.statusCode).toBe(200);
    const toolResponse = JSON.stringify(secondFetchBody(mockFetch));
    expect(toolResponse).toContain('administration');
    expect(toolResponse).not.toContain('revenue');
  });

  it('autorise les outils analytiques à un administrateur', async () => {
    const admin = await loginAdmin(app);

    mockFetch
      .mockResolvedValueOnce(reply([callPart('get_sales_stats', { days: 7 })]))
      .mockResolvedValueOnce(reply([textPart('Sur 7 jours : 0 € de chiffre d’affaires.')]));

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ messages: messages('CA des 7 derniers jours ?') });

    expect(res.statusCode).toBe(200);
    expect(res.body.mode).toBe('admin');

    const toolResponse = JSON.stringify(secondFetchBody(mockFetch));
    expect(toolResponse).toContain('revenue');
  });

  it('protège le suivi de commande : jeton obligatoire pour un invité', async () => {
    const order = await Order.create({
      items: [{ product: (await createProduct())._id, name: 'Produit', priceAtPurchase: 100, quantity: 1 }],
      totalAmount: 100,
      status: 'paid',
      trackingToken: 'jeton-secret-123',
      sessionId: 'guest-abc-1234'
    });
    const reference = order._id.toString().slice(-8);

    // Sans jeton
    mockFetch
      .mockResolvedValueOnce(reply([callPart('get_order_status', { orderId: reference })]))
      .mockResolvedValueOnce(reply([textPart('Commande introuvable.')]));
    const denied = await send({ messages: messages(`Où est la commande ${reference} ?`) });
    expect(denied.statusCode).toBe(200);
    let toolResponse = JSON.stringify(secondFetchBody(mockFetch));
    expect(toolResponse).toContain('"found":false');

    // Avec le jeton
    mockFetch
      .mockReset()
      .mockResolvedValueOnce(
        reply([callPart('get_order_status', { orderId: reference, trackingToken: 'jeton-secret-123' })])
      )
      .mockResolvedValueOnce(reply([textPart('Votre commande est payée.')]));
    const allowed = await send({ messages: messages(`Commande ${reference}, jeton jetons`) });
    expect(allowed.statusCode).toBe(200);
    toolResponse = JSON.stringify(secondFetchBody(mockFetch));
    expect(toolResponse).toContain('"found":true');
    expect(toolResponse).toContain('"status":"paid"');
  });

  it('rejette une requête sans messages (400)', async () => {
    const res = await send({ messages: 'bonjour' });
    expect(res.statusCode).toBe(400);
  });
});
