# Scénario de démonstration — soutenance

**Durée cible : 6 à 8 minutes.** Préparation avant la démo : `npm run dev` (backend + frontend) lancés, catalogue seedé, page Stripe ouverte (mode test), terminal prêt.

Avant de commencer : vider le panier si nécessaire (bouton « Vider le panier »).

---

## 1. Catalogue (≈ 1 min)

1. Arriver sur l'accueil : présenter le héro puis le catalogue (24 produits, 3 catégories de niveau 1).
2. **Langue** : basculer FR → EN → AR dans la navbar (l'arabe passe en RTL), puis revenir en FR.
3. **Filtres en cascade** : choisir une Catégorie, puis une Famille (le select se débloque), puis une Sous-famille ; revenir à « Toutes les catégories ».
4. **Recherche** : taper « nova » (anti-rebond) → résultats instantanés. **Tri** : « Prix croissant ».
5. Souligner les états : badge de stock (« En stock », « Plus que 3 », « Épuisé » sur le PC gamer si déjà acheté en répétition), squelettes de chargement au refresh.

## 2. Panier invité — CRUD complet (≈ 1,5 min)

1. Ajouter **2 produits différents** au panier → toast de confirmation + badge qui s'incrémente dans la navbar.
2. Ouvrir le panier : modifier une quantité avec **− / +** (refus au-delà du stock), supprimer un article (✕).
3. Montrer le récapitulatif (sous-total, total TVA incluse).

## 3. Bonus JWT — compte et fusion du panier (≈ 1 min)

1. Cliquer « Créer un compte », saisir nom/email/mot de passe (montrer la validation live).
2. Après inscription : **le panier invité a été rattaché au compte** (même contenu, désormais lié au compte — l'onglet « Mes commandes » apparaît dans la navbar).
3. Mentionner : mots de passe hachés bcrypt, jetons JWT 7 jours, `/api/auth/me` protégé.

## 4. Paiement Stripe (≈ 1,5 min)

1. « Passer au paiement » : expliquer que le **montant a été recalculé côté serveur** (le frontend ne transmet aucun prix).
2. Saisir la carte de test **4242 4242 4242 4242** (date future, CVC 123).
3. Payer → redirection vers la **page de confirmation** : statut *Payée*, détail des articles, montant.

## 5. Bonus stock + suivi de commande (≈ 1,5 min)

1. Revenir au catalogue → **le stock du produit acheté a diminué** (ex. « Plus que 4 en stock »).
2. « Mes commandes » → la commande apparaît → ouvrir le **suivi** : chronologie *Commandée → Paiement confirmé (payée)*, avec date de paiement et référence Stripe.
3. (Back-office/terminal) Montrer l'ordre en base : `status: "paid"`, `paidAt`, `stripePaymentIntentId`.

## 6. Résilience (si le temps le permet, ≈ 1 min)

1. Nouveau produit au panier → paiement avec **4000 0000 0000 0002** (refusée).
2. Le formulaire affiche l'erreur Stripe ; la commande passe en *Paiement échoué* ; **le stock n'a pas bougé**.
3. Repayer avec 4242 → succès.

## 6 bis. Espace d'administration (≈ 2 min)

1. Se déconnecter, puis se connecter avec `admin@novatech.fr` / `Admin1234!` → le lien **Administration** apparaît dans la navbar.
2. **Tableau de bord** `/admin` : changer la période (7/14/30 jours) dans la carte *Filtres*, montrer la courbe, la répartition, les meilleures ventes et la valeur du stock par famille. Replier un panneau puis recharger la page pour montrer que l'état est mémorisé. Cliquer sur le **bouton hamburger** de la topbar : la barre latérale passe en rail d'icônes, puis la déplier à nouveau.
3. **Produits** `/admin/products` : utiliser la **recherche du tableau** (temps réel), trier par prix en cliquant l'en-tête, passer le sélecteur de lignes (en haut à gauche) à 5 puis revenir à 10, vérifier la pagination centrée. Cliquer **+ Nouveau produit** (page dédiée), créer un produit, puis **Modifier** pour montrer le formulaire prérempli ; enfin le supprimer.
4. **Catégories** `/admin/categories` : tableau des familles, ouvrir **Modifier** (formulaire prérempli), renommer une famille → vérifier que le catalogue suit (mise à jour en cascade) ; tentative de suppression d'une famille utilisée → message `409`.
5. **Stocks** `/admin/stock` : filtrer « stock faible », modifier un stock et enregistrer ; le catalogue reflète la nouvelle valeur.
6. **Commandes** `/admin/orders` : ouvrir **Détails** d'une commande (articles, dates), passer une commande *payée* en **Expédiée** puis **Livrée**, puis cliquer **Exporter CSV**.
7. **Clients** `/admin/users` : promouvoir un compte en admin, puis le rétrograder.
8. **Sécurité** `/admin/security` : posture de l'API, filtrer le journal d'audit par action/auteur, et vérifier que les actions précédentes y figurent.
9. Montrer qu'un client normal n'a pas le lien, est redirigé de `/admin` et reçoit `403` sur `/api/admin/stats`.

## 7. Qualité & DevOps (échange, ≈ 1 min)

- `npm test` : montrer les 6 suites backend (86 tests, Jest/Supertest, MongoDB en mémoire, Stripe moqué) et les 14 suites frontend (53 tests, RTL).
- `npm run smoke` : montrer le tableau de 55 vérifications dont le **paiement réel** et le **webhook signé**.
- CI GitHub Actions : lint + tests + build à chaque push ; déploiement Render/Vercel sur `main` via secrets.
- Docker : `docker compose up --build` → stack complète mongo/api/web.

---

## Plan B (tous risques)

- Si le navigateur échoue : le smoke test (`npm run smoke`) démontre le même parcours en 30 secondes (catalogue, panier, paiement, webhook, suivi) avec un tableau de résultats.
- Si le paiement bloque : vérifier que `frontend/.env` contient bien la clé publique `pk_test_…` et que le backend tourne (le CI couvre déjà ces cas).
