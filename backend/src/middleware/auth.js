import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { ApiError } from './error.js';

/** Signe un jeton JWT pour un utilisateur donné. */
export const signToken = (userId) =>
  jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.split(' ')[1].trim();
};

/** Décode le jeton sans lever d'erreur (retourne null si absent/invalide). */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
};

/**
 * Authentification OBLIGATOIRE : protège les endpoints sensibles.
 */
export const requireAuth = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) {
    return next(new ApiError(401, 'Authentification requise : jeton manquant'));
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return next(new ApiError(401, 'Jeton invalide ou expiré'));
  }

  req.user = { id: decoded.id };
  next();
};

/**
 * Authentification OPTIONNELLE : attache req.user si un jeton valide est fourni,
 * mais laisse passer la requête sinon (paniers invités, commandes invités...).
 */
export const optionalAuth = (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      req.user = { id: decoded.id };
    }
  }
  next();
};
