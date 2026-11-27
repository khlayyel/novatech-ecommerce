import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';
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

/**
 * Autorisation ADMIN : exige un jeton valide puis vérifie le rôle en base
 * (le rôle n'est pas embarqué dans le jeton, ce qui évite un droit obsolète
 * après une révocation).
 */
export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, async (err) => {
    if (err) return next(err);
    try {
      const user = await User.findById(req.user.id).select('role email');
      if (!user) {
        return next(new ApiError(401, 'Utilisateur introuvable'));
      }
      if (user.role !== 'admin') {
        return next(new ApiError(403, 'Accès réservé aux administrateurs'));
      }
      req.user.role = user.role;
      req.user.email = user.email;
      return next();
    } catch (error) {
      return next(error);
    }
  });
};
