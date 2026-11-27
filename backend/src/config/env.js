import 'dotenv/config';

/**
 * Configuration centralisée de l'application.
 * Toutes les variables d'environnement sont lues ici, une seule fois.
 */
const parseList = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  frontendUrls: parseList(process.env.FRONTEND_URL, 'http://localhost:5173,http://localhost:3000'),
  // Assistant IA (Google Gemini) — fonctionnalité facultative.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  // Durée de vie d'un panier inactif avant expiration automatique (TTL MongoDB).
  cartTtlDays: 7,
  currency: 'eur'
};

config.isTest = config.nodeEnv === 'test';
config.isProd = config.nodeEnv === 'production';

/**
 * Vérifie les variables obligatoires au démarrage du serveur.
 * En production, une variable manquante arrête le processus ;
 * en développement, un avertissement explicite est affiché.
 */
export function assertServerEnv() {
  const required = [
    ['MONGODB_URI', config.mongoUri],
    ['JWT_SECRET', config.jwtSecret],
    ['STRIPE_SECRET_KEY', config.stripeSecretKey]
  ];

  for (const [name, value] of required) {
    if (!value) {
      if (config.isProd) {
        throw new Error(`Variable d'environnement manquante : ${name}. Configurez backend/.env (voir .env.example).`);
      }
      console.warn(`⚠️  Variable d'environnement manquante : ${name} — certaines fonctionnalités seront indisponibles.`);
    }
  }

  if (config.stripeSecretKey && !config.stripeSecretKey.startsWith('sk_test_') && !config.stripeSecretKey.startsWith('sk_live_')) {
    console.warn('⚠️  STRIPE_SECRET_KEY ne ressemble pas à une clé Stripe valide (sk_test_... ou sk_live_...).');
  }
}

export default config;
