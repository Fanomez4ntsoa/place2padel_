import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { invalidateFeedKeys } from '@/lib/invalidations';

import type {
  FriendlyMatch,
  FriendlyStatus,
  MatchHistoryEntry,
  UserElo,
} from './types';

export function useFriendlyMatches(status?: FriendlyStatus) {
  const { user } = useAuth();
  return useQuery<FriendlyMatch[]>({
    queryKey: ['friendly-matches', 'my', status ?? 'all', user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const { data } = await api.get('/friendly-matches/my', { params });
      return (data?.data ?? []) as FriendlyMatch[];
    },
    staleTime: 15_000,
  });
}

/**
 * GET /friendly-matches/{uuid} — détail.
 *
 * Polling accéléré à 5s quand le match est `in_progress` (port Emergent
 * FriendlyMatchLivePage.js:33 `setInterval(loadMatch, 5000)`) — les
 * spectateurs suivent le score live. Ralenti à 30s pour les autres statuts
 * (pending/accepted/completed/declined) — économise batterie et réseau.
 */
export function useFriendlyMatch(uuid: string | undefined) {
  return useQuery<FriendlyMatch>({
    queryKey: ['friendly-match', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data } = await api.get(`/friendly-matches/${uuid}`);
      return data.data as FriendlyMatch;
    },
    staleTime: 3_000,
    refetchInterval: (query) => {
      const m = query.state.data;
      if (!m) return 10_000;
      return m.status === 'in_progress' ? 5_000 : 30_000;
    },
  });
}

/**
 * POST /friendly-matches/{uuid}/result-photo — upload photo post-match
 * (multipart FormData `photo`). Backend contrôle participant-only et
 * stocke l'URL dans friendly_matches.result_photo_url. Port Emergent
 * FriendlyMatchLivePage.js:91-105.
 */
export function useUploadResultPhoto(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      form.append('photo', asset as unknown as Blob);
      const { data } = await api.post(
        `/friendly-matches/${uuid}/result-photo`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data as FriendlyMatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friendly-match', uuid] });
      qc.invalidateQueries({ queryKey: ['friendly-matches', 'my'] });
      // Le post système match_result créé au validate est rafraîchi avec
      // la nouvelle image — invalide le feed pour re-fetch.
      invalidateFeedKeys(qc);
    },
  });
}

interface CreatePayload {
  partner_uuid: string;
  opponent1_uuid: string;
  opponent2_uuid: string;
}

export function useCreateFriendlyMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      const { data } = await api.post('/friendly-matches', payload);
      return data.data as FriendlyMatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friendly-matches', 'my'] });
      invalidateFeedKeys(qc);
    },
  });
}

function invalidateMatch(qc: ReturnType<typeof useQueryClient>, uuid: string) {
  qc.invalidateQueries({ queryKey: ['friendly-match', uuid] });
  qc.invalidateQueries({ queryKey: ['friendly-matches', 'my'] });
}

export function useAcceptFriendlyMatch(uuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put(`/friendly-matches/${uuid}/accept`);
      return data.data as FriendlyMatch;
    },
    onSuccess: () => invalidateMatch(qc, uuid),
  });
}

export function useDeclineFriendlyMatch(uuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/friendly-matches/${uuid}/accept`);
      return data.data as FriendlyMatch;
    },
    onSuccess: () => invalidateMatch(qc, uuid),
  });
}

export function useStartFriendlyMatch(uuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put(`/friendly-matches/${uuid}/start`);
      return data.data as FriendlyMatch;
    },
    onSuccess: () => invalidateMatch(qc, uuid),
  });
}

interface ScorePayload {
  team1_games: number;
  team2_games: number;
  tiebreak_team1?: number | null;
  tiebreak_team2?: number | null;
}

export function useSubmitFriendlyScore(uuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ScorePayload) => {
      const { data } = await api.put(`/friendly-matches/${uuid}/score`, payload);
      return data.data as FriendlyMatch;
    },
    onSuccess: () => invalidateMatch(qc, uuid),
  });
}

export function useValidateFriendlyMatch(uuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (team: 1 | 2) => {
      const { data } = await api.put(`/friendly-matches/${uuid}/validate`, { team });
      return data.data as FriendlyMatch;
    },
    onSuccess: (match) => {
      invalidateMatch(qc, uuid);
      // Les ELOs des 4 participants peuvent avoir changé.
      match.team1.concat(match.team2).forEach((p) => {
        if (p.user) qc.invalidateQueries({ queryKey: ['user-elo', p.user.uuid] });
      });
      // La validation finale déclenche un post système de résultat.
      invalidateFeedKeys(qc);
    },
  });
}

export function useUserElo(userUuid: string | undefined) {
  return useQuery<UserElo>({
    queryKey: ['user-elo', userUuid],
    enabled: !!userUuid,
    queryFn: async () => {
      const { data } = await api.get(`/users/${userUuid}/elo`);
      return data.data as UserElo;
    },
    staleTime: 30_000,
  });
}

export function useMatchHistory(userUuid: string | undefined) {
  return useQuery<MatchHistoryEntry[]>({
    queryKey: ['match-history', userUuid],
    enabled: !!userUuid,
    queryFn: async () => {
      const { data } = await api.get(`/users/${userUuid}/match-history`);
      return (data?.data ?? []) as MatchHistoryEntry[];
    },
    staleTime: 30_000,
  });
}

interface SearchUser {
  uuid: string;
  name: string;
  picture_url: string | null;
  /** Array de clubs par priority — ProfileResource projection. */
  clubs?: Array<{ uuid: string; name: string; city: string; priority?: number }>;
}

/**
 * Recherche utilisateurs pour la création de match amical (partenaire, adversaires).
 * Debounce côté composant.
 */
export function useUserSearch(q: string) {
  return useQuery<SearchUser[]>({
    queryKey: ['users-search', q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const { data } = await api.get('/users/search', { params: { q: q.trim(), per_page: 10 } });
      return (data?.data ?? []) as SearchUser[];
    },
    staleTime: 60_000,
  });
}
