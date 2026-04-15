import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

/**
 * Skeleton loader pour la liste tournois — 4 cards grises qui pulsent.
 * Animation d'opacité légère pour indiquer le chargement sans distraire.
 */
export function TournamentListSkeleton() {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="px-5 pt-4">
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={pulse}
          className="mb-3 rounded-3xl border border-brand-border bg-white p-4"
        >
          <View className="mb-2 flex-row items-center justify-between">
            <View className="h-4 w-40 rounded-md bg-slate-100" />
            <View className="h-5 w-14 rounded-full bg-slate-100" />
          </View>
          <View className="h-3 w-28 rounded-md bg-slate-100" />
          <View className="mt-3 flex-row gap-2">
            <View className="h-3 w-12 rounded-md bg-slate-100" />
            <View className="h-3 w-12 rounded-md bg-slate-100" />
            <View className="h-3 w-10 rounded-md bg-slate-100" />
          </View>
          <View className="mt-3 h-1.5 rounded-full bg-slate-100" />
        </Animated.View>
      ))}
    </View>
  );
}

export function TournamentDetailSkeleton() {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="px-5 pt-6">
      <Animated.View style={pulse}>
        <View className="h-6 w-60 rounded-md bg-slate-100" />
        <View className="mt-4 rounded-3xl border border-brand-border bg-white p-5">
          <View className="h-4 w-48 rounded-md bg-slate-100" />
          <View className="mt-3 h-3 w-32 rounded-md bg-slate-100" />
          <View className="mt-3 h-2 w-full rounded-full bg-slate-100" />
        </View>
        <View className="mt-3 h-12 rounded-2xl bg-slate-100" />
      </Animated.View>
    </View>
  );
}
