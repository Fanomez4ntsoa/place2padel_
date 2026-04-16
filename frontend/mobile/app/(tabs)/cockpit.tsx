import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Heart,
  Inbox,
  LogOut,
  MapPin,
  MessageCircle,
  TreePalm,
  Plus,
  QrCode,
  Search,
  Swords,
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

import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Text, useFadeInUp } from '@/design-system';
import { formatApiError } from '@/lib/api';
import { useConversations } from '@/features/conversations/useConversations';
import { useUnreadCounters } from '@/features/counters/useCounters';
import { useProposals } from '@/features/proposals/useProposals';
import { useMySeekingTournaments } from '@/features/tournaments/useTournament';
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
    <CockpitReferee name={user.first_name ?? user.name} onLogout={handleLogout} />
  ) : (
    <CockpitPlayer
      name={user.first_name ?? user.name}
      userUuid={user.uuid}
      padelPoints={(user as unknown as { profile?: { padel_points?: number } }).profile?.padel_points}
      onLogout={handleLogout}
    />
  );
}

// ──────────────────────────────────────────────────────────────────
// Preview non authentifié
// ──────────────────────────────────────────────────────────────────
function CockpitPreview({
  onRegister,
  onLogin,
}: {
  onRegister: (accountType: 'player' | 'referee') => void;
  onLogin: () => void;
}) {
  const fade = useFadeInUp(0);

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 }}
        >
          <Text variant="caption" className="text-white/50">Mon cockpit</Text>
          <Text variant="h1" className="mt-1 text-white">
            Qui es-tu ?
          </Text>
          <Text variant="caption" className="mt-2 text-white/60">
            Découvre ton cockpit personnel selon ton profil.
          </Text>
        </LinearGradient>

        <Animated.View style={fade} className="-mt-6 gap-4 px-5">
          <RoleCard
            icon={Swords}
            title="Compétiteur"
            subtitle="Joueur de padel"
            description="Trouve des tournois, inscris-toi, suis tes scores en direct, gère tes partenaires et ton classement FFT."
            onPress={() => onRegister('player')}
          />
          <RoleCard
            icon={Trophy}
            title="Juge arbitre"
            subtitle="Organisateur"
            description="Crée tes tournois, gère les inscriptions, génère les tableaux et les convocations en un clic."
            onPress={() => onRegister('referee')}
          />

          <Button label="Je suis déjà inscrit" variant="ghost" onPress={onLogin} className="mt-2" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleCard({
  icon: Icon,
  title,
  subtitle,
  description,
  onPress,
}: {
  icon: IconCmp;
  title: string;
  subtitle: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View className="mb-3 flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange-light">
            <Icon size={26} color="#E8650A" />
          </View>
          <View>
            <Text variant="h3">{title}</Text>
            <Text variant="caption">{subtitle}</Text>
          </View>
        </View>
        <Text variant="caption">{description}</Text>
      </Card>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────
// Cockpit joueur authentifié
// ──────────────────────────────────────────────────────────────────
function CockpitPlayer({
  name,
  userUuid,
  padelPoints,
  onLogout,
}: {
  name?: string;
  userUuid: string;
  padelPoints?: number;
  onLogout: () => void;
}) {
  const router = useRouter();
  const fade = useFadeInUp(0);

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        >
          <Text variant="caption" className="text-white/50">
            Bonjour {name ?? ''} 👋
          </Text>
          <Text variant="h1" className="mt-1 text-white">
            Mon cockpit
          </Text>

          {typeof padelPoints === 'number' ? (
            <View className="mt-4 flex-row items-center gap-3">
              <Badge label={`${padelPoints} pts FFT`} tone="info" />
              <Badge label="Compétiteur" tone="neutral" />
            </View>
          ) : null}
        </LinearGradient>

        <Animated.View style={fade} className="-mt-6 gap-3 px-5">
          <VacationCard />
          <SeekingBlock />
          <ActionCard
            icon={Trophy}
            label="Mes tournois"
            subtitle="Tous mes engagements"
            onPress={() => router.push('/(tabs)/tournois')}
          />
          <ActionCard
            icon={QrCode}
            label="Scanner un QR"
            subtitle="Rejoindre un tournoi en un scan"
            onPress={() => router.push('/scan' as never)}
          />
          <ProposalsActionCard onPress={() => router.push('/proposals')} />
          <NotificationsActionCard onPress={() => router.push('/notifications' as never)} />
          <MessagesActionCard onPress={() => router.push('/conversations')} />
          <ActionCard
            icon={Heart}
            label="Partenaires"
            subtitle="Matching — Phase 6.2"
            onPress={() => undefined}
            disabled
          />
          <ActionCard
            icon={UserIcon}
            label="Mon profil"
            subtitle="Voir et éditer"
            onPress={() => router.push(`/profil/${userUuid}`)}
          />

          <Button
            label="Se déconnecter"
            variant="ghost"
            onPress={onLogout}
            leftIcon={<LogOut size={18} color="#1A2A4A" />}
            className="mt-2"
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
// NotificationsActionCard — badge unread aligné sur useUnreadCounters
// (partagé avec AppHeader, cache global, pas de double-fetch).
// ──────────────────────────────────────────────────────────────────
function NotificationsActionCard({ onPress }: { onPress: () => void }) {
  const { unreadNotifications } = useUnreadCounters();
  const subtitle =
    unreadNotifications > 0
      ? `${unreadNotifications} non lue${unreadNotifications > 1 ? 's' : ''}`
      : 'Alertes tournois, inscriptions, messages';

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="relative h-11 w-11 items-center justify-center rounded-2xl bg-brand-bg">
            <Bell size={20} color="#1A2A4A" />
            {unreadNotifications > 0 ? (
              <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1">
                <Text className="text-[10px] font-heading-black text-white">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-1">
            <Text variant="body-medium">Notifications</Text>
            <Text variant="caption" className="mt-0.5">
              {subtitle}
            </Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </Card>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────
// MessagesActionCard — ActionCard conversations avec badge unread
// ──────────────────────────────────────────────────────────────────
function MessagesActionCard({ onPress }: { onPress: () => void }) {
  const { data } = useConversations();
  const unread = (data ?? []).filter((c) => c.unread_count > 0).length;
  const subtitle = unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Mes conversations';

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="relative h-11 w-11 items-center justify-center rounded-2xl bg-brand-bg">
            <MessageCircle size={20} color="#1A2A4A" />
            {unread > 0 ? (
              <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1">
                <Text className="text-[10px] font-heading-black text-white">
                  {unread > 99 ? '99+' : unread}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-1">
            <Text variant="body-medium">Messages</Text>
            <Text variant="caption" className="mt-0.5">
              {subtitle}
            </Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </Card>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────
// ProposalsActionCard — ActionCard avec subtitle dynamique (N en attente)
// ──────────────────────────────────────────────────────────────────
function ProposalsActionCard({ onPress }: { onPress: () => void }) {
  const { data } = useProposals('received');
  const pendingCount = data?.filter((p) => p.status === 'pending').length ?? 0;
  const subtitle = pendingCount > 0 ? `${pendingCount} en attente` : 'Reçues et envoyées';

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="relative h-11 w-11 items-center justify-center rounded-2xl bg-brand-bg">
            <Inbox size={20} color="#1A2A4A" />
            {pendingCount > 0 ? (
              <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1">
                <Text className="text-[10px] font-heading-black text-white">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-1">
            <Text variant="body-medium">Propositions partenaires</Text>
            <Text variant="caption" className="mt-0.5">
              {subtitle}
            </Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </Card>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────
// SeekingBlock — liste des tournois où le joueur s'est déclaré seul
// ──────────────────────────────────────────────────────────────────
function SeekingBlock() {
  const router = useRouter();
  const { data, isLoading } = useMySeekingTournaments();

  if (isLoading || !data || data.length === 0) return null;

  return (
    <View className="rounded-3xl border border-brand-orange/30 bg-brand-orange-light p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Search size={16} color="#E8650A" />
        <Text variant="body-medium" className="text-[14px] text-brand-navy">
          Je suis seul ({data.length})
        </Text>
      </View>
      <Text variant="caption" className="mb-3">
        Tu cherches un partenaire sur {data.length === 1 ? 'ce tournoi' : 'ces tournois'} :
      </Text>
      <View className="gap-2">
        {data.map((entry) => (
          <Pressable
            key={entry.tournament.uuid}
            onPress={() => router.push(`/(tabs)/tournois/${entry.tournament.uuid}`)}
          >
            <View className="rounded-2xl bg-white p-3">
              <View className="flex-row items-center gap-2">
                <Text variant="body-medium" className="flex-1 text-[13px]" numberOfLines={1}>
                  {entry.tournament.name}
                </Text>
                <Badge label={entry.tournament.level} tone="info" />
              </View>
              {entry.tournament.club ? (
                <View className="mt-1 flex-row items-center gap-1">
                  <MapPin size={12} color="#64748B" />
                  <Text variant="caption" className="text-[11px]" numberOfLines={1}>
                    {entry.tournament.club.name} — {entry.tournament.club.city}
                  </Text>
                </View>
              ) : null}
              {entry.message ? (
                <Text variant="caption" className="mt-1 text-[11px] italic" numberOfLines={2}>
                  « {entry.message} »
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
// Cockpit juge arbitre / admin
// ──────────────────────────────────────────────────────────────────
function CockpitReferee({ name, onLogout }: { name?: string; onLogout: () => void }) {
  const router = useRouter();
  const fade = useFadeInUp(0);

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        >
          <Text variant="caption" className="text-white/50">
            Bonjour {name ?? ''} 👋
          </Text>
          <Text variant="h1" className="mt-1 text-white">
            Cockpit arbitre
          </Text>
          <Text variant="caption" className="mt-2 text-white/60">
            Gère tes tournois et les joueurs inscrits.
          </Text>
        </LinearGradient>

        <Animated.View style={fade} className="-mt-6 gap-3 px-5">
          <VacationCard />
          <Button
            label="Créer un tournoi"
            leftIcon={<Plus size={18} color="#FFFFFF" />}
            onPress={() => Alert.alert('Bientôt', 'Création de tournoi arrive en Phase 6.2.')}
          />

          <ActionCard
            icon={Trophy}
            label="Mes tournois"
            subtitle="Tous mes tournois organisés"
            onPress={() => router.push('/(tabs)/tournois')}
          />
          <NotificationsActionCard onPress={() => router.push('/notifications' as never)} />
          <ActionCard
            icon={MessageCircle}
            label="Messages"
            subtitle="Dispo dans une prochaine itération"
            onPress={() => undefined}
            disabled
          />

          <Button
            label="Se déconnecter"
            variant="ghost"
            onPress={onLogout}
            leftIcon={<LogOut size={18} color="#1A2A4A" />}
            className="mt-2"
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
// ActionCard réutilisable
// ──────────────────────────────────────────────────────────────────
function ActionCard({
  icon: Icon,
  label,
  subtitle,
  onPress,
  disabled,
}: {
  icon: IconCmp;
  label: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
      <Card className={disabled ? 'opacity-60' : ''}>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-bg">
            <Icon size={20} color="#1A2A4A" />
          </View>
          <View className="flex-1">
            <Text variant="body-medium">{label}</Text>
            <Text variant="caption" className="mt-0.5">
              {subtitle}
            </Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
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
