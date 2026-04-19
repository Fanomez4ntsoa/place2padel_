import { useRouter } from 'expo-router';
import { ArrowLeft, Inbox } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProposalCard } from '@/components/proposals/ProposalCard';
import { Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import {
  useCancelProposal,
  useProposals,
  useRespondProposal,
} from '@/features/proposals/useProposals';
import type { ProposalDirection } from '@/features/proposals/types';

export default function ProposalsScreen() {
  const router = useRouter();
  const [direction, setDirection] = useState<ProposalDirection>('received');
  const { data, isLoading } = useProposals(direction);
  const respondMut = useRespondProposal();
  const cancelMut = useCancelProposal();

  const handleAccept = (uuid: string) =>
    respondMut
      .mutateAsync({ uuid, response: 'accepted' })
      .catch((err) => Alert.alert('Erreur', formatApiError(err)));

  const handleRefuse = (uuid: string) =>
    respondMut
      .mutateAsync({ uuid, response: 'refused' })
      .catch((err) => Alert.alert('Erreur', formatApiError(err)));

  const handleCancel = (uuid: string) =>
    Alert.alert('Annuler la proposition', 'Cette proposition sera supprimée.', [
      { text: 'Garder', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: () =>
          cancelMut
            .mutateAsync(uuid)
            .catch((err) => Alert.alert('Erreur', formatApiError(err))),
      },
    ]);

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#1A2A4A" />
        </Pressable>
        <Text variant="h2" className="flex-1 text-[20px]">
          Propositions
        </Text>
      </View>

      {/* Pills */}
      <View className="mx-4 mb-3 flex-row gap-2 rounded-2xl bg-white p-1">
        <Pill
          label="Reçues"
          active={direction === 'received'}
          onPress={() => setDirection('received')}
        />
        <Pill
          label="Envoyées"
          active={direction === 'sent'}
          onPress={() => setDirection('sent')}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 12 }}>
        {isLoading ? (
          <ActivityIndicator color="#E8650A" />
        ) : !data || data.length === 0 ? (
          <Card>
            <View className="items-center py-6">
              <Inbox size={28} color="#94A3B8" />
              <Text variant="caption" className="mt-2 text-center">
                {direction === 'received'
                  ? 'Aucune proposition reçue pour l\'instant.'
                  : 'Tu n\'as envoyé aucune proposition.'}
              </Text>
            </View>
          </Card>
        ) : (
          data.map((p) => (
            <ProposalCard
              key={p.uuid}
              proposal={p}
              direction={direction}
              pending={respondMut.isPending || cancelMut.isPending}
              onAccept={() => handleAccept(p.uuid)}
              onRefuse={() => handleRefuse(p.uuid)}
              onCancel={() => handleCancel(p.uuid)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-xl py-2 ${active ? 'bg-brand-orange' : 'bg-transparent'}`}
    >
      <Text
        variant="caption"
        className={`text-[12px] font-heading-black ${active ? 'text-white' : 'text-brand-navy'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
