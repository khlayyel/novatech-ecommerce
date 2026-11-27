import Media from '../models/Media.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

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

/** Une image encore utilisée par un produit ou une famille ne doit pas être supprimée. */
export const isMediaReferenced = async (url) => {
  if (!url) return false;

  const [product, categories] = await Promise.all([
    Product.exists({ $or: [{ imageUrl: url }, { imageUrls: url }] }),
    Category.find({}).select('imageUrl subcategoryImages').lean()
  ]);

  if (product) return true;

  return categories.some(
    (category) =>
      category.imageUrl === url ||
      Object.values(category.subcategoryImages || {}).includes(url)
  );
};

/** Extrait l'identifiant de média d'une URL `/api/media/:id`. */
export const mediaIdFromUrl = (url) => MEDIA_URL.exec(String(url ?? ''))?.[1] ?? null;
