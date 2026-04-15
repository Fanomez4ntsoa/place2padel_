import { ActivityIndicator, Pressable, PressableProps, View } from 'react-native';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
}

const sizeClass: Record<Size, string> = {
  md: 'h-12 px-5',
  lg: 'h-14 px-6',
};

const variantClass: Record<Variant, { wrapper: string; label: string }> = {
  primary: {
    wrapper: 'bg-brand-orange active:bg-brand-orange-hover',
    label: 'text-white',
  },
  secondary: {
    wrapper: 'bg-brand-navy active:bg-brand-navy-2',
    label: 'text-white',
  },
  ghost: {
    wrapper: 'bg-transparent border border-brand-border active:bg-brand-orange-light',
    label: 'text-brand-navy',
  },
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled,
  className = '',
  leftIcon,
  ...rest
}: Props) {
  const v = variantClass[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-2xl ${sizeClass[size]} ${v.wrapper} ${isDisabled ? 'opacity-60' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? '#1A2A4A' : '#FFFFFF'} />
      ) : (
        <>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Text variant="body-medium" className={`${v.label} text-center`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
