import AuditLog from '../models/AuditLog.js';

/**
 * Trace une action d'administration. L'écriture ne doit jamais faire échouer
 * la requête métier : une erreur est seulement journalisée côté serveur.
 */
export async function logAdminAction(req, action, target = '', meta = undefined) {
  try {
    await AuditLog.create({
      actor: req.user?.id,
      actorEmail: req.user?.email || '',
      action,
      target: String(target || '').slice(0, 120),
      meta,
      ip: req.ip || ''
    });
  } catch (error) {
    console.warn('[audit] écriture impossible :', error.message);
  }
}
