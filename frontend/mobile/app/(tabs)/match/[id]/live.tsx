import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Minus, Plus, TrendingUp, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import type { FriendlyMatch } from '@/features/friendly-matches/types';
import {
  useAcceptFriendlyMatch,
  useDeclineFriendlyMatch,
  useFriendlyMatch,
  useStartFriendlyMatch,
  useSubmitFriendlyScore,
  useUserElo,
  useValidateFriendlyMatch,
} from '@/features/friendly-matches/useFriendlyMatches';

/**
 * FriendlyMatchLivePage — structure identique à MatchLive tournoi (G1) :
 * score board 9 jeux + tie-break 8-8 + double validation capitaine.
 * Additional : bloc ELO impact post-match (delta vs elo_before).
 */
const MAX_GAMES = 9;

export default function FriendlyMatchLiveScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const matchQuery = useFriendlyMatch(id);
  const match = matchQuery.data;

  const acceptMut = useAcceptFriendlyMatch(id ?? '');
  const declineMut = useDeclineFriendlyMatch(id ?? '');
  const startMut = useStartFriendlyMatch(id ?? '');
  const submitMut = useSubmitFriendlyScore(id ?? '');
  const validateMut = useValidateFriendlyMatch(id ?? '');

  const [tiebreakModal, setTiebreakModal] = useState(false);
  const [tb1, setTb1] = useState('');
  const [tb2, setTb2] = useState('');

  const perms = useMemo(() => computePermissions(match, user?.uuid), [match, user?.uuid]);

  if (matchQuery.isLoading || !match) {
    return (
      <SafeAreaView edges={[]} className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color="#E8650A" />
      </SafeAreaView>
    );
  }

  const s = match.score;
  const g1 = s.team1_games ?? 0;
  const g2 = s.team2_games ?? 0;
  const tbRequired = g1 === 8 && g2 === 8;
  const tbPresent = s.tiebreak_team1 !== null && s.tiebreak_team2 !== null;
  const canEditScore = perms.canScore && match.status === 'in_progress';
  const showValidation =
    match.status === 'in_progress' && (g1 >= 5 || g2 >= 5) && (!tbRequired || tbPresent);

  const submitGames = (newG1: number, newG2: number) => {
    if (newG1 === 8 && newG2 === 8) {
      setTb1('');
      setTb2('');
      setTiebreakModal(true);
      return;
    }
    submitMut
      .mutateAsync({ team1_games: newG1, team2_games: newG2 })
      .catch((err) => Alert.alert('Erreur', formatApiError(err)));
  };

  const submitTiebreak = () => {
    const n1 = parseInt(tb1, 10);
    const n2 = parseInt(tb2, 10);
    if (isNaN(n1) || isNaN(n2) || Math.abs(n1 - n2) < 2) {
      Alert.alert('Tie-break invalide', 'Les deux scores sont requis avec un écart ≥ 2.');
      return;
    }
    submitMut
      .mutateAsync({ team1_games: 8, team2_games: 8, tiebreak_team1: n1, tiebreak_team2: n2 })
      .then(() => setTiebreakModal(false))
      .catch((err) => Alert.alert('Erreur', formatApiError(err)));
  };

  const handleAccept = () =>
    acceptMut.mutateAsync().catch((err) => Alert.alert('Erreur', formatApiError(err)));
  const handleDecline = () =>
    Alert.alert("Refuser l'invitation", 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Refuser',
        style: 'destructive',
        onPress: () => declineMut.mutateAsync().catch((err) => Alert.alert('Erreur', formatApiError(err))),
      },
    ]);
  const handleStart = () =>
    startMut.mutateAsync().catch((err) => Alert.alert('Erreur', formatApiError(err)));
  const handleValidate = (team: 1 | 2) =>
    validateMut.mutateAsync(team).catch((err) => Alert.alert('Erreur', formatApiError(err)));

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#1A2A4A" />
          </Pressable>
          <View className="flex-1">
            <Text variant="h3" className="text-[16px]">Match amical</Text>
            <Text variant="caption" className="text-[11px]">
              {STATUS_LABEL[match.status]}
            </Text>
          </View>
          {match.status === 'in_progress' ? (
            <View className="flex-row items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1">
              <View className="h-2 w-2 rounded-full bg-red-500" />
              <Text variant="caption" className="text-[10px] font-heading-black uppercase text-red-500">
                LIVE
              </Text>
            </View>
          ) : null}
        </View>

        {/* CTA status-dependant */}
        {match.status === 'pending' && perms.isInvitee && !perms.selfAccepted ? (
          <View className="mx-4 flex-row gap-2">
            <Pressable
              onPress={handleDecline}
              disabled={declineMut.isPending}
              className="flex-1 items-center justify-center rounded-2xl border border-brand-border bg-white py-3"
            >
              <Text variant="caption" className="text-[13px] font-heading">Refuser</Text>
            </Pressable>
            <Pressable
              onPress={handleAccept}
              disabled={acceptMut.isPending}
              className="flex-1 items-center justify-center rounded-2xl bg-brand-orange py-3"
              style={{ opacity: acceptMut.isPending ? 0.6 : 1 }}
            >
              <Text className="font-heading-black text-[13px] text-white">Accepter</Text>
            </Pressable>
          </View>
        ) : null}

        {match.status === 'pending' && perms.selfAccepted ? (
          <View className="mx-4">
            <Card>
              <Text variant="caption" className="text-center text-[12px]">
                Tu as accepté. En attente des autres joueurs.
              </Text>
            </Card>
          </View>
        ) : null}

        {match.status === 'accepted' ? (
          <View className="mx-4">
            <Button
              label="Démarrer le match"
              loading={startMut.isPending}
              onPress={handleStart}
            />
          </View>
        ) : null}

        {/* Score board */}
        <View className="mx-4 mt-3">
          <Card>
            <TeamScoreRow
              label={teamLabel(match, 1)}
              games={g1}
              winner={match.winner_team === 1}
              canEdit={canEditScore}
              onMinus={() => submitGames(Math.max(0, g1 - 1), g2)}
              onPlus={() => submitGames(Math.min(MAX_GAMES, g1 + 1), g2)}
            />
            <View className="my-1.5 items-center">
              <Text variant="caption" className="text-[10px] font-heading-black tracking-wider">
                VS
              </Text>
            </View>
            <TeamScoreRow
              label={teamLabel(match, 2)}
              games={g2}
              winner={match.winner_team === 2}
              canEdit={canEditScore}
              onMinus={() => submitGames(g1, Math.max(0, g2 - 1))}
              onPlus={() => submitGames(g1, Math.min(MAX_GAMES, g2 + 1))}
            />

            {tbRequired ? (
              <View className="mt-3 items-center">
                <View className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
                  <Text variant="caption" className="text-[11px] font-heading text-amber-700">
                    Tie-break !
                  </Text>
                </View>
                {tbPresent ? (
                  <Text variant="caption" className="mt-1 text-[12px] font-body-medium">
                    {s.tiebreak_team1} – {s.tiebreak_team2}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Card>
        </View>

        {/* Validation */}
        {showValidation ? (
          <View className="mx-4 mt-3">
            <Card>
              <Text variant="body-medium" className="mb-3 text-[13px]">Validation du score</Text>
              <ValidationRow
                label={teamLabel(match, 1)}
                validated={match.validated_by_team1}
                canValidate={perms.canValidateTeam1}
                pending={validateMut.isPending}
                onValidate={() => handleValidate(1)}
              />
              <ValidationRow
                label={teamLabel(match, 2)}
                validated={match.validated_by_team2}
                canValidate={perms.canValidateTeam2}
                pending={validateMut.isPending}
                onValidate={() => handleValidate(2)}
              />
            </Card>
          </View>
        ) : null}

        {/* Completed + ELO impact */}
        {match.status === 'completed' ? (
          <CompletedBlock match={match} currentUserUuid={user?.uuid ?? null} />
        ) : null}

        {/* Declined */}
        {match.status === 'declined' ? (
          <View className="mx-4 mt-3">
            <View className="items-center rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <X size={28} color="#64748B" />
              <Text variant="h3" className="mt-2 text-[16px]">Match refusé</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Modal tie-break */}
      <Modal
        visible={tiebreakModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTiebreakModal(false)}
      >
        <Pressable onPress={() => setTiebreakModal(false)} className="flex-1 bg-black/40" />
        <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5">
          <Text variant="h2" className="text-[18px]">Saisie tie-break (8–8)</Text>
          <Text variant="caption" className="mt-1 text-[12px]">Écart minimum 2 points requis.</Text>
          <View className="mt-4 flex-row gap-3">
            <TiebreakInput label={teamLabel(match, 1)} value={tb1} onChange={setTb1} />
            <TiebreakInput label={teamLabel(match, 2)} value={tb2} onChange={setTb2} />
          </View>
          <Button
            label="Valider le tie-break"
            loading={submitMut.isPending}
            onPress={submitTiebreak}
            className="mt-4"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente des acceptations',
  accepted: 'Prêt à démarrer',
  declined: 'Match refusé',
  in_progress: 'Score live',
  completed: 'Terminé',
};

function teamLabel(match: FriendlyMatch, team: 1 | 2): string {
  const list = team === 1 ? match.team1 : match.team2;
  return list
    .map((p) => p.user?.name?.split(' ')[0] ?? '?')
    .join(' / ') || `Équipe ${team}`;
}

// ─── ELO impact bloc ───────────────────────────────────────────

function CompletedBlock({ match, currentUserUuid }: { match: FriendlyMatch; currentUserUuid: string | null }) {
  const eloQuery = useUserElo(currentUserUuid ?? undefined);
  const s = match.score;
  const isWinnerTeam = match.team1.concat(match.team2).some(
    (p) => p.user?.uuid === currentUserUuid && teamOfUser(match, currentUserUuid ?? '') === match.winner_team,
  );

  return (
    <View className="mx-4 mt-3 gap-3">
      <View className="items-center rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5">
        <Check size={32} color="#059669" />
        <Text variant="h3" className="mt-2 text-[16px] text-emerald-800">Match terminé</Text>
        <Text variant="caption" className="mt-1 text-[12px] text-emerald-700">
          Score final : {s.team1_games}–{s.team2_games}
          {s.tiebreak_team1 !== null && s.tiebreak_team2 !== null
            ? ` (TB ${s.tiebreak_team1}-${s.tiebreak_team2})`
            : ''}
        </Text>
        <Text variant="body-medium" className="mt-2 text-[14px] text-emerald-800">
          {isWinnerTeam ? '🏆 Victoire !' : 'Défaite — continue à progresser'}
        </Text>
      </View>

      {eloQuery.data ? (
        <View className="rounded-3xl border border-brand-border bg-white p-4">
          <View className="flex-row items-center gap-2">
            <TrendingUp size={16} color="#E8650A" />
            <Text variant="h3" className="text-[14px]">Ton nouvel ELO</Text>
          </View>
          <Text className="mt-2 font-heading-black text-[32px] text-brand-orange">
            {eloQuery.data.elo_level.toFixed(2)}
          </Text>
          {eloQuery.data.is_locked ? (
            <Text variant="caption" className="mt-1 text-[11px]">
              Encore {eloQuery.data.matches_to_unlock} match
              {eloQuery.data.matches_to_unlock > 1 ? 's' : ''} pour déverrouiller ton niveau.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function teamOfUser(match: FriendlyMatch, userUuid: string): 1 | 2 | null {
  if (match.team1.some((p) => p.user?.uuid === userUuid)) return 1;
  if (match.team2.some((p) => p.user?.uuid === userUuid)) return 2;
  return null;
}

// ─── Shared UI pieces (same as MatchLive tournoi) ─────────────

function TeamScoreRow({
  label,
  games,
  winner,
  canEdit,
  onMinus,
  onPlus,
}: {
  label: string;
  games: number;
  winner: boolean;
  canEdit: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl p-3 ${
        winner ? 'border border-emerald-200 bg-emerald-50' : 'bg-brand-bg'
      }`}
    >
      <View className="flex-1">
        <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
          {label}
        </Text>
      </View>
      {canEdit ? (
        <Pressable
          onPress={onMinus}
          className="h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-white"
          hitSlop={6}
        >
          <Minus size={14} color="#1A2A4A" />
        </Pressable>
      ) : null}
      <Text
        className="min-w-[48px] text-center font-heading-black text-[36px] text-brand-navy"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {games}
      </Text>
      {canEdit ? (
        <Pressable
          onPress={onPlus}
          className="h-8 w-8 items-center justify-center rounded-full bg-brand-orange"
          hitSlop={6}
        >
          <Plus size={14} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

function ValidationRow({
  label,
  validated,
  canValidate,
  pending,
  onValidate,
}: {
  label: string;
  validated: boolean;
  canValidate: boolean;
  pending: boolean;
  onValidate: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text variant="body" className="text-[13px]" numberOfLines={1}>{label}</Text>
      {validated ? (
        <Badge tone="success" label="Validé" />
      ) : canValidate ? (
        <Pressable
          onPress={onValidate}
          disabled={pending}
          className="h-7 items-center justify-center rounded-full bg-brand-orange px-3"
          style={{ opacity: pending ? 0.6 : 1 }}
        >
          <Text className="font-heading-black text-[11px] text-white">Valider</Text>
        </Pressable>
      ) : (
        <Text variant="caption" className="text-[11px]">En attente</Text>
      )}
    </View>
  );
}

function TiebreakInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-1">
      <Text variant="caption" className="mb-1 text-[10px] font-heading-black uppercase">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={2}
        className="rounded-2xl border border-brand-border bg-brand-bg px-4 py-3 text-center font-heading-black text-[22px] text-brand-navy"
      />
    </View>
  );
}

// ─── Permissions ───────────────────────────────────────────────

interface Perms {
  canScore: boolean;
  canValidateTeam1: boolean;
  canValidateTeam2: boolean;
  isInvitee: boolean;
  selfAccepted: boolean;
}

function computePermissions(match: FriendlyMatch | undefined, userUuid: string | undefined): Perms {
  const empty: Perms = {
    canScore: false,
    canValidateTeam1: false,
    canValidateTeam2: false,
    isInvitee: false,
    selfAccepted: false,
  };
  if (!match || !userUuid) return empty;

  const all = [...match.team1, ...match.team2];
  const selfParticipant = all.find((p) => p.user?.uuid === userUuid);
  if (!selfParticipant) return empty;

  const isCaptainOfTeam = (team: 1 | 2): boolean => {
    const list = team === 1 ? match.team1 : match.team2;
    return list.some((p) => p.user?.uuid === userUuid && p.is_captain);
  };

  return {
    canScore: true, // tout participant peut saisir
    canValidateTeam1: isCaptainOfTeam(1),
    canValidateTeam2: isCaptainOfTeam(2),
    isInvitee: true,
    selfAccepted: selfParticipant.accepted,
  };
}
