import { Heart, Swords, Trophy } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/design-system';
import type { PartnerMode } from '@/features/partners/types';

interface Props {
  value: PartnerMode;
  onChange: (v: PartnerMode) => void;
}

/**
 * Pills sticky 3 modes — port d541157. Fond navy actif, blanc bordure inactif.
 */
export function ModePills({ value, onChange }: Props) {
  const items: { key: PartnerMode; label: string; icon: typeof Swords }[] = [
    { key: 'amical', label: 'Match amical', icon: Swords },
    { key: 'tournoi', label: 'Tournoi', icon: Trophy },
    { key: 'rencontre', label: 'Rencontre', icon: Heart },
  ];

  return (
    <View className="border-b border-brand-border/60 bg-white px-3 py-2.5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7 }}
      >
        {items.map(({ key, label, icon: Icon }) => {
          const active = key === value;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                active ? 'bg-brand-navy' : 'border border-brand-border bg-white'
              }`}
            >
              <Icon size={13} color={active ? '#FFFFFF' : '#6B7280'} />
              <Text
                variant="caption"
                className={`text-[12px] font-heading ${active ? 'text-white' : 'text-brand-muted'}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
