# NovaTech — Plateforme E-commerce Fullstack

> **Projet d'examen** — Workshop : développement d'une plateforme e-commerce fullstack dédiée aux **produits informatiques**, avec **React + TypeScript**, **Node.js + Express**, **MongoDB (Mongoose)** et **Stripe** (mode test), tests automatisés, conteneurisation Docker et pipeline CI/CD.

![CI](https://github.com/khlayyel/novatech-ecommerce/actions/workflows/ci.yml/badge.svg)

Une boutique complète : catalogue filtrable, panier invité **ou** connecté (JWT), tunnel de paiement **Stripe Elements**, confirmation et **suivi de commande**, avec décrémentation du stock après paiement et pipeline de qualité (Jest, Supertest, React Testing Library, ESLint, GitHub Actions).

---

## 🎯 Objectifs pédagogiques couverts

| Module du workshop | Livrable | Où ? |
|---|---|---|
| 1. Initialisation & environnement | Monorepo, scripts npm, Git | `package.json`, scripts `install-all` / `dev` |
| 2. Modélisation des données | Produits, paniers (expiration TTL), commandes, utilisateurs | `backend/src/models/` |
| 3. API produits & panier | Liste, filtres, ajout, consultation, modification, suppression | `backend/src/controllers/` |
| 4. Intégration Stripe | PaymentIntents, commandes *pending*, webhook signé | `backend/src/services/stripe.service.js` |
| 5. Tests backend | Jest + Supertest, Stripe moqué, MongoDB en mémoire | `backend/tests/` |
| 6. Init frontend React | React + TypeScript + Vite + Axios + routage | `frontend/src/` |
| 7. Composants principaux | Catalogue, fiche produit, panier, paiement Stripe Elements, confirmation | `frontend/src/pages/` |
| 8. Tests frontend | Jest + React Testing Library | `frontend/src/__tests__/` |
| 9. Automatisation & CI/CD | Dockerfiles, docker-compose, GitHub Actions | `Dockerfile.*`, `.github/workflows/` |
| 10. Déploiement effectif | Render (API) + Vercel (web) + Atlas | `render.yaml`, `frontend/vercel.json` |
| 11. Bonus | ✅ Décrémentation du stock · ✅ Suivi de commande · ✅ Authentification JWT · ✅ Espace d'administration (rôle `admin`) | `backend/src/services/order.service.js`, `frontend/src/pages/OrderDetailPage.tsx`, `backend/src/middleware/auth.js`, `frontend/src/pages/admin/` |

---

## 🧱 Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19, TypeScript (strict), Vite, React Router 7, Axios, Stripe Elements (`@stripe/react-stripe-js`) |
| Backend | Node.js 22, Express 5, Mongoose 8, Stripe SDK, JWT (jsonwebtoken), bcryptjs, Helmet, express-rate-limit |
| Base de données | MongoDB Atlas (production) / MongoDB (Docker) / MongoDB en mémoire (tests) |
| Tests | Jest 30, Supertest, React Testing Library, jest-dom, mongodb-memory-server |
| Qualité | ESLint 10 (flat config), TypeScript `--noEmit`, GitHub Actions |
| Conteneurisation | Docker multi-stage (API + web/nginx), docker-compose (mongo + api + web) |
| Internationalisation | FR / EN / AR — fichiers de ressources JSON, résolution par clé, RTL automatique pour l'arabe |
| Déploiement | Render (backend), Vercel (frontend), GitHub Actions (CI/CD) |

---

## 🗂️ Architecture du monorepo

```
novatech-ecommerce/
├── backend/                    # API REST (Express + Mongoose + Stripe)
│   ├── src/
│   │   ├── config/             # env.js (config centralisée), db.js (connexion)
│   │   ├── models/             # Product, Category, CategoryGroup, Cart, Order, User, AuditLog, Media
│   │   ├── controllers/        # produit, catégorie, groupe, panier, commande, auth, admin, média, export
│   │   ├── routes/             # produit, catégorie, panier, commande, auth, admin
│   │   ├── middleware/         # auth (JWT + admin), cart (X-Cart-Id), errors, rate limits
│   │   ├── services/           # stripe.service, order.service (idempotence), audit.service
│   │   ├── utils/              # asyncHandler
│   │   ├── app.js              # assemblage Express (CORS, helmet, routes)
│   │   ├── server.js           # démarrage + arrêt propre
│   │   └── seed.js             # 24 produits + comptes démo et admin
│   ├── tests/                  # 6 suites Jest/Supertest (base en mémoire)
│   └── scripts/smoke.mjs       # smoke test de bout en bout (paiement réel test)
├── frontend/                   # SPA React + TypeScript
│   ├── src/
│   │   ├── api/                # client Axios central (+ produits, panier, commandes, auth, admin)
│   │   ├── components/         # Navbar, ProductCard, CheckoutForm, ProtectedRoute…
│   │   ├── components/admin/   # AdminIcon, BarChart (graphiques sans dépendance)
│   │   ├── components/ui/      # Panel repliable, DataTable, ImageDropzone, IconButton, LocaleSwitcher
│   │   ├── context/            # AuthContext (JWT), CartContext, ToastContext
│   │   ├── i18n/               # ressources fr/en/ar + provider + hook useI18n
│   │   ├── pages/              # Accueil, fiche produit, panier, paiement, suivi, auth
│   │   ├── pages/admin/        # tableau de bord, produits, catégories, stocks, commandes, clients, sécurité
│   │   ├── types/              # types partagés
│   │   └── __tests__/          # 14 suites Jest/RTL
│   └── public/images/products/ # 24 illustrations SVG du catalogue
├── .github/workflows/          # ci.yml (tests) + deploy.yml (CD)
├── Dockerfile.backend / Dockerfile.frontend / nginx.conf
├── docker-compose.yml          # mongo + api + web
├── render.yaml                 # blueprint du service backend
└── docs/                       # checklist des exigences + scénario de soutenance
```

**Séparation des responsabilités** : routes → contrôleurs → services → modèles. Le frontend ne parle jamais directement à MongoDB ni à Stripe avec la clé secrète : tout transite par l'API.

---

## 🗄️ Modèle de données (Mongoose)

### Product
`name` · `description` · `price` (euros, converti en centimes pour Stripe) · `category` (nom de famille) · `subcategory` (sous-famille, optionnelle) · `stock` (entier ≥ 0) · `imageUrl` · `timestamps`

### Category — familles et sous-familles
`name` (unique) · `description` · `subcategories[]` · `timestamps` — renommer une famille met à jour en cascade les produits qui la référencent.

### AuditLog — piste d'audit de l'administration
`actor?` · `actorEmail` · `action` · `target` · `meta` · `ip` · `createdAt`

### Cart — panier invité **ou** utilisateur
`user` (réf. User, unique sparse) **ou** `sessionId` (en-tête `X-Cart-Id`, unique sparse) · `items[]` (réf. Product + quantité 1–99) · `expiresAt` (**index TTL : expiration automatique après 7 jours d'inactivité**)

### Order — instantané figé au moment de l'achat
`user?` · `sessionId?` · `items[]` (name, imageUrl, priceAtPurchase, quantity) · `totalAmount` · `currency` · `stripePaymentIntentId` · `trackingToken` (suivi invité) · `status` (`pending → paid → shipped → delivered`, + `failed`) · `paidAt` · `timestamps`

### User (bonus JWT)
`name` · `email` (unique, minuscule) · `password` (**bcrypt, jamais renvoyé** — `select: false`) · `role` (`customer` | `admin`, jamais modifiable via l'inscription publique)

---

## 🔌 API REST

Base : `http://localhost:5000/api`

| Méthode | Route | Auth | Description | Codes |
|---|---|---|---|---|
| GET | `/health` | — | Sonde de santé (Render/Docker) | 200 / 503 |
| GET | `/products` | — | Catalogue paginé : `?group=`, `?category=`, `?subcategory=`, `?search=`, `?sort=recent\|price-asc\|price-desc`, `?page=`, `?limit=` | 200 |
| GET | `/products/categories` | — | Catégories distinctes | 200 |
| GET | `/products/:id` | — | Détail produit | 200 / 400 / 404 |
| POST | `/auth/register` | X-Cart-Id (optionnel) | Inscription + fusion du panier invité | 201 / 400 / 409 |
| POST | `/auth/login` | X-Cart-Id (optionnel) | Connexion + fusion du panier invité | 200 / 400 / 401 |
| GET | `/auth/me` | JWT | Profil courant | 200 / 401 |
| GET | `/cart` | JWT **ou** X-Cart-Id | Panier courant | 200 |
| POST | `/cart` | JWT **ou** X-Cart-Id | Ajouter un article (vérifie le stock) | 200 / 400 / 404 / 409 |
| PUT | `/cart/items/:productId` | JWT **ou** X-Cart-Id | Modifier la quantité (1–99) | 200 / 400 / 404 / 409 |
| DELETE | `/cart/items/:productId` | JWT **ou** X-Cart-Id | Retirer un article | 200 / 400 / 404 |
| DELETE | `/cart` | JWT **ou** X-Cart-Id | Vider le panier | 200 |
| POST | `/orders/checkout` | JWT **ou** X-Cart-Id | Créer PaymentIntent + commande *pending* (**montant recalculé serveur**) | 201 / 400 / 409 |
| POST | `/orders/:id/confirm` | JWT **ou** X-Order-Token | Confirmer après paiement (état revérifié chez Stripe) | 200 / 400 / 404 |
| GET | `/orders/mine` | JWT | Historique de l'utilisateur | 200 / 401 |
| GET | `/orders/:id` | JWT **ou** X-Order-Token | Suivi de commande | 200 / 400 / 404 |
| POST | `/orders/webhook` | signature Stripe | Webhook (corps brut) : paiement réussi/échoué | 200 / 400 |
| GET | `/admin/stats` | JWT **admin** | Indicateurs : CA, commandes par statut, stocks faibles, clients | 200 / 401 / 403 |
| GET | `/admin/orders` | JWT **admin** | Toutes les commandes : `?status=`, `?page=`, `?limit=` | 200 / 400 / 403 |
| PATCH | `/admin/orders/:id/status` | JWT **admin** | Transition `paid → shipped → delivered` | 200 / 400 / 403 / 404 / 409 |
| POST | `/admin/products` | JWT **admin** | Créer un produit | 201 / 400 / 403 |
| PUT | `/admin/products/:id` | JWT **admin** | Modifier un produit | 200 / 400 / 403 / 404 |
| DELETE | `/admin/products/:id` | JWT **admin** | Supprimer un produit | 200 / 403 / 404 |
| POST | `/admin/uploads` | JWT **admin** | Envoyer une image (base64 → média persistant, 2 Mo max) | 201 / 400 / 403 |
| GET | `/media/:id` | — | Servir une image stockée (cache immuable) | 200 / 400 / 404 |
| GET | `/category-groups` | — | Visuels des catégories de niveau 1 | 200 |
| PUT | `/admin/category-groups` | JWT **admin** | Enregistrer le visuel d'une catégorie | 200 / 400 / 403 |
| GET | `/categories` | — | Familles et sous-familles publiques | 200 |
| GET | `/admin/categories` | JWT **admin** | Liste complète des familles | 200 / 403 |
| POST | `/admin/categories` | JWT **admin** | Créer une famille (sous-familles incluses) | 201 / 400 / 403 |
| PUT | `/admin/categories/:id` | JWT **admin** | Renommer / éditer (renommage en cascade sur les produits) | 200 / 400 / 403 / 404 |
| DELETE | `/admin/categories/:id` | JWT **admin** | Supprimer (refusé si des produits l'utilisent) | 200 / 403 / 404 / 409 |
| GET | `/admin/analytics?days=14` | JWT **admin** | Séries de CA, répartition, top ventes, valeur du stock | 200 / 403 |
| GET | `/admin/users?search=&role=` | JWT **admin** | Comptes avec nombre de commandes et total dépensé | 200 / 403 |
| PATCH | `/admin/users/:id/role` | JWT **admin** | Promotion / rétrogradation (garde-fous dernier admin) | 200 / 400 / 403 / 404 / 409 |
| GET | `/admin/audit` | JWT **admin** | Journal des actions d'administration | 200 / 403 |
| GET | `/admin/export/orders.csv` | JWT **admin** | Export CSV des commandes (séparateur `;`, BOM Excel FR) | 200 / 403 |
| GET | `/admin/export/products.csv` | JWT **admin** | Export CSV du catalogue (famille, sous-famille, valeur du stock) | 200 / 403 |
| GET | `/admin/export/users.csv` | JWT **admin** | Export CSV des clients et de leurs dépenses | 200 / 403 |

---

## 🛡️ Espace d'administration

Un rôle `admin` ouvre `/admin`, protégé côté client **et** côté serveur :

| Écran / route | Contenu |
|---|---|
| `/admin` | Indicateurs, courbe de CA sur 14 jours, répartition des commandes, meilleures ventes, valeur du stock, dernières commandes |
| `/admin/products` | Liste, recherche, suppression · **création** `/admin/products/new` · **édition** `/admin/products/:id/edit` (formulaire prérempli) |
| `/admin/categories` | Liste en tableau, suppression · **création** `/admin/categories/new` · **édition** `/admin/categories/:id/edit` (formulaire prérempli, renommage en cascade) |
| `/admin/stock` | Ajustement rapide du stock, filtres *stock faible / épuisé*, valeur d'inventaire |
| `/admin/orders` | Toutes les commandes, filtrage par statut, détail dépliable (articles, dates), passage *payée → expédiée → livrée*, export CSV |
| `/admin/users` | Comptes clients, commandes et total dépensé, promotion / rétrogradation, export CSV |
| `/admin/security` | Posture de sécurité et journal d'audit horodaté de toutes les actions admin |

Les écrans **Produits**, **Commandes** et **Clients** proposent un **export CSV** (séparateur `;`, BOM UTF-8) directement ouvrable dans Excel.

**CRUD en pages dédiées** : chaque ajout et chaque modification ouvre sa propre page (`/new`, `/:id/edit`) avec son endpoint dédié (`POST`, `PUT`, `DELETE`). Le formulaire d'édition est chargé depuis l'API et **prérempli avec les données réelles** de l'élément ; l'annulation ramène à la liste.

**Images par glisser-déposer** : un composant unique `ImageDropzone` équipe les formulaires. Les fichiers sont envoyés à l'API et stockés en base (médias persistants, 2 Mo max, PNG/JPEG/WebP/GIF). Un produit accepte **jusqu'à 5 images** (la première sert de visuel principal, réordonnancement par glisser) et la fiche produit les affiche en **galerie de vignettes** ; une famille, une sous-famille et une catégorie de niveau 1 ont chacune leur visuel.

**Hiérarchie du catalogue** : `Catégorie` (niveau 1, champ `Category.group`) → `Famille` (`Category.name`) → `Sous-famille` (`Product.subcategory`). Les filtres sont en cascade dans le catalogue public, les produits, les stocks et les catégories : la famille n'est sélectionnable qu'après la catégorie, la sous-famille qu'après la famille.

**Standard d'interface** : chaque page de l'admin est composée d'un **conteneur principal unique** (`.admin-panel`, cadre visible) qui regroupe tous les éléments, et à l'intérieur duquel chaque bloc est une **carte distincte**. Les cartes de **filtres, indicateurs, graphiques et formulaires** sont **repliables** (état mémorisé) ; les cartes de **tableaux sont fixes et toujours visibles**. La **barre latérale se replie** en rail d'icônes via le bouton de la topbar (état mémorisé ; tiroir sur mobile). Tous les tableaux utilisent le même composant `DataTable` : **recherche intégrée en haut** (filtrage en temps réel), **sélecteur de lignes en haut à gauche** (5 / 10 / 15 / 20 / 50, 10 par défaut, choix mémorisé), tri par clic sur l'en-tête et **pagination centrée sous le tableau**. Aucune page ne duplique de barre de recherche : la recherche vit dans le tableau.

Le rôle n'est pas embarqué dans le JWT : `requireAdmin` le relit en base à chaque requête, ce qui permet une révocation immédiate. Un client authentifié reçoit `403` sur `/api/admin/*`.

---

## 💳 Flux de paiement Stripe

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant W as Frontend (React)
    participant A as Backend (Express)
    participant S as Stripe

    U->>W: Ajoute au panier (X-Cart-Id ou JWT)
    U->>W: Passe au paiement
    W->>A: POST /orders/checkout
    A->>A: Recalcule le total depuis la base + vérifie le stock
    A->>S: paymentIntents.create (montant en centimes)
    S-->>A: clientSecret
    A->>A: Commande "pending" + trackingToken
    A-->>W: clientSecret + orderId
    W->>S: confirmPayment (Stripe Elements, carte de test)
    S-->>W: PaymentIntent succeeded
    W->>A: POST /orders/:id/confirm
    A->>S: paymentIntents.retrieve (revérification)
    A->>A: pending → paid (atomique) + stock −1 + panier vidé
    S--)A: webhook payment_intent.succeeded (signature vérifiée)
    A->>A: idempotent : déjà "paid" → aucune double décrémentation
    W->>U: Page de confirmation → suivi de commande
```

**Deux mécanismes complémentaires** garantissent la cohérence :
1. **Webhook signé** (`STRIPE_WEBHOOK_SECRET`, corps brut + HMAC SHA-256) : source de vérité en production.
2. **Endpoint `/confirm`** appelé par le frontend : indispensable en local (avant configuration du webhook) et revérifié auprès de Stripe.

L'un comme l'autre passent par `markOrderPaid()` : un `findOneAndUpdate` **atomique** sur `{ status: "pending" }` — un webhook rejoué ou une double confirmation ne peuvent ni décrémenter le stock deux fois, ni vider le panier deux fois.

---

## 🔐 Sécurité

- **Prix et montants jamais lus depuis le client** : `totalAmount` est recalculé serveur à partir des prix en base.
- **Stock** : validé à l'ajout au panier **et** revalidé au checkout ; décrémentation avec garde `stock >= quantité` (jamais négatif, même en concurrence).
- **Webhook** : vérification cryptographique de la signature Stripe (corps brut obligatoire).
- **JWT** : signés côté serveur (`JWT_SECRET`), expiration 7 jours, mots de passe bcrypt (10 tours), jamais renvoyés par l'API.
- **Helmet** (en-têtes HTTP), **CORS restreint** à `FRONTEND_URL`, **rate limiting** sur `/auth` et `/checkout`.
- **Idempotence** des confirmations de paiement (atomique MongoDB).
- **Secrets** : `.env` gitignoré, exemples fournis (`.env.example`), aucune clé dans le code ou le CI.
- **Suivi invité** : jeton de suivi aléatoire (`trackingToken`), réponses 404 génériques (pas de fuite d'existence de commandes d'autrui).

---

## 🚀 Installation locale

### Prérequis
- Node.js ≥ 20 (développé et testé avec Node 22) et npm
- Un compte MongoDB Atlas (ou MongoDB local/Docker)
- Un compte Stripe en **mode test**

### Étapes

```bash
# 1. Dépendances (backend + frontend + racine)
npm run install-all
npm install

# 2. Variables d'environnement
cp backend/.env.example backend/.env    # puis renseignez-le (voir tableau)
cp frontend/.env.example frontend/.env

# 3. Données de démonstration (24 produits + comptes démo et admin)
npm run seed

# 4. Lancer backend (5000) + frontend (5173) simultanément
npm run dev
```

Application : **http://localhost:5173** — API : **http://localhost:5000/api/health**

### `backend/.env`

| Variable | Description | Exemple |
|---|---|---|
| `NODE_ENV` | development / production | `development` |
| `PORT` | Port de l'API | `5000` |
| `MONGODB_URI` | URI MongoDB (Atlas) | `mongodb+srv://…` |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe **mode test** | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook (`whsec_…`) | voir §Déploiement |
| `JWT_SECRET` | Longue chaîne aléatoire | `openssl rand -hex 32` |
| `FRONTEND_URL` | Origines CORS autorisées | `http://localhost:5173` |

### `frontend/.env`

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL de l'API | `http://localhost:5000/api` |
| `VITE_STRIPE_PUBLIC_KEY` | Clé **publique** Stripe (test) | `pk_test_…` |

> **Compte de démonstration** (créé par le seed) : `demo@novatech.fr` / `Demo1234!`
> **Compte administrateur** : `admin@novatech.fr` / `Admin1234!` — accès à l'espace `/admin` (tableau de bord, produits, commandes).

---

## ✅ Tests

```bash
npm test                 # backend puis frontend
# ou séparément :
npm test --prefix backend
npm test --prefix frontend
```

| Suite | Contenu |
|---|---|
| `backend/tests/products.test.js` | Catalogue : pagination, filtres, tri, 400/404, sonde de santé |
| `backend/tests/auth.test.js` | Inscription, connexion, JWT, doublons, **fusion du panier invité** |
| `backend/tests/cart.test.js` | CRUD complet invité + connecté, validation des quantités, stock 409, isolation entre utilisateurs |
| `backend/tests/checkout.test.js` | Montant **recalculé serveur** (falsification ignorée), stock insuffisant 409, confirmation idempotente, autorisations |
| `backend/tests/webhook.test.js` | Signature invalide 400, `paid` + décrémentation + panier vidé, **rejeu idempotent**, paiement échoué |
| `backend/tests/admin.test.js` | 401/403, statistiques, CRUD produits, transitions de statut `paid → shipped → delivered` |
| `frontend/src/__tests__/*.tsx` | Catalogue, fiche produit, panier, formulaire Stripe, authentification, garde admin, coquille admin, **DataTable (tri/pagination)**, **Panel repliable**, suivi, 404 |

Le backend est testé avec **MongoDB en mémoire** (`mongodb-memory-server`) et le service Stripe **moqué** : aucun appel réseau, aucune base réelle. Le frontend est testé en jsdom avec React Testing Library.

### Smoke test de bout en bout (paiement réel, mode test)

Avec l'API démarrée et le seed appliqué :

```bash
cd backend
npm run smoke
```

Le script déroule **le parcours complet** attendu à la soutenance : santé → catalogue → auth → CRUD panier → checkout → **paiement réel avec `pm_card_visa`** → confirmation → stock décrémenté → panier vidé → **webhook avec signature HMAC réelle** → idempotence → suivi de commande, et affiche un tableau de vérifications (55 contrôles).

---

## 🐳 Docker

```bash
# Stack complète : MongoDB + API + Frontend (nginx)
STRIPE_SECRET_KEY=sk_test_... \
VITE_STRIPE_PUBLIC_KEY=pk_test_... \
docker compose up --build

# Résultat : web http://localhost:8080 · api http://localhost:5000
```

- `Dockerfile.backend` : image Node 22 alpine, `npm ci --omit=dev`, utilisateur non-root, healthcheck.
- `Dockerfile.frontend` : build multi-stage (Vite → nginx) avec routing SPA et cache des assets.
- `docker-compose.yml` : mongo (volume + healthcheck), api (dépend du healthcheck), web.

---

## 🔄 CI/CD (GitHub Actions)

| Workflow | Déclencheur | Étapes |
|---|---|---|
| `ci.yml` | chaque push / PR | lint backend → tests backend (Jest) → lint frontend → build (typecheck TS) → tests frontend |
| `deploy.yml` | push sur `main` | mêmes vérifications, puis Deploy Hook Render + déploiement Vercel |

Le pipeline est **activé** : les secrets `RENDER_BACKEND_HOOK`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` et les variables `DEPLOY_RENDER` / `DEPLOY_VERCEL` (`true`) sont configurés. Chaque push sur `main` exécute les tests, puis déclenche le Deploy Hook Render et un déploiement Vercel. **Aucun secret n'apparaît dans le YAML.**

Render et Vercel redéploient aussi via leur intégration Git : un même commit peut donc produire deux déploiements identiques. Le workflow reste le garde-fou (rien n'est déployé si un test échoue) et permet un déclenchement manuel (`workflow_dispatch`).

---

## ☁️ Déploiement (Render + Vercel + Atlas + Stripe)

### Déploiement en production (actuel)

| Composant | URL |
|---|---|
| Frontend (Vercel) | https://novatech-ecommerce.vercel.app |
| API (Render) | https://novatech-api-7qa9.onrender.com |
| Sonde de santé | https://novatech-api-7qa9.onrender.com/api/health |
| Webhook Stripe | https://novatech-api-7qa9.onrender.com/api/orders/webhook |

Render et Vercel sont reliés au dépôt GitHub : chaque push sur `main` redéploie automatiquement les deux services.

### Procédure reproductible (nouveau compte)

1. **MongoDB Atlas** — créez un cluster gratuit (M0), un utilisateur et récupérez l'URI (`mongodb+srv://…`), autorisez l'IP `0.0.0.0/0` pour Render.
2. **Backend sur Render** — nouveau Web Service → connectez le repo → *Root directory* `backend` → build `npm ci --omit=dev` → start `npm start` (ou importez le blueprint `render.yaml`). Variables : `NODE_ENV=production`, `MONGODB_URI`, `STRIPE_SECRET_KEY`, `JWT_SECRET`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL=https://votre-app.vercel.app`. Health check : `/api/health`.
3. **Webhook Stripe** — Dashboard → Developers → Webhooks → *Add endpoint* : `https://votre-api.onrender.com/api/orders/webhook`, événements `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` → copiez le `whsec_…` dans Render.
4. **Frontend sur Vercel** — import du repo → *Root directory* `frontend` (framework détecté : Vite) → variables `VITE_API_URL=https://votre-api.onrender.com/api` et `VITE_STRIPE_PUBLIC_KEY=pk_test_…`.
5. **Vérification de bout en bout** : commandez avec la carte `4242 4242 4242 4242` → confirmation → le statut passe à *Payée* et le stock baisse.

> 💡 En local, le webhook peut être simulé sans le dashboard : `stripe listen --forward-to localhost:5000/api/orders/webhook` (Stripe CLI), puis `stripe trigger payment_intent.succeeded`. L'endpoint `/confirm` couvre déjà le cas où le webhook n'est pas configuré.

---

## 🌍 Internationalisation (FR / EN / AR)

Les chaînes de l'interface sont externalisées dans des fichiers de ressources :

```
frontend/src/i18n/
├── locales/fr.json   # français (langue par défaut)
├── locales/en.json   # anglais
├── locales/ar.json   # arabe
├── core.ts           # résolution des clés, interpolation, contexte, useI18n
└── I18nProvider.tsx  # provider React (langue, dir=rtl, persistance)
```

Utilisation dans les composants :

```tsx
const { t } = useI18n();
t('admin.nav.products');                          // « Produits »
t('table.range', { from, to, total });            // interpolation
```

- Langue par défaut : **français** ; sélecteur dans la barre de navigation boutique et dans la topbar admin.
- Choix **mémorisé** dans le navigateur ; `<html lang>` et `dir="rtl"` appliqués automatiquement pour l'arabe.
- Repli automatique sur le français si une clé manque dans la langue courante.
- **Ajouter une langue** : copier un fichier JSON, traduire les valeurs, puis l'enregistrer dans `LOCALES` et `RESOURCES` (`core.ts`).

Périmètre actuel : navigation, pied de page, accueil/catalogue, fiches produit, connexion, coquille d'administration (menu, titres, sortie) et tableau standard (pagination, tri, détail). Les libellés métier propres aux écrans d'administration, au panier et au tunnel de paiement restent en français et s'extraient de la même façon, clé par clé.

---

## 🧪 Cartes de test Stripe (mode test)

| Scénario | Numéro | Résultat |
|---|---|---|
| Paiement réussi | `4242 4242 4242 4242` | Commande *payée*, stock décrémenté |
| Paiement refusé | `4000 0000 0000 0002` | Commande *failed*, stock inchangé |
| Authentification 3D Secure | `4000 0025 0000 3155` | Vérification puis succès |

Date future quelconque, CVC 3 chiffres, code postal quelconque.

---

## 🎬 Scénario de démonstration (soutenance)

1. **Catalogue** : filtres par catégorie, recherche « nova », tri par prix.
2. **Panier invité** : ajouter 2 produits → badge navbar → modifier quantité → supprimer un article.
3. **Création de compte** : le panier invité est **automatiquement rattaché** au compte.
4. **Paiement** : checkout → carte `4242…` → page de confirmation avec statut *Payée*.
5. **Bonus** : « Mes commandes » → suivi avec chronologie (commandée → payée) → retour catalogue : **le stock a diminué**.
6. **Résilience** : payer avec `4000…0002` → commande marquée *échouée*, stock intact.

Détails complets : [`docs/DEMO-SOUTENANCE.md`](docs/DEMO-SOUTENANCE.md)

---

## 📚 Livrables académiques

- [`RAPPORT-EXPERIENCE.md`](RAPPORT-EXPERIENCE.md) — court rapport de retour d'expérience.
- [`docs/RAPPORT-FINAL.md`](docs/RAPPORT-FINAL.md) — rapport final de conformité (traçabilité, qualité, sécurité, déploiement, limites).
- [`docs/CHECKLIST-EXIGENCES.md`](docs/CHECKLIST-EXIGENCES.md) — traçabilité module par module (exigence → fichiers → tests).
- [`docs/DEMO-SOUTENANCE.md`](docs/DEMO-SOUTENANCE.md) — script de démonstration chronométré.

---

## 🛠️ Scripts racine

| Commande | Rôle |
|---|---|
| `npm run install-all` | Installe backend + frontend |
| `npm run dev` | Backend + frontend en parallèle |
| `npm run seed` | Catalogue de démonstration + compte démo |
| `npm test` | Tous les tests (backend + frontend) |
| `npm run lint` | ESLint backend + frontend |
| `npm run build` | Build production du frontend (typecheck inclus) |
| `npm run smoke` | Smoke test de bout en bout (backend démarré requis) |

---

*Projet académique — aucune vente réelle, Stripe en mode test uniquement.*
