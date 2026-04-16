import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type {
  Pool,
  RankingResponse,
  TournamentMatch,
} from './types';

/**
 * GET /tournaments/{uuid}/matches — liste complète ordonnée (round, match_number, id).
 */
export function useTournamentMatches(tournamentUuid: string | undefined) {
  return useQuery<TournamentMatch[]>({
    queryKey: ['tournament-matches', tournamentUuid],
    enabled: !!tournamentUuid,
    queryFn: async () => {
      const { data } = await api.get(`/tournaments/${tournamentUuid}/matches`);
      return (data?.data ?? []) as TournamentMatch[];
    },
    staleTime: 15_000,
  });
}

export function useTournamentPools(tournamentUuid: string | undefined) {
  return useQuery<Pool[]>({
    queryKey: ['tournament-pools', tournamentUuid],
    enabled: !!tournamentUuid,
    queryFn: async () => {
      const { data } = await api.get(`/tournaments/${tournamentUuid}/pools`);
      return (data?.data ?? []) as Pool[];
    },
    staleTime: 30_000,
  });
}

export function useTournamentRanking(tournamentUuid: string | undefined) {
  return useQuery<RankingResponse>({
    queryKey: ['tournament-ranking', tournamentUuid],
    enabled: !!tournamentUuid,
    queryFn: async () => {
      const { data } = await api.get(`/tournaments/${tournamentUuid}/ranking`);
      return data as RankingResponse;
    },
    staleTime: 30_000,
  });
}

interface ScorePayload {
  team1_games: number;
  team2_games: number;
  tiebreak_team1?: number | null;
  tiebreak_team2?: number | null;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, tournamentUuid: string) {
  qc.invalidateQueries({ queryKey: ['tournament-matches', tournamentUuid] });
  qc.invalidateQueries({ queryKey: ['tournament-pools', tournamentUuid] });
  qc.invalidateQueries({ queryKey: ['tournament-ranking', tournamentUuid] });
}

export function useSubmitScore(tournamentUuid: string, matchUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ScorePayload) => {
      const { data } = await api.put(`/matches/${matchUuid}/score`, payload);
      return data.data as TournamentMatch;
    },
    onSuccess: () => invalidateAll(qc, tournamentUuid),
  });
}

export function useValidateScore(tournamentUuid: string, matchUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (team: 'team1' | 'team2') => {
      const { data } = await api.put(`/matches/${matchUuid}/validate`, { team });
      return data.data as TournamentMatch;
    },
    onSuccess: () => invalidateAll(qc, tournamentUuid),
  });
}

export function useForfeitMatch(tournamentUuid: string, matchUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (winnerTeamId: number) => {
      const { data } = await api.post(`/matches/${matchUuid}/forfeit`, {
        winner_team_id: winnerTeamId,
      });
      return data.data as TournamentMatch;
    },
    onSuccess: () => invalidateAll(qc, tournamentUuid),
  });
}
