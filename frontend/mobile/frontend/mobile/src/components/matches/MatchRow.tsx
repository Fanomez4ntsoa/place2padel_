import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/design-system';
import type { MatchStatus, TournamentMatch } from '@/features/matches/types';

interface Props {
  match: TournamentMatch;
  onPress: () => void;
}

const STATUS_STYLE: Record<MatchStatus, { label: string; wrapper: string; text: string }> = {
  pending: { label: 'À jouer', wrapper: 'bg-slate-100', text: 'text-slate-500' },
  in_progress: { label: 'En cours', wrapper: 'bg-red-50', text: 'text-red-500' },
  completed: { label: 'Terminé', wrapper: 'bg-emerald-50', text: 'text-emerald-600' },
  forfeit: { label: 'Forfait', wrapper: 'bg-amber-50', text: 'text-amber-700' },
};

export function MatchRow({ match, onPress }: Props) {
  const s = match.score;
  const style = STATUS_STYLE[match.status];
  const team1Won = match.winner?.id === match.team1?.id;
  const team2Won = match.winner?.id === match.team2?.id;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-3xl border border-brand-border bg-white px-4 py-3"
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          {match.round ? (
            <Text variant="caption" className="text-[10px] font-heading-black uppercase tracking-wider">
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
