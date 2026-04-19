import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Flag, Minus, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import type { TournamentMatch } from '@/features/matches/types';
import {
  useForfeitMatch,
  useSubmitScore,
  useTournamentMatches,
  useValidateScore,
} from '@/features/matches/useMatches';
import { useTournament } from '@/features/tournaments/useTournament';

/**
 * MatchLive — port fidèle Emergent MatchLivePage.js (d541157).
 *
 * Route params :
 *   /matches/[id]?tournament=<tournamentUuid>
 *
 * Nécessite tournamentUuid pour résoudre les permissions (captain/partner/owner)
 * via le détail tournoi en cache (pas de GET /matches/{uuid} côté backend).
 */
const MAX_GAMES = 9;

export default function MatchLiveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; tournament?: string }>();
  const matchUuid = params.id;
  const tournamentUuid = params.tournament;
  const { user } = useAuth();

  const tournamentQuery = useTournament(tournamentUuid);
  const matchesQuery = useTournamentMatches(tournamentUuid);
  const match = matchesQuery.data?.find((m) => m.uuid === matchUuid);

  const submitMut = useSubmitScore(tournamentUuid ?? '', matchUuid);
  const validateMut = useValidateScore(tournamentUuid ?? '', matchUuid);
  const forfeitMut = useForfeitMatch(tournamentUuid ?? '', matchUuid);

  const [tiebreakModal, setTiebreakModal] = useState(false);
  const [tb1, setTb1] = useState('');
  const [tb2, setTb2] = useState('');

  const perms = useMemo(() => computePermissions(match, tournamentQuery.data, user?.uuid), [
    match,
    tournamentQuery.data,
    user?.uuid,
  ]);

  if (matchesQuery.isLoading || tournamentQuery.isLoading) {
    return (
      <SafeAreaView edges={[]} className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color="#E8650A" />
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView edges={[]} className="flex-1 items-center justify-center bg-brand-bg px-8">
        <Text variant="h3" className="text-center">Match introuvable</Text>
        <Button label="Retour" variant="ghost" onPress={() => router.back()} className="mt-4" />
      </SafeAreaView>
    );
  }

  const s = match.score;
  const g1 = s.team1_games ?? 0;
  const g2 = s.team2_games ?? 0;
  const tbRequired = g1 === 8 && g2 === 8;
  const tbPresent = s.tiebreak_team1 !== null && s.tiebreak_team2 !== null;
  const canEditScore = perms.canScore && (match.status === 'pending' || match.status === 'in_progress');
  const showValidation =
    match.status === 'in_progress' && (g1 >= 5 || g2 >= 5) && (!tbRequired || tbPresent);

  const submitGames = (newG1: number, newG2: number) => {
    const atTiebreak = newG1 === 8 && newG2 === 8;
    if (atTiebreak) {
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

  const handleValidate = (team: 'team1' | 'team2') =>
    validateMut.mutateAsync(team).catch((err) => Alert.alert('Erreur', formatApiError(err)));

  const handleForfeit = () => {
    if (!match.team1 || !match.team2) return;
    Alert.alert('Déclarer forfait', 'Quelle équipe est forfait ? Le gagnant sera l\'autre.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: `${match.team1.team_name} forfait`,
        onPress: () =>
          forfeitMut
            .mutateAsync(match.team2!.id)
            .catch((err) => Alert.alert('Erreur', formatApiError(err))),
      },
      {
        text: `${match.team2.team_name} forfait`,
        onPress: () =>
          forfeitMut
            .mutateAsync(match.team1!.id)
            .catch((err) => Alert.alert('Erreur', formatApiError(err))),
      },
    ]);
  };

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
            <Text variant="h3" className="text-[16px]">
              Score Live
            </Text>
            {tournamentQuery.data ? (
              <Text variant="caption" className="text-[12px]" numberOfLines={1}>
                {tournamentQuery.data.name}
              </Text>
            ) : null}
          </View>
          {match.status === 'in_progress' ? (
            <View className="flex-row items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1">
              <PulseDot />
              <Text variant="caption" className="text-[10px] font-heading-black uppercase text-red-500">
                LIVE
              </Text>
            </View>
          ) : null}
        </View>

        {/* Contexte */}
        <View className="mx-4 mb-3">
          <Card>
            <View className="flex-row items-center gap-2">
              <Badge
                tone="neutral"
                label={
                  match.phase === 'poule'
                    ? `Poule${match.bloc ? ` ${match.bloc}` : ''}`
                    : match.phase === 'bracket'
                      ? 'Tableau'
                      : 'Classement'
                }
              />
              {match.round ? <Badge tone="info" label={`Round ${match.round}`} /> : null}
              {match.court ? (
                <Text variant="caption" className="ml-auto text-[11px]">
                  Terrain {match.court}
                </Text>
              ) : null}
            </View>
          </Card>
        </View>

        {/* Score board */}
        <View className="mx-4">
          <Card>
            <TeamScoreRow
              team={match.team1}
              games={g1}
              winner={match.winner?.id === match.team1?.id}
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
              team={match.team2}
              games={g2}
              winner={match.winner?.id === match.team2?.id}
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
              <Text variant="body-medium" className="mb-3 text-[13px]">
                Validation du score
              </Text>
              <ValidationRow
                label={match.team1?.team_name ?? 'Équipe 1'}
                validated={match.validated_by_team1}
                canValidate={perms.canValidateTeam1}
                pending={validateMut.isPending}
                onValidate={() => handleValidate('team1')}
              />
              <ValidationRow
                label={match.team2?.team_name ?? 'Équipe 2'}
                validated={match.validated_by_team2}
                canValidate={perms.canValidateTeam2}
                pending={validateMut.isPending}
                onValidate={() => handleValidate('team2')}
              />
            </Card>
          </View>
        ) : null}

        {/* Completed */}
        {match.status === 'completed' ? (
          <View className="mx-4 mt-3">
            <View className="items-center rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <Check size={32} color="#059669" />
              <Text variant="h3" className="mt-2 text-[16px] text-emerald-800">
                Match terminé
              </Text>
              <Text variant="caption" className="mt-1 text-[12px] text-emerald-700">
                Score final : {g1} – {g2}
                {tbPresent ? ` (TB ${s.tiebreak_team1}-${s.tiebreak_team2})` : ''}
              </Text>
              {match.winner ? (
                <Text variant="body-medium" className="mt-2 text-[13px] text-emerald-800">
                  Vainqueur : {match.winner.team_name}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Forfait */}
        {match.status === 'forfeit' ? (
          <View className="mx-4 mt-3">
            <View className="items-center rounded-3xl border-2 border-amber-200 bg-amber-50 p-5">
              <Flag size={28} color="#D97706" />
              <Text variant="h3" className="mt-2 text-[16px] text-amber-800">
                Match forfait
              </Text>
              {match.winner ? (
                <Text variant="caption" className="mt-1 text-[12px] text-amber-700">
                  Vainqueur : {match.winner.team_name}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Forfait action owner/admin */}
        {perms.canForfeit && match.status !== 'completed' && match.status !== 'forfeit' ? (
          <View className="mx-4 mt-4">
            <Button
              label="Déclarer forfait"
              variant="ghost"
              leftIcon={<Flag size={18} color="#1A2A4A" />}
              loading={forfeitMut.isPending}
              onPress={handleForfeit}
            />
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
          <Text variant="h2" className="text-[18px]">
            Saisie tie-break (8–8)
          </Text>
          <Text variant="caption" className="mt-1 text-[12px]">
            Écart minimum 2 points requis.
          </Text>

          <View className="mt-4 flex-row gap-3">
            <TiebreakInput
              label={match.team1?.team_name ?? 'Équipe 1'}
              value={tb1}
              onChange={setTb1}
            />
            <TiebreakInput
              label={match.team2?.team_name ?? 'Équipe 2'}
              value={tb2}
              onChange={setTb2}
            />
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

// ─────────────────────────────────────────────────────────────

function TeamScoreRow({
  team,
  games,
  winner,
  canEdit,
  onMinus,
  onPlus,
}: {
  team: { team_name: string; seed: number | null } | null;
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
        {team?.seed ? (
          <Text variant="caption" className="text-[10px] font-heading-black text-brand-orange">
            [{team.seed}]
          </Text>
        ) : null}
        <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
          {team?.team_name ?? 'TBD'}
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
      <Text variant="body" className="text-[13px]">
        {label}
      </Text>
      {validated ? (
        <View className="flex-row items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5">
          <Check size={12} color="#059669" />
          <Text variant="caption" className="text-[11px] font-heading text-emerald-700">
            Validé
          </Text>
        </View>
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
        <Text variant="caption" className="text-[11px]">
          En attente
        </Text>
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

// ─────────────────────────────────────────────────────────────

function PulseDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 700 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={style}
      className="h-2 w-2 rounded-full bg-red-500"
    />
  );
}

interface Permissions {
  canScore: boolean;
  canValidateTeam1: boolean;
  canValidateTeam2: boolean;
  canForfeit: boolean;
}

function computePermissions(
  match: TournamentMatch | undefined,
  tournament: ReturnType<typeof useTournament>['data'],
  userUuid: string | undefined,
): Permissions {
  const empty: Permissions = {
    canScore: false,
    canValidateTeam1: false,
    canValidateTeam2: false,
    canForfeit: false,
  };
  if (!match || !tournament || !userUuid) return empty;

  const team1 = tournament.teams?.find((t) => t.id === match.team1?.id);
  const team2 = tournament.teams?.find((t) => t.id === match.team2?.id);

  const inTeam1 =
    team1?.captain.uuid === userUuid || team1?.partner?.uuid === userUuid;
  const inTeam2 =
    team2?.captain.uuid === userUuid || team2?.partner?.uuid === userUuid;

  const isCaptain1 = team1?.captain.uuid === userUuid;
  const isCaptain2 = team2?.captain.uuid === userUuid;
  const isOwner = tournament.creator?.uuid === userUuid;

  // canScore : STRICTEMENT membre d'une des 2 équipes (captain ou partenaire).
  // Le owner NON-participant ne peut pas saisir le score — aligné avec le backend
  // UpdateMatchScoreController qui n'autorise que captain_id/partner_id des 2 teams.
  // L'organisateur a le droit de forfait (canForfeit), pas le score.
  return {
    canScore: inTeam1 || inTeam2,
    canValidateTeam1: isCaptain1,
    canValidateTeam2: isCaptain2,
    canForfeit: isOwner,
  };
}
