import { useRouter } from 'expo-router';
import { Building2, ChevronRight, Heart, Trophy, User as UserIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/design-system';
import type { Club } from '@/features/clubs/types';
import { useUniversalSearch } from '@/features/search/useUniversalSearch';
import type { TournamentSummary } from '@/features/tournaments/types';

/**
 * Overlay plein-écran (sous header sticky) affichant les résultats de la
 * recherche universelle — port AppHeader.js Emergent 39b6544.
 *
 * Monté en frère de l'AppHeader : quand `visible`, un View absolute prend
 * toute la hauteur sous l'input. Tap backdrop ferme. Tap résultat navigue
 * et ferme.
 *
 * Le bouton Heart sur les résultats Joueurs est temporairement désactivé
 * — POST /matching/swipe Phase 4.2 Laravel pas encore livré.
 */
interface Props {
  visible: boolean;
  query: string;
  topOffset: number;
  onNavigate: () => void;
}

export function UniversalSearchOverlay({ visible, query, topOffset, onNavigate }: Props) {
  const router = useRouter();
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { enabled, isLoading, data, totalCount } = useUniversalSearch(debounced);

  if (!visible) return null;

  const go = (path: string) => {
    onNavigate();
    router.push(path as never);
  };

  return (
    <View
      pointerEvents="auto"
      style={{
        position: 'absolute',
        top: topOffset,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderTopWidth: 1,
        borderTopColor: '#F0EBE8',
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
        {!enabled ? (
          <Text variant="caption" className="py-4 text-center text-[11px]">
            Tape au moins 2 caractères…
          </Text>
        ) : isLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#E8650A" />
          </View>
        ) : totalCount === 0 ? (
          <Text variant="caption" className="py-4 text-center text-[11px]">
            Aucun résultat pour « {debounced} »
          </Text>
        ) : (
          <>
            {data.tournaments.length > 0 ? (
              <View>
                <SectionHeader label="Tournois" />
                {data.tournaments.map((t) => (
                  <TournamentRow key={t.uuid} tournament={t} onPress={() => go(`/(tabs)/tournois/${t.uuid}`)} />
                ))}
              </View>
            ) : null}

            {data.clubs.length > 0 ? (
              <View>
                <SectionHeader label="Clubs" />
                {data.clubs.map((c) => (
                  <ClubRow key={c.uuid} club={c} onPress={() => go(`/clubs/${c.uuid}`)} />
                ))}
              </View>
            ) : null}

            {data.users.length > 0 ? (
              <View>
                <SectionHeader label="Joueurs" />
                {data.users.map((u) => (
                  <UserRow
                    key={u.uuid}
                    user={u}
                    onOpen={() => go(`/profil/${u.uuid}`)}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      variant="caption"
      className="mb-1.5 px-2 text-[9px] font-heading-black uppercase"
      style={{ letterSpacing: 2, color: '#94A3B8' }}
    >
      {label}
    </Text>
  );
}

function TournamentRow({
  tournament,
  onPress,
}: {
  tournament: TournamentSummary;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2.5 rounded-xl px-2 py-2"
      style={({ pressed }) => ({ backgroundColor: pressed ? '#FFF8F4' : 'transparent' })}
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-brand-orange-light">
        <Trophy size={14} color="#E8650A" />
      </View>
      <View className="flex-1">
        <Text variant="body-medium" className="text-[12px]" numberOfLines={1}>
          {tournament.name}
        </Text>
        <Text variant="caption" className="mt-0.5 text-[10px]" numberOfLines={1}>
          {tournament.club?.name ?? tournament.location ?? ''}
          {tournament.date ? ` · ${tournament.date}` : ''}
        </Text>
      </View>
      <ChevronRight size={12} color="#CBD5E1" />
    </Pressable>
  );
}

function ClubRow({ club, onPress }: { club: Club; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2.5 rounded-xl px-2 py-2"
      style={({ pressed }) => ({ backgroundColor: pressed ? '#FFF8F4' : 'transparent' })}
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/5">
        <Building2 size={14} color="#1A2A4A" />
      </View>
      <View className="flex-1">
        <Text variant="body-medium" className="text-[12px]" numberOfLines={1}>
          {club.name}
        </Text>
        <Text variant="caption" className="mt-0.5 text-[10px]" numberOfLines={1}>
          {club.city}
          {club.postal_code ? ` (${club.postal_code})` : ''}
        </Text>
      </View>
      <ChevronRight size={12} color="#CBD5E1" />
    </Pressable>
  );
}

function UserRow({
  user,
  onOpen,
}: {
  user: {
    uuid: string;
    name: string;
    city?: string | null;
    profile?: { padel_points?: number | null } | null;
    clubs?: Array<{ name: string; city: string }>;
  };
  onOpen: () => void;
}) {
  const initial = (user.name || '?').trim().charAt(0).toUpperCase();
  const points = user.profile?.padel_points ?? 0;
  const clubOrCity = user.clubs?.[0]?.name ?? user.city ?? '';

  return (
    <View
      className="flex-row items-center gap-2.5 rounded-xl px-2 py-2"
    >
      <Pressable onPress={onOpen} className="flex-1 flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-navy">
          <Text className="font-heading-black text-[11px] text-white">{initial}</Text>
        </View>
        <View className="flex-1">
          <Text variant="body-medium" className="text-[12px]" numberOfLines={1}>
            {user.name}
          </Text>
          <Text variant="caption" className="mt-0.5 text-[10px]" numberOfLines={1}>
            {points} pts{clubOrCity ? ` · ${clubOrCity}` : ''}
          </Text>
        </View>
      </Pressable>
      {/* Heart quick-like — désactivé tant que POST /matching/swipe Phase 4.2 pas livré. */}
      <Pressable
        disabled
        className="h-8 w-8 items-center justify-center rounded-full bg-brand-bg"
        style={{ opacity: 0.4 }}
      >
        <Heart size={14} color="#E8650A" />
      </Pressable>
    </View>
  );
}

// Keep UserIcon import referenced via fallback chain for future avatars.
// (import reste pour ne pas le retirer involontairement — sera utilisé dès qu'on
// ajoute le support photo dans les résultats users.)
void UserIcon;
