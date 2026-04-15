import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '../tokens';

/**
 * Animation entrée : opacité 0→1 + translateY 12→0.
 * Port fidèle de @keyframes pageIn (placeToPadel/index.css) : 0.4s ease-out, y=12px.
 *
 * @param delayMs  délai avant démarrage (utile pour staggered lists)
 * @param distance pixels d'offset Y initial (défaut 12, identique web)
 */
export function useFadeInUp(delayMs = 0, distance = 12) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);

  useEffect(() => {
    const config = { duration: durations.page, easing: Easing.out(Easing.cubic) };
    opacity.value = withDelay(delayMs, withTiming(1, config));
    translateY.value = withDelay(delayMs, withTiming(0, config));
  }, [delayMs, opacity, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}
