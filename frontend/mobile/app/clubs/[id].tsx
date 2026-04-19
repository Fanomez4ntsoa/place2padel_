import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Building2,
  CalendarClock,
  ChevronRight,
  Globe,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
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

import { aspectRatioFor } from '@/components/feed/postAspect';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Text } from '@/design-system';
import {
  useClub,
  useMyClubs,
  useToggleClubSubscription,
} from '@/features/clubs/useClubs';
import { flattenFeed, useProfilePosts } from '@/features/feed/useFeed';
import type { FeedPost } from '@/features/feed/types';
import { flattenTournamentPages, useTournaments } from '@/features/tournaments/useTournaments';
import { formatApiError } from '@/lib/api';

export default function ClubDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const clubQuery = useClub(id);
  const myClubsQuery = useMyClubs();
  const toggleMut = useToggleClubSubscription();
  const tournamentsQuery = useTournaments({ clubUuid: id, perPage: 6 });
  const ownerPostsQuery = useProfilePosts(clubQuery.data?.owner?.uuid);

  const club = clubQuery.data;
  const isSubscribed = !!myClubsQuery.data?.some((c) => c.uuid === id);
  const tournaments = flattenTournamentPages(tournamentsQuery.data?.pages);
  const tournamentsCount = tournamentsQuery.data?.pages[0]?.meta.total ?? 0;
  const openTournaments = tournaments.filter((t) => t.status === 'open').slice(0, 3);
  const posts = flattenFeed(ownerPostsQuery.data);
  const isOwner = !!user && club?.owner?.uuid === user.uuid;

  const handleToggle = async () => {
    if (!isLoggedIn) {
      Alert.alert('Connexion requise', "Connecte-toi pour suivre ce club.");
      return;
    }
    if (!club) return;
    try {
      await toggleMut.mutateAsync({ club, isSubscribed });
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  const openMaps = () => {
    if (!club?.address) return;
    // Google Maps universal link — ouvre l'app native si installée, sinon le web.
    const query = encodeURIComponent(`${club.address}, ${club.city}`);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  if (clubQuery.isLoading || !club) {
    return (
      <SafeAreaView edges={[]} className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color="#E8650A" />
      </SafeAreaView>
    );
  }

  const subscribersCount = club.subscribers_count ?? 0;
  const courtsCount = club.courts_count;

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* ── Header navy compact (port ClubDetailPage.js:111-146) ── */}
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 }}
        >
          {/* Ligne 1 : back + logo + nom/ville + toggle Suivre/Suivi */}
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-[34px] w-[34px] items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <ArrowLeft size={16} color="#FFFFFF" />
            </Pressable>

            <View
              className="h-12 w-12 items-center justify-center overflow-hidden rounded-[14px]"
              style={{
                backgroundColor: 'rgba(232,101,10,0.25)',
                borderWidth: 2,
                borderColor: 'rgba(232,101,10,0.4)',
              }}
            >
              {club.picture_url ? (
                <Image
                  source={club.picture_url}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Building2 size={22} color="#E8650A" />
              )}
            </View>

            <View className="flex-1">
              <Text
                className="font-heading-black text-white"
                style={{ fontSize: 16, lineHeight: 20 }}
                numberOfLines={1}
              >
                {club.name}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <MapPin size={10} color="rgba(255,255,255,0.55)" />
                <Text
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}
                  numberOfLines={1}
                >
                  {club.city}
                  {club.department ? ` · ${club.department}` : ''}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleToggle}
              disabled={toggleMut.isPending}
              className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
              style={{
                backgroundColor: isSubscribed
                  ? 'rgba(255,255,255,0.15)'
                  : '#E8650A',
                borderWidth: isSubscribed ? 1 : 0,
                borderColor: 'rgba(255,255,255,0.2)',
                opacity: toggleMut.isPending ? 0.6 : 1,
              }}
            >
              {isSubscribed ? (
                <BellOff size={13} color="#FFFFFF" />
              ) : (
                <Bell size={13} color="#FFFFFF" />
              )}
              <Text
                className="font-heading-black text-white"
                style={{ fontSize: 12 }}
              >
                {isSubscribed ? 'Suivi' : 'Suivre'}
              </Text>
            </Pressable>
          </View>

          {/* Grille 3 stats */}
          <View className="mt-4 flex-row gap-2">
            <StatTile value={subscribersCount} label="Joueurs" />
            <StatTile value={tournamentsCount} label="Tournois" />
            <StatTile value={courtsCount ?? '?'} label="Terrains" />
          </View>
        </LinearGradient>

        <View className="px-4 pt-4">
          {/* Badges owner + club_type + indoor */}
          {(club.owner || club.club_type || club.indoor !== null) && (
            <View className="mb-4 flex-row flex-wrap gap-1.5">
              {club.owner ? (
                <View className="flex-row items-center gap-1 rounded-full bg-brand-orange-light px-2.5 py-1">
                  <Text className="font-heading text-[10px] text-brand-orange">
                    ⭐ Patron inscrit
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
              {isOwner ? (
                <View className="rounded-full bg-green-50 px-2.5 py-1">
                  <Text className="font-heading text-[10px] text-green-700">
                    ✓ Tu es le patron
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Description patron */}
          {club.description ? (
            <Card className="mb-4">
              <Text variant="body" className="text-[13px] leading-5">
                {club.description}
              </Text>
            </Card>
          ) : null}

          {/* Infos pratiques — adresse cliquable Google Maps + phone + website */}
          {club.address || club.phone || club.website || club.email ? (
            <View
              className="mb-4 gap-1.5 rounded-2xl border border-brand-border bg-white px-4 py-3"
            >
              {club.address ? (
                <Pressable
                  onPress={openMaps}
                  className="flex-row items-center gap-1.5"
                  hitSlop={4}
                >
                  <MapPin size={12} color="#E8650A" />
                  <Text
                    variant="caption"
                    className="flex-1 text-[12px] text-brand-orange"
                    numberOfLines={2}
                  >
                    {club.address}, {club.city}
                  </Text>
                </Pressable>
              ) : null}
              {club.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${club.phone}`)}
                  className="flex-row items-center gap-1.5"
                  hitSlop={4}
                >
                  <Phone size={12} color="#E8650A" />
                  <Text variant="caption" className="text-[12px] text-brand-orange">
                    {club.phone}
                  </Text>
                </Pressable>
              ) : null}
              {club.website ? (
                <Pressable
                  onPress={() => Linking.openURL(club.website as string)}
                  className="flex-row items-center gap-1.5"
                  hitSlop={4}
                >
                  <Globe size={12} color="#2563EB" />
                  <Text
                    variant="caption"
                    className="flex-1 text-[12px]"
                    style={{ color: '#2563EB' }}
                    numberOfLines={1}
                  >
                    {club.website}
                  </Text>
                </Pressable>
              ) : null}
              {club.email ? (
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${club.email}`)}
                  className="flex-row items-center gap-1.5"
                  hitSlop={4}
                >
                  <Mail size={12} color="#E8650A" />
                  <Text variant="caption" className="text-[12px] text-brand-orange">
                    {club.email}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Tournois à venir dans ce club */}
          {openTournaments.length > 0 ? (
            <View className="mb-4">
              <Text
                className="mb-2.5 font-heading-black text-brand-navy"
                style={{ fontSize: 14 }}
              >
                Tournois dans ce club
              </Text>
              <View className="gap-2">
                {openTournaments.map((t) => {
                  const registered = t.teams_count ?? 0;
                  const left = Math.max(0, (t.max_teams ?? 0) - registered);
                  return (
                    <Pressable
                      key={t.uuid}
                      onPress={() => router.push(`/tournois/${t.uuid}`)}
                      className="flex-row items-center gap-3 rounded-2xl border border-brand-border bg-white px-3.5 py-3"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-orange-light">
                        <Trophy size={16} color="#E8650A" />
                      </View>
                      <View className="flex-1">
                        <Text
                          variant="body-medium"
                          className="text-[13px]"
                          numberOfLines={1}
                        >
                          {t.name}
                        </Text>
                        <Text variant="caption" className="text-[11px]">
                          {t.date}
                          {t.level ? ` · ${t.level}` : ''}
                          {' · '}
                          <Text
                            variant="caption"
                            className="text-[11px]"
                            style={{
                              color: left > 0 ? '#16A34A' : '#EF4444',
                            }}
                          >
                            {left > 0 ? `${left} places` : 'Complet'}
                          </Text>
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Feed posts du club (posts du patron si club revendiqué) */}
          {club.owner ? (
            <View className="mb-4">
              <Text
                className="mb-2.5 font-heading-black text-brand-navy"
                style={{ fontSize: 14 }}
              >
                Actualités du club
              </Text>
              {ownerPostsQuery.isLoading ? (
                <View className="items-center py-6">
                  <ActivityIndicator color="#E8650A" />
                </View>
              ) : posts.length > 0 ? (
                <View className="gap-3">
                  {posts.slice(0, 5).map((post) => (
                    <ClubPostCard key={post.uuid} post={post} clubName={club.name} />
                  ))}
                </View>
              ) : (
                <ClubPostsEmptyState
                  isSubscribed={isSubscribed}
                  onSubscribe={handleToggle}
                  pending={toggleMut.isPending}
                />
              )}
            </View>
          ) : (
            <View className="mb-4">
              <Text
                className="mb-2.5 font-heading-black text-brand-navy"
                style={{ fontSize: 14 }}
              >
                Actualités du club
              </Text>
              <ClubPostsEmptyState
                isSubscribed={isSubscribed}
                onSubscribe={handleToggle}
                pending={toggleMut.isPending}
              />
            </View>
          )}

          {/* Services du club — 3 cards navy statiques (À venir) */}
          <View className="mb-4">
            <Text
              className="mb-2.5 font-heading-black text-brand-navy"
              style={{ fontSize: 14 }}
            >
              Services du club
            </Text>
            <View className="gap-2.5">
              <View className="flex-row gap-2.5">
                <ServiceCard
                  icon={<ShoppingBag size={24} color="#E8650A" />}
                  title="Boutique"
                  subtitle="Vends tes produits en ligne"
                  badgeColor="#E8650A"
                  badgeTextColor="#FFFFFF"
                />
                <ServiceCard
                  icon={<CalendarClock size={24} color="#4ADE80" />}
                  title="Réservation"
                  subtitle="Terrain en quelques secondes"
                  badgeColor="#4ADE80"
                  badgeTextColor="#15803D"
                />
              </View>
              <ServiceCard
                fullWidth
                icon={<Text style={{ fontSize: 24 }}>🍽️</Text>}
                title="Restauration"
                subtitle="Menu · Réservation table · À emporter"
                badgeColor="#FBBF24"
                badgeTextColor="#92400E"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <View
      className="flex-1 items-center rounded-[10px] py-2"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <Text
        className="font-heading-black text-white"
        style={{ fontSize: 16, lineHeight: 20 }}
      >
        {value}
      </Text>
      <Text
        className="font-body-medium"
        style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}
      >
        {label}
      </Text>
    </View>
  );
}

function ClubPostsEmptyState({
  isSubscribed,
  onSubscribe,
  pending,
}: {
  isSubscribed: boolean;
  onSubscribe: () => void;
  pending: boolean;
}) {
  return (
    <View className="items-center rounded-2xl border border-brand-border bg-white px-6 py-8">
      <Building2 size={32} color="#CBD5E1" />
      <Text variant="body-medium" className="mt-2 text-[14px]">
        Aucun post pour l&apos;instant
      </Text>
      {!isSubscribed ? (
        <>
          <Text variant="caption" className="mt-1 text-center text-[12px]">
            Suis ce club pour être notifié de ses actualités.
          </Text>
          <Pressable
            onPress={onSubscribe}
            disabled={pending}
            className="mt-3 flex-row items-center gap-1.5 rounded-full bg-brand-orange px-4 py-2"
            style={{ opacity: pending ? 0.6 : 1 }}
          >
            <Bell size={13} color="#FFFFFF" />
            <Text
              className="font-heading-black text-white"
              style={{ fontSize: 12 }}
            >
              Suivre ce club
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function ClubPostCard({ post, clubName }: { post: FeedPost; clubName: string }) {
  const authorName = post.author?.name ?? clubName;
  return (
    <View className="overflow-hidden rounded-2xl border border-brand-border bg-white">
      {/* Header */}
      <View className="flex-row items-center gap-2.5 px-3.5 py-2.5">
        <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-navy">
          {post.author?.picture_url ? (
            <Image
              source={post.author.picture_url}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <Building2 size={16} color="#FFFFFF" />
          )}
        </View>
        <View className="flex-1">
          <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
            {authorName}
          </Text>
          <Text
            className="font-heading-black text-brand-orange"
            style={{ fontSize: 10 }}
          >
            {subtypeLabel(post)}
          </Text>
        </View>
        <Text variant="caption" className="text-[10px]">
          {timeAgo(post.created_at)}
        </Text>
      </View>

      {/* Image ratio piloté par post_aspect */}
      {post.image_url ? (
        <Image
          source={post.image_url}
          style={{ width: '100%', aspectRatio: aspectRatioFor(post.post_aspect) }}
          contentFit="cover"
        />
      ) : null}

      {/* Texte */}
      {post.text ? (
        <View className="px-3.5 pb-2 pt-3">
          <Text variant="body" className="text-[13px] leading-5">
            {post.text}
          </Text>
        </View>
      ) : null}

      {/* Actions (read-only pour l'instant — les écrans Feed gèrent l'interaction) */}
      <View className="flex-row items-center gap-5 border-t border-brand-border/50 px-3.5 py-2.5">
        <View className="flex-row items-center gap-1.5">
          <Heart
            size={16}
            color={post.liked_by_viewer ? '#E8650A' : '#64748B'}
            fill={post.liked_by_viewer ? '#E8650A' : 'transparent'}
          />
          <Text variant="caption" className="text-[12px]">
            {post.likes_count}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <MessageCircle size={16} color="#64748B" />
          <Text variant="caption" className="text-[12px]">
            {post.comments_count}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ServiceCard({
  icon,
  title,
  subtitle,
  badgeColor,
  badgeTextColor,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badgeColor: string;
  badgeTextColor: string;
  fullWidth?: boolean;
}) {
  return (
    <View
      className={`overflow-hidden rounded-[18px] px-3.5 py-4 ${fullWidth ? '' : 'flex-1'}`}
      style={{ backgroundColor: '#1A2A4A' }}
    >
      <View className="mb-2.5">{icon}</View>
      <Text
        className="font-heading-black text-white"
        style={{ fontSize: 14, lineHeight: 18 }}
      >
        {title}
      </Text>
      <Text
        className="mt-0.5"
        style={{ fontSize: 10, lineHeight: 14, color: 'rgba(255,255,255,0.55)' }}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
      <View
        className="mt-2 self-start rounded-full px-2 py-0.5"
        style={{ backgroundColor: badgeColor }}
      >
        <Text
          className="font-heading-black"
          style={{ fontSize: 9, color: badgeTextColor }}
        >
          GRATUIT · 0% commission
        </Text>
      </View>
      <View className="mt-2 flex-row items-center gap-1">
        <Text
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}
        >
          Bientôt
        </Text>
        <ChevronRight size={10} color="rgba(255,255,255,0.4)" />
      </View>
    </View>
  );
}

function subtypeLabel(post: FeedPost): string {
  if (post.post_type === 'tournament_club') return '🏆 Tournoi';
  if (post.post_type === 'referee_announcement') return '📢 Annonce';
  if (post.post_type === 'match_result') return '🎾 Match';
  return 'PlaceToPadel';
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return "À l'instant";
  if (d < 3600) return `${Math.floor(d / 60)} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} h`;
  return `${Math.floor(d / 86400)} j`;
}
