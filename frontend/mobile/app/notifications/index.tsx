import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Clock,
  Heart,
  MessageCircle,
  Send,
  Swords,
  Trophy,
  UserPlus,
} from 'lucide-react-native';
import { ComponentType, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import type { AppNotification } from '@/features/notifications/types';
import {
  flattenNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/useNotifications';

/**
 * Écran Notifications — port NotificationsPage.js Emergent 39b6544.
 *
 * - GET /notifications paginé 20/page, infinite scroll
 * - Tap row → mark-as-read + navigate si `link`
 * - Bouton "Tout lire" en haut (visible uniquement si count unread > 0)
 * - 12 types mappés icône+couleur, fallback Bell gris sinon
 */

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface TypeStyle {
  icon: IconCmp;
  iconBg: string;
  iconColor: string;
}

/**
 * Mapping 13 types (8 émis Laravel + 5 Emergent-only futurs).
 * Alignement couleurs NotificationsPage.js Emergent 39b6544.
 */
const TYPE_STYLES: Record<string, TypeStyle> = {
  // Chat
  message: { icon: MessageCircle, iconBg: '#EFF6FF', iconColor: '#3B82F6' },
  // Tournoi créé
  new_tournament: { icon: Trophy, iconBg: '#FFF0E6', iconColor: '#E8650A' },
  // Inscription / waitlist
  registration: { icon: UserPlus, iconBg: '#ECFDF5', iconColor: '#059669' },
  waitlist: { icon: Clock, iconBg: '#FFFBEB', iconColor: '#D97706' },
  waitlist_promoted: { icon: Heart, iconBg: '#ECFDF5', iconColor: '#059669' },
  // Milestones remplissage
  milestone_50: { icon: Trophy, iconBg: '#FFFBEB', iconColor: '#D97706' },
  milestone_90: { icon: Trophy, iconBg: '#FEF2F2', iconColor: '#EF4444' },
  tournament_full: { icon: Trophy, iconBg: '#FEF2F2', iconColor: '#EF4444' },
  // Tournoi terminé
  tournament_complete: { icon: Trophy, iconBg: '#F5F3FF', iconColor: '#7C3AED' },
  // Propositions
  tournament_partner: { icon: Swords, iconBg: '#FFF0E6', iconColor: '#E8650A' },
  proposal: { icon: Swords, iconBg: '#FFF0E6', iconColor: '#E8650A' },
  proposal_response: { icon: CheckCheck, iconBg: '#ECFDF5', iconColor: '#059669' },
  // Match / social (Emergent extras)
  match: { icon: Heart, iconBg: '#FDF2F8', iconColor: '#EC4899' },
  match_start: { icon: Swords, iconBg: '#EFF6FF', iconColor: '#3B82F6' },
  new_post: { icon: Send, iconBg: '#FFF0E6', iconColor: '#E8650A' },
};

const FALLBACK_STYLE: TypeStyle = { icon: Bell, iconBg: '#F8FAFC', iconColor: '#64748B' };

export default function NotificationsScreen() {
  const router = useRouter();
  const query = useNotifications();
  const markOneMut = useMarkNotificationRead();
  const markAllMut = useMarkAllNotificationsRead();

  const notifications = flattenNotifications(query.data);
  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  const handleTap = async (n: AppNotification) => {
    if (n.read_at === null) {
      markOneMut.mutate(n.uuid);
    }
    // Le backend link contient des paths typés Laravel (ex: "/propositions/{uuid}").
    // On mappe les cas connus vers les routes Expo Router. Inconnu → ignoré.
    const href = mapBackendLinkToRoute(n);
    if (href) {
      router.push(href as never);
    }
  };

  const handleMarkAll = () => {
    markAllMut
      .mutateAsync()
      .catch((err) => Alert.alert('Erreur', formatApiError(err)));
  };

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#1A2A4A" />
        </Pressable>
        <Text variant="h2" className="flex-1 text-[20px]">
          Notifications
        </Text>
        {unreadCount > 0 ? (
          <View className="mr-2 h-6 min-w-[24px] items-center justify-center rounded-full bg-brand-orange px-1.5">
            <Text
              className="font-heading-black text-white"
              style={{ fontSize: 11, lineHeight: 13, includeFontPadding: false, textAlignVertical: 'center' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        ) : null}
        {unreadCount > 0 ? (
          <Button
            label="Tout lire"
            variant="ghost"
            size="md"
            leftIcon={<CheckCheck size={14} color="#E8650A" />}
            onPress={handleMarkAll}
            loading={markAllMut.isPending}
          />
        ) : null}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.uuid}
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => handleTap(item)} />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            tintColor="#E8650A"
          />
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#E8650A" />
            </View>
          ) : (
            <Card>
              <View className="items-center py-10">
                <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
                  <Bell size={28} color="#CBD5E1" />
                </View>
                <Text variant="h3" className="text-[16px]">
                  Aucune notification
                </Text>
                <Text variant="caption" className="mt-1 text-center">
                  Tu recevras ici les alertes tournois, inscriptions et messages.
                </Text>
              </View>
            </Card>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color="#E8650A" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const style = TYPE_STYLES[notification.type] ?? FALLBACK_STYLE;
  const Icon = style.icon;
  const isRead = notification.read_at !== null;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-start gap-3 rounded-3xl border bg-white p-4 ${
        isRead ? 'border-brand-border opacity-60' : 'border-brand-orange/15'
      }`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : isRead ? 0.6 : 1 })}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: style.iconBg }}
      >
        <Icon size={18} color={style.iconColor} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text
            variant={isRead ? 'body' : 'body-medium'}
            className={`flex-1 text-[13px] leading-5 ${isRead ? 'text-brand-muted' : 'text-brand-navy'}`}
            numberOfLines={2}
          >
            {notification.title}
          </Text>
          {!isRead ? (
            <View className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-orange" />
          ) : null}
        </View>
        <Text variant="caption" className="mt-1 text-[11px] leading-4" numberOfLines={2}>
          {notification.message}
        </Text>
        <Text variant="caption" className="mt-1.5 text-[10px]">
          {formatDate(notification.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Maps un `link` backend (path Laravel) vers une route Expo Router mobile.
 * Les cas connus ont été inventoriés via les listeners — les inconnus
 * retournent null (pas de nav, le tap marque juste comme lu).
 */
function mapBackendLinkToRoute(n: AppNotification): string | null {
  const link = n.link;
  const data = n.data ?? {};

  if (n.type === 'tournament_partner' || n.type === 'proposal_response' || n.type === 'proposal') {
    const proposalUuid = (data as { proposal_uuid?: string }).proposal_uuid;
    if (proposalUuid) return `/proposals`;
  }
  if (n.type === 'message') {
    const convUuid = (data as { conversation_uuid?: string }).conversation_uuid;
    if (convUuid) return `/conversations/${convUuid}`;
    return `/conversations`;
  }
  if (
    n.type === 'new_tournament' ||
    n.type === 'tournament_full' ||
    n.type === 'milestone_50' ||
    n.type === 'milestone_90' ||
    n.type === 'tournament_complete' ||
    n.type === 'registration' ||
    n.type === 'waitlist' ||
    n.type === 'waitlist_promoted'
  ) {
    const tournamentUuid = (data as { tournament_uuid?: string }).tournament_uuid;
    if (tournamentUuid) return `/(tabs)/tournois/${tournamentUuid}`;
  }

  // Fallback générique : si le backend a mis un path, on l'ignore car il suit
  // les conventions web (React Router) pas Expo Router — sauf s'il matche déjà
  // une de nos routes connues.
  if (link && (link.startsWith('/conversations') || link.startsWith('/proposals'))) {
    return link;
  }
  return null;
}
