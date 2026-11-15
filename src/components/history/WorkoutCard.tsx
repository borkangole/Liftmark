import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { MuscleMap } from '@/components/muscles/MuscleMap';
import { PressableLink, Text } from '@/components/ui';
import type { HistoryExercise, HistoryWorkout } from '@/features/history/history';
import { targetsForNames } from '@/features/muscles/targets';
import { formatCompact, formatLoad, formatMinutes, formatSeconds, plural } from '@/lib/format';
import { toDisplayWeight, type WeightUnit } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

/** "3 × 8 @ 60 kg", "4 sets · top 70 kg × 6", "3 × 12 @ BW", or "3 × 45 s" for holds. */
function setSummary(ex: HistoryExercise, unit: WeightUnit) {
  if (ex.sets === 0) return ex.warmups ? `${plural(ex.warmups, 'warm-up')} only` : 'No sets';
  if (ex.type === 'timed') {
    return ex.sameReps
      ? `${ex.sets} × ${formatSeconds(ex.topReps)}`
      : `${plural(ex.sets, 'set')} · best ${formatSeconds(ex.topReps)}`;
  }
  const load = formatLoad(ex.topWeight, ex.type, unit);
  return ex.sameReps
    ? `${ex.sets} × ${ex.topReps} @ ${load}`
    : `${plural(ex.sets, 'set')} · top ${load} × ${ex.topReps}`;
}

export function WorkoutCard({ workout, unit }: { workout: HistoryWorkout; unit: WeightUnit }) {
  const d = workout.startedAt;
  const meta = [
    workout.durationMs > 0 ? formatMinutes(workout.durationMs) : null,
    plural(workout.setCount, 'set'),
    workout.volume > 0 ? `${formatCompact(toDisplayWeight(workout.volume, unit))} ${unit}` : null,
  ].filter(Boolean);

  return (
    <PressableLink
      href={{ pathname: '/history/[id]', params: { id: String(workout.id) } }}
      accessibilityLabel={`${workout.name ?? 'Workout'}, ${d.toDateString()}, ${plural(workout.exercises.length, 'exercise')}, ${plural(workout.setCount, 'set')}${
        workout.prCount ? `, ${plural(workout.prCount, 'PR')}` : ''
      }`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.date}>
          <Text variant="caption" style={styles.weekday}>
            {d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}
          </Text>
          <Text style={styles.day}>{d.getDate()}</Text>
        </View>

        <View style={styles.headText}>
          <View style={styles.titleRow}>
            <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
              {workout.name ?? 'Workout'}
            </Text>
            {workout.prCount > 0 && (
              <View style={styles.pr}>
                <Ionicons name="trophy" size={10} color={colors.voltInk} />
                <Text variant="caption" style={styles.prText}>
                  {workout.prCount}
                </Text>
              </View>
            )}
          </View>
          <Text variant="caption" numberOfLines={1}>
            {meta.join(' · ')}
          </Text>
        </View>

        <MuscleMap targets={targetsForNames(workout.exerciseNames)} height={52} />
      </View>

      {workout.exercises.length > 0 && (
        <View style={styles.list}>
          {workout.exercises.map((ex, i) => (
            <View key={ex.exerciseId} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={[styles.dot, ex.isPr && styles.dotPr]} />
              <Text numberOfLines={1} style={styles.exName}>
                {ex.name}
              </Text>
              {ex.isPr && <Ionicons name="trophy" size={11} color={colors.volt} accessibilityLabel="Personal record" />}
              <Text variant="caption" style={styles.exSets}>
                {setSummary(ex, unit)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.md,
    gap: space.md,
  },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headText: { flex: 1, gap: 3, minWidth: 0 },
  date: {
    width: 48,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.volt },
  day: { color: colors.chalk, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.volt,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  prText: { color: colors.voltInk, fontWeight: '700' },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 7 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted },
  dotPr: { backgroundColor: colors.volt },
  exName: { flex: 1, color: colors.chalk, fontWeight: '600', fontSize: 14 },
  exSets: { fontVariant: ['tabular-nums'], color: colors.muted },
});
