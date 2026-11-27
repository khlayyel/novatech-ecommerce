import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

/**
 * Limitation de débit pour protéger l'API contre les abus
 * (tentatives de connexion en rafale, checkout automatisé...).
 * Désactivée pendant les tests automatisés.
 */
const skipInTests = () => config.isTest;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Trop de tentatives, réessayez dans quelques minutes.' }
});

export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Trop de tentatives de paiement, réessayez dans quelques minutes.' }
});

export const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Trop de messages envoyés à l’assistant, réessayez dans quelques minutes.' }
});
