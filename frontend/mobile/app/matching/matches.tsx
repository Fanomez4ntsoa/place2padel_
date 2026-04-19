import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, MapPin, MessageCircle, Trophy } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/design-system';
import { useMatchingMatches } from '@/features/matching/useMatching';

/**
 * Écran liste des matches mutuels — cible du bouton ♥ sur /partenaires.
 * Chaque match a un CTA "Discuter" qui ouvre /conversations/{uuid}.
 */
export default function MatchingMatchesScreen() {
  const router = useRouter();
  const query = useMatchingMatches();

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      {/* Header simple */}
      <View className="flex-row items-center gap-2 border-b border-brand-border/60 bg-white px-3 py-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#1A2A4A" />
        </Pressable>
        <View className="flex-1 flex-row items-center gap-2">
          <Heart size={16} color="#E8650A" fill="#E8650A" />
          <Text variant="h2" className="text-[18px]">
            Mes matches
          </Text>
        </View>
      </View>

      {query.isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#E8650A" />
        </View>
      ) : query.data && query.data.length > 0 ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor="#E8650A"
            />
          }
        >
          {query.data.map((entry) => {
            const other = entry.other;
            if (!other) return null;
            const initial = (other.name || '?').charAt(0).toUpperCase();
            return (
              <View
                key={entry.uuid}
                className="flex-row items-center gap-3 rounded-2xl border border-brand-border bg-white p-3"
              >
                {/* Avatar */}
                {other.picture_url ? (
                  <Image
                    source={{ uri: other.picture_url }}
                    style={{ width: 48, height: 48, borderRadius: 16 }}
                  />
                ) : (
                  <View
                    className="items-center justify-center rounded-2xl bg-brand-orange"
                    style={{ width: 48, height: 48 }}
                  >
                    <Text className="font-heading-black text-[20px] text-white">{initial}</Text>
                  </View>
                )}

                <View className="flex-1">
                  <Text variant="body-medium" className="text-[14px]" numberOfLines={1}>
                    {other.name}
                  </Text>
                  <View className="mt-0.5 flex-row items-center gap-2">
                    {other.club ? (
                      <View className="flex-row items-center gap-1">
                        <MapPin size={10} color="#94A3B8" />
                        <Text variant="caption" className="text-[11px]" numberOfLines={1}>
                          {other.club.name}
                        </Text>
                      </View>
                    ) : other.city ? (
                      <View className="flex-row items-center gap-1">
                        <MapPin size={10} color="#94A3B8" />
                        <Text variant="caption" className="text-[11px]">
                          {other.city}
                        </Text>
                      </View>
                    ) : null}
                    {other.padel_points ? (
                      <View className="flex-row items-center gap-0.5">
                        <Trophy size={10} color="#E8650A" />
                        <Text variant="caption" className="text-[11px] text-brand-orange">
                          {other.padel_points} pts
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* CTA Discuter */}
                <Pressable
                  onPress={() => {
                    if (entry.conversation_uuid) {
                      router.push(`/conversations/${entry.conversation_uuid}` as never);
                    } else {
                      // Rare : match sans conversation (edge case legacy).
                      router.push(`/profil/${other.uuid}`);
                    }
                  }}
                  className="flex-row items-center gap-1.5 rounded-full bg-brand-orange px-3.5 py-2"
                >
                  <MessageCircle size={14} color="#FFFFFF" />
                  <Text className="font-heading-black text-[12px] text-white">Discuter</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View className="items-center px-6 py-16">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-brand-orange-light">
            <Heart size={28} color="#E8650A" fill="#E8650A" />
          </View>
          <Text variant="h3" className="text-[16px]">
            Pas encore de match
          </Text>
          <Text variant="caption" className="mt-1 text-center">
            Quand deux joueurs se likent mutuellement, une conversation est ouverte ici.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/partenaires')}
            className="mt-4 rounded-full bg-brand-orange px-4 py-2"
          >
            <Text className="font-heading text-[12px] text-white">
              Découvrir des joueurs →
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
