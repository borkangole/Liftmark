import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { MuscleMap } from '@/components/muscles/MuscleMap';
import { PressableLink, Text } from '@/components/ui';
import { targetsForNames } from '@/features/muscles/targets';
import type { SplitPreset } from '@/features/routines/presets';
import { colors, radius, space } from '@/theme/tokens';

const levelColor = { Beginner: colors.volt, Intermediate: colors.steel, Advanced: colors.warning } as const;

/** A preset split in the library: name, level, schedule and its days at a glance. */
export function SplitCard({ preset }: { preset: SplitPreset }) {
  return (
    <PressableLink
      href={{ pathname: '/routines/preset/[key]', params: { key: preset.key } }}
      accessibilityRole="link"
      accessibilityLabel={`${preset.name}, ${preset.level}, ${preset.daysPerWeek}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.top}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title">{preset.name}</Text>
          <Text variant="label">{preset.tagline}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </View>

      <View style={styles.meta}>
        <View style={[styles.chip, { borderColor: levelColor[preset.level] }]}>
          <Text variant="caption" style={{ color: levelColor[preset.level], fontWeight: '700' }}>
            {preset.level}
          </Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="calendar-outline" size={12} color={colors.muted} />
          <Text variant="caption">{preset.daysPerWeek}</Text>
        </View>
      </View>

      {/* One mini body map per training day */}
      <View style={styles.days}>
        {preset.days.map((d) => (
          <View key={d.name} style={styles.day}>
            <MuscleMap targets={targetsForNames(d.exercises.map((e) => e.name))} height={44} />
            <Text variant="caption" numberOfLines={1} style={styles.dayName}>
              {d.name}
            </Text>
          </View>
        ))}
      </View>
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meta: { flexDirection: 'row', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  days: { flexDirection: 'row', gap: space.xs },
  day: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  dayName: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
