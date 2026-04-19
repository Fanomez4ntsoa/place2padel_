import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Text } from '@/design-system';
import { useConversations } from '@/features/conversations/useConversations';
import type { Conversation } from '@/features/conversations/types';

export default function ConversationsListScreen() {
  const router = useRouter();
  const { data, isLoading } = useConversations();

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#1A2A4A" />
        </Pressable>
        <Text variant="h2" className="flex-1 text-[20px]">
          Discussions
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}>
        {isLoading ? (
          <ActivityIndicator color="#E8650A" />
        ) : !data || data.length === 0 ? (
          <Card>
            <View className="items-center py-10">
              <MessageCircle size={28} color="#94A3B8" />
              <Text variant="h3" className="mt-2 text-[15px]">
                Aucune discussion
              </Text>
              <Text variant="caption" className="mt-1 text-center">
                Accepte une proposition partenaire pour démarrer une discussion.
              </Text>
            </View>
          </Card>
        ) : (
          data.map((c) => (
            <ConversationRow
              key={c.uuid}
              conversation={c}
              onPress={() => router.push(`/conversations/${c.uuid}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  const initial = (conversation.other_user?.name ?? '?').trim().charAt(0).toUpperCase();
  return (
    <Pressable onPress={onPress}>
      <View className="flex-row items-center gap-3 rounded-3xl border border-brand-border bg-white p-4">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy">
          <Text variant="body-medium" className="text-[16px] text-white">
            {initial}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="body-medium" className="text-[14px]" numberOfLines={1}>
            {conversation.other_user?.name ?? 'Joueur'}
          </Text>
          <Text variant="caption" className="mt-0.5 text-[12px]" numberOfLines={1}>
            {conversation.last_message ?? '…'}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text variant="caption" className="text-[10px]">
            {formatDateShort(conversation.last_message_at)}
          </Text>
          {conversation.unread_count > 0 ? (
            <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1.5">
              <Text className="text-[10px] font-heading-black text-white">
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 0) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays < 7) return `${diffDays}j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}
