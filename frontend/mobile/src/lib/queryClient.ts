import { QueryClient } from '@tanstack/react-query';

/**
 * Instance unique TanStack Query. Défauts conservateurs pour mobile :
 * - staleTime court (60s) mais pas zéro (évite le refetch à chaque focus écran).
 * - retry=1 pour ne pas pilonner l'API en cas de coupure réseau.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
