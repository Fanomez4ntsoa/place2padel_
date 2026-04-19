import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { invalidateFeedKeys } from '@/lib/invalidations';

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

/**
 * POST /tournaments — création via wizard Referee/Admin.
 * Contrat backend StoreTournamentRequest (Laravel) :
 *   club_uuid (UUID clubs.is_active=true), name (3-191), type, level,
 *   date (Y-m-d, future), start_time (H:i optional), inscription_deadline
 *   (nullable, <= date), max_teams (2-64), courts_available (1-20),
 *   price (nullable, 50 chars max), payment_method (on_site|online).
 */
export interface CreateTournamentBody {
  club_uuid: string;
  name: string;
  location?: string | null;
  type: 'masculin' | 'feminin' | 'mixte' | 'open';
  level: 'P25' | 'P50' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P2000';
  date: string; // YYYY-MM-DD
  start_time?: string; // HH:MM
  inscription_deadline?: string | null;
  max_teams: number;
  courts_available?: number;
  price?: string | null;
  payment_method?: 'on_site' | 'online' | null;
}

export function useCreateTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTournamentBody) => {
      const { data } = await api.post('/tournaments', body);
      return data.data as TournamentSummary;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      qc.invalidateQueries({ queryKey: ['tournaments', 'mine'] });
      // Listener backend CreateSystemPostOnTournamentCreated injecte un post.
      invalidateFeedKeys(qc);
    },
  });
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
      // Listener backend peut créer un post système (milestones de remplissage).
      invalidateFeedKeys(qc);
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

export interface MySeekingEntry {
  tournament: {
    uuid: string;
    name: string;
    level: string;
    date: string;
    club: { name: string; city: string } | null;
  };
  message: string | null;
  created_at: string;
}

/**
 * GET /seeking-partner/my — liste des tournois où le viewer s'est déclaré seul.
 * Source de vérité pour savoir si l'user est seeking sur un tournoi donné
 * (la liste /seeking-partners exclut le viewer lui-même côté backend).
 */
export function useMySeekingTournaments(enabled: boolean = true) {
  return useQuery<MySeekingEntry[]>({
    queryKey: ['my-seeking'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get('/seeking-partner/my');
      return (data?.data ?? []) as MySeekingEntry[];
    },
    staleTime: 30_000,
  });
}

interface SeekPayload {
  seek: boolean;
  message?: string | null;
}

export function useToggleSeeking(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SeekPayload | boolean) => {
      const { seek, message } =
        typeof payload === 'boolean' ? { seek: payload, message: undefined } : payload;
      if (seek) {
        const body = message && message.trim().length > 0 ? { message: message.trim() } : {};
        await api.post(`/tournaments/${uuid}/seeking-partner`, body);
      } else {
        await api.delete(`/tournaments/${uuid}/seeking-partner`);
      }
      return seek;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seeking-partners', uuid] });
      qc.invalidateQueries({ queryKey: ['my-seeking'] });
    },
  });
}

/**
 * GET /tournaments/{uuid}/qrcode — payload QR (share_link) + metadata légère.
 * La génération de l'image QR est déléguée au client (react-native-qrcode-svg).
 */
export interface TournamentQrData {
  share_link: string;
  tournament: { uuid: string; name: string; date: string | null; status: string };
  club: { name: string; city: string };
}

/**
 * DELETE /tournaments/{uuid} — owner-only. Autorisé sur open/full/in_progress,
 * interdit sur completed côté backend. Invalide toutes les caches qui listent
 * ce tournoi pour retirer la card immédiatement.
 */
export function useDeleteTournament(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/tournaments/${uuid}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      qc.invalidateQueries({ queryKey: ['tournaments', 'mine'] });
      qc.removeQueries({ queryKey: ['tournament', uuid] });
      invalidateFeedKeys(qc);
    },
  });
}

export function useTournamentQr(uuid: string | undefined, enabled: boolean = true) {
  return useQuery<TournamentQrData>({
    queryKey: ['tournament-qr', uuid],
    enabled: !!uuid && enabled,
    queryFn: async () => {
      const { data } = await api.get(`/tournaments/${uuid}/qrcode`);
      return data.data as TournamentQrData;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * POST /tournaments/{uuid}/launch — clôt les inscriptions, transition
 * status → in_progress, génère les matchs en async (GenerateMatchesJob).
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
