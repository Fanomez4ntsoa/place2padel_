import { useRouter } from 'expo-router';
import { Bell, MessageCircle } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import { useUnreadCounters } from '@/features/counters/useCounters';

/**
 * Header global — port fidèle placeToPadel/src/components/AppHeader.js (d541157).
 * Wordmark "Place" + "To" orange + "Padel", CTA inscription si non-auth,
 * icônes Messages + Notifications avec badges unread si auth.
 *
 * Monté au-dessus des Tabs dans (tabs)/_layout.tsx.
 */
export function AppHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { unreadMessages, unreadNotifications } = useUnreadCounters();

  const isLoggedIn = !!user;

  return (
    <View
      className="border-b border-brand-border bg-white px-4"
      style={{ paddingTop: insets.top, paddingBottom: 10 }}
    >
      <View className="h-12 flex-row items-center">
        {/* Wordmark */}
        <Pressable onPress={() => router.push('/(tabs)/home' as never)} hitSlop={6}>
          <Text variant="h3" className="text-[18px] text-brand-navy font-heading-black">
            Place<Text className="text-brand-orange font-heading-black">To</Text>Padel
          </Text>
        </Pressable>

        <View className="flex-1" />

        {isLoggedIn ? (
          <View className="flex-row items-center gap-1">
            <IconButton
              icon={<MessageCircle size={20} color="#1A2A4A" />}
              badge={unreadMessages}
              onPress={() => router.push('/conversations')}
            />
            <IconButton
              icon={<Bell size={20} color="#1A2A4A" />}
              badge={unreadNotifications}
              onPress={() => undefined /* Phase 6.2 — écran notifications */}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            className="h-8 items-center justify-center rounded-full bg-brand-orange px-3"
          >
            <Text variant="caption" className="font-heading-black text-white text-[11px]">
              Inscription gratuite
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function IconButton({
  icon,
  badge,
  onPress,
}: {
  icon: React.ReactNode;
  badge: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="h-9 w-9 items-center justify-center">
      {icon}
      {badge > 0 ? (
        <View className="absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-brand-orange px-1">
          <Text
            className="font-heading-black text-white"
            style={{ fontSize: 10, lineHeight: 12, includeFontPadding: false, textAlignVertical: 'center' }}
          >
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
