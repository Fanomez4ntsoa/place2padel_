import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/design-system';
import type { RankingEntry } from '@/features/matches/types';

interface Props {
  entries: RankingEntry[];
  isFinal: boolean;
}

/**
 * Liste classement — dynamique pendant le tournoi, figée après completion.
 */
export function RankingList({ entries, isFinal }: Props) {
  return (
    <View className="rounded-3xl border border-brand-border bg-white p-4">
      <View className="flex-row items-center gap-2">
        <Trophy size={18} color="#E8650A" />
        <Text variant="h3" className="text-[15px]">
          {isFinal ? 'Classement final' : 'Classement live'}
        </Text>
      </View>

      <View className="mt-3 flex-row border-b border-brand-border/50 pb-1.5">
        <Text variant="caption" className="w-8 text-[10px] font-heading-black uppercase">
          #
        </Text>
        <Text variant="caption" className="flex-1 text-[10px] font-heading-black uppercase tracking-wider">
          Équipe
        </Text>
        <Text variant="caption" className="w-8 text-center text-[10px] font-heading-black uppercase">
          V
        </Text>
        <Text variant="caption" className="w-8 text-center text-[10px] font-heading-black uppercase">
          D
        </Text>
      </View>

      {entries.map((e) => {
        const podium = e.position <= 3;
        return (
          <View
            key={e.team.id}
            className={`mt-1.5 flex-row items-center py-1 ${podium ? 'bg-brand-orange-light/40 -mx-2 rounded-xl px-2' : ''}`}
          >
            <Text
              variant="body"
              className={`w-8 text-[13px] ${podium ? 'font-heading text-brand-orange' : ''}`}
            >
              {e.position}
            </Text>
            <Text variant="body" className="flex-1 text-[13px]" numberOfLines={1}>
              {e.team.team_name}
            </Text>
            <Text variant="body" className="w-8 text-center text-[13px]">
              {e.wins}
            </Text>
            <Text variant="body" className="w-8 text-center text-[13px]">
              {e.losses}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
