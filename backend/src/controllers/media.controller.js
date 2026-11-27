import mongoose from 'mongoose';
import Media from '../models/Media.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { isMediaReferenced, mediaIdFromUrl } from '../services/media.service.js';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_BYTES = 2 * 1024 * 1024;
const DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i;

/**
 * POST /api/admin/uploads { dataUrl, filename }
 * Enregistre une image envoyée en base64 (le client la lit depuis un
 * fichier glissé-déposé ou sélectionné).
 */
export const uploadImage = asyncHandler(async (req, res) => {
  const { dataUrl, filename } = req.body ?? {};

  if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
    throw new ApiError(400, 'Image manquante');
  }

  const match = DATA_URL.exec(dataUrl);
  if (!match) {
    throw new ApiError(400, "Format d'image invalide");
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new ApiError(400, 'Format non supporté (PNG, JPEG, WebP ou GIF)');
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (buffer.length === 0) {
    throw new ApiError(400, 'Image vide');
  }
  if (buffer.length > MAX_BYTES) {
    throw new ApiError(400, 'Image trop lourde (2 Mo maximum)');
  }

  const media = await Media.create({
    filename: String(filename ?? 'image').slice(0, 120),
    mime,
    size: buffer.length,
    data: buffer
  });

  res.status(201).json({
    id: media._id,
    url: `/api/media/${media._id}`,
    mime,
    size: buffer.length
  });
});

/** GET /api/media/:id — sert l'image stockée avec un cache long. */
export const getMedia = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Identifiant de média invalide');
  }

  const media = await Media.findById(req.params.id).select('mime data');
  if (!media) {
    throw new ApiError(404, 'Média introuvable');
  }

  res.setHeader('Content-Type', media.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(media.data);
});

/**
 * DELETE /api/admin/uploads { url }
 * Supprime immédiatement un média s'il n'est plus référencé par un produit
 * ou une famille (sinon la suppression est différée à l'enregistrement).
 */
export const deleteMedia = asyncHandler(async (req, res) => {
  const { url } = req.body ?? {};
  const id = mediaIdFromUrl(url);

  if (!id) {
    throw new ApiError(400, 'URL de média invalide');
  }

  if (await isMediaReferenced(String(url))) {
    return res.json({ deleted: false, reason: 'referenced' });
  }

  const result = await Media.deleteOne({ _id: id });
  res.json({ deleted: result.deletedCount > 0 });
});
