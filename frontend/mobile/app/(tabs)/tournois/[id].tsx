import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Trophy,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
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

import { TournamentQrModal } from '@/components/tournois/TournamentQrModal';
import { MatchRow } from '@/components/matches/MatchRow';
import { PoolCard } from '@/components/matches/PoolCard';
import { RankingList } from '@/components/matches/RankingList';
import { Tabs } from '@/components/common/Tabs';
import { TournamentDetailSkeleton } from '@/components/tournois/TournamentListSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import {
  useTournamentMatches,
  useTournamentPools,
  useTournamentRanking,
} from '@/features/matches/useMatches';
import type { TournamentStatus } from '@/features/tournaments/types';
import {
  useLaunchTournament,
  useRegisterTeam,
  useSeekingPartners,
  useToggleSeeking,
  useTournament,
  useUnregisterTeam,
} from '@/features/tournaments/useTournament';

type TabKey = 'infos' | 'teams' | 'seeking' | 'matches' | 'pools' | 'ranking';

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
  const registerMut = useRegisterTeam(id);
  const unregisterMut = useUnregisterTeam(id);
  const launchMut = useLaunchTournament(id);
  const toggleSeekingMut = useToggleSeeking(id);
  const matchesQuery = useTournamentMatches(id);
  const poolsQuery = useTournamentPools(id);
  const rankingQuery = useTournamentRanking(id);

  const [tab, setTab] = useState<TabKey>('infos');

  if (isLoading || !tournament) {
    return (
      <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
        <TournamentDetailSkeleton />
      </SafeAreaView>
    );
  }

  const status = STATUS[tournament.status];
  const teamsCount = tournament.teams?.length ?? tournament.teams_count ?? 0;
  const max = tournament.max_teams || 1;
  const progress = Math.min((teamsCount / max) * 100, 100);

  const isRegistered = !!tournament.teams?.some(
    (t) => t.captain.uuid === user?.uuid || t.partner?.uuid === user?.uuid,
  );
  const isSeeking = !!seekingQuery.data?.data?.some((s) => s.user.uuid === user?.uuid);

  const handleRegister = async () => {
    try {
      await registerMut.mutateAsync(undefined);
      await refetch();
      Alert.alert('Inscription confirmée', 'Tu peux renseigner un partenaire depuis ton profil.');
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

  const [seekingModalOpen, setSeekingModalOpen] = useState(false);
  const [seekingMessage, setSeekingMessage] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  const handleToggleSeeking = () => {
    if (isSeeking) {
      toggleSeekingMut
        .mutateAsync({ seek: false })
        .catch((err) => Alert.alert('Erreur', formatApiError(err)));
    } else {
      setSeekingMessage('');
      setSeekingModalOpen(true);
    }
  };

  const confirmSeeking = () => {
    toggleSeekingMut
      .mutateAsync({ seek: true, message: seekingMessage })
      .then(() => setSeekingModalOpen(false))
      .catch((err) => Alert.alert('Erreur', formatApiError(err)));
  };

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Back + action QR */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#1A2A4A" />
          </Pressable>
          {tournament.share_link ? (
            <Pressable
              onPress={() => setQrOpen(true)}
              hitSlop={8}
              className="flex-row items-center gap-1.5 rounded-full border border-brand-border bg-white px-3 py-1.5"
            >
              <QrCode size={14} color="#1A2A4A" />
              <Text variant="caption" className="text-[12px] font-heading">
                QR
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Titre + statut dans le contenu */}
        <View className="flex-row items-start gap-3 px-5 pb-3">
          <Text variant="h2" className="flex-1 text-[22px]">
            {tournament.name}
          </Text>
          <View className={`rounded-full border px-3 py-1 ${status.wrapperClass}`}>
            <Text variant="caption" className={`${status.labelClass} text-[11px] font-heading`}>
              {status.label}
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
            </View>

            <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <View
                className="h-full rounded-full bg-brand-orange"
                style={{ width: `${progress}%` }}
              />
            </View>
          </Card>
        </View>

        {/* CTA */}
        <View className="mx-4 mt-3">
          <TournamentCta
            status={tournament.status}
            isAuthenticated={!!user}
            isRegistered={isRegistered}
            registering={registerMut.isPending}
            unregistering={unregisterMut.isPending}
            onLogin={() => router.push('/(auth)/login')}
            onRegister={handleRegister}
            onUnregister={handleUnregister}
          />
        </View>

        {/* Lancer — owner only, status open/full, min 2 équipes */}
        {tournament.creator?.uuid === user?.uuid &&
        (tournament.status === 'open' || tournament.status === 'full') ? (
          <View className="mx-4 mt-3">
            <Button
              label={
                teamsCount < 2
                  ? `Lancer (min 2 équipes, ${teamsCount} inscrite${teamsCount > 1 ? 's' : ''})`
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
        ) : null}

        {/* Tabs — Matches/Poules/Classement apparaissent uniquement quand le tournoi est lancé */}
        <Tabs<TabKey>
          tabs={[
            { key: 'infos', label: 'Infos' },
            { key: 'teams', label: 'Équipes', count: teamsCount },
            ...(tournament.status === 'open' || tournament.status === 'full'
              ? [
                  {
                    key: 'seeking' as TabKey,
                    label: 'Seeking',
                    count: seekingQuery.data?.meta.count ?? 0,
                  },
                ]
              : []),
            ...(tournament.status === 'in_progress' || tournament.status === 'completed'
              ? [
                  {
                    key: 'matches' as TabKey,
                    label: 'Matchs',
                    count: matchesQuery.data?.length ?? 0,
                  },
                  { key: 'pools' as TabKey, label: 'Poules' },
                  { key: 'ranking' as TabKey, label: 'Classement' },
                ]
              : []),
          ]}
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
                tournament.teams?.map((team) => (
                  <Card key={team.id}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <Text variant="body-medium">{team.team_name}</Text>
                        <Text variant="caption" className="mt-1">
                          {team.captain.name}
                          {team.partner ? ` / ${team.partner.name}` : ''}
                        </Text>
                      </View>
                      {team.seed ? (
                        <Badge label={`#${team.seed}`} tone="info" />
                      ) : null}
                    </View>
                  </Card>
                ))
              )}
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
            <View className="gap-2">
              {matchesQuery.isLoading ? (
                <ActivityIndicator color="#E8650A" />
              ) : !matchesQuery.data || matchesQuery.data.length === 0 ? (
                <Card>
                  <Text variant="caption" className="text-center">
                    Pas encore de match généré.
                  </Text>
                </Card>
              ) : (
                matchesQuery.data.map((m) => (
                  <MatchRow
                    key={m.uuid}
                    match={m}
                    onPress={() =>
                      router.push({
                        pathname: '/matches/[id]',
                        params: { id: m.uuid, tournament: id! },
                      })
                    }
                  />
                ))
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
        </View>
      </ScrollView>

      {/* Modal déclaration seeking avec message optionnel */}
      <Modal
        visible={seekingModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSeekingModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <Pressable onPress={() => setSeekingModalOpen(false)} className="flex-1 bg-black/40" />
          <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5">
            <Text variant="h2" className="text-[18px]">
              Je suis seul sur ce tournoi
            </Text>
            <Text variant="caption" className="mt-1 text-[12px]">
              Ajoute un mot pour les autres joueurs (optionnel).
            </Text>
            <TextInput
              value={seekingMessage}
              onChangeText={setSeekingMessage}
              placeholder="Ex : dispo tout le week-end, je joue à gauche…"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              className="mt-4 min-h-[96px] rounded-2xl border border-brand-border bg-brand-bg p-4 font-body text-[14px] text-brand-navy"
              style={{ textAlignVertical: 'top' }}
            />
            <Button
              label="Me déclarer"
              loading={toggleSeekingMut.isPending}
              onPress={confirmSeeking}
              className="mt-4"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TournamentQrModal
        visible={qrOpen}
        onClose={() => setQrOpen(false)}
        tournamentName={tournament.name}
        shareLink={tournament.share_link}
      />
    </SafeAreaView>
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

  return (
    <Button
      label="S'inscrire"
      loading={registering}
      onPress={onRegister}
      leftIcon={<UserPlus size={18} color="#FFFFFF" />}
    />
  );
}
