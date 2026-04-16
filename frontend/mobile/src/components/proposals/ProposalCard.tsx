import { Check, Trophy, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Badge, Text } from '@/design-system';
import type { Proposal, ProposalDirection, ProposalStatus } from '@/features/proposals/types';

interface Props {
  proposal: Proposal;
  direction: ProposalDirection;
  onAccept?: () => void;
  onRefuse?: () => void;
  onCancel?: () => void;
  pending?: boolean;
}

const STATUS_TONE: Record<ProposalStatus, { label: string; tone: 'info' | 'success' | 'danger' }> = {
  pending: { label: 'En attente', tone: 'info' },
  accepted: { label: 'Acceptée', tone: 'success' },
  refused: { label: 'Refusée', tone: 'danger' },
};

export function ProposalCard({ proposal, direction, onAccept, onRefuse, onCancel, pending }: Props) {
  const other = direction === 'received' ? proposal.from_user : proposal.to_user;
  const initial = (other?.name ?? '?').trim().charAt(0).toUpperCase();
  const st = STATUS_TONE[proposal.status];
  const message = proposal.payload?.message;

  return (
    <View className="rounded-3xl border border-brand-border bg-white p-4">
      {/* Header : avatar + identité + status */}
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-orange-light">
          <Text variant="body-medium" className="text-[16px] text-brand-orange">
            {initial}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="body-medium" className="text-[14px]" numberOfLines={1}>
            {other?.name ?? 'Joueur inconnu'}
          </Text>
          {proposal.tournament ? (
            <View className="mt-0.5 flex-row items-center gap-1">
              <Trophy size={11} color="#64748B" />
              <Text variant="caption" className="text-[11px]" numberOfLines={1}>
                {proposal.tournament.name} · {proposal.tournament.level}
              </Text>
            </View>
          ) : null}
        </View>
        <Badge label={st.label} tone={st.tone} />
      </View>

      {/* Message (guillemets français) */}
      {message ? (
        <Text variant="caption" className="mt-3 text-[12px] italic">
          « {message} »
        </Text>
      ) : null}

      {/* CTAs — direction + status dependent */}
      {direction === 'received' && proposal.status === 'pending' ? (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={onRefuse}
            disabled={pending}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-2xl border border-brand-border bg-white py-2.5"
            style={{ opacity: pending ? 0.5 : 1 }}
          >
            <X size={14} color="#64748B" />
            <Text variant="caption" className="text-[12px] font-heading">Refuser</Text>
          </Pressable>
          <Pressable
            onPress={onAccept}
            disabled={pending}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-2xl bg-brand-orange py-2.5"
            style={{ opacity: pending ? 0.5 : 1 }}
          >
            <Check size={14} color="#FFFFFF" />
            <Text className="text-[12px] font-heading-black text-white">Accepter</Text>
          </Pressable>
        </View>
      ) : null}

      {direction === 'sent' && proposal.status === 'pending' ? (
        <View className="mt-3">
          <Pressable
            onPress={onCancel}
            disabled={pending}
            className="items-center rounded-2xl border border-brand-border bg-white py-2.5"
            style={{ opacity: pending ? 0.5 : 1 }}
          >
            <Text variant="caption" className="text-[12px] font-heading">Annuler</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
