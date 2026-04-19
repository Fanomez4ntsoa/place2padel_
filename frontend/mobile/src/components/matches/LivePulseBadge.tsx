import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/design-system';

/**
 * Badge LIVE rouge pulsé — port FriendlyMatchLivePage.js:176-182 (framer-motion
 * opacity 1↔0.4 durée 1.2s). Version RN via Reanimated.
 *
 * Usage : uniquement rendu quand le match est `in_progress`. Le pulse
 * communique fortement le "live now" vs un badge statique.
 */
export function LivePulseBadge() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 800 }),
      -1,
      true,
    );
  }, [opacity]);

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={wrapperStyle}
      className="flex-row items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1"
    >
      <View className="h-2 w-2 rounded-full bg-red-500" />
      <Text
        variant="caption"
        className="font-heading-black uppercase text-red-500"
        style={{ fontSize: 10 }}
      >
        LIVE
      </Text>
    </Animated.View>
  );
}
