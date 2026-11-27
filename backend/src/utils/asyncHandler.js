/**
 * Enveloppe les contrôleurs asynchrones pour transmettre
 * automatiquement les erreurs au middleware d'erreur Express.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
