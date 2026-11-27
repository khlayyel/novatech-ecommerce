import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '../api/auth';
import { getErrorMessage } from '../utils/request';
import { clearToken, getToken, resetCartId, setToken } from '../utils/storage';
import type { User } from '../types';

/**
 * Contexte d'authentification (bonus JWT).
 * Au montage, si un jeton est présent, le profil est revérifié auprès de l'API :
 * un jeton expiré ou invalide déconnecte automatiquement l'utilisateur.
 */
interface AuthContextValue {
  user: User | null;
  token: string | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const storedToken = getToken();
      if (!storedToken) {
        setInitializing(false);
        return;
      }
      try {
        const me = await authApi.fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        // Jeton invalide/expiré : nettoyage silencieux.
        clearToken();
        if (!cancelled) {
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await authApi.login(email, password);
      setToken(data.token);
      setTokenState(data.token);
      setUser(data.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Connexion impossible, veuillez réessayer.'), { cause: error });
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const data = await authApi.register(name, email, password);
      setToken(data.token);
      setTokenState(data.token);
      setUser(data.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Inscription impossible, veuillez réessayer.'), { cause: error });
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    resetCartId();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, initializing, login, register, logout }),
    [user, token, initializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};
