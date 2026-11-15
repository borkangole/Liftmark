import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, font } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'body' | 'label' | 'caption';

const variants = {
  display: { fontSize: font.size.display, fontWeight: font.weight.bold, color: colors.chalk, letterSpacing: -1 },
  title: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.chalk },
  body: { fontSize: font.size.md, color: colors.chalk },
  label: { fontSize: font.size.sm, fontWeight: font.weight.medium, color: colors.muted },
  caption: { fontSize: font.size.xs, color: colors.muted },
} as const;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  accent?: boolean;
}

export function Text({ variant = 'body', accent, style, ...rest }: TextProps) {
  return <RNText style={[variants[variant], accent && { color: colors.volt }, style]} {...rest} />;
}
