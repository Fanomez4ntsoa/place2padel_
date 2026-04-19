import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Calendar,
  Clock,
  CreditCard,
  MapPin,
  QrCode,
  Share2,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BracketView } from '@/components/matches/BracketView';
import { MatchRow } from '@/components/matches/MatchRow';
import { PoolCard } from '@/components/matches/PoolCard';
import { RankingList } from '@/components/matches/RankingList';
import { Tabs } from '@/components/common/Tabs';
import { RegisterPartnerPicker } from '@/components/tournois/RegisterPartnerPicker';
import { TournamentDetailSkeleton } from '@/components/tournois/TournamentListSkeleton';
import { TournamentQrModal } from '@/components/tournois/TournamentQrModal';
import { TournamentSalon } from '@/components/tournois/TournamentSalon';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Text } from '@/design-system';
import type { Club } from '@/features/clubs/types';
import { useMyClubs, useToggleClubSubscription } from '@/features/clubs/useClubs';
import { formatApiError } from '@/lib/api';
import type { TournamentMatch } from '@/features/matches/types';
import {
  useForfeitMatch,
  useTournamentMatches,
  useTournamentPools,
  useTournamentRanking,
} from '@/features/matches/useMatches';
import { useCheckoutStatus, useCreateCheckout } from '@/features/payments/usePayments';
import type { TournamentStatus } from '@/features/tournaments/types';
import {
  useDeleteTournament,
  useLaunchTournament,
  useMySeekingTournaments,
  useRegisterTeam,
  useSeekingPartners,
  useToggleSeeking,
  useTournament,
  useUnregisterTeam,
} from '@/features/tournaments/useTournament';

const SEEKING_MESSAGE_MAX = 500;

type TabKey = 'infos' | 'teams' | 'seeking' | 'salon' | 'matches' | 'pools' | 'ranking' | 'bracket';

const STATUS: Record<
  TournamentStatus,
  { label: string; wrapperClass: string; labelClass: string }
> = {
  open: { label: 'Ouvert', wrapperClass: 'border-emerald-200 bg-emerald-50', labelClass: 'text-emerald-700' },
  full: { label: 'Complet', wrapperClass: 'border-amber-200 bg-amber-50', labelClass: 'text-amber-700' },
  in_progress: { label: 'En cours', wrapperClass: 'border-blue-200 bg-blue-50', labelClass: 'text-blue-700' },
  completed: { label: 'Terminé', wrapperClass: 'border-slate-200 bg-slate-50', labelClass: 'text-slate-500' },
};

function formatDateFR(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export default function TournamentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const { data: tournament, isLoading, refetch } = useTournament(id);
  const seekingQuery = useSeekingPartners(id);
  const mySeekingQuery = useMySeekingTournaments(!!user);
  const registerMut = useRegisterTeam(id);
  const unregisterMut = useUnregisterTeam(id);
  const toggleSeekingMut = useToggleSeeking(id);
  const createCheckoutMut = useCreateCheckout();
  const launchMut = useLaunchTournament(id);
  const deleteMut = useDeleteTournament(id);
  const myClubsQuery = useMyClubs();
  const toggleClubSubMut = useToggleClubSubscription();
  const matchesQuery = useTournamentMatches(id);
  const poolsQuery = useTournamentPools(id);
  const rankingQuery = useTournamentRanking(id);

  // TOUS les hooks déclarés AVANT tout return conditionnel (Rules of Hooks React).
  // L'ordre doit rester stable entre les renders, y compris la transition loading→loaded.
  const [tab, setTab] = useState<TabKey>('infos');
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [seekingModalOpen, setSeekingModalOpen] = useState(false);
  const [seekingMessage, setSeekingMessage] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);

  // Auto-switch du tab si la liste des tabs visibles change.
  // open/full            : [infos, teams, seeking, salon]
  // in_progress/completed : [matches, pools, ranking, salon]
  const tournamentStatus = tournament?.status;
  const isLaunched =
    tournamentStatus === 'in_progress' || tournamentStatus === 'completed';
  const LAUNCHED_TABS: readonly TabKey[] = ['matches', 'pools', 'bracket', 'ranking', 'salon'];
  const OPEN_TABS: readonly TabKey[] = ['infos', 'teams', 'seeking', 'salon'];
  useEffect(() => {
    if (!tournamentStatus) return;
    if (isLaunched && !LAUNCHED_TABS.includes(tab)) {
      setTab('matches');
    } else if (!isLaunched && !OPEN_TABS.includes(tab)) {
      setTab('infos');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentStatus, tab, isLaunched]);

  if (isLoading || !tournament) {
    return (
      <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
        <TournamentDetailSkeleton />
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS[tournament.status];
  const teamsCount = tournament.teams?.length ?? tournament.teams_count ?? 0;
  const max = tournament.max_teams || 1;
  const progress = Math.min((teamsCount / max) * 100, 100);

  const isRegistered = !!tournament.teams?.some(
    (t) => t.captain.uuid === user?.uuid || t.partner?.uuid === user?.uuid,
  );
  // Source de vérité : /seeking-partner/my (la liste /seeking-partners exclut le
  // viewer côté backend pour ne pas se proposer à soi-même).
  const isSeeking = !!mySeekingQuery.data?.some((e) => e.tournament.uuid === id);

  // Autorisation écriture salon — alignée CreatePostController:24-31 :
  // organizer | admin | captain ou partner d'une team registered.
  const isOrganizer = tournament.creator?.uuid === user?.uuid;
  const isAdmin = user?.role === 'admin';
  const canPostSalon = !!user && (isOrganizer || isAdmin || isRegistered);

  // Parse prix — Emergent regex `(tournament?.price || '').replace(/[^\d.,]/g,'')`.
  // Renvoie null si aucun prix parsable (ex: "" ou "Gratuit").
  const priceAmount = (() => {
    if (!tournament.price) return null;
    const cleaned = tournament.price.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();
  const priceLabel = priceAmount !== null ? `${priceAmount.toFixed(0)}€` : null;
  const hasPaidEntry = priceLabel !== null;
  const isOnlinePayment = hasPaidEntry && tournament.payment_method === 'online';

  // Soumission finale — appelée par le partner picker après choix d'un
  // partenaire (ou null si "S'inscrire seul"). Route Stripe si online payant.
  const submitRegistration = async (partnerUuid: string | null) => {
    if (tournament && tournament.payment_method === 'online' && tournament.price) {
      try {
        // NB : Stripe checkout courant ne prend pas partner_uuid (Phase 7) —
        // l'inscription sera faite sans partner au retour paid. TODO backend.
        const checkout = await createCheckoutMut.mutateAsync(tournament.uuid);
        if (!checkout.checkout_url) {
          Alert.alert('Erreur', 'URL Stripe indisponible.');
          return;
        }
        setCheckoutSessionId(checkout.session_id);
        setPartnerPickerOpen(false);
        await Linking.openURL(checkout.checkout_url);
      } catch (err) {
        Alert.alert('Erreur', formatApiError(err));
      }
      return;
    }

    try {
      await registerMut.mutateAsync(partnerUuid ?? undefined);
      await refetch();
      setPartnerPickerOpen(false);
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  const handleRegister = () => {
    // Ouvre le picker — choix partenaire obligatoire (port Emergent
    // TournamentDetailPage.js:406-479 Dialog partner picker).
    setPartnerPickerOpen(true);
  };

  const handleShare = async () => {
    const shareLink = tournament.share_link ?? `/tournois/${tournament.uuid}`;
    const message = `${tournament.name} — Tournoi ${tournament.level}${
      tournament.club ? ` au ${tournament.club.name}` : ''
    }${tournament.date ? ` · ${formatDateFR(tournament.date)}` : ''}`;
    try {
      await Share.share({
        message: `${message}\n${shareLink}`,
        url: shareLink,
        title: tournament.name,
      });
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  const handleUnregister = () => {
    Alert.alert('Désinscription', 'Confirmer la désinscription ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        style: 'destructive',
        onPress: async () => {
          try {
            await unregisterMut.mutateAsync();
            await refetch();
          } catch (err) {
            Alert.alert('Erreur', formatApiError(err));
          }
        },
      },
    ]);
  };

  const handleToggleSeeking = () => {
    if (isSeeking) {
      toggleSeekingMut
        .mutateAsync({ seek: false })
        .catch((err) => Alert.alert('Erreur', formatApiError(err)));
      return;
    }
    setSeekingMessage('');
    setSeekingModalOpen(true);
  };

  const submitSeeking = async () => {
    try {
      await toggleSeekingMut.mutateAsync({ seek: true, message: seekingMessage });
      setSeekingModalOpen(false);
      setSeekingMessage('');
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Back + Share + QR — AppHeader global prend le reste */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#1A2A4A" />
          </Pressable>
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={handleShare}
              className="h-9 w-9 items-center justify-center rounded-full"
              hitSlop={8}
              accessibilityLabel="Partager le tournoi"
            >
              <Share2 size={20} color="#1A2A4A" />
            </Pressable>
            {user ? (
              <Pressable
                onPress={() => setQrModalOpen(true)}
                className="h-9 w-9 items-center justify-center rounded-full"
                hitSlop={8}
              >
                <QrCode size={20} color="#1A2A4A" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Titre + statut dans le contenu */}
        <View className="flex-row items-start gap-3 px-5 pb-3">
          <Text variant="h2" className="flex-1 text-[22px]">
            {tournament.name}
          </Text>
          <View className={`rounded-full border px-3 py-1 ${statusStyle.wrapperClass}`}>
            <Text variant="caption" className={`${statusStyle.labelClass} text-[11px] font-heading`}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View className="mx-4">
          <Card>
            <View className="flex-row items-center gap-2">
              <MapPin size={16} color="#E8650A" />
              <Text variant="body-medium" className="flex-1" numberOfLines={1}>
                {tournament.club?.name ?? '—'}
                {tournament.location ? ` — ${tournament.location}` : ''}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center gap-4">
              <View className="flex-row items-center gap-1">
                <Calendar size={14} color="#64748B" />
                <Text variant="caption">{formatDateFR(tournament.date)}</Text>
              </View>
              {tournament.start_time ? (
                <View className="flex-row items-center gap-1">
                  <Clock size={14} color="#64748B" />
                  <Text variant="caption">{tournament.start_time}</Text>
                </View>
              ) : null}
            </View>

            <View className="mt-3 flex-row flex-wrap items-center gap-3">
              <View className="rounded-full bg-brand-navy/5 px-3 py-1">
                <Text variant="caption" className="font-heading text-brand-navy text-[11px]">
                  {tournament.level}
                </Text>
              </View>
              <Text variant="caption" className="capitalize">
                {tournament.type}
              </Text>
              <View className="flex-row items-center gap-1">
                <Users size={14} color="#64748B" />
                <Text variant="caption">
                  {teamsCount}/{tournament.max_teams}
                </Text>
              </View>
              {/* Prix + mode de paiement — port Emergent
                  TournamentDetailPage.js:344-351 (ligne CreditCard orange) */}
              {hasPaidEntry ? (
                <View className="flex-row items-center gap-1">
                  <CreditCard size={13} color="#E8650A" />
                  <Text
                    variant="caption"
                    className="font-heading-black text-brand-orange text-[11px]"
                  >
                    {priceLabel}
                    {isOnlinePayment ? ' (Stripe)' : ' (sur place)'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <View
                className="h-full rounded-full bg-brand-orange"
                style={{ width: `${progress}%` }}
              />
            </View>

            {/* Badge "Paiement sécurisé Stripe" en bas de la card si online. */}
            {isOnlinePayment ? (
              <View className="mt-2 self-start flex-row items-center gap-1 rounded-full border border-brand-orange/20 bg-brand-orange-light px-2.5 py-1">
                <Text
                  variant="caption"
                  className="font-heading-black text-brand-orange"
                  style={{ fontSize: 10 }}
                >
                  🔒 Paiement sécurisé via Stripe
                </Text>
              </View>
            ) : null}

            {/* Subscribe club — port Emergent TournamentDetailPage.js:356-364.
                Visible pour user authentifié, rapidement toggleable depuis la card
                (évite d'aller sur /clubs/{id} pour s'abonner). */}
            {user && tournament.club ? (
              <Pressable
                onPress={() => {
                  if (!tournament.club) return;
                  const isSub = !!myClubsQuery.data?.some(
                    (c) => c.uuid === tournament.club!.uuid,
                  );
                  // ClubEmbed n'a qu'uuid/name/city — on cast en Club minimal
                  // pour l'appel (le hook n'utilise que uuid + name.localeCompare).
                  const clubRef = {
                    ...tournament.club,
                    slug: '',
                    address: null,
                    postal_code: null,
                    department: null,
                    region: null,
                    country: 'FR',
                    latitude: null,
                    longitude: null,
                    phone: null,
                    email: null,
                    website: null,
                    courts_count: null,
                    indoor: null,
                    picture_url: null,
                    description: null,
                    club_type: null,
                    owner_id: null,
                    claimed_at: null,
                  } as Club;
                  toggleClubSubMut
                    .mutateAsync({ club: clubRef, isSubscribed: isSub })
                    .catch((err) => Alert.alert('Erreur', formatApiError(err)));
                }}
                disabled={toggleClubSubMut.isPending}
                className={`mt-2 self-start flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                  myClubsQuery.data?.some((c) => c.uuid === tournament.club!.uuid)
                    ? 'border border-brand-orange/20 bg-brand-orange-light'
                    : 'border border-brand-border bg-white'
                }`}
                style={{ opacity: toggleClubSubMut.isPending ? 0.5 : 1 }}
              >
                {myClubsQuery.data?.some((c) => c.uuid === tournament.club!.uuid) ? (
                  <>
                    <Bell size={11} color="#E8650A" />
                    <Text
                      variant="caption"
                      className="font-heading-black text-brand-orange"
                      style={{ fontSize: 11 }}
                    >
                      Alertes {tournament.club.name} activées
                    </Text>
                  </>
                ) : (
                  <>
                    <BellOff size={11} color="#64748B" />
                    <Text
                      variant="caption"
                      className="font-heading"
                      style={{ fontSize: 11, color: '#64748B' }}
                    >
                      Recevoir les alertes de {tournament.club.name}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </Card>
        </View>

        {/* CTA inscription — masqué pour l'organisateur (il ne s'inscrit pas à son
            propre tournoi) et pour les referees (ne jouent pas). */}
        {tournament.creator?.uuid !== user?.uuid && user?.role !== 'referee' ? (
          <View className="mx-4 mt-3">
            <TournamentCta
              status={tournament.status}
              isAuthenticated={!!user}
              isRegistered={isRegistered}
              registering={registerMut.isPending || createCheckoutMut.isPending}
              unregistering={unregisterMut.isPending}
              onLogin={() => router.push('/(auth)/login')}
              onRegister={handleRegister}
              onUnregister={handleUnregister}
              paymentMethod={tournament.payment_method}
              price={tournament.price}
            />
          </View>
        ) : null}

        {/* Format + phase badges — owner only, affichés si tournoi lancé.
            Emergent expose directement `tournament.format` et `tournament.phase`
            (MongoDB) ; côté Laravel ces colonnes n'existent pas, donc on dérive
            depuis les pools + matches déjà fetched (source de vérité locale). */}
        {(isOrganizer || isAdmin) && isLaunched ? (
          <View className="mx-4 mt-3 flex-row flex-wrap items-center gap-2">
            <DerivedFormatPhaseBadges
              status={tournament.status}
              pools={poolsQuery.data ?? []}
              matches={matchesQuery.data ?? []}
            />
          </View>
        ) : null}

        {/* Lancer + Supprimer — owner only, status open/full */}
        {tournament.creator?.uuid === user?.uuid &&
        (tournament.status === 'open' || tournament.status === 'full') ? (
          <View className="mx-4 mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button
                label={
                  teamsCount < 2
                    ? `Lancer (${teamsCount} éq.)`
                    : 'Lancer le tournoi'
                }
                leftIcon={<Trophy size={18} color="#FFFFFF" />}
                disabled={teamsCount < 2 || launchMut.isPending}
                loading={launchMut.isPending}
                onPress={() =>
                  Alert.alert(
                    'Lancer le tournoi',
                    `Cela clôt les inscriptions et génère les matchs pour ${teamsCount} équipe${teamsCount > 1 ? 's' : ''}. Action irréversible.`,
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Lancer',
                        style: 'destructive',
                        onPress: () =>
                          launchMut
                            .mutateAsync()
                            .catch((err) => Alert.alert('Erreur', formatApiError(err))),
                      },
                    ],
                  )
                }
              />
            </View>
            {/* Supprimer — port Emergent TournamentDetailPage.js:507-510.
                Policy backend : owner|admin + status in (open|full). */}
            <Pressable
              onPress={() =>
                Alert.alert(
                  'Supprimer ce tournoi',
                  'Cette action est définitive. Les inscriptions actuelles seront perdues.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Supprimer',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteMut.mutateAsync();
                          router.back();
                        } catch (err) {
                          Alert.alert('Erreur', formatApiError(err));
                        }
                      },
                    },
                  ],
                )
              }
              disabled={deleteMut.isPending}
              className="h-12 w-12 items-center justify-center rounded-2xl border-2 border-red-300 bg-white"
              style={{ opacity: deleteMut.isPending ? 0.5 : 1 }}
              accessibilityLabel="Supprimer le tournoi"
            >
              {deleteMut.isPending ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Trash2 size={18} color="#EF4444" />
              )}
            </Pressable>
          </View>
        ) : null}

        {/* Tabs — 3 max pour rentrer à l'écran :
            - open/full      : Infos / Équipes / Seeking
            - in_progress/completed : Matchs / Poules / Classement (les infos d'organisation
              ne sont plus prioritaires une fois le tournoi lancé) */}
        <Tabs<TabKey>
          tabs={
            tournament.status === 'in_progress' || tournament.status === 'completed'
              ? [
                  {
                    key: 'matches' as TabKey,
                    label: 'Matchs',
                    count: matchesQuery.data?.length ?? 0,
                  },
                  { key: 'pools' as TabKey, label: 'Poules' },
                  { key: 'bracket' as TabKey, label: 'Tableau' },
                  { key: 'ranking' as TabKey, label: 'Classement' },
                  { key: 'salon' as TabKey, label: 'Salon' },
                ]
              : [
                  { key: 'infos' as TabKey, label: 'Infos' },
                  { key: 'teams' as TabKey, label: 'Équipes', count: teamsCount },
                  {
                    key: 'seeking' as TabKey,
                    label: 'Seeking',
                    count: seekingQuery.data?.meta.count ?? 0,
                  },
                  { key: 'salon' as TabKey, label: 'Salon' },
                ]
          }
          value={tab}
          onChange={setTab}
        />

        <View className="mt-4 px-5">
          {tab === 'infos' ? (
            <View className="gap-3">
              <Card>
                <Text variant="h3" className="text-[15px]">Organisateur</Text>
                <Text variant="body" className="mt-1">
                  {tournament.creator?.name ?? '—'}
                </Text>
              </Card>
              {tournament.price ? (
                <Card>
                  <Text variant="h3" className="text-[15px]">Tarif</Text>
                  <Text variant="body" className="mt-1">{tournament.price}</Text>
                </Card>
              ) : null}
              {tournament.inscription_deadline ? (
                <Card>
                  <Text variant="h3" className="text-[15px]">Clôture des inscriptions</Text>
                  <Text variant="body" className="mt-1">
                    {formatDateFR(tournament.inscription_deadline)}
                  </Text>
                </Card>
              ) : null}
            </View>
          ) : null}

          {tab === 'teams' ? (
            <View className="gap-2">
              {teamsCount === 0 ? (
                <Card>
                  <Text variant="caption" className="text-center">
                    Aucune équipe inscrite pour l'instant.
                  </Text>
                </Card>
              ) : (
                tournament.teams?.map((team, idx) => {
                  // Port Emergent TournamentDetailPage.js:650-668 :
                  // - Seed 1..4 → pastille orange, TS badge
                  // - team_points à droite en font-black orange
                  const rank = team.seed ?? idx + 1;
                  const isTopSeed = !!team.seed && team.seed <= 4;
                  return (
                    <View
                      key={team.id}
                      className="flex-row items-center gap-3 rounded-3xl border border-brand-border bg-white px-4 py-3"
                    >
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-full ${
                          isTopSeed ? 'bg-brand-orange-light' : 'bg-slate-100'
                        }`}
                      >
                        <Text
                          className={`font-heading-black ${isTopSeed ? 'text-brand-orange' : 'text-slate-500'}`}
                          style={{ fontSize: 13 }}
                        >
                          {rank}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
                          {team.team_name}
                        </Text>
                        <Text variant="caption" className="mt-0.5 text-[11px]" numberOfLines={1}>
                          {team.captain.name}
                          {team.partner ? ` & ${team.partner.name}` : ''}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className="font-heading-black text-brand-orange"
                          style={{ fontSize: 14, fontVariant: ['tabular-nums'] }}
                        >
                          {team.team_points}
                        </Text>
                        <Text variant="caption" className="text-[9px]">
                          pts équipe
                        </Text>
                      </View>
                      {isTopSeed && team.seed ? (
                        <Badge label={`TS${team.seed}`} tone="info" />
                      ) : null}
                    </View>
                  );
                })
              )}

              {/* Liste d'attente — port Emergent TournamentDetailPage.js:672-686.
                  Affichée dessous les équipes registered si waitlist présente. */}
              {tournament.waitlist && tournament.waitlist.length > 0 ? (
                <View className="mt-4">
                  <Text
                    className="mb-2 text-[11px] font-heading-black uppercase tracking-wider text-amber-600"
                  >
                    Liste d&apos;attente ({tournament.waitlist.length})
                  </Text>
                  <View className="gap-1.5">
                    {tournament.waitlist.map((w, i) => (
                      <View
                        key={w.id}
                        className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-3 py-2.5"
                      >
                        <View className="h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                          <Text
                            className="font-heading-black text-amber-700"
                            style={{ fontSize: 11 }}
                          >
                            {i + 1}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
                            {w.team_name}
                          </Text>
                          <Text variant="caption" className="text-[11px]" numberOfLines={1}>
                            {w.captain.name}
                            {w.partner ? ` & ${w.partner.name}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {tab === 'seeking' ? (
            <View className="gap-3">
              {user ? (
                <Button
                  label={isSeeking ? 'Retirer ma déclaration' : 'Je suis seul sur ce tournoi'}
                  variant={isSeeking ? 'ghost' : 'primary'}
                  loading={toggleSeekingMut.isPending}
                  onPress={handleToggleSeeking}
                />
              ) : (
                <Button
                  label="Se connecter pour se déclarer"
                  variant="ghost"
                  onPress={() => router.push('/(auth)/login')}
                />
              )}

              {seekingQuery.isLoading ? (
                <ActivityIndicator color="#E8650A" />
              ) : seekingQuery.data?.meta.authenticated ? (
                seekingQuery.data.data.length === 0 ? (
                  <Card>
                    <Text variant="caption" className="text-center">
                      Personne ne cherche encore de partenaire.
                    </Text>
                  </Card>
                ) : (
                  seekingQuery.data.data.map((row) => (
                    <Card key={row.user.uuid}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-2">
                          <Text variant="body-medium">{row.user.name}</Text>
                          {row.message ? (
                            <Text variant="caption" className="mt-1">{row.message}</Text>
                          ) : null}
                        </View>
                        {typeof row.compatibility_score === 'number' ? (
                          <Badge label={`${row.compatibility_score}%`} tone="info" />
                        ) : null}
                      </View>
                    </Card>
                  ))
                )
              ) : (
                <Card>
                  <Text variant="caption" className="text-center">
                    {seekingQuery.data?.meta.count ?? 0} joueur(s) cherchent un partenaire. Connecte-toi
                    pour voir les profils et le score de compatibilité.
                  </Text>
                </Card>
              )}
            </View>
          ) : null}

          {tab === 'matches' ? (
            <View className="gap-5">
              {matchesQuery.isLoading ? (
                <ActivityIndicator color="#E8650A" />
              ) : !matchesQuery.data || matchesQuery.data.length === 0 ? (
                <Card>
                  <Text variant="caption" className="text-center">
                    Pas encore de match généré.
                  </Text>
                </Card>
              ) : (
                <MatchesGrouped
                  matches={matchesQuery.data}
                  tournamentUuid={tournament.uuid}
                  isOwner={isOrganizer || isAdmin}
                  onPressMatch={(m) =>
                    router.push(`/matches/${m.uuid}?tournament=${id}` as never)
                  }
                />
              )}
            </View>
          ) : null}

          {tab === 'pools' ? (
            <View className="gap-3">
              {poolsQuery.isLoading ? (
                <ActivityIndicator color="#E8650A" />
              ) : !poolsQuery.data || poolsQuery.data.length === 0 ? (
                <Card>
                  <Text variant="caption" className="text-center">
                    Aucune poule pour ce tournoi.
                  </Text>
                </Card>
              ) : (
                poolsQuery.data.map((p) => <PoolCard key={p.uuid} pool={p} />)
              )}
            </View>
          ) : null}

          {tab === 'bracket' ? (
            matchesQuery.isLoading ? (
              <ActivityIndicator color="#E8650A" />
            ) : (
              <BracketView matches={matchesQuery.data ?? []} />
            )
          ) : null}

          {tab === 'ranking' ? (
            <View>
              {rankingQuery.isLoading ? (
                <ActivityIndicator color="#E8650A" />
              ) : !rankingQuery.data || rankingQuery.data.data.length === 0 ? (
                <Card>
                  <Text variant="caption" className="text-center">
                    Classement indisponible pour l'instant.
                  </Text>
                </Card>
              ) : (
                <RankingList
                  entries={rankingQuery.data.data}
                  isFinal={rankingQuery.data.meta.final}
                />
              )}
            </View>
          ) : null}

          {tab === 'salon' ? (
            <TournamentSalon
              tournamentUuid={tournament.uuid}
              tournamentName={tournament.name}
              canPost={canPostSalon}
              isAuthenticated={!!user}
              onLogin={() => router.push('/(auth)/login')}
            />
          ) : null}
        </View>
      </ScrollView>

      <CheckoutPollingOverlay
        sessionId={checkoutSessionId}
        onClose={() => setCheckoutSessionId(null)}
        onPaid={async () => {
          await refetch();
          setCheckoutSessionId(null);
          Alert.alert('Paiement confirmé', 'Tu es inscrit au tournoi !');
        }}
      />

      <SeekingBottomSheet
        visible={seekingModalOpen}
        message={seekingMessage}
        onChangeMessage={setSeekingMessage}
        onClose={() => setSeekingModalOpen(false)}
        onSubmit={submitSeeking}
        submitting={toggleSeekingMut.isPending}
      />

      <TournamentQrModal
        tournamentUuid={id ?? ''}
        visible={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />

      <RegisterPartnerPicker
        visible={partnerPickerOpen}
        onClose={() => setPartnerPickerOpen(false)}
        onSubmit={(partnerUuid) => void submitRegistration(partnerUuid)}
        submitting={registerMut.isPending || createCheckoutMut.isPending}
        submitLabel={
          isOnlinePayment && priceLabel
            ? `S'inscrire — ${priceLabel}`
            : hasPaidEntry
              ? `S'inscrire — ${priceLabel} sur place`
              : "S'inscrire"
        }
        paymentInfo={
          hasPaidEntry && priceLabel
            ? { method: tournament.payment_method, priceLabel }
            : null
        }
        excludeUuids={[
          user?.uuid,
          ...(tournament.teams?.flatMap((t) =>
            [t.captain.uuid, t.partner?.uuid ?? null].filter(Boolean),
          ) ?? []),
        ].filter((u): u is string => !!u)}
      />
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────────
// MatchesGrouped — port Emergent TournamentDetailPage.js:773-869.
// Sépare poule / bracket principal / reclassement avec titres orange/amber.
// ───────────────────────────────────────────────────────────────

function MatchesGrouped({
  matches,
  tournamentUuid,
  isOwner,
  onPressMatch,
}: {
  matches: TournamentMatch[];
  tournamentUuid: string;
  isOwner: boolean;
  onPressMatch: (m: TournamentMatch) => void;
}) {
  // Groupement 1 : poule (par pool_uuid), bracket main, classement/consolante (par bloc).
  const poolMatches = matches.filter((m) => m.phase === 'poule');
  const bracketMain = matches.filter(
    (m) => m.phase === 'bracket' && (m.bloc === 'main' || !m.bloc),
  );
  const classementMatches = matches.filter((m) => m.phase === 'classement');

  const poolGroups = groupBy(poolMatches, (m) => m.pool_uuid ?? 'other');
  const classementGroups = groupBy(classementMatches, (m) => m.bloc ?? 'other');

  const renderMatchList = (list: TournamentMatch[]) => (
    <View className="gap-2">
      {list.map((m) => (
        <OwnerMatchRow
          key={m.uuid}
          match={m}
          tournamentUuid={tournamentUuid}
          isOwner={isOwner}
          onPress={() => onPressMatch(m)}
        />
      ))}
    </View>
  );

  const blocLabel = (bloc: string): string => {
    if (bloc === 'main') return 'Tableau principal';
    if (bloc.startsWith('classement_R0')) return 'Classement (perdants demi-finales)';
    if (bloc.startsWith('classement_R2')) return 'Classement (perdants quarts)';
    if (bloc.startsWith('classement_R3')) return 'Classement (perdants 8èmes)';
    if (bloc.startsWith('classement_R4')) return 'Classement (perdants 1er tour)';
    if (bloc.startsWith('consolante')) return bloc.replace('consolante_', 'Consolante ');
    return bloc.replace('classement_', 'Classement ').replace(/_/g, ' ');
  };

  return (
    <>
      {/* Poules — titre orange par pool */}
      {Object.entries(poolGroups).map(([poolUuid, list]) => (
        <View key={`pool-${poolUuid}`}>
          <Text
            className="mb-2 text-[11px] font-heading-black uppercase tracking-wider text-brand-orange"
          >
            Poule
          </Text>
          {renderMatchList(list)}
        </View>
      ))}

      {/* Tableau principal — séparateurs horizontaux orange de part et d'autre */}
      {bracketMain.length > 0 ? (
        <View>
          <SectionDivider label="Tableau principal" accent="#E8650A" />
          {renderMatchList(bracketMain)}
        </View>
      ) : null}

      {/* Reclassement / consolante — séparateur amber */}
      {Object.keys(classementGroups).length > 0 ? (
        <View>
          <SectionDivider label="Reclassement" accent="#D97706" />
          {Object.entries(classementGroups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([bloc, list]) => (
              <View key={`cls-${bloc}`} className="mb-3">
                <Text
                  className="mb-2 text-[11px] font-heading-black tracking-wider text-amber-600"
                >
                  {blocLabel(bloc)}
                </Text>
                {renderMatchList(list)}
              </View>
            ))}
        </View>
      ) : null}
    </>
  );
}

/**
 * Port Emergent TournamentDetailPage.js:514-531 — badges "format" + "phase".
 *
 * Les colonnes `format`/`phase` n'existent pas côté Laravel (le MatchEngineService
 * dérive tout à chaque requête). On les calcule ici depuis les données déjà
 * chargées : pools + matches + status. Invariants :
 *
 *   - pools.length > 0 + bracket matches présents → format "poules + tableau"
 *   - pools.length > 0 uniquement → "poules"
 *   - bracket only → "élimination directe"
 *
 *   - status=completed → phase "Terminé" (emerald)
 *   - bracket matches non tous terminés → "Tableau final" (blue)
 *   - pool matches restants → "Phase de poules" (amber)
 */
function DerivedFormatPhaseBadges({
  status,
  pools,
  matches,
}: {
  status: TournamentStatus;
  pools: { uuid: string }[];
  matches: TournamentMatch[];
}) {
  if (matches.length === 0) return null;

  const hasPools = pools.length > 0;
  const bracketMatches = matches.filter((m) => m.phase === 'bracket');
  const poolMatches = matches.filter((m) => m.phase === 'poule');
  const hasBracket = bracketMatches.length > 0;

  const format =
    hasPools && hasBracket
      ? 'Poules + tableau'
      : hasPools
        ? 'Poules'
        : hasBracket
          ? 'Élimination directe'
          : null;

  let phaseLabel: string | null = null;
  let phaseTone: 'emerald' | 'blue' | 'amber' = 'amber';

  if (status === 'completed') {
    phaseLabel = 'Terminé';
    phaseTone = 'emerald';
  } else {
    const poolPending = poolMatches.some(
      (m) => m.status === 'pending' || m.status === 'in_progress',
    );
    const bracketPending = bracketMatches.some(
      (m) => m.status === 'pending' || m.status === 'in_progress',
    );
    if (hasBracket && !bracketPending && bracketMatches.length > 0) {
      phaseLabel = 'Tableau terminé';
      phaseTone = 'emerald';
    } else if (hasBracket && bracketPending) {
      phaseLabel = 'Tableau final';
      phaseTone = 'blue';
    } else if (hasPools && poolPending) {
      phaseLabel = 'Phase de poules';
      phaseTone = 'amber';
    }
  }

  const toneClasses: Record<typeof phaseTone, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
  };

  if (!format && !phaseLabel) return null;

  return (
    <>
      {format ? (
        <View className="rounded-full bg-brand-navy/5 px-3 py-1">
          <Text
            variant="caption"
            className="font-heading-black text-brand-navy"
            style={{ fontSize: 10 }}
          >
            {format}
          </Text>
        </View>
      ) : null}
      {phaseLabel ? (
        <View
          className={`rounded-full px-3 py-1 ${toneClasses[phaseTone].bg}`}
        >
          <Text
            variant="caption"
            className={`font-heading-black ${toneClasses[phaseTone].text}`}
            style={{ fontSize: 10 }}
          >
            {phaseLabel}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function SectionDivider({ label, accent }: { label: string; accent: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <View style={{ height: 1, flex: 1, backgroundColor: `${accent}33` }} />
      <Text
        className="font-heading-black uppercase tracking-widest"
        style={{ fontSize: 10, color: accent }}
      >
        {label}
      </Text>
      <View style={{ height: 1, flex: 1, backgroundColor: `${accent}33` }} />
    </View>
  );
}

function groupBy<T, K extends string>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const map = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

// ───────────────────────────────────────────────────────────────
// OwnerMatchRow — wrapper qui scope useForfeitMatch par match UUID.
// Le hook a besoin d'un matchUuid stable, donc on ne peut pas l'appeler
// dans une boucle. Chaque MatchRow est monté dans son propre composant.
// ───────────────────────────────────────────────────────────────

function OwnerMatchRow({
  match,
  tournamentUuid,
  isOwner,
  onPress,
}: {
  match: TournamentMatch;
  tournamentUuid: string;
  isOwner: boolean;
  onPress: () => void;
}) {
  const forfeitMut = useForfeitMatch(tournamentUuid, match.uuid);

  return (
    <MatchRow
      match={match}
      onPress={onPress}
      isOwner={isOwner}
      forfeitPending={forfeitMut.isPending}
      onForfeit={(winnerTeamId) => {
        forfeitMut
          .mutateAsync(winnerTeamId)
          .catch((err) => Alert.alert('Erreur', formatApiError(err)));
      }}
    />
  );
}

// ───────────────────────────────────────────────────────────────
// Polling overlay — après retour Stripe, poll /checkout/status/{id}
// ───────────────────────────────────────────────────────────────

function CheckoutPollingOverlay({
  sessionId,
  onClose,
  onPaid,
}: {
  sessionId: string | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const statusQuery = useCheckoutStatus(sessionId);
  const [paidHandled, setPaidHandled] = useState(false);

  if (!sessionId) return null;

  const status = statusQuery.data?.status;
  const isPaid = status === 'paid';
  const isFailed = status === 'failed' || status === 'expired' || status === 'cancelled';

  if (isPaid && !paidHandled) {
    setPaidHandled(true);
    onPaid();
  }

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/60 px-8">
      <View className="w-full max-w-[320px] items-center rounded-3xl bg-white p-6">
        {isFailed ? (
          <>
            <Text className="text-[32px]">❌</Text>
            <Text variant="h3" className="mt-3 text-center text-[16px]">
              Paiement annulé
            </Text>
            <Text variant="caption" className="mt-2 text-center">
              Aucun débit n'a été effectué.
            </Text>
            <Pressable
              onPress={onClose}
              className="mt-4 rounded-2xl bg-brand-navy px-5 py-2.5"
            >
              <Text className="font-heading-black text-[13px] text-white">Fermer</Text>
            </Pressable>
          </>
        ) : isPaid ? (
          <>
            <Text className="text-[32px]">✅</Text>
            <Text variant="h3" className="mt-3 text-[16px]">Paiement confirmé</Text>
            <Text variant="caption" className="mt-1 text-center">
              Inscription en cours...
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator color="#E8650A" size="large" />
            <Text variant="h3" className="mt-4 text-center text-[15px]">
              Vérification du paiement…
            </Text>
            <Text variant="caption" className="mt-2 text-center">
              Si tu as fini sur Stripe, reviens ici. Sinon, utilise le lien reçu par email.
            </Text>
            <Pressable
              onPress={onClose}
              className="mt-4 rounded-2xl border border-brand-border bg-white px-5 py-2.5"
            >
              <Text variant="caption" className="text-[12px] font-heading">Annuler la vérification</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

interface CtaProps {
  status: TournamentStatus;
  isAuthenticated: boolean;
  isRegistered: boolean;
  registering: boolean;
  unregistering: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onUnregister: () => void;
  paymentMethod: 'on_site' | 'online';
  price: string | null;
}

function TournamentCta({
  status,
  isAuthenticated,
  isRegistered,
  registering,
  unregistering,
  onLogin,
  onRegister,
  onUnregister,
  paymentMethod,
  price,
}: CtaProps) {
  if (status === 'in_progress' || status === 'completed') {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Button
        label="Se connecter pour s'inscrire"
        onPress={onLogin}
        leftIcon={<UserPlus size={18} color="#FFFFFF" />}
      />
    );
  }

  if (isRegistered) {
    return (
      <View className="gap-2">
        <View className="flex-row items-center justify-center gap-2 rounded-2xl border border-brand-success bg-emerald-50 py-3">
          <Trophy size={16} color="#059669" />
          <Text variant="body-medium" className="text-brand-success">Inscrit au tournoi</Text>
        </View>
        <Button
          label="Se désinscrire"
          variant="ghost"
          loading={unregistering}
          onPress={onUnregister}
          leftIcon={<UserX size={18} color="#1A2A4A" />}
        />
      </View>
    );
  }

  if (status === 'full') {
    return (
      <Button
        label="Rejoindre la liste d'attente"
        loading={registering}
        onPress={onRegister}
        leftIcon={<UserPlus size={18} color="#FFFFFF" />}
      />
    );
  }

  const priceLabel = paymentMethod === 'online' && price ? ` — ${price}` : '';
  return (
    <View className="gap-2">
      <Button
        label={`S'inscrire${priceLabel}`}
        loading={registering}
        onPress={onRegister}
        leftIcon={<UserPlus size={18} color="#FFFFFF" />}
      />
      {paymentMethod === 'online' ? (
        <View className="items-center">
          <Text variant="caption" className="text-[11px]">
            🔒 Paiement sécurisé via Stripe
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ───────────────────────────────────────────────────────────────
// SeekingBottomSheet — champ message optionnel (max 500) + CTA
// ───────────────────────────────────────────────────────────────
function SeekingBottomSheet({
  visible,
  message,
  onChangeMessage,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  message: string;
  onChangeMessage: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  if (!visible) return null;

  const remaining = SEEKING_MESSAGE_MAX - message.length;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable onPress={onClose} className="flex-1 bg-black/40" />
        <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text variant="h2" className="text-[18px]">
              Je suis seul sur ce tournoi
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
          </View>
          <Text variant="caption" className="mb-3">
            Tu apparaîtras dans la liste des joueurs seuls. Ajoute un mot pour te
            présenter (optionnel).
          </Text>
          <TextInput
            value={message}
            onChangeText={(t) => onChangeMessage(t.slice(0, SEEKING_MESSAGE_MAX))}
            placeholder="Ex : je joue à gauche P100, dispo tout le week-end."
            placeholderTextColor="#94A3B8"
            multiline
            className="min-h-[96px] rounded-2xl border border-brand-border bg-brand-bg p-4 font-body text-[15px] text-brand-navy"
            textAlignVertical="top"
          />
          <Text variant="caption" className="mt-1 text-right text-[11px]">
            {remaining} caractères restants
          </Text>

          <View className="mt-4 gap-2">
            <Button label="Me déclarer" loading={submitting} onPress={onSubmit} />
            <Button label="Annuler" variant="ghost" onPress={onClose} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
