import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedLiftmarkMark } from '@/components/brand/AnimatedLiftmarkMark';
import { WorkoutCard } from '@/components/history/WorkoutCard';
import { CountUp } from '@/components/motion/CountUp';
import { FadeIn } from '@/components/motion/FadeIn';
import { Button, Text } from '@/components/ui';
import { useHistory } from '@/hooks/useHistory';
import { useActiveWorkoutRow } from '@/hooks/useWorkout';
import { formatCompact } from '@/lib/format';
import { toDisplayWeight, useSettings } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

/** Every finished workout, by month. Shown under Progress → History. */
export function HistoryView() {
  const months = useHistory();
  const active = useActiveWorkoutRow();
  const unit = useSettings((s) => s.unit);

  const all = months.flatMap((m) => m.workouts);
  const thisMonth = months[0]?.key === monthKeyNow() ? months[0].workouts.length : 0;
  const totalPrs = all.reduce((n, w) => n + w.prCount, 0);

  return (
    <>
      {active && (
        <FadeIn delay={40}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: String(active.id) } })}
            style={styles.active}
          >
            <View style={styles.liveDot} />
            <Text style={{ flex: 1, fontWeight: '700' }}>{active.name ?? 'Workout'} in progress</Text>
            <Text variant="label" accent style={{ fontWeight: '700' }}>
              Resume ›
            </Text>
          </Pressable>
        </FadeIn>
      )}

      {all.length === 0 ? (
        <View style={styles.empty}>
          <AnimatedLiftmarkMark size={88} progress={0} staggerOnMount />
          <Text variant="title">No workouts yet</Text>
          <Text variant="label" style={{ textAlign: 'center' }}>
            Finished workouts land here with their sets, volume and PRs.
          </Text>
          <Button title="Go to Today" variant="secondary" onPress={() => router.navigate('/')} />
        </View>
      ) : (
        <>
          <FadeIn delay={80}>
            <View style={styles.tiles}>
              <Tile label="Workouts" value={all.length} />
              <Tile label="This month" value={thisMonth} />
              <Tile label="PRs" value={totalPrs} accent />
            </View>
          </FadeIn>

          {months.map((month, mi) => (
            <FadeIn key={month.key} delay={Math.min(120 + mi * 60, 400)} style={{ gap: space.md }}>
              <View style={styles.monthHeader} accessibilityRole="header">
                <Text variant="title" style={{ flex: 1 }}>
                  {month.label}
                </Text>
                <Text variant="caption">
                  {month.workouts.length} workout{month.workouts.length === 1 ? '' : 's'} ·{' '}
                  {formatCompact(toDisplayWeight(month.volume, unit))} {unit}
                </Text>
              </View>
              {month.workouts.map((w) => (
                <WorkoutCard key={w.id} workout={w} unit={unit} />
              ))}
            </FadeIn>
          ))}
        </>
      )}
    </>
  );
}

const monthKeyNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function Tile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={styles.tile}>
      <CountUp value={value} style={[styles.tileValue, accent && { color: colors.volt }]} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  active: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.volt,
    backgroundColor: colors.surface,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.volt },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.md,
    gap: 2,
  },
  tileValue: { color: colors.chalk, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  monthHeader: { flexDirection: 'row', alignItems: 'baseline', marginTop: space.sm },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
});
