import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MapPin, Trophy, X } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';

import { Text } from '@/design-system';
import type { SeekingPartner } from '@/features/partners/types';

interface Props {
  partner: SeekingPartner;
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
 * Card partenaire — port d541157. Photo carré 1/1 avec overlay navy en bas,
 * badge compat haut gauche, actions Like/Pass haut droit. Bio + dispos sous la photo.
 */
export function PartnerCard({ partner, onLike, onPass, isPending }: Props) {
  const { user, compatibility_score } = partner;
  const initial = (user.name || '?').charAt(0).toUpperCase();
  const availSet = new Set(user.availabilities);

  return (
    <View className="overflow-hidden rounded-3xl bg-white shadow-sm">
      {/* Photo 1:1 */}
      <View style={{ width: '100%', aspectRatio: 1, position: 'relative' }}>
        {user.picture_url ? (
          <Image
            source={{ uri: user.picture_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#0F4C3A', '#3A9E8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text className="font-heading-black" style={{ fontSize: 80, color: 'rgba(255,255,255,0.22)' }}>
              {initial}
            </Text>
          </LinearGradient>
        )}

        {/* Badge compat haut gauche */}
        <View className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 shadow-sm">
          <Text className="font-heading-black text-[13px] text-emerald-600">
            {compatibility_score}%
          </Text>
        </View>

        {/* Actions haut droit */}
        <View className="absolute right-3 top-3 flex-row gap-2">
          <Pressable
            onPress={onPass}
            disabled={isPending}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/95"
          >
            <X size={18} color="#ef4444" />
          </Pressable>
          <Pressable
            onPress={onLike}
            disabled={isPending}
            className="h-10 w-10 items-center justify-center rounded-full bg-brand-orange"
            style={{ opacity: isPending ? 0.5 : 1 }}
          >
            <Heart size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Gradient bas + infos */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.88)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', justifyContent: 'flex-end', padding: 16 }}
        >
          <Text className="font-heading-black text-[22px] text-white">{user.name}</Text>
          {user.club ? (
            <View className="mt-1 flex-row items-center gap-1">
              <MapPin size={11} color="rgba(255,255,255,0.75)" />
              <Text variant="caption" className="text-[12px] text-white/75">
                {user.club.name} — {user.club.city}
              </Text>
            </View>
          ) : null}
          <View className="mt-2 flex-row flex-wrap gap-2">
            {user.position ? (
              <View className="rounded-full bg-white/20 px-3 py-1">
                <Text variant="caption" className="text-[11px] font-heading text-white">
                  {POSITION_LABELS[user.position] ?? user.position}
                </Text>
              </View>
            ) : null}
            {user.ranking ? (
              <View className="flex-row items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                <Trophy size={11} color="#FFFFFF" />
                <Text variant="caption" className="text-[11px] font-heading text-white">
                  #{user.ranking.toLocaleString('fr-FR')}
                </Text>
              </View>
            ) : null}
            {user.padel_points !== null ? (
              <View className="rounded-full bg-white/20 px-3 py-1">
                <Text variant="caption" className="text-[11px] font-heading text-white">
                  {user.padel_points} pts
                </Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </View>

      {/* Message + Dispos sous la photo */}
      <View className="gap-3 p-4">
        {partner.message ? (
          <View className="rounded-2xl bg-brand-bg px-4 py-3">
            <Text
              variant="caption"
              className="mb-1.5 text-[10px] font-heading-black uppercase tracking-wider text-brand-orange"
            >
              Message
            </Text>
            <Text variant="body" className="text-[13px] leading-5">
              {partner.message}
            </Text>
          </View>
        ) : null}

        {user.availabilities.length > 0 ? (
          <View className="rounded-2xl bg-brand-bg px-4 py-3">
            <Text
              variant="caption"
              className="mb-2 text-[10px] font-heading-black uppercase tracking-wider text-brand-orange"
            >
              Disponibilités
            </Text>
            <View className="flex-row justify-between">
              {DAYS.map((day, i) => {
                const has = availSet.has(i + 1);
                return (
                  <View key={day} className="items-center gap-1">
                    <Text
                      variant="caption"
                      className={`text-[10px] font-heading uppercase ${has ? 'text-brand-orange' : 'text-slate-300'}`}
                    >
                      {day}
                    </Text>
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${
                        has ? 'bg-brand-orange' : 'bg-slate-100'
                      }`}
                    >
                      {has ? (
                        <Text className="font-heading-black text-[12px] text-white">✓</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
