/**
 * Environnement de test hermétique : exécuté AVANT le chargement des modules.
 * - NODE_ENV=test : désactive les limiteurs de débit, morgan, etc.
 * - secrets factices pour que les modules se chargent sans .env réel
 * - MONGODB_URI supprimé pour garantir qu'aucun test ne touche une vraie base.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-factice-pour-les-tests';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'gemini-test-key';
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
delete process.env.MONGODB_URI;
