import { Check, Trophy, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Badge, Card, Text } from '@/design-system';
import type { Proposal, ProposalDirection } from '@/features/partners/types';

interface Props {
  proposal: Proposal;
  viewerDirection: ProposalDirection;
  onAccept?: () => void;
  onRefuse?: () => void;
  onCancel?: () => void;
  pending?: boolean;
}

/**
 * Carte proposition — port d541157. Présente l'interlocuteur (selon direction),
 * le tournoi concerné, le message optionnel et les actions selon status.
 */
export function ProposalCard({
  proposal,
  viewerDirection,
  onAccept,
  onRefuse,
  onCancel,
  pending,
}: Props) {
  const otherUser =
    viewerDirection === 'received' ? proposal.from_user : proposal.to_user;
  const initial = (otherUser?.name ?? '?').charAt(0).toUpperCase();

  return (
    <Card>
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-orange">
          <Text className="font-heading-black text-white">{initial}</Text>
        </View>
        <View className="flex-1">
          <Text variant="body-medium" className="text-[14px]" numberOfLines={1}>
            {otherUser?.name ?? '—'}
          </Text>
          <Text variant="caption" className="mt-0.5 text-[11px]">
            {viewerDirection === 'received' ? 'souhaite te proposer' : 'tu lui as proposé'}
          </Text>
          {proposal.tournament ? (
            <View className="mt-2 flex-row items-center gap-1.5 rounded-xl bg-brand-bg px-2.5 py-1.5">
              <Trophy size={12} color="#E8650A" />
              <Text
                variant="caption"
                className="flex-1 text-[12px] font-heading text-brand-navy"
                numberOfLines={1}
              >
                {proposal.tournament.name} · {proposal.tournament.level}
              </Text>
            </View>
          ) : null}
          {proposal.payload?.message ? (
            <Text variant="body" className="mt-2 text-[13px] leading-5">
              « {proposal.payload.message} »
            </Text>
          ) : null}
        </View>
        <StatusBadge status={proposal.status} />
      </View>

      {proposal.status === 'pending' ? (
        <View className="mt-3 flex-row gap-2">
          {viewerDirection === 'received' ? (
            <>
              <Pressable
                onPress={onRefuse}
                disabled={pending}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-brand-border bg-white py-2.5"
                style={{ opacity: pending ? 0.5 : 1 }}
              >
                <X size={14} color="#64748B" />
                <Text variant="caption" className="text-[12px] font-heading">
                  Refuser
                </Text>
              </Pressable>
              <Pressable
                onPress={onAccept}
                disabled={pending}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-brand-orange py-2.5"
                style={{ opacity: pending ? 0.5 : 1 }}
              >
                <Check size={14} color="#FFFFFF" />
                <Text variant="caption" className="text-[12px] font-heading-black text-white">
                  Accepter
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={onCancel}
              disabled={pending}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-brand-border bg-white py-2.5"
              style={{ opacity: pending ? 0.5 : 1 }}
            >
              <X size={14} color="#64748B" />
              <Text variant="caption" className="text-[12px] font-heading">
                Annuler
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </Card>
  );
}

function StatusBadge({ status }: { status: Proposal['status'] }) {
  if (status === 'pending') return <Badge label="En attente" tone="info" />;
  if (status === 'accepted') return <Badge label="Acceptée" tone="success" />;
  return <Badge label="Refusée" tone="danger" />;
}
