import { useRouter } from 'expo-router';
import { ChevronDown, Heart, Sparkles, Trophy, Users } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CandidateCard } from '@/components/matching/CandidateCard';
import { SwipeableCandidate } from '@/components/matching/SwipeableCandidate';
import { ComingSoonSheet } from '@/components/partners/ComingSoonSheet';
import { ModePills } from '@/components/partners/ModePills';
import { PartnerCard } from '@/components/partners/PartnerCard';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import {
  useMatchingCandidates,
  useMatchingMatches,
  useSwipeCandidate,
} from '@/features/matching/useMatching';
import type { PartnerMode, SeekingPartner } from '@/features/partners/types';
import { useProposeToPartner, useSeekingPartners } from '@/features/partners/usePartners';
import { flattenTournamentPages, useTournaments } from '@/features/tournaments/useTournaments';
import { formatApiError } from '@/lib/api';
import { showToast } from '@/lib/toast';

export default function PartenairesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // Default 'amical' — matching global activé Phase 4.2.
  const [mode, setMode] = useState<PartnerMode>('amical');
  const [comingSoonFor, setComingSoonFor] = useState<'rencontre' | null>(null);
  const matchesQuery = useMatchingMatches();
  const matchesCount = matchesQuery.data?.length ?? 0;

  const handleModeChange = (m: PartnerMode) => {
    if (m === 'rencontre') {
      setComingSoonFor('rencontre');
      return;
    }
    setMode(m);
  };

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      {/* Pills + bouton matches alignés horizontalement */}
      <View className="flex-row items-center border-b border-brand-border/60 bg-white pr-3">
        <View className="flex-1">
          <ModePills value={mode} onChange={handleModeChange} />
        </View>
        {isLoggedIn ? (
          <Pressable
            onPress={() => router.push('/matching/matches' as never)}
            className="relative ml-1 h-9 w-9 items-center justify-center rounded-full bg-brand-orange-light"
            hitSlop={6}
          >
            <Heart size={16} color="#E8650A" fill="#E8650A" />
            {matchesCount > 0 ? (
              <View className="absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-brand-orange px-1">
                <Text
                  className="font-heading-black text-white"
                  style={{
                    fontSize: 10,
                    lineHeight: 12,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                  }}
                >
                  {matchesCount > 99 ? '99+' : matchesCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {mode === 'amical' ? <AmicalMode /> : <TournoiMode />}

      <ComingSoonSheet
        visible={!!comingSoonFor}
        onClose={() => setComingSoonFor(null)}
        mode={comingSoonFor ?? 'rencontre'}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODE AMICAL — matching global avec swipe Reanimated. Phase 4.2.
// ═══════════════════════════════════════════════════════════════════
function AmicalMode() {
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const candidatesQuery = useMatchingCandidates();
  const swipeMut = useSwipeCandidate();
  const [currentIdx, setCurrentIdx] = useState(0);

  const candidates = candidatesQuery.data ?? [];
  const current = candidates[currentIdx];

  const handleSwipe = useCallback(
    (action: 'like' | 'pass') => {
      if (!current) return;

      // Pour un user non auth : pas de POST, on passe juste la card suivante
      // pour permettre le browse. Toast d'incitation sur like uniquement.
      if (!isLoggedIn) {
        if (action === 'like') {
          showToast('Connecte-toi pour liker', 'info');
        }
        setCurrentIdx((i) => i + 1);
        return;
      }

      const targetName = current.first_name ?? current.name;
      const targetUuid = current.uuid;

      swipeMut
        .mutateAsync({ target_uuid: targetUuid, action })
        .then((result) => {
          setCurrentIdx((i) => i + 1);
          if (action === 'like' && result.is_match && result.conversation_uuid) {
            showToast(`Match avec ${targetName} ! 🎾`, 'success');
            // Petite latence pour laisser le toast apparaître avant la nav.
            setTimeout(() => {
              router.push(`/conversations/${result.conversation_uuid}` as never);
            }, 400);
          }
        })
        .catch((err) => {
          Alert.alert('Erreur', formatApiError(err));
        });
    },
    [current, isLoggedIn, router, swipeMut],
  );

  if (candidatesQuery.isLoading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#E8650A" />
      </View>
    );
  }

  if (candidates.length === 0) {
    return (
      <AmicalEmpty
        title="Aucun joueur à proximité"
        subtitle={
          isLoggedIn
            ? "Reviens plus tard — on cherche des partenaires autour de toi."
            : "Connecte-toi pour voir les joueurs compatibles avec ton profil."
        }
      />
    );
  }

  if (!current) {
    return (
      <AmicalEmpty
        title="Plus de joueurs"
        subtitle="Tu as vu tous les candidats du moment. Reviens bientôt."
        showReload
        onReload={() => {
          setCurrentIdx(0);
          candidatesQuery.refetch();
        }}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 100, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <SwipeableCandidate
        key={current.uuid}
        candidate={current}
        onSwipeComplete={handleSwipe}
        isPending={swipeMut.isPending}
      />
      <Text
        variant="caption"
        className="mt-3 text-center text-[11px]"
        style={{ color: '#94A3B8' }}
      >
        {currentIdx + 1} / {candidates.length}
      </Text>
    </ScrollView>
  );
}

function AmicalEmpty({
  title,
  subtitle,
  showReload,
  onReload,
}: {
  title: string;
  subtitle: string;
  showReload?: boolean;
  onReload?: () => void;
}) {
  return (
    <View className="items-center px-6 py-16">
      <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
        <Sparkles size={28} color="#CBD5E1" />
      </View>
      <Text variant="h3" className="text-[16px]">
        {title}
      </Text>
      <Text variant="caption" className="mt-1 text-center">
        {subtitle}
      </Text>
      {showReload ? (
        <Pressable
          onPress={onReload}
          className="mt-4 rounded-full bg-brand-orange px-4 py-2"
        >
          <Text className="font-heading text-[12px] text-white">Recharger</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODE TOURNOI — code existant (seeking-partners) légèrement extrait.
// ═══════════════════════════════════════════════════════════════════
function TournoiMode() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [tournamentUuid, setTournamentUuid] = useState<string | null>(null);
  const [tournamentPickerOpen, setTournamentPickerOpen] = useState(false);
  const [passedUuids, setPassedUuids] = useState<Set<string>>(new Set());

  const tournamentsQuery = useTournaments({ status: 'open', perPage: 50 });
  const tournaments = useMemo(
    () => flattenTournamentPages(tournamentsQuery.data?.pages),
    [tournamentsQuery.data],
  );
  const selectedTournament = tournaments.find((t) => t.uuid === tournamentUuid);

  const seekingQuery = useSeekingPartners(tournamentUuid);
  const proposeMut = useProposeToPartner(tournamentUuid ?? '');

  const candidates = (seekingQuery.data?.data ?? []).filter(
    (p) => !passedUuids.has(p.user.uuid),
  );

  const handlePass = (p: SeekingPartner) => {
    setPassedUuids((prev) => new Set(prev).add(p.user.uuid));
  };

  const handleLike = async (p: SeekingPartner) => {
    if (!isLoggedIn) {
      Alert.alert('Connexion requise', 'Connecte-toi pour proposer un partenariat.');
      return;
    }
    if (!tournamentUuid) return;
    try {
      await proposeMut.mutateAsync({ target_user_uuid: p.user.uuid });
      setPassedUuids((prev) => new Set(prev).add(p.user.uuid));
      Alert.alert('✓ Proposition envoyée', `${p.user.name} recevra ta demande.`);
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  return (
    <>
      {/* Sélecteur tournoi */}
      <View className="px-4 pt-3">
        <Pressable
          onPress={() => setTournamentPickerOpen(true)}
          className="flex-row items-center gap-3 rounded-2xl border border-brand-border bg-white px-4 py-3"
        >
          <Trophy size={16} color="#E8650A" />
          <Text
            variant="body"
            className={`flex-1 text-[13px] ${selectedTournament ? '' : 'text-brand-muted'}`}
            numberOfLines={1}
          >
            {selectedTournament
              ? `${selectedTournament.name} — ${selectedTournament.club?.name ?? ''}`
              : 'Choisis un tournoi…'}
          </Text>
          <ChevronDown size={16} color="#94A3B8" />
        </Pressable>
      </View>

      {!tournamentUuid ? (
        <EmptyState
          icon={<Trophy size={28} color="#CBD5E1" />}
          title="Choisis un tournoi"
          subtitle="Pour voir les joueurs qui cherchent un partenaire"
        />
      ) : seekingQuery.isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#E8650A" />
        </View>
      ) : !seekingQuery.data?.meta.authenticated ? (
        <EmptyState
          icon={<Users size={28} color="#CBD5E1" />}
          title={`${seekingQuery.data?.meta.count ?? 0} joueurs cherchent un partenaire`}
          subtitle="Connecte-toi pour voir la liste détaillée et proposer un partenariat."
        />
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={<Heart size={28} color="#CBD5E1" />}
          title="Plus de joueurs"
          subtitle="Reviens plus tard ou choisis un autre tournoi."
        />
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(p) => p.user.uuid}
          renderItem={({ item }) => (
            <View className="px-4 pb-4">
              <PartnerCard
                partner={item}
                onLike={() => handleLike(item)}
                onPass={() => handlePass(item)}
                isPending={proposeMut.isPending}
              />
            </View>
          )}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={tournamentPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTournamentPickerOpen(false)}
      >
        <Pressable
          onPress={() => setTournamentPickerOpen(false)}
          className="flex-1 bg-black/50"
        />
        <View className="max-h-[70%] rounded-t-3xl bg-white px-5 pb-6 pt-4">
          <Text variant="h3" className="mb-3 text-[16px]">
            Choisir un tournoi
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {tournamentsQuery.isLoading ? (
              <ActivityIndicator color="#E8650A" className="my-6" />
            ) : tournaments.length === 0 ? (
              <Text variant="caption" className="py-6 text-center">
                Aucun tournoi ouvert actuellement.
              </Text>
            ) : (
              tournaments.map((t) => (
                <Pressable
                  key={t.uuid}
                  onPress={() => {
                    setTournamentUuid(t.uuid);
                    setPassedUuids(new Set());
                    setTournamentPickerOpen(false);
                  }}
                  className="border-b border-brand-border/50 py-3"
                >
                  <Text variant="body-medium" className="text-[14px]">
                    {t.name}
                  </Text>
                  <Text variant="caption" className="mt-0.5">
                    {t.club?.name ?? '—'} · {t.level}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="items-center px-6 py-16">
      <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
        {icon}
      </View>
      <Text variant="h3" className="text-[16px]">
        {title}
      </Text>
      <Text variant="caption" className="mt-1 text-center">
        {subtitle}
      </Text>
    </View>
  );
}
