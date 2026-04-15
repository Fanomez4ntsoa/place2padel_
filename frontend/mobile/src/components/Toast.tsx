import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/design-system';
import { subscribeToast } from '@/lib/toast';

type Toast = { id: number; message: string; tone: 'info' | 'error' | 'success' };

const TONE_CLASSES: Record<Toast['tone'], string> = {
  info: 'bg-brand-navy',
  error: 'bg-brand-danger',
  success: 'bg-brand-success',
};

export function ToastHost() {
  const [toast, setToast] = useState<Toast | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return subscribeToast(({ message, tone }) => {
      const t: Toast = { id: Date.now(), message, tone };
      setToast(t);
      setTimeout(() => {
        setToast((current) => (current?.id === t.id ? null : current));
      }, 4000);
    });
  }, []);

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0"
      style={{ bottom: Math.max(insets.bottom + 90, 100) }}
    >
      <Animated.View entering={FadeInDown} exiting={FadeOutDown} className="mx-5">
        <Pressable
          onPress={() => setToast(null)}
          className={`rounded-2xl px-4 py-3 ${TONE_CLASSES[toast.tone]}`}
        >
          <Text variant="body-medium" className="text-white text-[14px]">
            {toast.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
