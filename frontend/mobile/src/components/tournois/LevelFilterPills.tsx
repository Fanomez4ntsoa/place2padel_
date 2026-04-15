import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/design-system';
import type { TournamentLevel } from '@/features/tournaments/types';

interface Props {
  value: TournamentLevel | '';
  onChange: (level: TournamentLevel | '') => void;
}

/**
 * Pills niveau — port fidèle placeToPadel d541157 (TournamentsPage).
 * Actif : navy rempli + shadow navy doux. Inactif : bordure brand-border, fond blanc.
 *
 * L'écran Emergent n'expose pas P250 dans ce filtre (deliberately trimmed) —
 * on garde strictement la même sélection visible. Un éventuel P250 côté backend
 * reste accessible via un autre mode (ex: cliquer sur un tournoi P250 directement).
 */

const LEVELS: TournamentLevel[] = ['P25', 'P50', 'P100', 'P500', 'P1000', 'P2000'];

export function LevelFilterPills({ value, onChange }: Props) {
  const renderPill = (label: string, active: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      className={`rounded-2xl px-3.5 py-2 ${
        active ? 'bg-brand-navy' : 'border border-brand-border bg-white'
      }`}
      style={
        active
          ? {
              shadowColor: '#1A2A4A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 3,
            }
          : undefined
      }
    >
      <Text
        variant="caption"
        className={`font-heading text-[12px] ${active ? 'text-white' : 'text-brand-muted'}`}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}
    >
      {renderPill('Tous', value === '', () => onChange(''), 'all')}
      {LEVELS.map((lvl) =>
        renderPill(lvl, value === lvl, () => onChange(value === lvl ? '' : lvl), lvl),
      )}
    </ScrollView>
  );
}
