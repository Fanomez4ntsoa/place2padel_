import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

import type {
  MatchingCandidate,
  MatchingCandidatesResponse,
  PlayerMatchEntry,
  SwipeResult,
} from './types';

/**
 * GET /matching/candidates — mode amical. Auth optionnelle côté backend,
 * mais le hook est désactivé sans user pour éviter un fetch public pendant
 * que l'UI impose la connexion pour liker.
 *
 * staleTime 60s : les swipes invalident explicitement le cache via
 * `useSwipeCandidate`, donc pas besoin de refetch fréquent.
 */
export function useMatchingCandidates(city?: string) {
  const { user } = useAuth();
  return useQuery<MatchingCandidate[]>({
    queryKey: ['matching', 'candidates', user?.uuid ?? 'anon', city ?? ''],
    enabled: true,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (city?.trim()) params.city = city.trim();
      const { data } = await api.get<MatchingCandidatesResponse>('/matching/candidates', {
        params,
      });
      return data.data;
    },
    staleTime: 60_000,
  });
}

/**
 * POST /matching/swipe. Retourne `{is_match, conversation_uuid, match_uuid}`.
 * L'écran appelant est responsable d'afficher le toast match + naviguer vers
 * la conversation — ce hook ne fait que persister.
 *
 * Invalide : candidates (retirer le target) + matches (si nouveau match).
 */
export function useSwipeCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { target_uuid: string; action: 'like' | 'pass' }) => {
      const { data } = await api.post<{ data: SwipeResult }>('/matching/swipe', payload);
      return data.data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['matching', 'candidates'] });
      if (result.is_match) {
        qc.invalidateQueries({ queryKey: ['matching', 'matches'] });
      }
    },
  });
}

/**
 * GET /matching/matches — liste des matches mutuels avec conversation_uuid.
 * Triée par created_at desc côté backend.
 */
export function useMatchingMatches() {
  const { user } = useAuth();
  return useQuery<PlayerMatchEntry[]>({
    queryKey: ['matching', 'matches', user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await api.get<{ data: PlayerMatchEntry[] }>('/matching/matches');
      return data.data;
    },
    staleTime: 30_000,
  });
}
