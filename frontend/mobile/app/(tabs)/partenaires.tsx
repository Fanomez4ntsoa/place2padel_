import { ChevronDown, Heart, Trophy, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
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

import { ComingSoonSheet } from '@/components/partners/ComingSoonSheet';
import { ModePills } from '@/components/partners/ModePills';
import { PartnerCard } from '@/components/partners/PartnerCard';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import type { PartnerMode, SeekingPartner } from '@/features/partners/types';
import { useProposeToPartner, useSeekingPartners } from '@/features/partners/usePartners';
import { flattenTournamentPages, useTournaments } from '@/features/tournaments/useTournaments';

export default function PartenairesScreen() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [mode, setMode] = useState<PartnerMode>('tournoi');
  const [comingSoonFor, setComingSoonFor] = useState<'amical' | 'rencontre' | null>(null);
  const [tournamentUuid, setTournamentUuid] = useState<string | null>(null);
  const [tournamentPickerOpen, setTournamentPickerOpen] = useState(false);
  const [passedUuids, setPassedUuids] = useState<Set<string>>(new Set());

  const tournamentsQuery = useTournaments({ status: 'open', perPage: 50 });
  const tournaments = useMemo(
    () => flattenTournamentPages(tournamentsQuery.data?.pages),
    [tournamentsQuery.data],
  );
  const selectedTournament = tournaments.find((t) => t.uuid === tournamentUuid);

  const seekingQuery = useSeekingPartners(mode === 'tournoi' ? tournamentUuid : null);
  const proposeMut = useProposeToPartner(tournamentUuid ?? '');

  const candidates = (seekingQuery.data?.data ?? []).filter(
    (p) => !passedUuids.has(p.user.uuid),
  );

  const handleModeChange = (m: PartnerMode) => {
    if (m === 'amical' || m === 'rencontre') {
      setComingSoonFor(m);
      return;
    }
    setMode(m);
  };

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
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ModePills value={mode} onChange={handleModeChange} />

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

      {/* Contenu */}
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

      {/* Modal sélection tournoi */}
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

      <ComingSoonSheet
        visible={!!comingSoonFor}
        onClose={() => setComingSoonFor(null)}
        mode={comingSoonFor ?? 'amical'}
      />
    </SafeAreaView>
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
