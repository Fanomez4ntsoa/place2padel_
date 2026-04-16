import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

import type { Conversation, Message } from './types';

/**
 * GET /conversations — liste triée par last_message_at DESC avec unread_count.
 * Polling 10s pour approximer du temps réel sans WebSocket (décision CLAUDE.md).
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
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

/**
 * GET /conversations/{uuid}/messages — 200 derniers messages ordre chronologique (ASC).
 */
export function useMessages(conversationUuid: string | undefined) {
  return useQuery<Message[]>({
    queryKey: ['messages', conversationUuid],
    enabled: !!conversationUuid,
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${conversationUuid}/messages`);
      return (data?.data ?? []) as Message[];
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

/**
 * POST /conversations/{uuid}/messages — envoi texte. Append optimiste au cache
 * puis rollback si 422. L'invalidation conversations remonte le last_message.
 */
export function useSendMessage(conversationUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post(`/conversations/${conversationUuid}/messages`, {
        text,
      });
      return data.data as Message;
    },
    onSuccess: (msg) => {
      qc.setQueryData<Message[]>(['messages', conversationUuid], (old) => [
        ...(old ?? []),
        msg,
      ]);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
