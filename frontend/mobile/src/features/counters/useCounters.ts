import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

/**
 * Compteurs temps réel pour l'AppHeader — messages non lus + notifs non lues.
 * Refresh 30s (miroir de l'interval Emergent AppHeader d541157).
 * Désactivé si non-authentifié.
 */
export function useUnreadCounters() {
  const { user } = useAuth();

  const messagesQuery = useQuery({
    queryKey: ['counters', 'messages', user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await api.get('/conversations');
      const list = (data?.data ?? []) as Array<{ unread_count?: number }>;
      return list.filter((c) => (c.unread_count ?? 0) > 0).length;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const notifsQuery = useQuery({
    queryKey: ['counters', 'notifications', user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: { unread: 1 } });
      return (data?.meta?.total as number | undefined) ?? (data?.data?.length ?? 0);
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return {
    unreadMessages: messagesQuery.data ?? 0,
    unreadNotifications: notifsQuery.data ?? 0,
  };
}
