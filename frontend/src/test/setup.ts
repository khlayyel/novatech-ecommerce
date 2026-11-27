import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'node:util';

/**
 * Configuration Jest exécutée après l'environnement de test :
 * - matchers jest-dom (toBeInTheDocument, toBeDisabled…)
 * - polyfills TextEncoder/TextDecoder : absents de l'environnement jsdom
 *   mais requis par certaines dépendances (React Router 7).
 */
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}
