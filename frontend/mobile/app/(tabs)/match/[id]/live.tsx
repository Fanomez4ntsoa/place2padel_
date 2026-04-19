import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Check,
  Minus,
  Newspaper,
  Plus,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react-native';
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

import { LivePulseBadge } from '@/components/matches/LivePulseBadge';
import { MatchTimerChip } from '@/components/matches/MatchTimerChip';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import type { EloHistoryEntry, FriendlyMatch } from '@/features/friendly-matches/types';
import {
  useAcceptFriendlyMatch,
  useDeclineFriendlyMatch,
  useFriendlyMatch,
  useStartFriendlyMatch,
  useSubmitFriendlyScore,
  useUploadResultPhoto,
  useUserElo,
  useValidateFriendlyMatch,
} from '@/features/friendly-matches/useFriendlyMatches';
import { showToast } from '@/lib/toast';

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
          {match.status === 'in_progress' ? <LivePulseBadge /> : null}
        </View>

        {/* Timer elapsed mm:ss — pulse live, figé en completed */}
        {(match.status === 'in_progress' || match.status === 'completed') && match.started_at ? (
          <View className="mb-4">
            <MatchTimerChip
              startedAtIso={match.started_at}
              frozen={match.status === 'completed'}
            />
          </View>
        ) : null}

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
            <Pressable
              onPress={handleStart}
              disabled={startMut.isPending}
              className="h-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: '#16A34A',
                opacity: startMut.isPending ? 0.6 : 1,
                shadowColor: '#16A34A',
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            >
              {startMut.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-heading-black text-white">
                  Démarrer le match
                </Text>
              )}
            </Pressable>
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

        {/* Completed + ELO impact + photo share + footer */}
        {match.status === 'completed' ? (
          <CompletedBlock
            match={match}
            currentUserUuid={user?.uuid ?? null}
            onGoHome={() => router.push('/(tabs)/match' as never)}
            onGoProfile={() =>
              user ? router.push(`/profil/${user.uuid}`) : router.push('/(auth)/login')
            }
            onGoActualites={() => router.push('/(tabs)/actualites' as never)}
          />
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

// ─── Completed block — port Emergent FriendlyMatchLivePage.js:259-338 ───
// 3 sections : card résultat (vert/rouge selon viewer) + ELO delta +
// "Partager la victoire" (upload photo) + boutons footer.

function CompletedBlock({
  match,
  currentUserUuid,
  onGoHome,
  onGoProfile,
  onGoActualites,
}: {
  match: FriendlyMatch;
  currentUserUuid: string | null;
  onGoHome: () => void;
  onGoProfile: () => void;
  onGoActualites: () => void;
}) {
  const eloQuery = useUserElo(currentUserUuid ?? undefined);
  const uploadMut = useUploadResultPhoto(match.uuid);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(
    match.result_photo_url,
  );

  const s = match.score;
  const myTeam = currentUserUuid ? teamOfUser(match, currentUserUuid) : null;
  const isWinner = myTeam !== null && myTeam === match.winner_team;

  // Retrouve l'entrée ELO pour ce match précis (elo_before → elo_after).
  // Port Emergent FriendlyMatchLivePage.js:79-82 `history.slice(-1)[0]`,
  // mais on match par match_uuid — plus fiable si des matchs concurrents
  // ont validé en parallèle.
  const eloEntry: EloHistoryEntry | null = useMemo(() => {
    const history = eloQuery.data?.history ?? [];
    return history.find((e) => e.match_uuid === match.uuid) ?? null;
  }, [eloQuery.data, match.uuid]);

  const pickAndUploadPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Autorisation requise', "Active l'accès aux photos dans les réglages.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    const uriExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const type = asset.mimeType ?? mimeMap[uriExt] ?? 'image/jpeg';

    try {
      const updated = await uploadMut.mutateAsync({
        uri: asset.uri,
        name: `match-result.${uriExt}`,
        type,
      });
      setUploadedUrl(updated.result_photo_url);
      showToast("Photo publiée dans l'actualité ✅", 'success');
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  // Thème contextuel selon victoire/défaite du viewer (port Emergent :
  // bg greenLight + border green si gagnant, bg redLight + border red si perdant).
  const resultBg = isWinner ? 'bg-emerald-50' : 'bg-red-50';
  const resultBorder = isWinner ? 'border-emerald-300' : 'border-red-300';
  const resultTextColor = isWinner ? 'text-emerald-800' : 'text-red-700';

  return (
    <View className="mx-4 mt-3 gap-3">
      {/* ── Card résultat contextuelle ── */}
      <View
        className={`items-center rounded-3xl border-2 p-5 ${resultBg} ${resultBorder}`}
      >
        {isWinner ? (
          <Trophy size={36} color="#D97706" fill="#F59E0B" />
        ) : (
          <Check size={32} color="#64748B" />
        )}
        <Text
          variant="h2"
          className={`mt-2 text-[18px] ${resultTextColor}`}
        >
          Match terminé !
        </Text>
        <Text
          variant="h1"
          className={`mt-1 text-[24px] ${resultTextColor}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {s.team1_games} — {s.team2_games}
        </Text>
        {s.tiebreak_team1 !== null && s.tiebreak_team2 !== null ? (
          <Text variant="caption" className="mt-0.5 text-[11px]">
            Tie-break {s.tiebreak_team1} – {s.tiebreak_team2}
          </Text>
        ) : null}
        {match.winner_team ? (
          <Text variant="body-medium" className="mt-2 text-center text-[13px]">
            {isWinner
              ? '🏆 Tu remportes la victoire !'
              : teamLabel(match, match.winner_team)}{' '}
            {!isWinner ? 'remporte la partie' : ''}
          </Text>
        ) : null}

        {/* ELO delta inline */}
        {eloEntry ? (
          <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-white px-4 py-2">
            {eloEntry.elo_after >= eloEntry.elo_before ? (
              <TrendingUp size={16} color="#16A34A" />
            ) : (
              <TrendingDown size={16} color="#EF4444" />
            )}
            <Text
              className="font-heading-black text-[13px] text-brand-navy"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              Niveau {eloEntry.elo_before.toFixed(1)} → {eloEntry.elo_after.toFixed(1)}
            </Text>
            <Text
              className="font-heading-black text-[13px]"
              style={{
                color: eloEntry.elo_after >= eloEntry.elo_before ? '#16A34A' : '#EF4444',
                fontVariant: ['tabular-nums'],
              }}
            >
              {eloEntry.elo_after >= eloEntry.elo_before ? '+' : ''}
              {(eloEntry.elo_after - eloEntry.elo_before).toFixed(2)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Partager la victoire — upload photo result → post système ── */}
      <View className="rounded-3xl border border-brand-border bg-white p-4">
        <View className="mb-3 flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-orange-light">
            <Camera size={16} color="#E8650A" />
          </View>
          <View className="flex-1">
            <Text variant="h3" className="text-[14px]">
              Partager dans le fil d&apos;actu
            </Text>
            <Text variant="caption" className="text-[11px]">
              Le post est déjà publié — ajoute une photo !
            </Text>
          </View>
        </View>

        {uploadedUrl ? (
          <View className="flex-row items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <Check size={16} color="#059669" />
            <Text
              variant="caption"
              className="flex-1 text-[12px] font-heading text-emerald-700"
            >
              Photo publiée dans l&apos;actualité
            </Text>
            <Image
              source={uploadedUrl}
              style={{ width: 36, height: 36, borderRadius: 8 }}
              contentFit="cover"
            />
          </View>
        ) : (
          <View className="flex-row gap-2">
            <Pressable
              onPress={pickAndUploadPhoto}
              disabled={uploadMut.isPending}
              className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-orange"
              style={{
                opacity: uploadMut.isPending ? 0.6 : 1,
                shadowColor: '#E8650A',
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            >
              {uploadMut.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Camera size={16} color="#FFFFFF" />
                  <Text
                    className="font-heading-black text-white"
                    style={{ fontSize: 13 }}
                  >
                    Ajouter une photo
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={onGoActualites}
              className="h-11 w-11 items-center justify-center rounded-2xl border border-brand-border bg-white"
              accessibilityLabel="Voir l'actualité"
            >
              <Newspaper size={16} color="#64748B" />
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Boutons footer ── */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={onGoHome}
          className="h-11 flex-1 items-center justify-center rounded-2xl bg-brand-navy"
        >
          <Text className="font-heading-black text-[13px] text-white">Retour</Text>
        </Pressable>
        <Pressable
          onPress={onGoProfile}
          className="h-11 flex-1 items-center justify-center rounded-2xl border border-brand-border bg-white"
        >
          <Text className="font-heading-black text-[13px]">Mes stats</Text>
        </Pressable>
      </View>
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
          {/* Port Emergent FriendlyMatchLivePage.js:248 — le texte "Partie
              terminée" est plus explicite que "Valider" pour le capitaine qui
              clôt le match (fin de partie, pas une étape intermédiaire). */}
          <Text className="font-heading-black text-[11px] text-white">Partie terminée</Text>
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
