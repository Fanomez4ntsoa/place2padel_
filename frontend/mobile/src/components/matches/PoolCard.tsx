import { View } from 'react-native';

import { Text } from '@/design-system';
import type { Pool } from '@/features/matches/types';

interface Props {
  pool: Pool;
}

/**
 * Card poule — affiche le classement live calculé par le backend
 * (wins / losses / team_points).
 */
export function PoolCard({ pool }: Props) {
  return (
    <View className="rounded-3xl border border-brand-border bg-white p-4">
      <Text variant="h3" className="text-[15px]">
        Poule {pool.pool_name}
      </Text>

      <View className="mt-3 flex-row border-b border-brand-border/50 pb-1.5">
        <Text variant="caption" className="flex-1 text-[10px] font-heading-black uppercase tracking-wider">
          Équipe
        </Text>
        <Text variant="caption" className="w-8 text-center text-[10px] font-heading-black uppercase">
          V
        </Text>
        <Text variant="caption" className="w-8 text-center text-[10px] font-heading-black uppercase">
          D
        </Text>
        <Text variant="caption" className="w-10 text-center text-[10px] font-heading-black uppercase">
          Pts
        </Text>
      </View>

      {pool.standings.map((s, i) => (
        <View
          key={s.team_id}
          className={`mt-1.5 flex-row items-center py-1 ${i === 0 ? 'bg-brand-orange-light/40 -mx-2 rounded-xl px-2' : ''}`}
        >
          <Text variant="body" className="flex-1 text-[13px]" numberOfLines={1}>
            <Text className={i === 0 ? 'font-heading text-brand-orange' : ''}>
              {i + 1}.{' '}
            </Text>
            {s.team_name}
          </Text>
          <Text variant="body" className="w-8 text-center text-[13px]">
            {s.won}
          </Text>
          <Text variant="body" className="w-8 text-center text-[13px]">
            {s.lost}
          </Text>
          <Text variant="body-medium" className="w-10 text-center text-[13px]">
            {s.points}
          </Text>
        </View>
      ))}
    </View>
  );
}
