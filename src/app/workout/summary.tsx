import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedLiftmarkMark } from '@/components/brand/AnimatedLiftmarkMark';
import { Button, Card, Screen, Text } from '@/components/ui';
import { getWorkoutSummary, type WorkoutSummary } from '@/db/queries';
import type { PrKind } from '@/features/progression';
import { formatCompact, formatDuration, formatScore, formatSet, plural } from '@/lib/format';
import { useProfile } from '@/stores/useProfile';
import { toDisplayWeight, useSettings } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

const prLabel: Record<PrKind, string> = { e1rm: 'Est. 1RM', weight: 'Heaviest', volume: 'Volume' };

export default function WorkoutSummaryScreen() {
  const workoutId = Number(useLocalSearchParams<{ id: string }>().id);
  const unit = useSettings((s) => s.unit);
  const bodyweightKg = useProfile((s) => s.profile?.weightKg);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);

  useEffect(() => {
    getWorkoutSummary(workoutId, bodyweightKg).then(setSummary).catch(console.error);
  }, [workoutId, bodyweightKg]);

  if (!summary) return null;

  const prs = summary.exercises.filter((e) => e.prs.length > 0);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <AnimatedLiftmarkMark size={88} progress={1} staggerOnMount celebrateOnMount />
        <Text variant="label" accent style={styles.kicker}>
          {summary.name ? `${summary.name.toUpperCase()} COMPLETE` : 'WORKOUT COMPLETE'}
        </Text>
        <Text variant="display">
          {prs.length > 0 ? `${prs.length} new PR${prs.length > 1 ? 's' : ''}` : 'Nice work.'}
        </Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Duration" value={formatDuration(summary.durationMs)} />
        <Stat label="Sets" value={String(summary.setCount)} />
        <Stat label={`Volume (${unit})`} value={formatCompact(toDisplayWeight(summary.volume, unit))} />
      </View>

      {summary.exercises.map((e) => (
        <Card key={e.exerciseId}>
          <View style={styles.exerciseHeader}>
            <Text variant="title" style={{ flex: 1 }}>
              {e.name}
            </Text>
            <Text variant="label">{plural(e.workingSets, 'set')}</Text>
          </View>
          <Text variant="label">
            {e.type === 'timed'
              ? `Longest hold ${formatScore(e.bestE1rm, e.type, unit)}`
              : `Top set ${formatSet({ weight: e.topWeight, reps: e.topReps }, e.type, unit)} · est. 1RM ${formatScore(e.bestE1rm, e.type, unit)}`}
          </Text>
          {e.prs.length > 0 && (
            <View style={styles.prRow}>
              {e.prs.map((kind) => (
                <View key={kind} style={styles.pr}>
                  <Text variant="caption" style={styles.prText}>
                    PR · {e.type === 'timed' ? 'Longest hold' : prLabel[kind]}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      ))}

      <Button title="Done" onPress={() => router.back()} />
      <Button
        title="View details"
        variant="secondary"
        onPress={() => router.replace({ pathname: '/history/[id]', params: { id: String(workoutId) } })}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.sm, paddingTop: space.xl },
  kicker: { letterSpacing: 1.4, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: space.md },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.md,
    gap: 2,
  },
  statValue: { color: colors.chalk, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  exerciseHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  prRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pr: { backgroundColor: colors.volt, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  prText: { color: colors.voltInk, fontWeight: '700' },
});
