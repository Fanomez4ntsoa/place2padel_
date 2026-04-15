import { Pressable, View } from 'react-native';

import { Text } from '@/design-system';

interface Props<T extends string> {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}

/**
 * Tabs pill horizontal — fond pills arrondi, actif navy + label blanc,
 * cohérent avec les pills Emergent (TournamentDetailPage + CockpitPage).
 */
export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <View className="mx-5 mt-2 flex-row rounded-2xl border border-brand-border bg-white p-1">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className={`flex-1 items-center justify-center rounded-xl py-2 ${active ? 'bg-brand-navy' : ''}`}
          >
            <Text
              variant="caption"
              className={`font-heading text-[12px] ${active ? 'text-white' : 'text-brand-muted'}`}
            >
              {t.label}
              {typeof t.count === 'number' ? ` (${t.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
