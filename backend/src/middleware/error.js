/**
 * Erreur applicative avec un code HTTP explicite.
 * Utilisée par les contrôleurs pour des réponses d'erreur cohérentes.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** 404 pour toute route inconnue. */
export const notFound = (req, res) => {
  res.status(404).json({ message: `Route introuvable : ${req.originalUrl}` });
};

/**
 * Gestionnaire d'erreurs centralisé.
 * - ApiError → son code HTTP et son message
 * - ValidationError Mongoose → 400 avec messages concaténés
 * - CastError → 400 (identifiant invalide)
 * - Doublon d'index unique (11000) → 409
 * - Autre → 500 sans divulgation de détails internes en production
 */
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.statusCode || 500;
  let message = err.message || 'Erreur interne du serveur';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(' ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Identifiant invalide';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `Cette valeur existe déjà (${field}).` : 'Cette ressource existe déjà.';
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  const body = { message };
  if (err.details) body.details = err.details;

  res.status(status).json(body);
};
