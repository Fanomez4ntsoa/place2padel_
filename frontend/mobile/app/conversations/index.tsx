import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/design-system';
import type { Conversation } from '@/features/chat/types';
import { useConversations } from '@/features/chat/useChat';

/**
 * Liste des conversations — port d541157. Polling 10s via useConversations.
 * Tap → détail conversation. Badge unread_count orange.
 */
export default function ConversationsScreen() {
  const router = useRouter();
  const query = useConversations();
  const conversations = query.data ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#1A2A4A" />
        </Pressable>
        <Text variant="h2" className="text-[20px]">
          Messages
        </Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.uuid}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => router.push(`/conversations/${item.uuid}` as never)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-px bg-brand-border/50" />}
        ListEmptyComponent={
          query.isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#E8650A" />
            </View>
          ) : (
            <View className="items-center px-6 py-16">
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
                <MessageCircle size={28} color="#CBD5E1" />
              </View>
              <Text variant="h3" className="text-[16px]">
                Aucune conversation
              </Text>
              <Text variant="caption" className="mt-1 text-center">
                Les conversations apparaissent après avoir accepté{'\n'}une proposition de partenaire.
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#E8650A"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
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
  const other = conversation.other_user;
  const initial = (other?.name ?? '?').charAt(0).toUpperCase();
  const unread = conversation.unread_count > 0;

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 bg-white px-4 py-3">
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand-orange">
        {other?.picture_url ? (
          <Image
            source={{ uri: other.picture_url }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
          />
        ) : (
          <Text className="font-heading-black text-[16px] text-white">{initial}</Text>
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            variant={unread ? 'body-medium' : 'body'}
            className="flex-1 text-[14px]"
            numberOfLines={1}
          >
            {other?.name ?? 'Utilisateur'}
          </Text>
          {conversation.last_message_at ? (
            <Text variant="caption" className="ml-2 text-[11px]">
              {timeAgo(conversation.last_message_at)}
            </Text>
          ) : null}
        </View>
        <Text
          variant="caption"
          className={`mt-0.5 text-[12px] ${unread ? 'text-brand-navy font-body-medium' : ''}`}
          numberOfLines={1}
        >
          {conversation.last_message ?? 'Pas encore de message'}
        </Text>
      </View>
      {unread ? (
        <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1.5">
          <Text className="font-heading-black text-[10px] text-white">
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function timeAgo(dateStr: string): string {
  const diffSec = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diffSec < 60) return "à l'instant";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h`;
  return `${Math.floor(diffSec / 86400)} j`;
}
