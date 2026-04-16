import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

import type { Club, ClubSearchFilters } from './types';

interface ClubsPage {
  data: Club[];
  meta: { current_page: number; last_page: number; total: number };
}

/**
 * GET /clubs/search — recherche paginée (q, city, region, department).
 * Public (pas d'auth requise), backend force is_active=true.
 */
export function useClubsSearch(filters: ClubSearchFilters) {
  return useInfiniteQuery<ClubsPage>({
    queryKey: ['clubs', 'search', filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const params: Record<string, string | number> = {
        page: pageParam as number,
        per_page: 20,
      };
      if (filters.q?.trim()) params.q = filters.q.trim();
      if (filters.city?.trim()) params.city = filters.city.trim();
      if (filters.region) params.region = filters.region;
      if (filters.department) params.department = filters.department;
      const { data } = await api.get('/clubs/search', { params });
      return data as ClubsPage;
    },
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    staleTime: 60_000,
  });
}

export function flattenClubs(data: InfiniteData<ClubsPage> | undefined): Club[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.data);
}

/**
 * GET /clubs/search — version légère non paginée pour autocomplete (profil, wizards).
 * Désactivée si q < 2 caractères. staleTime 60s.
 */
export function useClubsQuickSearch(q: string, limit: number = 10) {
  return useQuery<Club[]>({
    queryKey: ['clubs', 'quick-search', q.trim(), limit],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const { data } = await api.get('/clubs/search', {
        params: { q: q.trim(), per_page: limit },
      });
      return (data?.data ?? []) as Club[];
    },
    staleTime: 60_000,
  });
}

export function useClub(uuid: string | undefined) {
  return useQuery<Club>({
    queryKey: ['club', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data } = await api.get(`/clubs/${uuid}`);
      return data.data as Club;
    },
    staleTime: 120_000,
  });
}

/**
 * GET /clubs/subscriptions — liste non paginée des clubs abonnés (max ~85).
 * Désactivée si non authentifié.
 */
export function useMyClubs() {
  const { user } = useAuth();
  return useQuery<Club[]>({
    queryKey: ['clubs', 'subscriptions', user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await api.get('/clubs/subscriptions');
      return (data?.data ?? []) as Club[];
    },
    staleTime: 30_000,
  });
}

/**
 * Toggle subscribe/unsubscribe sur un club. Utilise `isSubscribed` pour router
 * entre POST/DELETE. Met à jour la liste `clubs/subscriptions` dans le cache.
 */
export function useToggleClubSubscription() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ club, isSubscribed }: { club: Club; isSubscribed: boolean }) => {
      if (isSubscribed) {
        await api.delete(`/clubs/${club.uuid}/subscribe`);
        return { club, subscribed: false };
      }
      await api.post(`/clubs/${club.uuid}/subscribe`);
      return { club, subscribed: true };
    },
    onSuccess: ({ club, subscribed }) => {
      qc.setQueryData<Club[]>(['clubs', 'subscriptions', user?.uuid], (old) => {
        const list = old ?? [];
        if (subscribed) {
          if (list.some((c) => c.uuid === club.uuid)) return list;
          return [...list, club].sort((a, b) => a.name.localeCompare(b.name));
        }
        return list.filter((c) => c.uuid !== club.uuid);
      });
    },
  });
}
