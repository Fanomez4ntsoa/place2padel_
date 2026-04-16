import { Lock, TrendingDown, TrendingUp } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/design-system';
import type { UserElo } from '@/features/friendly-matches/types';

interface Props {
  elo: UserElo;
}

/**
 * Card ELO — port d541157 / 39b6544 (declared vs elo, barre 1-10, lock badge).
 */
export function EloCard({ elo }: Props) {
  const progress = Math.min(100, Math.max(0, (elo.elo_level / 10) * 100));
  const diff = elo.elo_level - elo.declared_level;

  return (
    <View className="rounded-3xl border border-brand-border bg-white p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text variant="h3" className="text-[15px]">Niveau ELO</Text>
        {elo.is_locked ? (
          <View className="flex-row items-center gap-1 rounded-full bg-brand-orange-light px-2.5 py-1">
            <Lock size={11} color="#E8650A" />
            <Text variant="caption" className="text-[10px] font-heading-black text-brand-orange">
              🔒 {elo.matches_to_unlock} à jouer
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-end justify-between">
        <View>
          <Text variant="caption" className="text-[10px] font-heading-black uppercase tracking-wider">
            Déclaré
          </Text>
          <Text className="font-heading-black text-[28px] text-brand-navy">
            {elo.declared_level}
          </Text>
        </View>
        <View className="items-end">
          <Text variant="caption" className="text-[10px] font-heading-black uppercase tracking-wider text-brand-orange">
            ELO
          </Text>
          <Text className="font-heading-black text-[28px] text-brand-orange">
            {elo.elo_level.toFixed(2)}
          </Text>
        </View>
      </View>

      <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <View
          className="h-full rounded-full bg-brand-orange"
          style={{ width: `${progress}%` }}
        />
      </View>
      <View className="mt-1 flex-row justify-between">
        <Text variant="caption" className="text-[9px]">1</Text>
        <Text variant="caption" className="text-[9px]">10</Text>
      </View>

      {!elo.is_locked && diff !== 0 ? (
        <View className="mt-3 flex-row items-center gap-1.5">
          {diff > 0 ? (
            <>
              <TrendingUp size={13} color="#059669" />
              <Text variant="caption" className="text-[11px] font-body-medium text-emerald-700">
                +{diff.toFixed(2)} au-dessus de ton niveau déclaré
              </Text>
            </>
          ) : (
            <>
              <TrendingDown size={13} color="#DC2626" />
              <Text variant="caption" className="text-[11px] font-body-medium text-red-700">
                {diff.toFixed(2)} sous ton niveau déclaré
              </Text>
            </>
          )}
        </View>
      ) : null}

      <View className="mt-3 flex-row gap-3 border-t border-brand-border/50 pt-3">
        <StatCell value={elo.matches_played} label="Joués" />
        <StatCell value={elo.matches_won} label="Victoires" color="text-emerald-600" />
        <StatCell value={elo.matches_lost} label="Défaites" color="text-red-500" />
      </View>
    </View>
  );
}

function StatCell({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className={`font-heading-black text-[18px] ${color ?? 'text-brand-navy'}`}>
        {value}
      </Text>
      <Text variant="caption" className="text-[10px]">{label}</Text>
    </View>
  );
}
