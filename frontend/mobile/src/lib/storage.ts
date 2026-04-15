import * as SecureStore from 'expo-secure-store';

/**
 * Wrappers autour d'expo-secure-store pour les tokens d'auth.
 * SecureStore chiffre via Keychain (iOS) / Keystore (Android).
 */
const ACCESS_KEY = 'p2p.access_token';
const REFRESH_KEY = 'p2p.refresh_token';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, access),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
