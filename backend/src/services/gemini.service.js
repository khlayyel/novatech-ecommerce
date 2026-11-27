import config from '../config/env.js';
import { ApiError } from '../middleware/error.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 20000;

export const isAssistantConfigured = () => Boolean(config.geminiApiKey);

/**
 * Appel bas niveau à l'API Gemini (generateContent) avec outils optionnels.
 * La clé reste côté serveur ; aucune donnée n'est journalisée.
 */
export async function generateContent({
  contents,
  tools,
  systemInstruction,
  maxOutputTokens = 512
}) {
  if (!config.geminiApiKey) {
    throw new ApiError(503, "L'assistant IA n'est pas configuré sur ce serveur.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${ENDPOINT}/${encodeURIComponent(config.geminiModel)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': config.geminiApiKey
        },
        body: JSON.stringify({
          contents,
          ...(tools ? { tools } : {}),
          ...(systemInstruction ? { systemInstruction } : {}),
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens,
            topP: 0.9
          }
        }),
        signal: controller.signal
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = payload?.error?.message || 'erreur inconnue';
      console.warn('[assistant] Gemini', response.status, detail);
      throw new ApiError(502, "L'assistant est momentanément indisponible.");
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError(504, "L'assistant met trop de temps à répondre.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
