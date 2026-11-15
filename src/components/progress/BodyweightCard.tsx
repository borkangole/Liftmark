import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BodyweightChart } from '@/components/charts/BodyweightChart';
import { Button, Card, Text } from '@/components/ui';
import { BODY_GOAL_SHORT, type BodyAnalysis, type BodyStatus, type LiftSignal } from '@/features/bodyweight/trend';
import { useBodyweight } from '@/hooks/useBodyweight';
import { CalorieSummary } from './CalorieTarget';
import { formatNumber, formatWeight } from '@/lib/format';
import { toDisplayWeight, type WeightUnit } from '@/lib/units';
import { colors, radius, space } from '@/theme/tokens';

export const STATUS_STYLE: Record<BodyStatus, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> =
  {
    start: { color: colors.muted, icon: 'time-outline', label: 'Getting started' },
    on_track: { color: colors.volt, icon: 'checkmark-circle', label: 'On track' },
    too_fast: { color: colors.warning, icon: 'speedometer-outline', label: 'Too fast' },
    too_slow: { color: colors.warning, icon: 'hourglass-outline', label: 'Too slow' },
    wrong_way: { color: colors.danger, icon: 'swap-vertical', label: 'Off course' },
  };

/** "+0.15 kg/wk" in the user's unit. */
export function weeklyLabel(kg: number, unit: WeightUnit) {
  const v = toDisplayWeight(kg, unit);
  const sign = v > 0.005 ? '+' : v < -0.005 ? '−' : '±';
  return `${sign}${formatNumber(Math.abs(v), 2)} ${unit}/wk`;
}

/** What's happening and what to do: the heart of the tracker. */
export function Verdict({
  analysis,
  unit,
  targetKg,
}: {
  analysis: BodyAnalysis;
  unit: WeightUnit;
  targetKg: number | null;
}) {
  const s = STATUS_STYLE[analysis.status];
  return (
    <View style={[styles.verdict, { borderLeftColor: s.color }]} accessibilityLiveRegion="polite">
      <View style={styles.verdictHead}>
        <Ionicons name={s.icon} size={18} color={s.color} />
        <Text style={styles.verdictTitle}>{analysis.headline}</Text>
      </View>
      <Text variant="label">{analysis.tip}</Text>
      {targetKg !== null && analysis.weeksToTarget !== null && (
        <Text variant="caption" style={{ color: colors.chalk }}>
          {analysis.weeksToTarget === 0
            ? `You're at your goal of ${formatWeight(targetKg, unit)}.`
            : `About ${analysis.weeksToTarget} week${analysis.weeksToTarget === 1 ? '' : 's'} to ${formatWeight(targetKg, unit)} at this pace.`}
        </Text>
      )}
    </View>
  );
}

const shortDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** This week's weigh-in: a clear call to action when it's due, a quiet "done" when it isn't. */
export function WeighInRow({
  schedule,
}: {
  schedule: { due: boolean; next: Date; loggedThisWeek: { date: Date } | null };
}) {
  if (schedule.due) {
    return <Button title="Log this week's weigh-in" onPress={() => router.push('/bodyweight/log')} />;
  }
  return (
    <View style={styles.doneRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.volt} />
      <View style={{ flex: 1 }}>
        <Text variant="label" style={{ color: colors.chalk, fontWeight: '700' }}>
          This week's weigh-in is done
        </Text>
        <Text variant="caption">Next: {shortDay(schedule.next)}, morning</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/bodyweight/log')} hitSlop={8}>
        <Text variant="label" accent style={{ fontWeight: '700' }}>
          Update
        </Text>
      </Pressable>
    </View>
  );
}

/** Bodyweight on the Progress tab: asks for a goal first, then shows the trend and what to do. */
export function BodyweightCard({ lifts }: { lifts?: LiftSignal }) {
  const { entries, goal, targetKg, analysis, unit, schedule, calories } = useBodyweight(lifts);

  if (!goal || !analysis) {
    return (
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="scale-outline" size={18} color={colors.chalk} />
          <Text variant="title" style={{ flex: 1 }}>
            Bodyweight
          </Text>
        </View>
        <Text variant="label">
          Track your weight against your goal. Liftmark reads the trend, not the daily ups and downs, and tells you when
          to adjust.
        </Text>
        <Button title="Set your goal" onPress={() => router.push('/bodyweight/goal')} />
      </Card>
    );
  }

  const s = STATUS_STYLE[analysis.status];
  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Bodyweight details"
        onPress={() => router.push('/bodyweight')}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
        hitSlop={6}
      >
        <Ionicons name="scale-outline" size={18} color={colors.chalk} />
        <Text variant="title" style={{ flex: 1 }}>
          Bodyweight
        </Text>
        <View style={styles.goalPill}>
          <Text variant="caption" style={styles.goalText}>
            {BODY_GOAL_SHORT[goal]}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      {analysis.trendKg !== null && (
        <View style={styles.numbers}>
          <View>
            <Text variant="caption">TREND</Text>
            <Text style={styles.big}>{formatWeight(analysis.trendKg, unit)}</Text>
          </View>
          {analysis.weeklyKg !== null && (
            <View style={[styles.rate, { borderColor: s.color }]}>
              <Text variant="caption" style={{ color: s.color, fontWeight: '700' }}>
                {weeklyLabel(analysis.weeklyKg, unit)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Text variant="caption">
            {entries.length} week{entries.length === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      {entries.length > 1 && <BodyweightChart entries={entries} unit={unit} height={84} targetKg={targetKg} />}

      <Verdict analysis={analysis} unit={unit} targetKg={targetKg} />

      {calories && <CalorieSummary advice={calories} />}

      <WeighInRow schedule={schedule} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  goalPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.voltSoft },
  goalText: { color: colors.volt, fontWeight: '700' },
  numbers: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  big: { color: colors.chalk, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rate: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6 },
  verdict: {
    gap: 4,
    paddingLeft: space.md,
    paddingVertical: 2,
    borderLeftWidth: 3,
  },
  verdictHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verdictTitle: { flex: 1, color: colors.chalk, fontWeight: '700', fontSize: 15 },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.voltSoft,
  },
});
