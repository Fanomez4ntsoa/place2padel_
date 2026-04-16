import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { TournamentSummary } from './types';

interface TeamMember {
  uuid: string | null;
  name: string;
}

export interface TournamentTeamDetail {
  id: number;
  uuid?: string;
  team_name: string;
  captain: TeamMember;
  partner: TeamMember | null;
  team_points: number;
  seed: number | null;
  status: 'registered' | 'waitlisted';
  registered_at: string;
}

export interface TournamentDetail extends TournamentSummary {
  teams?: TournamentTeamDetail[];
  waitlist?: TournamentTeamDetail[];
  creator?: { uuid: string; name: string };
}

export function useTournament(uuid: string | undefined) {
  return useQuery<TournamentDetail>({
    queryKey: ['tournament', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data } = await api.get(`/tournaments/${uuid}`);
      return data.data as TournamentDetail;
    },
  });
}

/**
 * POST /tournaments/{uuid}/launch — clôt les inscriptions, transition status
 * → in_progress, génère les matchs en async (GenerateMatchesJob queue high).
 * Autorisation : owner ou admin, min 2 équipes registered, status open/full.
 */
export function useLaunchTournament(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/tournaments/${uuid}/launch`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournament', uuid] });
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      qc.invalidateQueries({ queryKey: ['tournament-matches', uuid] });
      qc.invalidateQueries({ queryKey: ['tournament-pools', uuid] });
      qc.invalidateQueries({ queryKey: ['tournament-ranking', uuid] });
    },
  });
}

/** Inscription simple — sans partenaire (Phase 6.1). Backend accepte partner_uuid optionnel. */
export function useRegisterTeam(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partnerUuid?: string) => {
      const body = partnerUuid ? { partner_uuid: partnerUuid } : {};
      const { data } = await api.post(`/tournaments/${uuid}/register`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournament', uuid] });
      qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useUnregisterTeam(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/tournaments/${uuid}/register`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournament', uuid] });
      qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useSeekingPartners(uuid: string | undefined) {
  return useQuery({
    queryKey: ['seeking-partners', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data } = await api.get(`/tournaments/${uuid}/seeking-partners`);
      return data as {
        data: Array<{
          user: { uuid: string; name: string; picture_url?: string | null };
          message?: string | null;
          compatibility_score?: number;
        }>;
        meta: { authenticated: boolean; count: number };
      };
    },
  });
}

export function useToggleSeeking(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { seek: boolean; message?: string }) => {
      if (payload.seek) {
        const body = payload.message?.trim() ? { message: payload.message.trim() } : {};
        await api.post(`/tournaments/${uuid}/seeking-partner`, body);
      } else {
        await api.delete(`/tournaments/${uuid}/seeking-partner`);
      }
      return payload.seek;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seeking-partners', uuid] });
      qc.invalidateQueries({ queryKey: ['my-seekings'] });
    },
  });
}
