import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';

import config from './config/env.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import categoryRoutes from './routes/category.routes.js';
import mediaRoutes from './routes/media.routes.js';
import categoryGroupRoutes from './routes/category-group.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import { stripeWebhook } from './controllers/order.controller.js';
import { ApiError, notFound, errorHandler } from './middleware/error.js';

const app = express();

// Derrière un reverse proxy (Render, Railway...), nécessaire à express-rate-limit.
app.set('trust proxy', 1);

// En-têtes de sécurité HTTP.
app.use(helmet());

// CORS : seules les origines listées dans FRONTEND_URL sont autorisées.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.frontendUrls.includes(origin)) {
        return callback(null, true);
      }
      // 403 (et non 500) pour une origine explicitement refusée.
      return callback(new ApiError(403, 'Origine non autorisée par CORS'));
    }
  })
);

// Journal des requêtes HTTP (désactivé pendant les tests pour des sorties propres).
if (!config.isTest) {
  app.use(morgan(config.isProd ? 'tiny' : 'dev'));
}

// Webhook Stripe : DOIT recevoir le corps brut (signature),
// donc il est monté AVANT le middleware express.json().
app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

// Sonde de santé utilisée par Render / Docker / le script de smoke test.
app.get('/api/health', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    environment: config.nodeEnv,
    uptime: Math.round(process.uptime())
  });
});

app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/category-groups', categoryGroupRoutes);
app.use('/api/assistant', assistantRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
