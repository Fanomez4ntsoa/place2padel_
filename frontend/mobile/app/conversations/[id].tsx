import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
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

import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import {
  useConversations,
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

  const [text, setText] = useState('');
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
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 border-b border-brand-border bg-white px-4 pb-3 pt-2">
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
