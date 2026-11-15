import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';
import { Text } from './Text';

interface StepperProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  decimal?: boolean;
  /** Shown when empty (defaults to "0"). */
  placeholder?: string;
  /** Where −/+ start from when the field is empty (defaults to 0). */
  emptyStart?: number;
}

/** Number input with −/+ buttons, sized for one-handed use between sets. */
export function Stepper({
  label,
  value,
  onChange,
  step,
  decimal = false,
  placeholder = '0',
  emptyStart = 0,
}: StepperProps) {
  const bump = (delta: number) => {
    const current = value.trim() === '' ? emptyStart : Number(value.replace(',', '.')) || 0;
    const next = Math.max(0, current + delta);
    Haptics.selectionAsync().catch(() => {});
    onChange(formatNumber(next));
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" style={styles.label}>
        {label}
      </Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => bump(-step)}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          hitSlop={4}
        >
          <Ionicons name="remove" size={20} color={colors.chalk} />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ''))}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          selectTextOnFocus
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={styles.input}
          maxLength={6}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => bump(step)}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          hitSlop={4}
        >
          <Ionicons name="add" size={20} color={colors.chalk} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.xs },
  label: { textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  input: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    color: colors.chalk,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: space.sm,
  },
});
