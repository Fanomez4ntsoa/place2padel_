import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

import type { AppNotification, NotificationsPage } from './types';

/**
 * GET /notifications paginé — 20/page par défaut (backend).
 * Infinite scroll : next page quand last.current_page < last.last_page.
 * Désactivé si non-auth (le endpoint réclame Sanctum).
 */
export function useNotifications() {
  const { user } = useAuth();
  return useInfiniteQuery<NotificationsPage>({
    queryKey: ['notifications', user?.uuid],
    enabled: !!user,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get('/notifications', {
        params: { page: pageParam, per_page: 20 },
      });
      return data as NotificationsPage;
    },
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    staleTime: 15_000,
  });
}

export function flattenNotifications(
  data: InfiniteData<NotificationsPage> | undefined,
): AppNotification[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.data);
}

/**
 * PUT /notifications/{uuid}/read — marque une notif comme lue.
 * Sur succès : invalide la liste + le badge compteur AppHeader.
 */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      const { data } = await api.put(`/notifications/${uuid}/read`);
      return data.data as AppNotification;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['counters', 'notifications'] });
    },
  });
}

/**
 * PUT /notifications/read-all — bulk mark.
 * Sur succès : invalide la liste + le badge compteur AppHeader.
 */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['counters', 'notifications'] });
    },
  });
}
