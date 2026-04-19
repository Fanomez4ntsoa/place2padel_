import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  Heart,
  Inbox,
  LogOut,
  MessageCircle,
  Newspaper,
  TreePalm,
  Plus,
  QrCode,
  Trophy,
  User as UserIcon,
  X,
} from 'lucide-react-native';
import { ComponentType, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountRoleCardsList, AccountRole } from '@/components/auth/AccountRoleCards';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, Text, useFadeInUp } from '@/design-system';
import { formatApiError } from '@/lib/api';
import { useConversations } from '@/features/conversations/useConversations';
import { useUnreadCounters } from '@/features/counters/useCounters';
import { useUserElo } from '@/features/friendly-matches/useFriendlyMatches';
import { useProfile } from '@/features/profile/useProfile';
import { useProposals } from '@/features/proposals/useProposals';
import { useMyTournaments } from '@/features/tournaments/useMyTournaments';
import Animated from 'react-native-reanimated';

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export default function CockpitScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return <View className="flex-1 bg-brand-bg" />;
  }

  if (!user) {
    return (
      <CockpitPreview
        onRegister={(accountType) =>
          router.push({ pathname: '/(auth)/register', params: { accountType } })
        }
        onLogin={() => router.push('/(auth)/login')}
      />
    );
  }

  const isReferee = user.role === 'referee' || user.role === 'admin';

  const handleLogout = () =>
    Alert.alert('Déconnexion', 'Se déconnecter de PlaceToPadel ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch (err) {
            Alert.alert('Erreur', formatApiError(err));
          }
        },
      },
    ]);

  return isReferee ? (
    <CockpitReferee
      name={user.first_name ?? user.name}
      userUuid={user.uuid}
      role={user.role}
      onLogout={handleLogout}
    />
  ) : (
    <CockpitPlayer
      name={user.first_name ?? user.name}
      userUuid={user.uuid}
      role={user.role}
      padelPoints={(user as unknown as { profile?: { padel_points?: number } }).profile?.padel_points}
      onLogout={handleLogout}
    />
  );
}

// ──────────────────────────────────────────────────────────────────
// Preview non authentifié — port RegisterPage.js account selector Emergent d5ac086
// (hero navy + barre "Se connecter" + 3 cartes chipées → /register?accountType=X).
// Cartes partagées avec RegisterPage via AccountRoleCardsList (AccountRole type).
// ──────────────────────────────────────────────────────────────────
function CockpitPreview({
  onRegister,
  onLogin,
}: {
  onRegister: (accountType: AccountRole) => void;
  onLogin: () => void;
}) {
  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
        >
          <Text className="font-heading-black text-white" style={{ fontSize: 20 }}>
            Rejoins PlaceToPadel 🎾
          </Text>
          <Text className="mt-0.5 text-white/60" style={{ fontSize: 11 }}>
            Choisis ton profil pour commencer
          </Text>
        </LinearGradient>

        {/* Barre "Tu as déjà un compte ? · Se connecter →" */}
        <View className="flex-row items-center justify-between border-b border-brand-border bg-white px-5 py-2">
          <Text className="text-[12px] text-brand-muted">
            Tu as déjà un compte&nbsp;?
          </Text>
          <Pressable
            onPress={onLogin}
            className="rounded-full bg-brand-navy px-3.5 py-1"
            hitSlop={6}
          >
            <Text className="font-heading text-[12px] text-white">Se connecter →</Text>
          </Pressable>
        </View>

        <AccountRoleCardsList onPick={onRegister} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
// Cockpit joueur authentifié
// ──────────────────────────────────────────────────────────────────
function CockpitPlayer({
  name,
  userUuid,
  onLogout,
}: {
  name?: string;
  userUuid: string;
  role: 'player' | 'organizer' | 'referee' | 'admin' | 'club_owner';
  padelPoints?: number;
  onLogout: () => void;
}) {
  const router = useRouter();
  const fade = useFadeInUp(0);

  // Données dashboard — hooks cached TanStack Query (staleTime 30-60s).
  const { data: profile } = useProfile(userUuid);
  const { data: elo } = useUserElo(userUuid);
  const inProgressQuery = useMyTournaments('in_progress');
  const { unreadNotifications } = useUnreadCounters();
  const { data: conversations } = useConversations();
  const { data: receivedProposals } = useProposals('received');

  const unreadMessages = (conversations ?? []).filter((c) => c.unread_count > 0).length;
  const pendingProposals =
    receivedProposals?.filter((p) => p.status === 'pending').length ?? 0;
  const inProgressCount = inProgressQuery.data?.pages[0]?.meta.total ?? 0;

  const stats = {
    points: profile?.padel_points ?? 0,
    ranking: profile?.ranking ? `#${profile.ranking}` : '—',
    wins: elo?.matches_won ?? 0,
    tournaments: inProgressCount,
  };

  // Barre de complétion — 6 critères alignés Emergent d5ac086.
  const completionChecks: boolean[] = [
    !!profile?.picture_url,
    !!profile?.profile?.bio,
    (profile?.availabilities?.length ?? 0) > 0,
    (profile?.clubs?.length ?? 0) > 0,
    !!profile?.profile?.license_number,
    (profile?.padel_points ?? 0) > 0,
  ];
  const completionPct = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
  );

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Hero navy avec avatar + label + stats ── */}
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text variant="caption" className="text-white/40 text-[11px]">
                Mon cockpit
              </Text>
              <Text variant="h1" className="mt-0.5 text-white">
                {name ?? ''}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(`/profil/${userUuid}`)}
              className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/10"
              hitSlop={4}
            >
              {profile?.picture_url ? (
                <ExpoImageCompat uri={profile.picture_url} />
              ) : (
                <Text className="font-heading-black text-[16px] text-white">
                  {(name ?? '?').trim().charAt(0).toUpperCase()}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Grille 4 stats */}
          <View className="flex-row gap-2">
            <StatTile value={stats.points} label="Points FFT" />
            <StatTile value={stats.ranking} label="Rang" />
            <StatTile value={stats.wins} label="Victoires" />
            <StatTile value={stats.tournaments} label="Tournois" />
          </View>
        </LinearGradient>

        <Animated.View style={fade} className="-mt-6 gap-3 px-5">
          {/* ── Barre de complétion profil ── */}
          <Pressable
            onPress={() => router.push(`/profil/${userUuid}`)}
            className="rounded-2xl border border-brand-border bg-white p-3"
          >
            <View className="mb-1.5 flex-row items-center justify-between">
              <Text
                className="font-heading-black text-[11px] text-brand-navy"
              >
                Mon profil
              </Text>
              <Text
                className="font-heading-black text-[11px] text-brand-orange"
              >
                {completionPct}%
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-brand-orange-light">
              <View
                className="h-full rounded-full bg-brand-orange"
                style={{ width: `${completionPct}%` }}
              />
            </View>
          </Pressable>

          {/* ── Bouton + Nouveau post ── */}
          <Button
            label="Nouveau post"
            leftIcon={<Plus size={18} color="#FFFFFF" />}
            onPress={() => router.push(`/profil/${userUuid}`)}
          />

          {/* ── VacationCard ── */}
          <VacationCard />

          {/* ── ActionCards — ordre exact utilisateur ── */}
          <ActionCard
            icon={UserIcon}
            label="Mon profil"
            subtitle="Voir et éditer"
            onPress={() => router.push(`/profil/${userUuid}`)}
          />
          <ActionCard
            icon={Bell}
            label="Notifications"
            subtitle={
              unreadNotifications > 0
                ? `${unreadNotifications} non lue${unreadNotifications > 1 ? 's' : ''}`
                : 'Alertes tournois, inscriptions, messages'
            }
            count={unreadNotifications}
            onPress={() => router.push('/notifications' as never)}
          />
          <ActionCard
            icon={MessageCircle}
            label="Messages"
            subtitle={
              unreadMessages > 0
                ? `${unreadMessages} non lu${unreadMessages > 1 ? 's' : ''}`
                : 'Mes conversations'
            }
            count={unreadMessages}
            onPress={() => router.push('/conversations')}
          />
          <ActionCard
            icon={Trophy}
            label="Mes tournois"
            subtitle={
              inProgressCount > 0
                ? `${inProgressCount} en cours`
                : 'En cours, à venir, passés'
            }
            count={inProgressCount}
            onPress={() => router.push('/mes-tournois' as never)}
          />
          <ActionCard
            icon={Heart}
            label="Partenaires"
            subtitle="Matching contextuel par tournoi"
            onPress={() => router.push('/(tabs)/partenaires')}
          />
          <ActionCard
            icon={Inbox}
            label="Propositions partenaires"
            subtitle={
              pendingProposals > 0 ? `${pendingProposals} en attente` : 'Reçues et envoyées'
            }
            count={pendingProposals}
            onPress={() => router.push('/proposals')}
          />
          <ActionCard
            icon={QrCode}
            label="Scanner un QR"
            subtitle="Rejoindre un tournoi en un scan"
            onPress={() => router.push('/scan' as never)}
          />
          <ActionCard
            icon={LogOut}
            label="Se déconnecter"
            tone="danger"
            onPress={onLogout}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Tuile d'une stat dans la grille hero. Valeur en grand + label petit.
 * Largeur implicite 1/4 par flex-1 sur parent gap:2.
 */
function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-white/10 px-2 py-2">
      <Text
        className="font-heading-black text-white"
        style={{ fontSize: 18, lineHeight: 22 }}
      >
        {value}
      </Text>
      <Text className="mt-0.5 text-white/60" style={{ fontSize: 9 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Wrapper léger autour d'une Image avatar — gère les URLs absolues (Google CDN,
 * S3) en pass-through. Pas besoin d'expo-image ici, `Image` natif suffit
 * (l'accessor backend retourne déjà l'URL complète).
 */
function ExpoImageCompat({ uri }: { uri: string }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Image } = require('react-native') as typeof import('react-native');
  return <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />;
}

// ──────────────────────────────────────────────────────────────────
// Cockpit juge arbitre / admin
// ──────────────────────────────────────────────────────────────────
function CockpitReferee({
  name,
  userUuid,
  role,
  onLogout,
}: {
  name?: string;
  userUuid: string;
  role: 'player' | 'organizer' | 'referee' | 'admin' | 'club_owner';
  onLogout: () => void;
}) {
  const router = useRouter();
  const fade = useFadeInUp(0);

  // Données dashboard — mêmes hooks que CockpitPlayer pour cohérence.
  const { data: profile } = useProfile(userUuid);
  const inProgressQuery = useMyTournaments('in_progress');
  const upcomingQuery = useMyTournaments('upcoming');
  const completedQuery = useMyTournaments('completed');
  const { unreadNotifications } = useUnreadCounters();
  const { data: conversations } = useConversations();
  const unreadMessages = (conversations ?? []).filter((c) => c.unread_count > 0).length;

  const inProgressCount = inProgressQuery.data?.pages[0]?.meta.total ?? 0;
  const organizedTotal =
    (upcomingQuery.data?.pages[0]?.meta.total ?? 0) +
    inProgressCount +
    (completedQuery.data?.pages[0]?.meta.total ?? 0);

  // Club principal — si l'user est club_owner, c'est très probablement le club
  // qu'il a revendiqué via POST /clubs/claim (priority 1 dans user_clubs).
  const primaryClubEntry = profile?.clubs?.find((c) => (c.priority ?? 99) === 1);
  const primaryClubName = primaryClubEntry?.name ?? null;
  const isClubOwner = role === 'club_owner';

  const heroSubtitle = primaryClubName ?? 'Juge arbitre';

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Hero navy : avatar + label + prénom + sous-titre club + 4 stats ── */}
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text variant="caption" className="text-white/40 text-[11px]">
                Cockpit organisateur
              </Text>
              <Text variant="h1" className="mt-0.5 text-white">
                {name ?? ''}
              </Text>
              <Text variant="caption" className="mt-0.5 text-white/60 text-[11px]">
                {heroSubtitle}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(`/profil/${userUuid}`)}
              className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/10"
              hitSlop={4}
            >
              {profile?.picture_url ? (
                <ExpoImageCompat uri={profile.picture_url} />
              ) : (
                <Text className="font-heading-black text-[16px] text-white">
                  {(name ?? '?').trim().charAt(0).toUpperCase()}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Grille 4 stats */}
          <View className="flex-row gap-2">
            <StatTile value={organizedTotal} label="Tournois" />
            <StatTile value={inProgressCount} label="En cours" />
            <StatTile value="—" label="Joueurs" />
            <StatTile value="—" label="Matchs" />
          </View>
        </LinearGradient>

        <Animated.View style={fade} className="-mt-6 gap-3 px-5">
          {/* ── Bouton principal : créer un tournoi ── */}
          <Button
            label="Créer un tournoi"
            leftIcon={<Plus size={18} color="#FFFFFF" />}
            onPress={() => router.push('/(tabs)/tournois/creer' as never)}
          />

          {/* ── VacationCard ── */}
          <VacationCard />

          {/* ── ActionCards — ordre aligné Emergent d5ac086 ── */}
          <ActionCard
            icon={Trophy}
            label="Mes tournois"
            subtitle={
              inProgressCount > 0
                ? `${inProgressCount} en cours`
                : 'Inscriptions, tableaux, scores'
            }
            count={inProgressCount}
            onPress={() => router.push('/mes-tournois' as never)}
          />
          <ActionCard
            icon={BarChart3}
            label="Espace organisateur"
            subtitle="Gestion avancée des tournois"
            onPress={() => router.push('/mes-tournois' as never)}
          />
          <ActionCard
            icon={Newspaper}
            label="Publier"
            subtitle="Annonces, photos, résultats"
            onPress={() => router.push(`/profil/${userUuid}`)}
          />
          <ActionCard
            icon={Bell}
            label="Notifications"
            subtitle={
              unreadNotifications > 0
                ? `${unreadNotifications} non lue${unreadNotifications > 1 ? 's' : ''}`
                : 'Alertes, inscriptions, messages'
            }
            count={unreadNotifications}
            onPress={() => router.push('/notifications' as never)}
          />
          <ActionCard
            icon={MessageCircle}
            label="Messages"
            subtitle={
              unreadMessages > 0
                ? `${unreadMessages} non lu${unreadMessages > 1 ? 's' : ''}`
                : 'Mes conversations'
            }
            count={unreadMessages}
            onPress={() => router.push('/conversations')}
          />
          <ActionCard
            icon={UserIcon}
            label="Mon profil"
            subtitle="Voir et éditer"
            onPress={() => router.push(`/profil/${userUuid}`)}
          />

          {/* Ma page club — conditionnel role club_owner + club principal connu */}
          {isClubOwner && primaryClubEntry ? (
            <ActionCard
              icon={Building2}
              label="Ma page club"
              subtitle={primaryClubName ?? 'Gérer ma page'}
              onPress={() => router.push(`/clubs/${primaryClubEntry.uuid}`)}
            />
          ) : null}

          <ActionCard
            icon={LogOut}
            label="Se déconnecter"
            tone="danger"
            onPress={onLogout}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
// ActionCard réutilisable — style épuré Emergent d5ac086 (icon orange direct
// sans box 40×40, badge count orange si > 0, chevron gris). `tone="danger"`
// → label rouge pour l'action de déconnexion.
// ──────────────────────────────────────────────────────────────────
function ActionCard({
  icon: Icon,
  label,
  subtitle,
  count,
  onPress,
  disabled,
  tone = 'default',
}: {
  icon: IconCmp;
  label: string;
  subtitle?: string;
  count?: number;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  const iconColor = tone === 'danger' ? '#DC2626' : '#E8650A';
  return (
    <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
      <Card className={disabled ? 'opacity-60' : ''}>
        <View className="flex-row items-center gap-3">
          <Icon size={18} color={iconColor} />
          <View className="flex-1">
            <Text
              variant="body-medium"
              className={tone === 'danger' ? 'text-brand-danger' : undefined}
            >
              {label}
            </Text>
            {subtitle ? (
              <Text variant="caption" className="mt-0.5">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {count && count > 0 ? (
            <View className="min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1.5 py-0.5">
              <Text
                className="font-heading-black text-white"
                style={{
                  fontSize: 10,
                  lineHeight: 12,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                }}
              >
                {count > 99 ? '99+' : count}
              </Text>
            </View>
          ) : null}
          <ChevronRight size={14} color="#94A3B8" />
        </View>
      </Card>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────
// VacationCard — mode vacances / déplacement (UI Phase 6.1.5, backend Phase 6.2)
// ──────────────────────────────────────────────────────────────────
function VacationCard() {
  const [active, setActive] = useState(false);
  const [city, setCity] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draftCity, setDraftCity] = useState('');

  const activate = () => {
    const c = draftCity.trim();
    if (!c) return;
    setCity(c);
    setActive(true);
    setModalOpen(false);
    setDraftCity('');
  };

  return (
    <>
      <View
        className={`rounded-3xl border p-4 ${
          active ? 'border-brand-orange/30 bg-brand-orange-light' : 'border-brand-border bg-white'
        }`}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <TreePalm size={16} color={active ? '#E8650A' : '#1A2A4A'} />
              <Text variant="body-medium" className="text-[14px]">
                En déplacement / Vacances
              </Text>
            </View>
            <Text variant="caption" className="mt-1">
              {active
                ? `📍 ${city} — tes tournois sont gelés`
                : 'Active ce mode quand tu pars — tu ne recevras plus de notifs tournoi.'}
            </Text>
          </View>
          <Pressable
            onPress={() => (active ? setActive(false) : setModalOpen(true))}
            className={`self-start rounded-full px-3 py-1.5 ${
              active ? 'bg-white' : 'bg-brand-navy'
            }`}
          >
            <Text
              variant="caption"
              className={`font-heading text-[11px] ${active ? 'text-brand-navy' : 'text-white'}`}
            >
              {active ? 'Désactiver' : 'Activer'}
            </Text>
          </Pressable>
        </View>
      </View>

      {modalOpen ? (
        <Modal transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <Pressable onPress={() => setModalOpen(false)} className="flex-1 bg-black/40" />
            <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5">
              <View className="mb-4 flex-row items-center justify-between">
                <Text variant="h2" className="text-[18px]">
                  🌴 Mode vacances
                </Text>
                <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                  <X size={22} color="#1A2A4A" />
                </Pressable>
              </View>
              <Text variant="caption" className="mb-3">
                Indique où tu pars — on te suggérera les tournois locaux à la place.
              </Text>
              <TextInput
                value={draftCity}
                onChangeText={setDraftCity}
                placeholder="Ville de destination (ex : Agde, Bordeaux…)"
                placeholderTextColor="#94A3B8"
                className="rounded-2xl border border-brand-border bg-brand-bg p-4 font-body text-[15px] text-brand-navy"
                autoFocus
                autoCapitalize="words"
              />
              <Pressable
                onPress={activate}
                className="mt-4 h-12 items-center justify-center rounded-2xl bg-brand-orange"
              >
                <Text className="font-heading-black text-white">Activer le mode vacances</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </>
  );
}
