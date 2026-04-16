import { useQueries } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { Club } from '@/features/clubs/types';
import type { TournamentSummary } from '@/features/tournaments/types';

interface SearchUserRow {
  uuid: string;
  name: string;
  picture_url: string | null;
  city?: string | null;
  profile?: { padel_points?: number | null } | null;
  clubs?: Array<{ name: string; city: string }>;
}

export interface UniversalSearchResults {
  tournaments: TournamentSummary[];
  clubs: Club[];
  users: SearchUserRow[];
}

/**
 * Recherche universelle fédérée — port AppHeader.js Emergent 39b6544.
 *
 * Fan-out 3 requêtes parallèles (/tournaments?q, /clubs/search?q,
 * /users/search?q). useQueries gère les caches séparément (q de 2 chars min).
 * Debounce attendu côté caller via useDebouncedValue (applicatif).
 *
 * Retourne top 3 tournois, top 3 clubs, top 5 joueurs + loading/empty states.
 */
export function useUniversalSearch(q: string) {
  const enabled = q.trim().length >= 2;
  const results = useQueries({
    queries: [
      {
        queryKey: ['search', 'tournaments', q.trim()],
        enabled,
        queryFn: async () => {
          const { data } = await api.get('/tournaments', {
            params: { q: q.trim(), per_page: 3 },
          });
          return (data?.data ?? []) as TournamentSummary[];
        },
        staleTime: 30_000,
      },
      {
        queryKey: ['search', 'clubs', q.trim()],
        enabled,
        queryFn: async () => {
          const { data } = await api.get('/clubs/search', {
            params: { q: q.trim(), per_page: 3 },
          });
          return (data?.data ?? []) as Club[];
        },
        staleTime: 30_000,
      },
      {
        queryKey: ['search', 'users', q.trim()],
        enabled,
        queryFn: async () => {
          const { data } = await api.get('/users/search', {
            params: { q: q.trim(), per_page: 5 },
          });
          return (data?.data ?? []) as SearchUserRow[];
        },
        staleTime: 30_000,
      },
    ],
  });

  const [t, c, u] = results;
  return {
    enabled,
    isLoading: enabled && results.some((r) => r.isLoading),
    data: {
      tournaments: t.data ?? [],
      clubs: c.data ?? [],
      users: u.data ?? [],
    } as UniversalSearchResults,
    totalCount: (t.data?.length ?? 0) + (c.data?.length ?? 0) + (u.data?.length ?? 0),
  };
}
