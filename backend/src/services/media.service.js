import Media from '../models/Media.js';

const MEDIA_URL = /\/api\/media\/([a-f0-9]{24})/i;

/**
 * Supprime les médias référencés par une liste d'URL (`/api/media/:id`).
 * Utilisé lorsqu'un produit ou une famille est supprimé pour éviter les
 * images orphelines en base.
 */
export const deleteMediaByUrls = async (urls = []) => {
  const ids = [
    ...new Set(
      urls
        .map((url) => MEDIA_URL.exec(String(url ?? ''))?.[1])
        .filter(Boolean)
        .map((id) => id.toLowerCase())
    )
  ];

  if (ids.length > 0) {
    await Media.deleteMany({ _id: { $in: ids } });
  }
};
