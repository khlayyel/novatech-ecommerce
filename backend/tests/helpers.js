import request from 'supertest';
import Product from '../src/models/Product.js';

/** Email unique pour éviter les collisions entre tests. */
export const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@novatech.test`;

/** Identifiant de panier invité (simule l'en-tête X-Cart-Id du navigateur). */
export const guestCartId = () => `guest-${Math.random().toString(36).slice(2)}-${Date.now()}`;

/** Enregistre un utilisateur via l'API et renvoie la réponse. */
export const registerUser = (app, overrides = {}) => {
  const payload = {
    name: 'Utilisateur Test',
    email: uniqueEmail(),
    password: 'Password123!',
    ...overrides
  };
  return request(app).post('/api/auth/register').send(payload);
};

/** Crée un produit directement en base (données de test). */
export const createProduct = (overrides = {}) =>
  Product.create({
    name: 'Produit Test',
    description: 'Description du produit de test.',
    price: 100,
    category: 'Périphériques',
    stock: 10,
    imageUrl: '/images/products/test.svg',
    ...overrides
  });

/** Crée un jeu de produits varié pour les tests du catalogue. */
export const createCatalog = () =>
  Promise.all([
    createProduct({ name: 'Souris Alpha', price: 49.5, category: 'Périphériques', stock: 10 }),
    createProduct({ name: 'Écran Beta', price: 299, category: 'Écrans', stock: 5 }),
    createProduct({ name: 'Souris Gamma', price: 89, category: 'Périphériques', stock: 3 }),
    createProduct({ name: 'PC Delta', price: 1500, category: 'Ordinateurs', stock: 2 })
  ]);
