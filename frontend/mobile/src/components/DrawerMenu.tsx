import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bell,
  Building2,
  ChevronRight,
  Heart,
  Home as HomeIcon,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Newspaper,
  Settings,
  Trophy,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react-native';
import { ComponentType, useEffect } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import { useUnreadCounters } from '@/features/counters/useCounters';

/**
 * Drawer latéral gauche 280px — port AppHeader.js Emergent 39b6544 menu hamburger.
 *
 * Structure 4 zones : header auth-aware, CTA bands (Matching + Juge arbitre),
 * navigation scrollable (+ section compte), footer version.
 *
 * Animation : translateX + backdrop opacity via Reanimated spring-like easing.
 * Dismissal : tap backdrop, bouton X, ou hardware back Android (onRequestClose).
 */
const DRAWER_WIDTH = 280;
const SCREEN_W = Dimensions.get('window').width;

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function DrawerMenu({ visible, onClose }: Props) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadMessages, unreadNotifications } = useUnreadCounters();

  const isLoggedIn = !!user;
  const isReferee = isLoggedIn && (user?.role === 'referee' || user?.role === 'admin');
  const padelPoints = (user as unknown as { profile?: { padel_points?: number } } | null)
    ?.profile?.padel_points;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, progress]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -DRAWER_WIDTH + progress.value * DRAWER_WIDTH }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.4 }));

  const go = (path: string) => {
    onClose();
    // typed routes — on force car certains paths peuvent être dynamiques.
    router.push(path as never);
  };

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
    } catch {
      // best-effort
    }
    router.replace('/(auth)/login');
  };

  if (!visible) return null;

  const initial = (user?.name ?? '?').trim().charAt(0).toUpperCase();

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop noir */}
      <Pressable onPress={onClose} style={{ position: 'absolute', inset: 0 }}>
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
            backdropStyle,
          ]}
        />
      </Pressable>

      {/* Drawer sliding */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            maxWidth: SCREEN_W * 0.85,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          },
          drawerStyle,
        ]}
      >
        {/* Zone 1 — Header navy gradient */}
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 44, paddingBottom: 20 }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} color="#FFFFFF" />
          </Pressable>

          {isLoggedIn ? (
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/15">
                {user?.picture_url ? (
                  <Image
                    source={{ uri: user.picture_url as string }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Text className="font-heading-black text-[18px] text-white">{initial}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text variant="body-medium" className="text-[14px] text-white" numberOfLines={1}>
                  {user?.name}
                </Text>
                <Text variant="caption" className="mt-0.5 text-[11px] text-white/50" numberOfLines={1}>
                  {typeof padelPoints === 'number' ? `${padelPoints} pts` : ''}
                  {user?.city ? ` · ${user.city}` : ''}
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <Text className="font-heading-black text-[20px] tracking-tight text-white">
                Place<Text className="text-brand-orange font-heading-black">To</Text>Padel
              </Text>
              <Text variant="caption" className="mt-1 text-[11px] text-white/40">
                The Place To Be. 100% Padel.
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Zone 2 — CTA bands */}
        <Pressable
          onPress={() => go('/(tabs)/matching')}
          style={{
            backgroundColor: '#DBEAFE',
            borderBottomWidth: 1,
            borderBottomColor: '#BFDBFE',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          className="flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-orange">
              <Users size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text className="font-heading-black text-[13px] text-blue-900">
                Matching Partenaire
              </Text>
              <Text variant="caption" className="mt-0.5 text-[10px] text-blue-600">
                Trouve ton partenaire idéal 🎾
              </Text>
            </View>
          </View>
          <ChevronRight size={14} color="#2563EB" />
        </Pressable>

        <Pressable
          onPress={() => go('/organisateurs')}
          style={{
            backgroundColor: '#FFF0E6',
            borderBottomWidth: 1,
            borderBottomColor: '#F0EBE8',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          className="flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-orange">
              <Trophy size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text className="font-heading-black text-[13px] text-brand-orange">
                Tu es juge arbitre ?
              </Text>
              <Text variant="caption" className="mt-0.5 text-[10px]" style={{ color: '#C75508' }}>
                Organise ton tournoi en 5 min ⚡
              </Text>
            </View>
          </View>
          <ChevronRight size={14} color="#E8650A" />
        </Pressable>

        {/* Zone 3 — Navigation scrollable */}
        <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 8 }}>
          <SectionLabel label="NAVIGATION" />
          <MenuItem icon={HomeIcon} label="Accueil" iconBg="#FFF8F4" iconColor="#E8650A" onPress={() => go('/(tabs)/home')} />
          <MenuItem icon={Newspaper} label="Fil d'actualité" iconBg="#F5F3FF" iconColor="#7C3AED" onPress={() => go('/(tabs)/actualites')} />
          <MenuItem icon={Trophy} label="Tournois" iconBg="#FFF0E6" iconColor="#E8650A" onPress={() => go('/(tabs)/tournois')} />
          <MenuItem icon={Heart} label="Partenaires" iconBg="#F0FDF4" iconColor="#16a34a" onPress={() => go('/(tabs)/partenaires')} />
          <MenuItem icon={Building2} label="Clubs" iconBg="#EFF6FF" iconColor="#2563EB" onPress={() => go('/(tabs)/clubs')} />

          {isLoggedIn ? (
            <>
              <MenuItem icon={LayoutGrid} label="Mon cockpit" iconBg="#FFF0E6" iconColor="#E8650A" onPress={() => go('/(tabs)/cockpit')} />
              <MenuItem
                icon={MessageCircle}
                label="Messages"
                iconBg="#F0FDF4"
                iconColor="#16a34a"
                badge={unreadMessages}
                onPress={() => go('/conversations')}
              />
              <MenuItem
                icon={Bell}
                label="Notifications"
                iconBg="#FFF0E6"
                iconColor="#E8650A"
                badge={unreadNotifications}
                onPress={() => go('/notifications')}
              />
              {isReferee ? (
                <MenuItem icon={Settings} label="Espace organisateur" iconBg="#EFF6FF" iconColor="#2563EB" onPress={() => go('/organisateurs')} />
              ) : null}
            </>
          ) : null}

          <View className="my-2 mx-5 h-px bg-brand-border" />

          <SectionLabel label="ESPACE COMPTE" />
          {isLoggedIn ? (
            <>
              <MenuItem
                icon={UserIcon}
                label="Mon profil"
                iconBg="#F8FAFC"
                iconColor="#64748b"
                onPress={() => go(`/profil/${user!.uuid}` as string)}
              />
              <MenuItem icon={LogOut} label="Se déconnecter" iconBg="#FEF2F2" iconColor="#ef4444" onPress={handleLogout} danger />
            </>
          ) : (
            <>
              <MenuItem icon={UserIcon} label="Créer un compte" iconBg="#FFF0E6" iconColor="#E8650A" onPress={() => go('/(auth)/register')} accent />
              <MenuItem icon={LogOut} label="Se connecter" iconBg="#F8FAFC" iconColor="#64748b" onPress={() => go('/(auth)/login')} />
            </>
          )}
        </ScrollView>

        {/* Zone 4 — Footer */}
        <View className="border-t border-brand-border px-5 py-3">
          <Text variant="caption" className="text-center text-[10px] text-brand-muted">
            PlaceToPadel · v1.0 · 2026
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      variant="caption"
      className="px-5 pb-1 pt-2 text-[9px] font-heading-black uppercase tracking-widest"
      style={{ color: '#94A3B8', letterSpacing: 1 }}
    >
      {label}
    </Text>
  );
}

function MenuItem({
  icon: Icon,
  label,
  iconBg,
  iconColor,
  onPress,
  badge,
  accent,
  danger,
}: {
  icon: IconCmp;
  label: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  badge?: number;
  accent?: boolean;
  danger?: boolean;
}) {
  const color = danger ? '#EF4444' : accent ? '#E8650A' : '#1A2A4A';
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-5 py-2.5"
      style={({ pressed }) => ({ backgroundColor: pressed ? '#F8FAFC' : 'transparent' })}
    >
      <View className="relative">
        <View
          className="h-[34px] w-[34px] items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={16} color={iconColor} />
        </View>
        {badge && badge > 0 ? (
          <View
            className="absolute -right-1 -top-1 h-[14px] min-w-[14px] items-center justify-center rounded-full bg-brand-orange px-0.5"
          >
            <Text
              className="font-heading-black text-white"
              style={{ fontSize: 8, lineHeight: 10, includeFontPadding: false, textAlignVertical: 'center' }}
            >
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={{ color, fontSize: 14, fontWeight: accent ? '700' : '600' }}
        className="font-body-medium"
      >
        {label}
      </Text>
    </Pressable>
  );
}
