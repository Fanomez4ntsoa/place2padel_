import { forwardRef, ReactNode, useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

import { colors } from '../colors';
import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  className?: string;
  leftIcon?: ReactNode;
  /** Fond du champ — par défaut blanc ; Emergent utilise brand-bg (#FFF8F4) sur les formulaires auth. */
  fieldBg?: 'white' | 'brand';
}

/**
 * Input — label au-dessus, border focus orange, texte body.
 * Hauteur 48 (h-12) cohérente avec Button md.
 */
export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, className = '', leftIcon, fieldBg = 'white', onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-brand-danger'
    : focused
      ? 'border-brand-orange'
      : 'border-brand-border';
  const bgClass = fieldBg === 'brand' ? 'bg-brand-bg' : 'bg-white';
  const padLeftClass = leftIcon ? 'pl-11' : 'px-4';

  return (
    <View className={className}>
      {label ? (
        <Text variant="caption" className="mb-1.5 font-body-medium text-brand-navy">
          {label}
        </Text>
      ) : null}
      <View className="relative">
        {leftIcon ? (
          <View className="absolute left-3.5 top-0 bottom-0 z-10 justify-center">{leftIcon}</View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`h-12 rounded-2xl border ${bgClass} ${padLeftClass} pr-4 font-body text-[16px] text-brand-navy ${borderClass}`}
          {...rest}
        />
      </View>
      {error ? (
        <Text variant="caption" className="mt-1 text-brand-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
