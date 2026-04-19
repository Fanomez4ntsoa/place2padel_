import { Building2, ChevronRight, MapPin, Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/design-system';
import type { Club } from '@/features/clubs/types';

interface Props {
  club: Club;
  onPress: () => void;
  rightAction?: React.ReactNode;
}

/**
 * Ligne liste club — port d541157 + support patron (owner_id) Emergent d5ac086.
 * Affiche étoile + badge "Patron inscrit" si un owner a revendiqué le club.
 * `rightAction` permet d'injecter un bouton (ex: "Revendiquer") sous la card.
 */
export function ClubRow({ club, onPress, rightAction }: Props) {
  const hasOwner = !!club.owner_id;

  return (
    <View>
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 rounded-3xl border bg-white px-4 py-3"
        style={{ borderColor: hasOwner ? '#E8650A33' : '#F0EBE8' }}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: hasOwner ? '#FFF0E6' : '#F8FAFC' }}
        >
          <Building2 size={20} color={hasOwner ? '#E8650A' : '#94A3B8'} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text variant="body-medium" className="flex-1 text-[14px]" numberOfLines={1}>
              {club.name}
            </Text>
            {hasOwner ? <Star size={11} fill="#E8650A" color="#E8650A" /> : null}
          </View>
          <View className="mt-0.5 flex-row items-center gap-1">
            <MapPin size={11} color="#94A3B8" />
            <Text variant="caption" className="text-[12px]" numberOfLines={1}>
              {club.city}
              {club.postal_code ? ` (${club.postal_code})` : ''}
              {club.courts_count ? ` · ${club.courts_count} terrains` : ''}
            </Text>
          </View>
          {hasOwner ? (
            <Text
              variant="caption"
              className="mt-0.5 text-[10px] font-heading text-brand-orange"
            >
              ✓ Patron inscrit sur PlaceToPadel
            </Text>
          ) : club.address ? (
            <Text variant="caption" className="mt-0.5 text-[11px]" numberOfLines={1}>
              {club.address}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={16} color="#CBD5E1" />
      </Pressable>
      {rightAction ? <View className="mt-2">{rightAction}</View> : null}
    </View>
  );
}
