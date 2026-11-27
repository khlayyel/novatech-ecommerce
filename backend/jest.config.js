export default {
  testMatch: ['**/tests/**/*.test.js'],
  // Le téléchargement initial de mongod (mongodb-memory-server) peut être long en CI.
  testTimeout: 120000,
  // Variables d'environnement sûres pour les tests (jamais la vraie base).
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  verbose: true
};
