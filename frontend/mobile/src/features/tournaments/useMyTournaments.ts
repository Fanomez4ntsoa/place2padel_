import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

import type { TournamentSummary, TournamentsPage } from './types';

export type MyTournamentsStatus = 'in_progress' | 'upcoming' | 'completed';

/**
 * GET /tournaments/mine?status= — tournois où le viewer est engagé
 * (créateur OU captain/partner d'une équipe inscrite/waitlist).
 *
 * Distinct de /tournaments/for-me qui propose des tournois PUBLIC matchant
 * le profil (niveaux préférés + ville).
 *
 * Pagination standard 20/page via useInfiniteQuery.
 */
export function useMyTournaments(status: MyTournamentsStatus) {
  const { user } = useAuth();
  return useInfiniteQuery<TournamentsPage>({
    queryKey: ['tournaments', 'mine', user?.uuid, status],
    enabled: !!user,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get('/tournaments/mine', {
        params: { page: pageParam, per_page: 20, status },
      });
      return data as TournamentsPage;
    },
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    staleTime: 30_000,
  });
}

export function flattenMyTournaments(data: ReturnType<typeof useMyTournaments>['data']): TournamentSummary[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.data);
}
