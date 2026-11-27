import CategoryGroup from '../models/CategoryGroup.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { logAdminAction } from '../services/audit.service.js';
import { deleteMediaByUrls } from '../services/media.service.js';

/** GET /api/category-groups — visuels des catégories de niveau 1 (public). */
export const listCategoryGroups = asyncHandler(async (_req, res) => {
  const groups = await CategoryGroup.find().sort({ name: 1 });
  res.json(groups);
});

/** PUT /api/admin/category-groups { name, imageUrl } — crée ou met à jour le visuel. */
export const upsertCategoryGroup = asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  if (name.length < 2) {
    throw new ApiError(400, 'Le nom de la catégorie est requis');
  }

  const imageUrl = String(req.body.imageUrl ?? '').trim();
  const existing = await CategoryGroup.findOne({ name });

  const group = await CategoryGroup.findOneAndUpdate(
    { name },
    { $set: { name, imageUrl } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (existing?.imageUrl && existing.imageUrl !== imageUrl) {
    await deleteMediaByUrls([existing.imageUrl]);
  }

  await logAdminAction(req, 'group.image', name, { imageUrl });
  res.json(group);
});
