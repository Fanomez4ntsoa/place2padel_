import { useRouter } from 'expo-router';
import { Bell, Menu, MessageCircle, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import { useUnreadCounters } from '@/features/counters/useCounters';

import { DrawerMenu } from './DrawerMenu';
import { UniversalSearchOverlay } from './UniversalSearchOverlay';

/**
 * Header global sticky — port AppHeader.js Emergent 39b6544.
 *
 * Gauche : bouton hamburger → DrawerMenu 280px.
 * Centre : wordmark "PlaceToPadel" (tap → /home) OU input de recherche
 *          quand searchOpen = true.
 * Droite : (non-auth) CTA "Inscription gratuite" · (auth) Messages + Notifs
 *          + toggle Search.
 *
 * L'overlay search apparaît sous le header et fédère /tournaments, /clubs,
 * /users en parallèle (useUniversalSearch + debounce 300ms).
 *
 * Monté au-dessus des Tabs dans (tabs)/_layout.tsx.
 */
export function AppHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { unreadMessages, unreadNotifications } = useUnreadCounters();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isLoggedIn = !!user;
  const headerHeight = insets.top + 10 + 48; // insets.top + paddingBottom + row height

  const toggleSearch = () => {
    setSearchOpen((prev) => {
      if (prev) setQuery('');
      return !prev;
    });
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <>
      <View
        className="border-b border-brand-border bg-white px-3"
        style={{ paddingTop: insets.top, paddingBottom: 10 }}
      >
        <View className="h-12 flex-row items-center">
          {/* Zone gauche — hamburger fixe */}
          <Pressable
            onPress={() => setMenuOpen(true)}
            className="h-9 w-9 shrink-0 items-center justify-center"
            hitSlop={6}
          >
            <Menu size={22} color="#1A2A4A" />
          </Pressable>

          {/* Zone centre — wordmark OU input (bornée par flex-1, ne déborde pas) */}
          <View className="mx-2 flex-1 flex-row items-center">
            {searchOpen ? (
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Tournoi, club, joueur…"
                placeholderTextColor="#94A3B8"
                className="h-8 w-full rounded-full border border-brand-border bg-brand-bg px-3 font-body text-[13px] text-brand-navy"
                returnKeyType="search"
              />
            ) : (
              <Pressable
                onPress={() => router.push('/(tabs)/home' as never)}
                hitSlop={6}
              >
                <Text variant="h3" className="text-[18px] text-brand-navy font-heading-black">
                  Place<Text className="text-brand-orange font-heading-black">To</Text>Padel
                </Text>
              </Pressable>
            )}
          </View>

          {/* Zone droite — actions auth-aware (masquées pendant search pour laisser
              la place à l'input + au toggle X) */}
          {!searchOpen && !isLoggedIn ? (
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              className="h-8 shrink-0 items-center justify-center rounded-full bg-brand-orange px-3"
            >
              <Text variant="caption" className="font-heading-black text-white text-[11px]">
                Inscription gratuite
              </Text>
            </Pressable>
          ) : null}

          {!searchOpen && isLoggedIn ? (
            <View className="flex-row items-center">
              <IconButton
                icon={<MessageCircle size={20} color="#1A2A4A" />}
                badge={unreadMessages}
                onPress={() => router.push('/conversations')}
              />
              <IconButton
                icon={<Bell size={20} color="#1A2A4A" />}
                badge={unreadNotifications}
                onPress={() => router.push('/notifications' as never)}
              />
            </View>
          ) : null}

          {/* Toggle Search — toujours visible à droite, shrink-0 pour rester accessible */}
          <Pressable
            onPress={toggleSearch}
            className="h-9 w-9 shrink-0 items-center justify-center"
            hitSlop={6}
          >
            {searchOpen ? (
              <X size={20} color="#94A3B8" />
            ) : (
              <Search size={20} color="#1A2A4A" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Overlay résultats — rendu sous le header, prend toute la hauteur restante */}
      <UniversalSearchOverlay
        visible={searchOpen}
        query={query}
        topOffset={headerHeight}
        onNavigate={closeSearch}
      />

      {/* Drawer */}
      <DrawerMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
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
