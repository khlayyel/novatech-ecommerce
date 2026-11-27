/**
 * Variables d'environnement publiques du frontend.
 * Lecture compatible Vite (import.meta.env) avec repli sûr sous Jest (CommonJS).
 */
type PublicEnv = {
  VITE_API_URL?: string;
  VITE_STRIPE_PUBLIC_KEY?: string;
};

function readViteEnv(): PublicEnv {
  try {
    // `import.meta.env` doit rester une expression littérale : Vite la remplace
    // statiquement à la compilation (un alias casserait l'injection).
    // Sous Jest, Babel remplace `import.meta` par `{}` → repli sur les défauts.
    return (import.meta.env as unknown as PublicEnv) ?? {};
  } catch {
    return {};
  }
}

const viteEnv = readViteEnv();

export const API_URL = (viteEnv.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const STRIPE_PUBLIC_KEY = viteEnv.VITE_STRIPE_PUBLIC_KEY || '';
export const APP_NAME = 'NovaTech';
