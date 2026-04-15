import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Building2, LayoutGrid, Newspaper, Trophy, Users } from 'lucide-react-native';
import { ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/design-system';

/**
 * Port fidèle de placeToPadel/src/components/BottomNav.js.
 * Navy #1A2A4A, border-top orange 1.5px, Cockpit center surélevé (-28px) en carré orange 48x48.
 */

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ITEMS: { name: string; label: string; icon: IconCmp; center?: boolean }[] = [
  { name: 'actualites', label: 'Actu', icon: Newspaper },
  { name: 'tournois/index', label: 'Tournois', icon: Trophy },
  { name: 'cockpit', label: 'Cockpit', icon: LayoutGrid, center: true },
  { name: 'partenaires', label: 'Partenaires', icon: Users },
  { name: 'clubs', label: 'Clubs', icon: Building2 },
];

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View className="absolute bottom-0 left-0 right-0 z-50">
      {/* border-top orange 1.5px */}
      <View className="h-[1.5px] bg-brand-orange" />

      <View
        className="flex-row items-end justify-around bg-brand-navy px-3 pt-2"
        style={{ paddingBottom: Math.max(8, insets.bottom) }}
      >
        {ITEMS.map(({ name, label, icon: Icon, center }) => {
          const isActive = activeRouteName === name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes.find((r) => r.name === name)?.key ?? name,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented && !isActive) {
              navigation.navigate(name);
            }
          };

          if (center) {
            return (
              <Pressable
                key={name}
                onPress={onPress}
                className="items-center"
                style={{ marginTop: -28, marginBottom: -2 }}
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange"
                  style={{
                    shadowColor: '#E8650A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 15,
                    elevation: 6,
                  }}
                >
                  <Icon size={22} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text
                  className={`mt-1 text-[9px] font-heading ${isActive ? 'text-brand-orange' : 'text-white/60'}`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={name}
              onPress={onPress}
              className="min-w-[48px] items-center justify-center gap-1 py-1"
            >
              <Icon
                size={22}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <Text
                className={`text-[9px] font-body-medium ${isActive ? 'text-white' : 'text-white/60'}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
