# Checklist de traçabilité des exigences

Source de vérité : le document du workshop (« Développement d'une Plateforme E-commerce Fullstack avec React, Node.js, MongoDB et Stripe »). Chaque exigence est tracée vers ses fichiers et ses tests, avec son statut de vérification final.

## Module 1 — Initialisation et environnement de travail

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 1.1 | Monorepo backend / frontend | `backend/`, `frontend/`, scripts racine | ✅ install + build testés |
| 1.2 | Fichiers de dépendances et scripts npm | `package.json` (racine, backend, frontend) : `install-all`, `dev`, `test`, `build`, `lint`, `seed` | ✅ |
| 1.3 | Dépôt Git | `.gitignore` (secrets, node_modules, dist), `.gitattributes` | ✅ |
| 1.4 | Variables d'environnement rigoureuses | `.env.example` des deux côtés, config centralisée `src/config/env.js` | ✅ |

## Module 2 — Modélisation des données (Mongoose)

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 2.1 | Produits : nom, description, prix, catégorie, stock, image | `models/Product.js` (+ validation, enum, index) | ✅ tests `products.test.js` |
| 2.2 | Paniers : items, quantités, expiration | `models/Cart.js` (TTL 7 jours, rafraîchi à chaque sauvegarde) | ✅ tests `cart.test.js` |
| 2.3 | Commandes : utilisateur, items, montant total, identifiant Stripe, statut | `models/Order.js` (+ instantané prix/nom, trackingToken, paidAt) | ✅ tests `checkout.test.js` |
| 2.4 | Utilisateurs (optionnel recommandé) : authentification | `models/User.js` (bcrypt, email unique) | ✅ tests `auth.test.js` |

## Module 3 — API produits et panier

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 3.1 | Lister les produits | `GET /api/products` (pagination, filtres, tri) | ✅ test + smoke |
| 3.2 | Ajouter un article au panier | `POST /api/cart` (invité X-Cart-Id ou JWT) | ✅ test + smoke |
| 3.3 | Consulter le panier | `GET /api/cart` | ✅ test + smoke |
| 3.4 | Modifier les quantités | `PUT /api/cart/items/:productId` | ✅ test + smoke |
| 3.5 | Supprimer des articles | `DELETE /api/cart/items/:productId` (+ vider le panier) | ✅ test + smoke |
| 3.6 | Cohérence des données (stock, doublons) | Validation 1–99, refus 409 si stock insuffisant, incrémentation si déjà présent | ✅ tests |

## Module 4 — Intégration Stripe

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 4.1 | Configuration Stripe par variables d'environnement | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, clé publique côté client | ✅ |
| 4.2 | Créer des intentions de paiement | `services/stripe.service.js` → `paymentIntents.create` (centimes) | ✅ paiement réel lors du smoke test |
| 4.3 | Commandes en statut « en attente » | `checkout` crée `status: "pending"` | ✅ test + smoke |
| 4.4 | Webhook de confirmation | `POST /api/orders/webhook` (corps brut, signature vérifiée) | ✅ signature HMAC réelle au smoke test |
| 4.5 | Mise à jour du statut de commande | `payment_intent.succeeded → paid`, `payment_failed/canceled → failed` | ✅ test + smoke |
| 4.6 | Test du webhook en local | Stripe CLI documenté + smoke test signé + endpoint `/confirm` | ✅ |

## Module 5 — Tests backend (Jest + Supertest)

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 5.1 | Tests unitaires et d'intégration des API | 6 suites, 84 tests, MongoDB en mémoire | ✅ `npm test --prefix backend` |
| 5.2 | Tests du service Stripe | Service moqué (`jest.unstable_mockModule`) | ✅ `checkout.test.js`, `webhook.test.js` |
| 5.3 | Isolation des tests | `tests/setup-env.js` + base en mémoire + `clearTestDb` | ✅ |

## Module 6 — Initialisation du frontend React

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 6.1 | React + TypeScript | React 19, TS strict, Vite | ✅ build vérifié |
| 6.2 | Services API via Axios | `src/api/client.ts` + intercepteurs (JWT, X-Cart-Id) | ✅ |
| 6.3 | Routage | React Router 7 (9 pages) | ✅ test `App.test.tsx` |
| 6.4 | Variables d'environnement frontend | `VITE_API_URL`, `VITE_STRIPE_PUBLIC_KEY` | ✅ |

## Module 7 — Composants principaux

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 7.1 | Liste des produits avec ajout au panier | `HomePage` + `ProductList` + `ProductCard` (filtres, recherche, tri, pagination) | ✅ tests + smoke |
| 7.2 | Page panier avec modification et suppression | `CartPage` + `QuantityStepper` | ✅ tests + smoke |
| 7.3 | Formulaire de paiement Stripe Elements | `CheckoutPage` + `CheckoutForm` (PaymentElement) | ✅ tests + paiement réel |
| 7.4 | Page de confirmation | `ConfirmationPage` (statut, articles, total) | ✅ |
| 7.5 | Gestion d'état du panier cohérente | `CartContext` (React Context) | ✅ test dédié |

## Module 8 — Tests frontend (Testing Library + Jest)

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 8.1 | Tests de composants | 11 suites (ProductCard, ProductList, ProductDetailPage, CartPage, CheckoutForm, LoginPage, OrderDetailPage, App, garde admin, coquille admin, contexte panier) | ✅ `npm test --prefix frontend` |
| 8.2 | Rendu conditionnel | Chargement (skeletons), vide, erreur | ✅ tests |
| 8.3 | Interactions utilisateur | Ajout, quantités, suppression, soumission formulaires | ✅ tests |
| 8.4 | Gestion des erreurs | Alertes role="alert", bannières, toasts | ✅ tests |

## Module 9 — Automatisation et CI/CD

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 9.1 | Scripts npm (install, build, start, simultané) | `install-all`, `build`, `start`, `dev` (concurrently) | ✅ |
| 9.2 | Fichiers Docker | `Dockerfile.backend`, `Dockerfile.frontend` (multi-stage + nginx), `docker-compose.yml` (mongo+api+web) | ✅ écrits (Docker non testé localement — absent de la machine) |
| 9.3 | Pipeline GitHub Actions (tests + déploiement) | `ci.yml` (lint, tests, build sur chaque push) + `deploy.yml` (Render + Vercel sur main, piloté par secrets) | ✅ |

## Module 10 — Déploiement effectif

| # | Exigence | Implémentation | Vérification |
|---|---|---|---|
| 10.1 | Backend sur Render/Railway | `render.yaml` (blueprint), health check `/api/health` | 📋 prêt — nécessite le compte Render de l'étudiant |
| 10.2 | Connecté à MongoDB Atlas et Stripe | variables documentées étape par étape (README §Déploiement) | 📋 prêt — nécessite les comptes de l'étudiant |
| 10.3 | Frontend sur Vercel/Netlify | `frontend/vercel.json` (SPA), build Vite | 📋 prêt |
| 10.4 | Variables d'environnement de production | tableau complet dans le README | 📋 |
| 10.5 | Vérification de bout en bout | smoke test réutilisable contre l'URL de production (`SMOKE_API_URL`) | 📋 à exécuter après déploiement |

## Module 11 — Bonus (tous implémentés)

| # | Bonus | Implémentation | Vérification |
|---|---|---|---|
| 11.1 | Décrémentation du stock après paiement | `order.service.js` — condition `$gte`, idempotence, jamais de stock négatif | ✅ test + smoke (rejeu vérifié) |
| 11.2 | Page de suivi des commandes | `OrderDetailPage` (chronologie, invités via trackingToken) + `OrdersPage` | ✅ tests |
| 11.3 | Authentification JWT liant le panier | JWT + bcrypt, fusion du panier invité au login/register | ✅ tests + smoke |

## Modalités d'évaluation

| Critère | Preuve |
|---|---|
| Fonctionnalité complète (catalogue, panier, paiement, confirmation) | Smoke test 28/28 ✅ + démo |
| Qualité du code (lisibilité, organisation, gestion d'erreurs) | Architecture en couches, erreurs centralisées, ESLint sans erreur |
| Pertinence des tests | 6 suites backend (88 tests) + 15 suites frontend (57 tests) + smoke E2E (55 contrôles) |
| Pipeline CI/CD | `ci.yml` + `deploy.yml` |
| Déploiement | Configurations prêtes + guide pas à pas |
| Documentation | README complet, présent rapport, checklist, scénario de démo |
