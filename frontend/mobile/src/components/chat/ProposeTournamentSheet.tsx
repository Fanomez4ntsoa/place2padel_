import { Trophy, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/design-system';
import { useProposeToPartner } from '@/features/partners/usePartners';
import type { TournamentSummary } from '@/features/tournaments/types';
import { flattenTournamentPages, useTournaments } from '@/features/tournaments/useTournaments';
import { formatApiError } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  targetUser: { uuid: string; name: string };
}

/**
 * Sheet pour proposer un tournoi à l'interlocuteur depuis le chat.
 * Liste les tournois `status=open`. Le backend enforce que la cible a déclaré
 * seeking-partner sur ce tournoi (422 sinon) → on affiche un toast d'erreur
 * propre si ce n'est pas le cas, avec un hint pour que le user comprenne.
 */
export function ProposeTournamentSheet({ visible, onClose, targetUser }: Props) {
  const [pendingUuid, setPendingUuid] = useState<string | null>(null);

  const tournamentsQuery = useTournaments({ status: 'open', perPage: 30 });
  const tournaments = flattenTournamentPages(tournamentsQuery.data?.pages);

  const handlePick = async (t: TournamentSummary, mutate: (p: { target_user_uuid: string }) => Promise<unknown>) => {
    setPendingUuid(t.uuid);
    try {
      await mutate({ target_user_uuid: targetUser.uuid });
      showToast(`Proposition envoyée à ${targetUser.name} 🎾`, 'success');
      onClose();
    } catch (err) {
      Alert.alert('Proposition impossible', formatApiError(err));
    } finally {
      setPendingUuid(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50" />
      <View className="max-h-[70%] rounded-t-3xl bg-white pb-8 pt-4">
        <View className="mb-3 flex-row items-center justify-between px-5">
          <View className="flex-row items-center gap-2">
            <Trophy size={18} color="#E8650A" />
            <Text variant="h2" className="text-[17px]">
              Proposer un tournoi
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color="#1A2A4A" />
          </Pressable>
        </View>

        <Text variant="caption" className="mb-3 px-5 text-[12px]">
          Propose un tournoi à {targetUser.name}. Il doit avoir déclaré{' '}
          <Text className="font-heading text-brand-orange">« Je suis seul »</Text> sur ce tournoi
          pour recevoir la proposition.
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
              <TournamentRow
                key={t.uuid}
                tournament={t}
                pending={pendingUuid === t.uuid}
                onPick={(mutate) => handlePick(t, mutate)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * Ligne d'un tournoi dans la sheet. Sépare l'instanciation de `useProposeToPartner`
 * par tournament_uuid pour que chaque row ait sa propre mutation (le hook exige
 * un uuid fixe à l'instantiation).
 */
function TournamentRow({
  tournament,
  pending,
  onPick,
}: {
  tournament: TournamentSummary;
  pending: boolean;
  onPick: (mutate: (p: { target_user_uuid: string }) => Promise<unknown>) => void;
}) {
  const mut = useProposeToPartner(tournament.uuid);
  return (
    <Pressable
      onPress={() => onPick((p) => mut.mutateAsync(p))}
      disabled={pending}
      className="border-b border-brand-border/50 px-5 py-3"
      style={{ opacity: pending ? 0.5 : 1 }}
    >
      <Text variant="body-medium" className="text-[14px]" numberOfLines={1}>
        {tournament.name}
      </Text>
      <Text variant="caption" className="mt-0.5 text-[11px]">
        {tournament.club?.name ?? '—'} · {tournament.level} · {tournament.date}
      </Text>
    </Pressable>
  );
}
