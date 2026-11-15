import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';
import { Text } from './Text';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'secondary';
}

export function Button({ title, variant = 'primary', onPress, style, ...rest }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={(state) => [
        styles.base,
        { backgroundColor: primary ? colors.volt : colors.surfaceRaised, opacity: state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <Text style={{ color: primary ? colors.voltInk : colors.chalk, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
