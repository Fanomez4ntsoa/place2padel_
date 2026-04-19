import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Swords, Trophy } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProposeFriendlyMatchSheet } from '@/components/chat/ProposeFriendlyMatchSheet';
import { ProposeTournamentSheet } from '@/components/chat/ProposeTournamentSheet';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import {
  useConversations,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from '@/features/conversations/useConversations';
import type { PrivateMessage } from '@/features/conversations/types';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const conversationUuid = params.id;
  const { user } = useAuth();

  const convsQuery = useConversations();
  const messagesQuery = useMessages(conversationUuid);
  const sendMut = useSendMessage(conversationUuid);
  const markReadMut = useMarkConversationRead();

  const [text, setText] = useState('');
  const [sheet, setSheet] = useState<'tournament' | 'friendly' | null>(null);
  const listRef = useRef<FlatList<PrivateMessage>>(null);

  const conversation = useMemo(
    () => convsQuery.data?.find((c) => c.uuid === conversationUuid),
    [convsQuery.data, conversationUuid],
  );
  const otherUser = conversation?.other_user;
  const messages = messagesQuery.data ?? [];

  // Scroll auto en bas à chaque nouveau message (y compris polling).
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  // Mark-read : à chaque arrivée de messages (mount + polling) on pose read_at
  // côté backend. Idempotent (marked_read=0 si rien à marquer), pas besoin de
  // guard. L'invalidation de ['conversations'] + ['counters', 'messages']
  // fait disparaître le badge immédiatement.
  useEffect(() => {
    if (!conversationUuid || messages.length === 0) return;
    markReadMut.mutate(conversationUuid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationUuid, messages.length]);

  const initial = (otherUser?.name ?? '?').trim().charAt(0).toUpperCase();

  const handleSend = async () => {
    const clean = text.trim();
    if (!clean) return;
    try {
      await sendMut.mutateAsync(clean);
      setText('');
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="border-b border-brand-border bg-white">
          <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
            <Pressable
              onPress={() => router.back()}
              className="h-9 w-9 items-center justify-center rounded-full"
              hitSlop={8}
            >
              <ArrowLeft size={20} color="#1A2A4A" />
            </Pressable>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-navy">
              <Text className="text-[13px] font-heading-black text-white">{initial}</Text>
            </View>
            <View className="flex-1">
              <Text variant="body-medium" className="text-[14px]" numberOfLines={1}>
                {otherUser?.name ?? 'Discussion'}
              </Text>
            </View>
          </View>

          {/* CTAs propositions — port chat Emergent d5ac086 ChatPage.js (2 dialogs) */}
          {otherUser ? (
            <View className="flex-row gap-2 px-4 pb-3">
              <Pressable
                onPress={() => setSheet('tournament')}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-brand-orange/30 bg-brand-orange-light py-2"
              >
                <Trophy size={13} color="#E8650A" />
                <Text className="font-heading text-[12px] text-brand-orange">Proposer un tournoi</Text>
              </Pressable>
              <Pressable
                onPress={() => setSheet('friendly')}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-brand-navy/20 bg-slate-50 py-2"
              >
                <Swords size={13} color="#1A2A4A" />
                <Text className="font-heading text-[12px] text-brand-navy">Match amical</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Messages */}
        {messagesQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#E8650A" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.uuid}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <MessageBubble message={item} viewerUuid={user?.uuid ?? null} />
            )}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Composer */}
        <View className="flex-row items-center gap-2 border-t border-brand-border bg-white px-4 py-3">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Écris un message…"
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={5000}
            className="max-h-[100px] flex-1 rounded-full border border-brand-border bg-brand-bg px-4 py-2.5 font-body text-[14px] text-brand-navy"
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sendMut.isPending}
            className="h-10 w-10 items-center justify-center rounded-full bg-brand-orange"
            style={{ opacity: !text.trim() || sendMut.isPending ? 0.4 : 1 }}
          >
            <Send size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Sheets propositions — rendus hors KeyboardAvoidingView pour overlay plein écran */}
      {otherUser ? (
        <>
          <ProposeTournamentSheet
            visible={sheet === 'tournament'}
            onClose={() => setSheet(null)}
            targetUser={{ uuid: otherUser.uuid, name: otherUser.name }}
          />
          <ProposeFriendlyMatchSheet
            visible={sheet === 'friendly'}
            onClose={() => setSheet(null)}
            opponent1={{
              uuid: otherUser.uuid,
              name: otherUser.name,
              picture_url: otherUser.picture_url ?? null,
            }}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  viewerUuid,
}: {
  message: PrivateMessage;
  viewerUuid: string | null;
}) {
  const isSystem = message.type === 'system';
  const isMe = !!viewerUuid && message.sender?.uuid === viewerUuid;

  if (isSystem) {
    return (
      <View className="items-center">
        <View className="rounded-full bg-brand-navy/5 px-3 py-1">
          <Text variant="caption" className="text-[11px]">
            {message.text}
          </Text>
        </View>
      </View>
    );
  }

  const isProposal = message.type === 'tournament_proposal' || message.type === 'match_proposal';

  return (
    <View className={`max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-2xl px-3.5 py-2.5 ${
          isProposal
            ? 'border border-brand-orange/30 bg-brand-orange-light'
            : isMe
              ? 'bg-brand-orange'
              : 'border border-brand-border bg-white'
        }`}
      >
        {isProposal ? (
          <Text variant="caption" className="mb-1 text-[10px] font-heading-black uppercase text-brand-orange">
            {message.type === 'tournament_proposal' ? 'Tournoi' : 'Match amical'}
          </Text>
        ) : null}
        <Text
          variant="body"
          className={`text-[13px] leading-[18px] ${
            isProposal ? 'text-brand-navy' : isMe ? 'text-white' : 'text-brand-navy'
          }`}
        >
          {message.text}
        </Text>
        <Text
          variant="caption"
          className={`mt-1 text-[10px] ${
            isProposal ? 'text-brand-navy/60' : isMe ? 'text-white/60' : 'text-brand-navy/60'
          }`}
        >
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
