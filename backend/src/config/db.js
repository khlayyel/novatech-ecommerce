import mongoose from 'mongoose';
import config from './env.js';

/**
 * Connexion à MongoDB (Atlas en production, locale ou en mémoire pour les tests).
 */
export async function connectDatabase() {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI manquant : configurez backend/.env avant de démarrer.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(config.mongoUri);

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  Connexion MongoDB perdue, tentative de reconnexion...');
  });

  return mongoose.connection;
}

export async function closeDatabase() {
  await mongoose.connection.close();
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
