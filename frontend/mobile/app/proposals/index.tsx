import { useRouter } from 'expo-router';
import { ArrowLeft, MailX } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProposalCard } from '@/components/proposals/ProposalCard';
import { Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import type { ProposalDirection } from '@/features/partners/types';
import {
  useCancelProposal,
  useProposals,
  useRespondProposal,
} from '@/features/partners/usePartners';

/**
 * Inbox propositions partenaires — tabs Reçues / Envoyées + filtres status.
 * Depuis Cockpit. Backend : GET /proposals + PUT /proposals/{uuid}/respond.
 */
export default function ProposalsScreen() {
  const router = useRouter();
  const [direction, setDirection] = useState<ProposalDirection>('received');
  const query = useProposals(direction);
  const respondMut = useRespondProposal();
  const cancelMut = useCancelProposal();

  const proposals = query.data?.data ?? [];

  const handleRespond = (uuid: string, response: 'accepted' | 'refused') =>
    respondMut
      .mutateAsync({ uuid, response })
      .catch((err) => Alert.alert('Erreur', formatApiError(err)));

  const handleCancel = (uuid: string) =>
    Alert.alert('Annuler la proposition', 'Confirmer l\'annulation ?', [
      { text: 'Non', style: 'cancel' },
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
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#1A2A4A" />
        </Pressable>
        <Text variant="h2" className="text-[20px]">
          Propositions
        </Text>
      </View>

      {/* Tabs direction */}
      <View className="px-4 pb-3">
        <View className="flex-row rounded-2xl border border-brand-border bg-white p-1">
          {(['received', 'sent'] as const).map((d) => {
            const active = direction === d;
            return (
              <Pressable
                key={d}
                onPress={() => setDirection(d)}
                className={`flex-1 items-center rounded-xl py-2 ${active ? 'bg-brand-navy' : ''}`}
              >
                <Text
                  variant="caption"
                  className={`text-[12px] font-heading ${active ? 'text-white' : 'text-brand-muted'}`}
                >
                  {d === 'received' ? 'Reçues' : 'Envoyées'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}>
        {query.isLoading ? (
          <ActivityIndicator color="#E8650A" className="mt-8" />
        ) : proposals.length === 0 ? (
          <View className="items-center px-6 py-16">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
              <MailX size={28} color="#CBD5E1" />
            </View>
            <Text variant="h3" className="text-[16px]">
              Aucune proposition
            </Text>
            <Text variant="caption" className="mt-1 text-center">
              {direction === 'received'
                ? 'Tu n\'as reçu aucune proposition.'
                : 'Tu n\'as envoyé aucune proposition.'}
            </Text>
          </View>
        ) : (
          proposals.map((p) => (
            <ProposalCard
              key={p.uuid}
              proposal={p}
              viewerDirection={direction}
              pending={respondMut.isPending || cancelMut.isPending}
              onAccept={() => handleRespond(p.uuid, 'accepted')}
              onRefuse={() => handleRespond(p.uuid, 'refused')}
              onCancel={() => handleCancel(p.uuid)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
