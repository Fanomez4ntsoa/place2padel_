import { ChevronRight, Play, X as XIcon } from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { Text } from '@/design-system';
import type { MatchStatus, TournamentMatch } from '@/features/matches/types';

interface Props {
  match: TournamentMatch;
  onPress: () => void;
  /** True si le viewer est organizer/admin du tournoi — affiche les actions inline. */
  isOwner?: boolean;
  /** Déclare le forfait — appelé avec winner_team_id (la team GAGNANTE). */
  onForfeit?: (winnerTeamId: number) => void;
  /** True pendant le forfait en cours (désactive les boutons). */
  forfeitPending?: boolean;
}

const STATUS_STYLE: Record<MatchStatus, { label: string; wrapper: string; text: string }> = {
  pending: { label: 'À jouer', wrapper: 'bg-slate-100', text: 'text-slate-500' },
  in_progress: { label: 'LIVE', wrapper: 'bg-red-50', text: 'text-red-500' },
  completed: { label: 'Terminé', wrapper: 'bg-emerald-50', text: 'text-emerald-600' },
  forfeit: { label: 'Forfait', wrapper: 'bg-amber-50', text: 'text-amber-700' },
};

/**
 * Ligne de match dans la liste — port Emergent d5ac086 MatchCard
 * [TournamentDetailPage.js:888-948].
 *
 * Layout :
 *  - Zone tap navigation vers /matches/{uuid}
 *  - Bandeau actions owner (in_progress → "Score live" / scheduled+team1+team2 → "Forfait")
 */
export function MatchRow({
  match,
  onPress,
  isOwner = false,
  onForfeit,
  forfeitPending = false,
}: Props) {
  const s = match.score;
  const style = STATUS_STYLE[match.status];
  const team1Won = match.winner?.id === match.team1?.id;
  const team2Won = match.winner?.id === match.team2?.id;

  // Propose un forfait seulement si les deux équipes sont connues (pas TBD)
  // et que le match est encore jouable (pending/in_progress) — aligné backend
  // ForfeitMatchController qui refuse sur matches completed.
  const canForfeit =
    isOwner &&
    !!match.team1?.id &&
    !!match.team2?.id &&
    (match.status === 'pending' || match.status === 'in_progress');

  const showLiveCta = match.status === 'in_progress';

  const confirmForfeit = (winnerTeamId: number, loserTeamName: string) => {
    Alert.alert(
      'Déclarer forfait',
      `L'équipe "${loserTeamName}" abandonne. Le match sera clos 9-0 en faveur de l'autre équipe.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: () => onForfeit?.(winnerTeamId),
        },
      ],
    );
  };

  return (
    <View className="overflow-hidden rounded-3xl border border-brand-border bg-white">
      <Pressable onPress={onPress} className="flex-row items-center gap-3 px-4 py-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            {match.round ? (
              <Text
                variant="caption"
                className="text-[10px] font-heading-black uppercase tracking-wider"
              >
                {match.phase === 'poule' ? 'Poule' : match.phase === 'bracket' ? 'Tableau' : 'Classement'}
                {match.bloc ? ` · ${match.bloc}` : ''} · R{match.round}
              </Text>
            ) : null}
            <View className={`rounded-full px-2 py-0.5 ${style.wrapper}`}>
              <Text variant="caption" className={`text-[10px] font-heading ${style.text}`}>
                {style.label}
              </Text>
            </View>
          </View>

          <View className="mt-1.5 flex-row items-center gap-3">
            <Text
              variant="body"
              className={`flex-1 text-[13px] ${team1Won ? 'font-body-medium text-brand-navy' : ''}`}
              numberOfLines={1}
            >
              {match.team1?.team_name ?? 'TBD'}
            </Text>
            <ScoreBadge games={s.team1_games} winner={team1Won} />
          </View>

          <View className="mt-0.5 flex-row items-center gap-3">
            <Text
              variant="body"
              className={`flex-1 text-[13px] ${team2Won ? 'font-body-medium text-brand-navy' : ''}`}
              numberOfLines={1}
            >
              {match.team2?.team_name ?? 'TBD'}
            </Text>
            <ScoreBadge games={s.team2_games} winner={team2Won} />
          </View>
        </View>
        <ChevronRight size={16} color="#CBD5E1" />
      </Pressable>

      {/* Bandeau actions owner — port Emergent
          TournamentDetailPage.js:922-944 (Score live / Forfait row). */}
      {(showLiveCta || canForfeit) ? (
        <View className="flex-row items-center gap-2 border-t border-brand-border/50 bg-slate-50/60 px-4 py-2">
          {showLiveCta ? (
            <Pressable
              onPress={onPress}
              className="flex-row items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5"
            >
              <Play size={11} color="#FFFFFF" fill="#FFFFFF" />
              <Text
                className="font-heading-black text-white"
                style={{ fontSize: 11 }}
              >
                Score live
              </Text>
            </Pressable>
          ) : null}
          {canForfeit && match.team1 && match.team2 ? (
            <>
              {/* Forfait team1 → team2 gagne. Forfait team2 → team1 gagne. */}
              <Pressable
                onPress={() =>
                  confirmForfeit(match.team2!.id, match.team1!.team_name)
                }
                disabled={forfeitPending}
                className="flex-row items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-1.5"
                style={{ opacity: forfeitPending ? 0.5 : 1 }}
              >
                {forfeitPending ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <XIcon size={10} color="#EF4444" />
                )}
                <Text
                  className="font-heading-black text-red-500"
                  style={{ fontSize: 10 }}
                  numberOfLines={1}
                >
                  Forfait {match.team1.team_name.slice(0, 12)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  confirmForfeit(match.team1!.id, match.team2!.team_name)
                }
                disabled={forfeitPending}
                className="flex-row items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-1.5"
                style={{ opacity: forfeitPending ? 0.5 : 1 }}
              >
                <XIcon size={10} color="#EF4444" />
                <Text
                  className="font-heading-black text-red-500"
                  style={{ fontSize: 10 }}
                  numberOfLines={1}
                >
                  Forfait {match.team2.team_name.slice(0, 12)}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ScoreBadge({ games, winner }: { games: number | null; winner: boolean }) {
  return (
    <View className={`min-w-[28px] items-center rounded-lg px-2 py-0.5 ${winner ? 'bg-brand-orange' : 'bg-slate-100'}`}>
      <Text
        className={`font-heading-black text-[13px] ${winner ? 'text-white' : 'text-brand-navy'}`}
      >
        {games ?? '—'}
      </Text>
    </View>
  );
}
