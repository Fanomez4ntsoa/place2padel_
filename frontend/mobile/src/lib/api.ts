import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './storage';
import { showToast } from './toast';

/**
 * Base URL API — lue depuis EXPO_PUBLIC_API_URL (app.config / .env).
 * Fallback localhost:8000/api/v1 pour dev.
 */
const baseURL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15_000,
});

// ---------------------------------------------------------------------------
// Request interceptor : injecte Bearer access_token si présent.
// ---------------------------------------------------------------------------
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor : rotation tokens sur 401.
// Évite les boucles via `_retry` et mutualise les refresh concurrents.
// ---------------------------------------------------------------------------
type QueuedRequest = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let refreshPromise: Promise<string | null> | null = null;
let refreshQueue: QueuedRequest[] = [];

function drainQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error ?? new Error('Refresh failed'));
    else resolve(token);
  });
  refreshQueue = [];
}

/**
 * Listener d'événement auth — le AuthContext s'y abonne pour réagir à un logout forcé
 * (refresh expiré). Évite un import circulaire entre api.ts et AuthContext.
 */
type AuthEvent = 'logged-out';
const authListeners = new Set<(e: AuthEvent) => void>();
export function onAuthEvent(cb: (e: AuthEvent) => void): () => void {
  authListeners.add(cb);
  return () => authListeners.delete(cb);
}
function emitAuth(e: AuthEvent) {
  authListeners.forEach((cb) => cb(e));
}

async function performRefresh(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  try {
    // Appel direct (pas via `api` pour éviter la récursion dans les intercepteurs).
    const { data } = await axios.post(
      `${baseURL}/auth/refresh`,
      { refresh_token: refresh },
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );
    const access = data?.data?.access_token as string | undefined;
    const newRefresh = data?.data?.refresh_token as string | undefined;
    if (!access || !newRefresh) return null;
    await setTokens(access, newRefresh);
    return access;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // Réseau injoignable (pas de réponse HTTP du tout) → toast global informatif.
    // On évite de spammer sur les endpoints d'auth silencieux (hydratation /me au boot).
    if (!error.response && !original?.url?.includes('/auth/me')) {
      showToast('Connexion impossible au serveur. Vérifie ton réseau.', 'error');
    }

    // Rejet direct : non-401, pas de config, déjà retry, ou endpoint refresh lui-même.
    if (
      !original ||
      status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    // Un seul refresh à la fois — les autres requêtes attendent le résultat.
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;

    if (!newToken) {
      drainQueue(error, null);
      await clearTokens();
      emitAuth('logged-out');
      return Promise.reject(error);
    }

    drainQueue(null, newToken);

    // Rejoue la requête originale avec le nouveau token.
    if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);

/**
 * Normalise un message d'erreur API Laravel pour affichage UI.
 */
export function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.errors) {
      return Object.values(data.errors).flat().join(' ');
    }
    if (data?.message) return data.message;
    return error.message;
  }
  return 'Une erreur est survenue.';
}
