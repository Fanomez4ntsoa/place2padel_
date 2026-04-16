import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

import type {
  MySeeking,
  Proposal,
  ProposalDirection,
  ProposalStatus,
  SeekingPartnersResponse,
} from './types';

/**
 * GET /tournaments/{uuid}/seeking-partners — auth requise pour voir la liste
 * détaillée avec scores de compatibilité (sinon count uniquement).
 */
export function useSeekingPartners(tournamentUuid: string | null) {
  return useQuery<SeekingPartnersResponse>({
    queryKey: ['seeking-partners', tournamentUuid],
    enabled: !!tournamentUuid,
    queryFn: async () => {
      const { data } = await api.get(`/tournaments/${tournamentUuid}/seeking-partners`);
      return data as SeekingPartnersResponse;
    },
    staleTime: 30_000,
  });
}

/**
 * POST /tournaments/{uuid}/propose-to-partner — crée une proposition de
 * partenariat. Le backend refuse si la cible n'a pas déclaré seeking-partner.
 */
export function useProposeToPartner(tournamentUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { target_user_uuid: string; message?: string }) => {
      const { data } = await api.post(
        `/tournaments/${tournamentUuid}/propose-to-partner`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

/**
 * GET /seeking-partner/my — mes déclarations "je suis seul" actives.
 */
export function useMySeekings() {
  const { user } = useAuth();
  return useQuery<MySeeking[]>({
    queryKey: ['my-seekings', user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await api.get('/seeking-partner/my');
      return (data?.data ?? []) as MySeeking[];
    },
    staleTime: 30_000,
  });
}

interface ProposalsResponse {
  data: Proposal[];
  meta: { current_page: number; last_page: number; total: number };
}

/**
 * GET /proposals — filtrage direction (received/sent/all) + status optionnel.
 */
export function useProposals(direction: ProposalDirection | 'all', status?: ProposalStatus) {
  const { user } = useAuth();
  return useQuery<ProposalsResponse>({
    queryKey: ['proposals', direction, status ?? null, user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const params: Record<string, string | number> = { direction, per_page: 50 };
      if (status) params.status = status;
      const { data } = await api.get('/proposals', { params });
      return data as ProposalsResponse;
    },
    staleTime: 15_000,
  });
}

/**
 * PUT /proposals/{uuid}/respond — accepter ou refuser.
 * Une acceptation crée côté backend une conversation (Phase 6.2 G3 chat).
 */
export function useRespondProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { uuid: string; response: 'accepted' | 'refused' }) => {
      const { data } = await api.put(`/proposals/${payload.uuid}/respond`, {
        response: payload.response,
      });
      return data.data as Proposal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * DELETE /proposals/{uuid} — annulation (sender uniquement, pending uniquement).
 */
export function useCancelProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/proposals/${uuid}`);
      return uuid;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}
