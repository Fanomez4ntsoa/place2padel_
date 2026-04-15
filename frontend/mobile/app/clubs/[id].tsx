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

export default function ClubDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const clubQuery = useClub(id);
  const myClubsQuery = useMyClubs();
  const toggleMut = useToggleClubSubscription();

  const club = clubQuery.data;
  const isSubscribed = !!myClubsQuery.data?.some((c) => c.uuid === id);

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
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color="#E8650A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
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

        {/* Hero */}
        <View className="px-5 pb-4">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-brand-orange-light">
            <Building2 size={30} color="#E8650A" />
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
        </View>

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
