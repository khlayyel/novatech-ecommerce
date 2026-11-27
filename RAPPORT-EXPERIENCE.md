# Rapport de retour d'expérience

**Projet : plateforme e-commerce fullstack (React, Node.js, MongoDB, Stripe)**

Ce projet m'a fait traverser l'intégralité de la chaîne de développement d'une application web moderne : modélisation, API, paiement, tests, conteneurisation, CI/CD et déploiement. Voici les points marquants de cette expérience.

## Difficultés rencontrées et solutions apportées

**1. La signature du webhook Stripe.** Le premier piège technique a été la vérification de la signature : Stripe signe le **corps brut** de la requête, or le middleware `express.json()` le consomme et le transforme en objet. La solution consiste à monter la route du webhook **avant** le parseur JSON, avec `express.raw({ type: 'application/json' })`. J'ai pu vérifier la validité de cette implémentation en fabricant moi-même des webhooks signés (HMAC SHA-256) dans le script de smoke test, sans dépendre d'une connection au dashboard.

**2. La confiance côté client.** Il était tentant d'accepter le montant envoyé par le frontend au moment du checkout. C'est une faille classique : n'importe qui peut modifier une requête HTTP. J'ai donc fait le choix inverse : le backend **recalcule** le total à partir des prix en base et revalide le stock, et l'endpoint de checkout ignore entièrement toute donnée de prix envoyée par le client. Les items de la commande sont un instantané figé (nom, image, prix) pour que l'historique reste exact même si le catalogue change ensuite.

**3. L'idempotence des paiements.** Stripe rejoue parfois un webhook ; le frontend peut aussi confirmer une commande deux fois. Sans précaution, le stock serait décrémenté en double. La solution : un `findOneAndUpdate` **atomique** conditionné sur `status: "pending"` — un seul des appels « gagne », les suivants ne trouvent plus rien à faire. La décrémentation du stock utilise en plus une garde `stock >= quantité` pour ne jamais passer en négatif, même en cas d'achats simultanés.

**4. Les paniers invités et leur fusion.** Le cahier des charges imposait un panier fonctionnel sans compte, et proposait en bonus l'authentification JWT pour lier le panier à un utilisateur. J'ai implémenté les deux : un identifiant de panier invité (en-tête `X-Cart-Id`, généré côté navigateur), et une **fusion automatique** au moment de l'inscription ou de la connexion — le visiteur ne perd jamais son panier. L'expiration automatique des paniers inactifs est assurée par un index TTL MongoDB de 7 jours.

**5. Les tests d'intégration sans dépendance externe.** Tester un flux de paiement sans appeler Stripe à chaque test a requis de **moquer le service Stripe** (création d'intention de paiement, vérification de signature) tout en conservant la vraie logique métier, et d'utiliser **MongoDB en mémoire**. Le smoke test de bout en bout complète cette base en effectuant, lui, un **vrai paiement** avec la carte de test `pm_card_visa` — les deux niveaux se valident mutuellement.

**6. L'écosystème et la reproductibilité.** Choix des versions (Express 5, Vite 7, Jest 30, React 19), configuration ESLint en flat config, pipeline GitHub Actions exécutant lint + tests backend + typecheck + build + tests frontend : l'objectif constant était qu'un tiers puisse cloner le dépôt et tout faire fonctionner en trois commandes.

## Ce que j'ai appris

- La **sécurité** ne se décrète pas : elle découle de décisions précises (recalcul serveur, CORS restreint, rate limiting, Helmet, 404 génériques pour ne pas révéler l'existence de ressources).
- Un **pipeline de CI** transforme la qualité en réflexe : chaque push rejoue l'ensemble des vérifications.
- Les **états de l'interface** (chargement, vide, erreur, succès) demandent autant d'attention que le cas nominal — ce sont eux qui font la différence entre une démo et un produit.
- Docker et les plateformes de déploiement (Render, Vercel) ne sont plus des étapes annexes mais partie intégrante du cycle de livraison.

## Pistes d'amélioration

Si le projet devait continuer : envoi d'emails de confirmation, gestion d'un back-office produits, pagination côté historique de commandes et enrichissement des statuts (expédition réelle via un transporteur).
