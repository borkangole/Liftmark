import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { setExerciseRest } from '@/db/exercises';
import { REST_CHOICES } from '@/features/rest/rest';
import { formatSeconds } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

/** "1:30" / "3:00": rest always reads as a clock, even under a minute ("0:45"). */
export const formatRest = (s: number) => (s < 60 ? `0:${String(s).padStart(2, '0')}` : formatSeconds(s));

interface RestPickerProps {
  exerciseId: number;
  /** The user's saved value; null = automatic. */
  value: number | null;
  /** What "Auto" would pick (smart or the fixed default). */
  autoSeconds: number;
  autoLabel?: string;
}

/** Auto, or a specific rest for this exercise. Saves straight to the exercise. */
export function RestPicker({ exerciseId, value, autoSeconds, autoLabel = 'Auto' }: RestPickerProps) {
  const pick = (seconds: number | null) => {
    if (seconds === value) return;
    Haptics.selectionAsync().catch(() => {});
    setExerciseRest(exerciseId, seconds).catch(console.error);
  };
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Rest between sets">
      <Chip
        active={value === null}
        onPress={() => pick(null)}
        label={`${autoLabel} · ${formatRest(autoSeconds)}`}
        wide
      />
      {REST_CHOICES.map((s) => (
        <Chip key={s} active={value === s} onPress={() => pick(s)} label={formatRest(s)} />
      ))}
    </View>
  );
}

function Chip({
  active,
  onPress,
  label,
  wide,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, wide && styles.wide, active && styles.active, pressed && { opacity: 0.75 }]}
    >
      <Text
        variant="label"
        style={{
          fontWeight: '700',
          color: active ? colors.voltInk : colors.chalk,
          fontVariant: ['tabular-nums'],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    minHeight: 38,
    minWidth: 56,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { paddingHorizontal: space.lg },
  active: { backgroundColor: colors.volt, borderColor: colors.volt },
});
