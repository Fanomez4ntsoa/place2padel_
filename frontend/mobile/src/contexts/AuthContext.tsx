import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api, onAuthEvent } from '@/lib/api';
import { clearTokens, getAccessToken, setTokens } from '@/lib/storage';

export interface AuthUser {
  uuid: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  role: 'player' | 'organizer' | 'referee' | 'admin';
  picture_url?: string | null;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    const u = (data?.data?.user ?? data?.data ?? data) as AuthUser;
    setUser(u);
    return u;
  }, []);

  // Hydratation au boot : si un access_token existe en secure-store, on appelle /me.
  // Si l'appel échoue (401 → refresh raté → clearTokens), on reste non-authentifié.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        await fetchMe();
      } catch {
        await clearTokens();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMe]);

  // Écoute les logout forcés déclenchés par api.ts (refresh expiré).
  useEffect(() => {
    const off = onAuthEvent((e) => {
      if (e === 'logged-out') setUser(null);
    });
    return () => {
      off();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const payload = data?.data;
    await setTokens(payload.access_token, payload.refresh_token);
    setUser(payload.user);
    return payload.user as AuthUser;
  }, []);

  const register = useCallback(async (form: Record<string, unknown>) => {
    const { data } = await api.post('/auth/register', form);
    const payload = data?.data;
    await setTokens(payload.access_token, payload.refresh_token);
    setUser(payload.user);
    return payload.user as AuthUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort : on vide le state même si l'appel échoue (offline, token déjà invalide).
    }
    await clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      await fetchMe();
    } catch {
      setUser(null);
    }
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
