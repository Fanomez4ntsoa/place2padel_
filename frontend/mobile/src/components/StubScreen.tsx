import { useRouter } from 'expo-router';
import { ComponentType } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/design-system';

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface Props {
  title: string;
  hint?: string;
  icon?: IconCmp;
}

/**
 * Placeholder conservant la charte. Ajoute un CTA retour Cockpit par défaut
 * pour que l'utilisateur ne se retrouve pas dans un cul-de-sac.
 */
export function StubScreen({ title, hint, icon: Icon }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <View className="flex-1 items-center justify-center px-6">
        {Icon ? (
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-brand-orange-light">
            <Icon size={32} color="#E8650A" />
          </View>
        ) : null}

        <Text variant="h2">{title}</Text>
        <Text variant="caption" className="mt-2 text-center">
          {hint ?? 'Disponible dans une prochaine itération.'}
        </Text>

        <Button
          label="Retour Cockpit"
          variant="ghost"
          onPress={() => router.replace('/(tabs)/cockpit')}
          className="mt-6 px-6"
          size="md"
        />
      </View>
    </SafeAreaView>
  );
}
