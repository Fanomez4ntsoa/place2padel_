import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MapPin, Trophy, X } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';

import { Text } from '@/design-system';
import type { MatchingCandidate } from '@/features/matching/types';

interface Props {
  candidate: MatchingCandidate;
  onLike: () => void;
  onPass: () => void;
  isPending?: boolean;
}

const POSITION_LABELS: Record<string, string> = {
  left: 'Gauche ▶',
  right: '◀ Droite',
  both: '↔ Polyvalent',
};

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/**
 * Card candidat mode amical — port fidèle PartnersPage.js Emergent d5ac086.
 * Photo carrée 1:1 avec gradient bas + overlay navy, badge compat haut-gauche,
 * bio + grille 7 jours dispos sous la photo, CTAs Pass/Like en bas.
 *
 * Slot Flexible (day null) matche tous les jours → enrichit la Set visuelle.
 */
export function CandidateCard({ candidate, onLike, onPass, isPending }: Props) {
  const initial = (candidate.name || '?').charAt(0).toUpperCase();
  const hasFlexible = candidate.availabilities.some((a) => a.day_of_week === null);
  const availSet = new Set<number>(
    hasFlexible
      ? [1, 2, 3, 4, 5, 6, 7]
      : candidate.availabilities
          .map((a) => a.day_of_week)
          .filter((d): d is number => d !== null),
  );

  return (
    <View className="overflow-hidden rounded-3xl bg-white shadow-sm">
      {/* Photo 1:1 */}
      <View style={{ width: '100%', aspectRatio: 1, position: 'relative' }}>
        {candidate.picture_url ? (
          <Image
            source={{ uri: candidate.picture_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="items-center justify-center bg-brand-navy"
            style={{ width: '100%', height: '100%' }}
          >
            <Text className="font-heading-black text-[80px] text-white/90">{initial}</Text>
          </View>
        )}

        {/* Badge compatibilité % haut-gauche (emerald) */}
        {typeof candidate.compatibility === 'number' ? (
          <View
            className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1"
            style={{ shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 8 }}
          >
            <Text className="font-heading-black text-[11px] text-white">
              {candidate.compatibility}% compat
            </Text>
          </View>
        ) : null}

        {/* Gradient bas — fond pour l'overlay navy */}
        <LinearGradient
          colors={['transparent', 'rgba(26,42,74,0.75)']}
          locations={[0.45, 1]}
          style={{ position: 'absolute', inset: 0 }}
          pointerEvents="none"
        />

        {/* Overlay navy bas : nom + club + position + ranking */}
        <View className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-6">
          <Text
            className="font-heading-black text-white"
            style={{ fontSize: 22, lineHeight: 26 }}
            numberOfLines={1}
          >
            {candidate.name}
          </Text>
          {candidate.club ? (
            <View className="mt-1 flex-row items-center gap-1">
              <MapPin size={11} color="#FFFFFF99" />
              <Text className="text-[12px] text-white/75" numberOfLines={1}>
                {candidate.club.name} — {candidate.club.city}
              </Text>
            </View>
          ) : candidate.city ? (
            <View className="mt-1 flex-row items-center gap-1">
              <MapPin size={11} color="#FFFFFF99" />
              <Text className="text-[12px] text-white/75" numberOfLines={1}>
                {candidate.city}
              </Text>
            </View>
          ) : null}
          <View className="mt-2 flex-row items-center gap-1.5">
            {candidate.position ? (
              <View className="rounded-full bg-white/20 px-2.5 py-0.5">
                <Text className="font-heading text-[10px] text-white">
                  {POSITION_LABELS[candidate.position] ?? candidate.position}
                </Text>
              </View>
            ) : null}
            {candidate.padel_points ? (
              <View className="flex-row items-center gap-1 rounded-full bg-brand-orange/80 px-2.5 py-0.5">
                <Trophy size={10} color="#FFFFFF" />
                <Text className="font-heading text-[10px] text-white">
                  {candidate.padel_points} pts
                </Text>
              </View>
            ) : null}
            {candidate.ranking ? (
              <View className="rounded-full bg-white/20 px-2.5 py-0.5">
                <Text className="font-heading text-[10px] text-white">#{candidate.ranking}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Bio */}
      {candidate.bio ? (
        <View className="border-b border-brand-border/50 px-4 py-3">
          <Text
            variant="caption"
            className="mb-1 text-[10px] font-heading-black uppercase tracking-wider"
          >
            À propos
          </Text>
          <Text variant="body" className="text-[13px]" style={{ lineHeight: 18 }}>
            {candidate.bio}
          </Text>
        </View>
      ) : null}

      {/* Grille 7 jours — orange = dispo, gris = non */}
      {candidate.availabilities.length > 0 ? (
        <View className="border-b border-brand-border/50 px-4 py-3">
          <Text
            variant="caption"
            className="mb-2 text-[10px] font-heading-black uppercase tracking-wider"
          >
            Disponibilités {hasFlexible ? '(Flexible)' : ''}
          </Text>
          <View className="flex-row gap-1.5">
            {DAYS.map((label, idx) => {
              const day = idx + 1;
              const active = availSet.has(day);
              return (
                <View
                  key={label}
                  className="flex-1 items-center rounded-lg py-1.5"
                  style={{ backgroundColor: active ? '#E8650A' : '#F1F5F9' }}
                >
                  <Text
                    className="font-heading text-[11px]"
                    style={{ color: active ? '#FFFFFF' : '#94A3B8' }}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* CTAs Pass + Like */}
      <View className="flex-row gap-3 px-4 py-4">
        <Pressable
          onPress={onPass}
          disabled={isPending}
          className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-brand-border bg-white"
        >
          <X size={18} color="#64748B" />
          <Text className="font-heading text-[13px] text-brand-muted">Passer</Text>
        </Pressable>
        <Pressable
          onPress={onLike}
          disabled={isPending}
          className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl"
          style={{
            backgroundColor: '#E8650A',
            opacity: isPending ? 0.6 : 1,
            shadowColor: '#E8650A',
            shadowOpacity: 0.3,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <Heart size={18} color="#FFFFFF" fill="#FFFFFF" />
          <Text className="font-heading-black text-[13px] text-white">J'aime</Text>
        </Pressable>
      </View>
    </View>
  );
}
