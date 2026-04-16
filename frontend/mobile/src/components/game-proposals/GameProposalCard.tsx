import { Calendar, Check, MapPin, Users, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Badge, Text } from '@/design-system';
import type { GameProposal, GameProposalStatus } from '@/features/game-proposals/types';

interface Props {
  proposal: GameProposal;
  viewerUuid: string | null;
  onAccept?: () => void;
  onRefuse?: () => void;
  onCancel?: () => void;
  onStart?: () => void;
  onOpenMatch?: () => void;
  pending?: boolean;
}

const STATUS_TONE: Record<GameProposalStatus, { label: string; bg: string; color: string }> = {
  open: { label: 'En cours', bg: 'bg-amber-50', color: 'text-amber-700' },
  full: { label: 'Complet', bg: 'bg-blue-50', color: 'text-blue-700' },
  started: { label: 'Démarré', bg: 'bg-emerald-50', color: 'text-emerald-700' },
  cancelled: { label: 'Annulé', bg: 'bg-slate-100', color: 'text-slate-500' },
};

export function GameProposalCard({
  proposal,
  viewerUuid,
  onAccept,
  onRefuse,
  onCancel,
  onStart,
  onOpenMatch,
  pending,
}: Props) {
  const isCreator = proposal.creator?.uuid === viewerUuid;
  const myInvitee = proposal.invitees.find((i) => i.user?.uuid === viewerUuid);
  const myResponse = myInvitee?.response;
  const st = STATUS_TONE[proposal.status];

  const dateFR = formatDateFR(proposal.schedule.date);

  return (
    <View className="rounded-3xl border border-brand-border bg-white p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className={`rounded-full px-2.5 py-0.5 ${st.bg}`}>
          <Text variant="caption" className={`text-[10px] font-heading ${st.color}`}>
            {st.label}
          </Text>
        </View>
        <Text variant="caption" className="text-[11px]">
          {proposal.accepted_count}/{proposal.players_needed} joueurs
        </Text>
      </View>

      {/* Créateur */}
      <Text variant="body-medium" className="mt-2 text-[13px]" numberOfLines={1}>
        {isCreator ? 'Ta partie' : proposal.creator?.name ?? 'Un joueur'}
      </Text>

      {/* Schedule */}
      <View className="mt-2 flex-row items-center gap-1.5">
        <Calendar size={13} color="#64748B" />
        <Text variant="caption" className="text-[12px]">
          {dateFR} à {proposal.schedule.time.slice(0, 5)} ({proposal.schedule.duration_min} min)
        </Text>
      </View>

      {/* Location */}
      {proposal.location.club || proposal.location.city ? (
        <View className="mt-1 flex-row items-center gap-1.5">
          <MapPin size={13} color="#E8650A" />
          <Text variant="caption" className="text-[12px]">
            {proposal.location.club ?? ''}
            {proposal.location.club && proposal.location.city ? ' · ' : ''}
            {proposal.location.city ?? ''}
          </Text>
        </View>
      ) : null}

      {/* Invités tags */}
      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {proposal.invitees.map((inv) => (
          <InviteeBadge key={inv.user?.uuid ?? Math.random()} invitee={inv} />
        ))}
      </View>

      {/* Actions */}
      <View className="mt-3 flex-row gap-2">
        {/* Invité pending → accepter / refuser */}
        {!isCreator && myResponse === 'pending' && proposal.status === 'open' ? (
          <>
            <Pressable
              onPress={onRefuse}
              disabled={pending}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-2xl border border-brand-border bg-white py-2"
              style={{ opacity: pending ? 0.5 : 1 }}
            >
              <X size={12} color="#64748B" />
              <Text variant="caption" className="text-[12px] font-heading">Refuser</Text>
            </Pressable>
            <Pressable
              onPress={onAccept}
              disabled={pending}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-2xl bg-brand-orange py-2"
              style={{ opacity: pending ? 0.5 : 1 }}
            >
              <Check size={12} color="#FFFFFF" />
              <Text variant="caption" className="text-[12px] font-heading-black text-white">Accepter</Text>
            </Pressable>
          </>
        ) : null}

        {/* Créateur proposal full → lancer la partie */}
        {isCreator && proposal.status === 'full' && onStart ? (
          <Pressable
            onPress={onStart}
            disabled={pending}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-brand-orange py-2.5"
            style={{ opacity: pending ? 0.5 : 1 }}
          >
            <Users size={13} color="#FFFFFF" />
            <Text className="text-[12px] font-heading-black text-white">Assigner rôles & démarrer</Text>
          </Pressable>
        ) : null}

        {/* Creator → annuler (tant que pas started) */}
        {isCreator && proposal.status !== 'started' && proposal.status !== 'cancelled' && onCancel ? (
          <Pressable
            onPress={onCancel}
            disabled={pending}
            className="flex-1 items-center rounded-2xl border border-brand-border bg-white py-2"
            style={{ opacity: pending ? 0.5 : 1 }}
          >
            <Text variant="caption" className="text-[12px] font-heading">Annuler</Text>
          </Pressable>
        ) : null}

        {/* Started → lien match */}
        {proposal.status === 'started' && proposal.friendly_match && onOpenMatch ? (
          <Pressable
            onPress={onOpenMatch}
            className="flex-1 items-center rounded-2xl bg-brand-navy py-2.5"
          >
            <Text className="text-[12px] font-heading-black text-white">Ouvrir le match</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function InviteeBadge({ invitee }: { invitee: GameProposal['invitees'][number] }) {
  const name = invitee.user?.name?.split(' ')[0] ?? '?';
  const tone = invitee.response === 'accepted'
    ? 'success'
    : invitee.response === 'refused'
      ? 'danger'
      : 'neutral';
  const prefix = invitee.response === 'accepted' ? '✓ ' : invitee.response === 'refused' ? '✕ ' : '';
  return <Badge label={`${prefix}${name}`} tone={tone as 'success' | 'danger' | 'neutral'} />;
}

function formatDateFR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}
