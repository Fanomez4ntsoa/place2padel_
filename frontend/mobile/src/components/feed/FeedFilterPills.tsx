import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/design-system';
import type { FeedFilter } from '@/features/feed/types';

interface Props {
  value: FeedFilter;
  onChange: (v: FeedFilter) => void;
  isLoggedIn: boolean;
}

const LABELS: { key: FeedFilter; label: string; authOnly?: boolean }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'my-tournaments', label: 'Mes tournois', authOnly: true },
  { key: 'my-partners', label: 'Mes partenaires', authOnly: true },
  { key: 'my-clubs', label: 'Mes clubs', authOnly: true },
];

/**
 * Filtres sticky Feed — port d541157 (bg navy actif / bordure clair inactif).
 * Les 3 filtres "mes-*" sont masqués pour les visiteurs non authentifiés.
 */
export function FeedFilterPills({ value, onChange, isLoggedIn }: Props) {
  const items = LABELS.filter((f) => !f.authOnly || isLoggedIn);
  return (
    <View className="border-b border-brand-border/60 bg-white/95 px-4 py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {items.map((f) => {
          const active = f.key === value;
          return (
            <Pressable
              key={f.key}
              onPress={() => onChange(f.key)}
              className={`rounded-full px-4 py-1.5 ${
                active ? 'bg-brand-navy' : 'border border-brand-border bg-white'
              }`}
            >
              <Text
                variant="caption"
                className={`font-heading text-[12px] ${active ? 'text-white' : 'text-brand-muted'}`}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
