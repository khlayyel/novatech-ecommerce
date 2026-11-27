import mongoose from 'mongoose';
import app from './app.js';
import config, { assertServerEnv } from './config/env.js';
import { connectDatabase } from './config/db.js';

const start = async () => {
  try {
    assertServerEnv();
    await connectDatabase();
    console.log(`✓ MongoDB connecté (${mongoose.connection.name})`);
  } catch (error) {
    console.error('Impossible de démarrer le serveur :', error.message);
    process.exit(1);
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`✓ API NovaTech démarrée sur http://localhost:${config.port} (${config.nodeEnv})`);
  });

  // Arrêt propre demandé par l'hébergeur (Render) ou Ctrl+C.
  const shutdown = (signal) => {
    console.log(`\n${signal} reçu : arrêt du serveur...`);
    server.close(async () => {
      await mongoose.connection.close().catch(() => undefined);
      console.log('Serveur arrêté proprement.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start();
