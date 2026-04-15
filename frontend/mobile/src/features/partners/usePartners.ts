import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { SeekingPartnersResponse } from './types';

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
