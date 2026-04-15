import { View } from 'react-native';

import { Text } from './Text';

type Tone = 'neutral' | 'success' | 'danger' | 'live' | 'info';

const toneClass: Record<Tone, { wrapper: string; label: string }> = {
  neutral: { wrapper: 'bg-brand-border', label: 'text-brand-navy' },
  success: { wrapper: 'bg-brand-success', label: 'text-white' },
  danger: { wrapper: 'bg-brand-danger', label: 'text-white' },
  live: { wrapper: 'bg-brand-live', label: 'text-white' },
  info: { wrapper: 'bg-brand-orange-light', label: 'text-brand-orange' },
};

interface Props {
  label: string;
  tone?: Tone;
  className?: string;
}

export function Badge({ label, tone = 'neutral', className = '' }: Props) {
  const t = toneClass[tone];
  return (
    <View className={`self-start rounded-full px-3 py-1 ${t.wrapper} ${className}`}>
      <Text variant="caption" className={`${t.label} text-[12px] font-body-medium`}>
        {label}
      </Text>
    </View>
  );
}
