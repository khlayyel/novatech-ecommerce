# Rapport final de conformité — NovaTech

> Projet d'examen : plateforme e-commerce fullstack de matériel informatique.
> Stack : React 19 + TypeScript + Vite · Node.js 22 + Express 5 + Mongoose 8 · MongoDB Atlas · Stripe (mode test).
> Dépôt : https://github.com/khlayyel/novatech-ecommerce

---

## 1. Objet

Ce rapport vérifie, module par module, la conformité du projet avec le document de
workshop fourni par le professeur, puis récapitule les résultats de test, l'état du
déploiement et les actions restant à la charge de l'étudiant.

Le document du professeur reste la source de vérité : aucune exigence n'a été
supprimée ou remplacée par une maquette. Les ajouts (administration, exports CSV)
sont des approfondissements autorisés par le module 11 (« bonus et approfondissements »).

---

## 2. Traçabilité des exigences

| Module | Exigence | Statut | Preuve |
|---|---|---|---|
| 1 | Monorepo, scripts npm, dépôt Git | ✅ | `package.json` (`install-all`, `dev`, `test`, `lint`, `build`, `smoke`), dépôt GitHub public |
| 2 | Modélisation Mongoose (produits, paniers, commandes, utilisateurs) | ✅ | `backend/src/models/` + `Category`, `AuditLog` |
| 3 | API produits et panier (liste, détail, ajout, quantité, suppression) | ✅ | `product.controller.js`, `cart.controller.js`, tests `products.test.js` / `cart.test.js` |
| 4 | Stripe : PaymentIntents, commande *pending*, webhook signé | ✅ | `stripe.service.js`, `order.controller.js`, test `webhook.test.js` |
| 5 | Tests backend Jest + Supertest, dépendances mockées | ✅ | 7 suites, **96 tests**, MongoDB en mémoire |
| 6 | Frontend React + TypeScript, Axios, routage | ✅ | `frontend/src/`, `api/request.ts`, React Router 7 |
| 7 | Composants clés : catalogue, panier, Stripe Elements, confirmation | ✅ | `pages/`, `components/CheckoutForm.tsx` |
| 8 | Tests frontend Jest + Testing Library | ✅ | 17 suites, **66 tests** |
| 9 | Automatisation, Docker, GitHub Actions | ✅ | `Dockerfile.*`, `docker-compose.yml`, `.github/workflows/ci.yml` + `deploy.yml` |
| 10 | Déploiement effectif (Render + Vercel + Atlas + Stripe) | ✅ | https://novatech-ecommerce.vercel.app · https://novatech-api-7qa9.onrender.com |
| 11 | Bonus : stock, suivi, JWT | ✅ | `order.service.js`, `OrderDetailPage.tsx`, `middleware/auth.js` |
| 11+ | Approfondissements | ✅ | Espace d'administration complet, exports CSV, journal d'audit |

---

## 3. Fonctionnalités livrées

### Boutique (client / visiteur)

- Catalogue de **24 produits** sur **6 familles** et 15 sous-familles : filtres, recherche anti-rebond, tri, pagination.
- **Fiche produit** `/products/:id` : visuel, stock, quantité, produits similaires.
- Panier invité (`X-Cart-Id`) ou connecté (JWT), fusion automatique du panier à la connexion.
- Paiement Stripe Elements, page de confirmation, suivi de commande avec chronologie.
- Historique des commandes par compte ; suivi invité par jeton.

### Administration (`/admin`, rôle `admin`)

| Écran | Fonctions |
|---|---|
| Tableau de bord | CA, panier moyen, commandes, catalogue · histogramme 14 jours · donut des statuts · top ventes · valeur du stock |
| Produits | Recherche, CRUD, famille / sous-famille, export CSV |
| Catégories | CRUD familles et sous-familles, renommage en cascade, suppression protégée |
| Stocks | Ajustement rapide, filtres faible/épuisé, unités et valeur d'inventaire |
| Commandes | Filtre, détail dépliable, `paid → shipped → delivered`, export CSV |
| Clients | Recherche, rôle, commandes et total dépensé, promotion/rétrogradation, export CSV |
| Sécurité | Contrôles actifs + journal d'audit horodaté (acteur, cible, IP) |

---

## 4. Qualité technique (vérifiée)

| Contrôle | Commande | Résultat |
|---|---|---|
| Tests backend | `npm test --prefix backend` | **96 / 96** |
| Tests frontend | `npm test --prefix frontend` | **66 / 66** |
| Lint backend | `npm run lint --prefix backend` | 0 erreur |
| Lint frontend | `npm run lint --prefix frontend` | 0 erreur |
| Typecheck + build | `npm run build` | ✅ (≈ 131 kB gzip) |
| Smoke E2E production | `npm run smoke` + `SMOKE_API_URL` | **55 / 55** |
| Audit dépendances production | `npm audit --omit=dev` | 0 vulnérabilité |
| CI GitHub Actions | `ci.yml` | vert |
| CD GitHub Actions | `deploy.yml` | vert (tests → Render → Vercel) |

---

## 5. Sécurité

- Mots de passe **bcrypt**, champ `password` en `select: false`.
- JWT signé, expiration 7 jours, rôle **relu en base** à chaque requête admin (révocation immédiate).
- `requireAdmin` : 401 sans jeton, 403 pour un client.
- Inscription publique : le rôle est forcé à `customer` (aucune escalade possible).
- Montants **recalculés côté serveur** ; aucune donnée de prix client n'est utilisée.
- Webhook Stripe : corps brut + **vérification de signature HMAC**, idempotence, rejeu sans double décrément.
- Stock jamais négatif (garde `$gte`), transitions de statut validées (`409` sinon).
- Helmet, rate limiting (auth 30/15 min, checkout 10/15 min), CORS restreint aux origines connues.
- Listes blanches de champs (anti mass-assignment), validation Mongoose, échappement des regex de recherche.
- Journal d'audit de toutes les mutations administratives.
- Aucun secret dans le dépôt (`.env` ignoré, exports `*.example` uniquement).

---

## 6. Déploiement

| Composant | URL / état |
|---|---|
| Frontend | https://novatech-ecommerce.vercel.app |
| API | https://novatech-api-7qa9.onrender.com |
| Santé | `GET /api/health` → `{"status":"ok","database":"connected"}` |
| Webhook Stripe | `POST /api/orders/webhook` (3 événements `payment_intent.*`) |
| Base | MongoDB Atlas, base `novatech` |
| CI/CD | GitHub Actions : tests → Deploy Hook Render → déploiement Vercel |

Comptes de démonstration : `demo@novatech.fr` / `Demo1234!` — `admin@novatech.fr` / `Admin1234!`.

---

## 7. Limites connues

- Images Docker non exécutées localement (aucun démon Docker sur la machine de développement) ; les fichiers sont fournis et validés par la relecture.
- L'instance Render gratuite s'endort après 15 minutes : première requête ≈ 50 s.
- Chaque push déclenche deux déploiements identiques (intégration Git + workflow) ; sans impact fonctionnel.
- Base de démonstration : les tests de smoke laissent quelques commandes et comptes `smoke-…`.

---

## 8. Actions restant à la charge de l'étudiant

1. Supprimer le secret inutilisé `DEPLOY_RENDER` créé par erreur dans les *secrets* GitHub (les variables suffisent).
2. Optionnel : désactiver l'auto-deploy Render si l'on souhaite que le workflow soit l'unique déclencheur.
3. Préparer la soutenance avec `docs/DEMO-SOUTENANCE.md` (scénario minuté, plan B).

---

## 9. Conclusion

Toutes les exigences du document du professeur sont couvertes et **vérifiées par
exécution** : tests automatisés, smoke test de bout en bout avec paiement Stripe réel
en mode test, contrôle du webhook signé, vérifications directes des endpoints en
production et pipeline CI/CD opérationnel.
