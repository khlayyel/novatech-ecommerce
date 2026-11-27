import { API_URL } from '../config';

const API_ORIGIN = API_URL.replace(/\/api$/, '');

/**
 * Résout une URL d'image : les médias uploadés sont stockés en relatif
 * (`/api/media/:id`) et doivent pointer vers l'API, pas vers le frontend.
 */
export const imageSrc = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
  return url;
};
