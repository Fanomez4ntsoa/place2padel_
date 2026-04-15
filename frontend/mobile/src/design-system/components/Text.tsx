import { Text as RNText, TextProps } from 'react-native';

/**
 * Text normalisé — applique la bonne famille selon `variant`.
 * Toutes les classes Tailwind reçues via className sont mergées par NativeWind.
 *
 * Familles (chargées par expo-font dans _layout) :
 *   - heading variants → Plus Jakarta Sans
 *   - body variants    → DM Sans
 */
type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'body-medium' | 'caption';

const variantClass: Record<Variant, string> = {
  h1: 'font-heading-black text-[32px] leading-[38px] text-brand-navy',
  h2: 'font-heading text-[24px] leading-[30px] text-brand-navy',
  h3: 'font-heading text-[18px] leading-[24px] text-brand-navy',
  body: 'font-body text-[16px] leading-[24px] text-brand-navy',
  'body-medium': 'font-body-medium text-[16px] leading-[24px] text-brand-navy',
  caption: 'font-body text-[13px] leading-[18px] text-brand-muted',
};

interface Props extends TextProps {
  variant?: Variant;
  className?: string;
}

export function Text({ variant = 'body', className = '', ...rest }: Props) {
  return <RNText className={`${variantClass[variant]} ${className}`} {...rest} />;
}
