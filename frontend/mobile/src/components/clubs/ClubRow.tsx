import { Building2, ChevronRight, MapPin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/design-system';
import type { Club } from '@/features/clubs/types';

interface Props {
  club: Club;
  onPress: () => void;
}

/**
 * Ligne liste club — port d541157 (icône orange + nom + ville/postal + adresse).
 */
export function ClubRow({ club, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-3xl border border-brand-border bg-white px-4 py-3"
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-orange-light">
        <Building2 size={20} color="#E8650A" />
      </View>
      <View className="flex-1">
        <Text variant="body-medium" className="text-[14px]" numberOfLines={1}>
          {club.name}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1">
          <MapPin size={11} color="#94A3B8" />
          <Text variant="caption" className="text-[12px]" numberOfLines={1}>
            {club.city}
            {club.postal_code ? ` (${club.postal_code})` : ''}
          </Text>
        </View>
        {club.address ? (
          <Text variant="caption" className="mt-0.5 text-[11px]" numberOfLines={1}>
            {club.address}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={16} color="#CBD5E1" />
    </Pressable>
  );
}
