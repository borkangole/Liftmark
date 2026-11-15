import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { MuscleMap } from '@/components/muscles/MuscleMap';
import { Button, PressableLink, Text } from '@/components/ui';
import type { UpNext } from '@/db/routines';
import { combineTargets, getTargets } from '@/features/muscles/targets';
import { colors, radius, space } from '@/theme/tokens';
import { loadTypeOf } from '@/features/progression';
import { formatRepRange } from '@/lib/format';

const MAX_LISTED = 5;

/** Today's hero: the next day of your active routine, ready to start. */
export function UpNextCard({ upNext, onStart }: { upNext: UpNext; onStart: () => void }) {
  const { routine, day } = upNext;
  const position = routine.days.findIndex((d) => d.id === day.id);
  const totalSets = day.exercises.reduce((n, e) => n + e.targetSets, 0);
  const listed = day.exercises.slice(0, MAX_LISTED);
  const more = day.exercises.length - listed.length;
  const targets = combineTargets(
    day.exercises.map((e) =>
      getTargets(e.exercise.name, e.exercise.muscleGroup, e.exercise.primaryMuscle, e.exercise.targetMuscles),
    ),
  );

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(198,244,50,0.20)', 'rgba(198,244,50,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.top}>
        <Text variant="caption" style={styles.kicker}>
          UP NEXT
        </Text>
        <PressableLink
          href={{ pathname: '/routines/[id]', params: { id: String(routine.id) } }}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text variant="caption" style={{ fontWeight: '700' }}>
            {routine.name} ›
          </Text>
        </PressableLink>
      </View>

      <View style={styles.hero}>
        <Text variant="display" style={[styles.dayName, { flex: 1 }]} numberOfLines={2}>
          {day.name}
        </Text>
        <MuscleMap targets={targets} height={100} />
      </View>

      {/* Where you are in the cycle */}
      <View style={styles.cycle} accessibilityLabel={`Day ${position + 1} of ${routine.days.length}`}>
        {routine.days.map((d, i) => (
          <View
            key={d.id}
            style={[
              styles.cycleSeg,
              { backgroundColor: i === position ? colors.volt : i < position ? colors.steel : colors.surfaceRaised },
              i < position && { opacity: 0.5 },
            ]}
          />
        ))}
      </View>
      <Text variant="caption">
        Day {position + 1} of {routine.days.length} · {day.exercises.length} exercises · {totalSets} sets
      </Text>

      <View style={styles.list}>
        {listed.map((item) => (
          <View key={item.id} style={styles.item}>
            <Text style={{ flex: 1 }} numberOfLines={1}>
              {item.exercise.name}
            </Text>
            <Text variant="label" style={{ fontVariant: ['tabular-nums'] }}>
              {item.targetSets} ×{' '}
              {formatRepRange(item.exercise.repRangeMin, item.exercise.repRangeMax, loadTypeOf(item.exercise), false)}
            </Text>
          </View>
        ))}
        {more > 0 && <Text variant="caption">+ {more} more</Text>}
      </View>

      <Button title={`Start ${day.name}`} onPress={onStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(198,244,50,0.35)',
    padding: space.lg,
    gap: space.sm,
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  dayName: { fontSize: 36 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cycle: { flexDirection: 'row', gap: 4 },
  cycleSeg: { flex: 1, height: 6, borderRadius: 3 },
  list: { gap: 2, marginVertical: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: space.md },
});
