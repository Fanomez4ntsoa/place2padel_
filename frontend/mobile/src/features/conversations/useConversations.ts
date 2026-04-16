import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

import type { Conversation, PrivateMessage } from './types';

/**
 * GET /conversations — liste conversations 1-1 du viewer.
 * Polling 15s (port Emergent ChatPage loadConversations 4s — on relâche pour mobile/batterie).
 */
export function useConversations() {
  const { user } = useAuth();
  return useQuery<Conversation[]>({
    queryKey: ['conversations', user?.uuid],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await api.get('/conversations');
      return (data?.data ?? []) as Conversation[];
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

/**
 * GET /conversations/{uuid}/messages — messages ordre chronologique ASC.
 * Polling 10s sur l'écran chat ouvert (conforme demande — cf Emergent interval 4s, relâché mobile).
 */
export function useMessages(conversationUuid: string | undefined) {
  return useQuery<PrivateMessage[]>({
    queryKey: ['conversations', conversationUuid, 'messages'],
    enabled: !!conversationUuid,
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${conversationUuid}/messages`);
      return (data?.data ?? []) as PrivateMessage[];
    },
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

export function useSendMessage(conversationUuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post(`/conversations/${conversationUuid}/messages`, { text });
      return data.data as PrivateMessage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations', conversationUuid, 'messages'] });
      // Rafraîchir aussi la liste (last_message + last_message_at changent).
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['counters', 'messages'] });
    },
  });
}
