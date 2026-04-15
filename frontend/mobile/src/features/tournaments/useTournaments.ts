import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { TournamentLevel, TournamentStatus, TournamentSummary } from './types';

export interface TournamentFilters {
  city?: string;
  level?: TournamentLevel | '';
  status?: TournamentStatus | '';
  dateFrom?: string;
  dateTo?: string;
  perPage?: number;
}

interface Page {
  data: TournamentSummary[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

/**
 * Liste paginée des tournois — infinite scroll via useInfiniteQuery.
 * Les filtres vides sont exclus des paramètres (backend accepte `when(filled)`).
 *
 * Le radius km est UI-only (backend ne filtre pas par distance tant que
 * les clubs n'ont pas lat/lon peuplés — cf. CLAUDE.md Phase 2 GeocodeClubsJob).
 */
export function useTournaments(filters: TournamentFilters) {
  return useInfiniteQuery<Page>({
    queryKey: ['tournaments', filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const params: Record<string, string | number> = {
        page: pageParam as number,
        per_page: filters.perPage ?? 20,
      };
      if (filters.city?.trim()) params.city = filters.city.trim();
      if (filters.level) params.level = filters.level;
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const { data } = await api.get('/tournaments', { params });
      return data as Page;
    },
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    staleTime: 30_000,
  });
}

/**
 * Helper : aplatit toutes les pages en un seul tableau pour FlatList.
 */
export function flattenTournamentPages(
  pages: { data: TournamentSummary[] }[] | undefined,
): TournamentSummary[] {
  if (!pages) return [];
  return pages.flatMap((p) => p.data);
}
