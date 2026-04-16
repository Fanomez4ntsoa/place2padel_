import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { Proposal, ProposalDirection } from './types';

/**
 * GET /proposals?direction=received|sent — liste paginée (20/page).
 * Le backend filtre via to_user_id / from_user_id selon direction.
 * Ordonné par created_at DESC.
 */
export function useProposals(direction: ProposalDirection) {
  return useQuery<Proposal[]>({
    queryKey: ['proposals', direction],
    queryFn: async () => {
      const { data } = await api.get('/proposals', { params: { direction } });
      return (data?.data ?? []) as Proposal[];
    },
    staleTime: 15_000,
  });
}

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
      // Accept crée une conversation côté backend (ProposalResponded listener).
      // Invalider aussi ['counters', 'messages'] pour que le badge AppHeader
      // bascule immédiatement sans attendre le refetchInterval de 30s.
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['counters', 'messages'] });
    },
  });
}

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
