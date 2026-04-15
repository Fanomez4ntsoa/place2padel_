import { View, ViewProps } from 'react-native';

import { shadows } from '../tokens';

interface Props extends ViewProps {
  className?: string;
}

/**
 * Card — rounded-3xl, border brand-border, shadow douce (miroir Emergent :
 * rounded-3xl + border #F0EBE8 + shadow 0 8px 30px rgba(0,0,0,0.04)).
 */
export function Card({ className = '', style, children, ...rest }: Props) {
  return (
    <View
      className={`rounded-3xl border border-brand-border bg-white p-5 ${className}`}
      style={[shadows.card, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
