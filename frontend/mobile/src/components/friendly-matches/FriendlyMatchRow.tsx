import { ChevronRight, Swords } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/design-system';
import type { FriendlyMatch, FriendlyStatus } from '@/features/friendly-matches/types';

interface Props {
  match: FriendlyMatch;
  onPress: () => void;
}

const STATUS: Record<FriendlyStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'En attente', bg: 'bg-amber-50', color: 'text-amber-700' },
  accepted: { label: 'Prêt à jouer', bg: 'bg-blue-50', color: 'text-blue-700' },
  declined: { label: 'Refusé', bg: 'bg-slate-100', color: 'text-slate-500' },
  in_progress: { label: 'En cours', bg: 'bg-red-50', color: 'text-red-500' },
  completed: { label: 'Terminé', bg: 'bg-emerald-50', color: 'text-emerald-700' },
};

export function FriendlyMatchRow({ match, onPress }: Props) {
  const st = STATUS[match.status];
  const team1 = match.team1.map((p) => p.user?.name?.split(' ')[0] ?? '?').join(' / ');
  const team2 = match.team2.map((p) => p.user?.name?.split(' ')[0] ?? '?').join(' / ');
  const hasScore = match.score.team1_games !== null;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-3xl border border-brand-border bg-white px-4 py-3"
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-orange-light">
        <Swords size={18} color="#E8650A" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <View className={`rounded-full px-2 py-0.5 ${st.bg}`}>
            <Text variant="caption" className={`text-[10px] font-heading ${st.color}`}>
              {st.label}
            </Text>
          </View>
          {hasScore ? (
            <Text variant="caption" className="text-[11px] font-body-medium">
              {match.score.team1_games}–{match.score.team2_games}
            </Text>
          ) : null}
        </View>
        <Text variant="body-medium" className="mt-1 text-[13px]" numberOfLines={1}>
          {team1} <Text variant="caption" className="text-[11px]">vs</Text> {team2}
        </Text>
      </View>
      <ChevronRight size={16} color="#CBD5E1" />
    </Pressable>
  );
}
