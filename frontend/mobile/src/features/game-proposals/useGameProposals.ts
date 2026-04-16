import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

import type { GameProposal, GameProposalResponse } from './types';

export function useGameProposals() {
  const { user } = useAuth();
  return useQuery<GameProposal[]>({
    queryKey: ['game-proposals', 'my', user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await api.get('/game-proposals/my');
      return (data?.data ?? []) as GameProposal[];
    },
    staleTime: 15_000,
  });
}

interface CreatePayload {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration_min?: number;
  club?: string;
  club_city?: string;
  invitee_uuids: string[];
}

export function useCreateGameProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      const { data } = await api.post('/game-proposals', payload);
      return data.data as GameProposal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-proposals', 'my'] });
    },
  });
}

export function useRespondGameProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { uuid: string; response: Exclude<GameProposalResponse, 'pending'> }) => {
      const { data } = await api.put(`/game-proposals/${payload.uuid}/respond`, {
        response: payload.response,
      });
      return data.data as GameProposal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-proposals', 'my'] });
    },
  });
}

export function useCancelGameProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/game-proposals/${uuid}`);
      return uuid;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-proposals', 'my'] });
    },
  });
}

interface StartPayload {
  uuid: string;
  partner_uuid: string;
  opponent1_uuid: string;
  opponent2_uuid: string;
}

export function useStartGameProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StartPayload) => {
      const { data } = await api.post(`/game-proposals/${payload.uuid}/start`, {
        partner_uuid: payload.partner_uuid,
        opponent1_uuid: payload.opponent1_uuid,
        opponent2_uuid: payload.opponent2_uuid,
      });
      return data.data as { proposal_uuid: string; friendly_match_uuid: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-proposals', 'my'] });
      qc.invalidateQueries({ queryKey: ['friendly-matches', 'my'] });
    },
  });
}
