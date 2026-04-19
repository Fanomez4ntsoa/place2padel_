import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BellRing,
  Building2,
  Globe,
  Heart,
  Mail,
  MapPin,
  Phone,
  Star,
  Trophy,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import { useClub, useMyClubs, useToggleClubSubscription } from '@/features/clubs/useClubs';
import { flattenTournamentPages, useTournaments } from '@/features/tournaments/useTournaments';

export default function ClubDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const clubQuery = useClub(id);
  const myClubsQuery = useMyClubs();
  const toggleMut = useToggleClubSubscription();
  const tournamentsQuery = useTournaments({ clubUuid: id, perPage: 6 });

  const club = clubQuery.data;
  const isSubscribed = !!myClubsQuery.data?.some((c) => c.uuid === id);
  const tournaments = flattenTournamentPages(tournamentsQuery.data?.pages).slice(0, 6);
  const isOwner = !!user && club?.owner?.uuid === user.uuid;

  const handleToggle = async () => {
    if (!isLoggedIn) {
      Alert.alert('Connexion requise', 'Connecte-toi pour t\'abonner aux clubs.');
      return;
    }
    if (!club) return;
    try {
      await toggleMut.mutateAsync({ club, isSubscribed });
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  if (clubQuery.isLoading || !club) {
    return (
      <SafeAreaView edges={[]} className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color="#E8650A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Back minimal */}
        <View className="px-4 pt-2 pb-1">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#1A2A4A" />
          </Pressable>
        </View>

        {/* Picture (si patron a uploadé) */}
        {club.picture_url ? (
          <View className="mb-3 px-4">
            <View className="overflow-hidden rounded-3xl bg-slate-100" style={{ aspectRatio: 16 / 9 }}>
              <Image
                source={club.picture_url}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
          </View>
        ) : null}

        {/* Hero */}
        <View className="px-5 pb-4">
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-brand-orange-light">
              <Building2 size={30} color="#E8650A" />
            </View>
            {club.owner_id ? (
              <View className="flex-row items-center gap-1 rounded-full bg-brand-orange-light px-2.5 py-1">
                <Star size={11} fill="#E8650A" color="#E8650A" />
                <Text className="font-heading text-[10px] text-brand-orange">
                  Patron inscrit
                </Text>
              </View>
            ) : null}
            {club.club_type ? (
              <View className="rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="font-heading text-[10px] text-brand-navy">
                  {club.club_type === 'associatif' ? '🤝 Associatif' : '🏢 Privé'}
                </Text>
              </View>
            ) : null}
            {club.indoor === true ? (
              <View className="rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="font-heading text-[10px] text-brand-navy">🏠 Couvert</Text>
              </View>
            ) : club.indoor === false ? (
              <View className="rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="font-heading text-[10px] text-brand-navy">☀️ Extérieur</Text>
              </View>
            ) : null}
          </View>
          <Text variant="h2" className="text-[22px]">
            {club.name}
          </Text>
          <View className="mt-1 flex-row items-center gap-1">
            <MapPin size={13} color="#64748B" />
            <Text variant="caption" className="text-[13px]">
              {club.city}
              {club.postal_code ? ` · ${club.postal_code}` : ''}
              {club.region ? ` · ${club.region}` : ''}
            </Text>
          </View>
          {isOwner ? (
            <View className="mt-2 self-start rounded-full bg-green-50 px-3 py-1">
              <Text className="font-heading text-[11px] text-green-700">
                ✓ Tu es le patron de ce club
              </Text>
            </View>
          ) : null}
        </View>

        {/* Description (optionnelle, rédigée par le patron) */}
        {club.description ? (
          <View className="mx-5 mb-4">
            <Card>
              <Text variant="body" className="text-[13px] leading-5">
                {club.description}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* Abonnement */}
        <View className="mx-5">
          <Button
            label={isSubscribed ? 'Désabonner' : "S'abonner aux alertes"}
            variant={isSubscribed ? 'ghost' : 'primary'}
            loading={toggleMut.isPending}
            leftIcon={
              isSubscribed ? (
                <Heart size={18} color="#1A2A4A" fill="#E8650A" />
              ) : (
                <BellRing size={18} color="#FFFFFF" />
              )
            }
            onPress={handleToggle}
          />
          <Text variant="caption" className="mt-2 px-1 text-[11px]">
            {isSubscribed
              ? 'Tu reçois les notifications des nouveaux tournois de ce club.'
              : "Active les alertes pour être notifié des nouveaux tournois."}
          </Text>
        </View>

        {/* Infos */}
        <View className="mx-5 mt-5">
          <Card>
            {club.address ? (
              <InfoRow icon={<MapPin size={16} color="#E8650A" />} label="Adresse" value={club.address} />
            ) : null}
            {club.courts_count ? (
              <InfoRow
                icon={<Trophy size={16} color="#E8650A" />}
                label="Terrains"
                value={`${club.courts_count} court${club.courts_count > 1 ? 's' : ''}`}
              />
            ) : null}
            {club.phone ? (
              <InfoRow
                icon={<Phone size={16} color="#E8650A" />}
                label="Téléphone"
                value={club.phone}
                onPress={() => Linking.openURL(`tel:${club.phone}`)}
              />
            ) : null}
            {club.email ? (
              <InfoRow
                icon={<Mail size={16} color="#E8650A" />}
                label="Email"
                value={club.email}
                onPress={() => Linking.openURL(`mailto:${club.email}`)}
              />
            ) : null}
            {club.website ? (
              <InfoRow
                icon={<Globe size={16} color="#E8650A" />}
                label="Site web"
                value={club.website}
                onPress={() => Linking.openURL(club.website as string)}
              />
            ) : null}
          </Card>
        </View>

        {/* Tournois dans ce club */}
        {tournaments.length > 0 ? (
          <View className="mx-5 mt-5">
            <Text
              variant="caption"
              className="mb-2 text-[11px] font-heading-black uppercase tracking-wider"
            >
              Tournois dans ce club
            </Text>
            <View className="gap-2.5">
              {tournaments.map((t) => (
                <Pressable
                  key={t.uuid}
                  onPress={() => router.push(`/tournois/${t.uuid}`)}
                  className="flex-row items-center gap-3 rounded-3xl border border-brand-border bg-white px-4 py-3"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-orange-light">
                    <Trophy size={18} color="#E8650A" />
                  </View>
                  <View className="flex-1">
                    <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text variant="caption" className="text-[11px]">
                      {t.date}
                      {t.level ? ` · ${t.level}` : ''}
                      {t.status === 'open' ? ' · Ouvert' : ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-brand-border/60 py-2.5 last:border-b-0"
    >
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand-orange-light">
        {icon}
      </View>
      <View className="flex-1">
        <Text variant="caption" className="text-[10px] font-heading-black uppercase tracking-wider">
          {label}
        </Text>
        <Text
          variant="body"
          className={`mt-0.5 text-[13px] ${onPress ? 'text-brand-orange' : ''}`}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </Wrapper>
  );
}
