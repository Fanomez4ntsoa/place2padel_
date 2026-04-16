import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import type { Message } from '@/features/chat/types';
import { useConversations, useMessages, useSendMessage } from '@/features/chat/useChat';

/**
 * Conversation 1-1 — port d541157. Liste messages bubbles + composer bas.
 * Polling 10s sur useMessages et useConversations.
 */
export default function ConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const messagesQuery = useMessages(id);
  const sendMut = useSendMessage(id ?? '');
  const conversationsQuery = useConversations();

  const other = conversationsQuery.data?.find((c) => c.uuid === id)?.other_user;
  const messages = messagesQuery.data ?? [];
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sendMut.isPending) return;
    setText('');
    try {
      await sendMut.mutateAsync(trimmed);
    } catch (err) {
      setText(trimmed);
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <View className="flex-row items-center gap-3 border-b border-brand-border/60 bg-white px-4 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#1A2A4A" />
        </Pressable>
        <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-orange">
          {other?.picture_url ? (
            <Image
              source={{ uri: other.picture_url }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
            />
          ) : (
            <Text className="font-heading-black text-[13px] text-white">
              {(other?.name ?? '?').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text variant="h3" className="flex-1 text-[15px]" numberOfLines={1}>
          {other?.name ?? '—'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        className="flex-1"
      >
        {messagesQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#E8650A" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.uuid}
            renderItem={({ item }) => (
              <MessageBubble message={item} isMine={item.sender?.uuid === user?.uuid} />
            )}
            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Composer */}
        <View className="flex-row items-end gap-2 border-t border-brand-border/60 bg-white px-3 py-2.5">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Écris un message…"
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={2000}
            className="flex-1 max-h-28 rounded-2xl bg-brand-bg px-4 py-2.5 font-body text-[14px] text-brand-navy"
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sendMut.isPending}
            className="h-10 w-10 items-center justify-center rounded-full bg-brand-orange"
            style={{ opacity: !text.trim() || sendMut.isPending ? 0.5 : 1 }}
          >
            <Send size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <View className={`my-1 max-w-[80%] ${isMine ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-2xl px-3.5 py-2 ${isMine ? 'bg-brand-orange' : 'bg-white border border-brand-border'}`}
      >
        <Text
          variant="body"
          className={`text-[14px] leading-5 ${isMine ? 'text-white' : 'text-brand-navy'}`}
        >
          {message.text}
        </Text>
      </View>
      <Text
        variant="caption"
        className={`mt-0.5 text-[10px] ${isMine ? 'self-end' : 'self-start'}`}
      >
        {formatTime(message.created_at)}
      </Text>
    </View>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
