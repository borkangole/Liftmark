import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { BodyweightChart } from '@/components/charts/BodyweightChart';
import { STATUS_STYLE, Verdict, WeighInRow, weeklyLabel } from '@/components/progress/BodyweightCard';
import { CalorieBreakdown } from '@/components/progress/CalorieTarget';
import { RangeTabs, type RangeWeeks } from '@/components/progress/RangeTabs';
import { Card, Screen, Text } from '@/components/ui';
import { deleteBodyweight } from '@/db/bodyweight';
import { BODY_GOAL_LABEL, smoothTrend, WEEKDAYS } from '@/features/bodyweight/trend';
import { useBodyweight } from '@/hooks/useBodyweight';
import { useProgressOverview } from '@/hooks/useProgressOverview';
import { formatWeight } from '@/lib/format';
import { toDisplayWeight } from '@/lib/units';
import { colors, radius, space } from '@/theme/tokens';

/** Everything about bodyweight: the trend, what it means for your goal, and every weigh-in. */
export default function BodyweightScreen() {
  const { statusCounts } = useProgressOverview(12);
  const { entries, goal, targetKg, analysis, unit, schedule, weighInDay, calories } = useBodyweight(statusCounts);
  const [range, setRange] = useState<RangeWeeks>(12);
  const trend = useMemo(() => smoothTrend(entries), [entries]);

  if (!goal || !analysis) {
    return (
      <Screen edges={[]}>
        <Text variant="label">Set a goal on the Progress tab to start tracking.</Text>
      </Screen>
    );
  }

  const first = trend[0];
  const last = trend.at(-1);
  // Needs two weigh-ins: with one, "since start" would always read +0.
  const total = trend.length > 1 && first && last ? last.trendKg - first.trendKg : null;
  const s = STATUS_STYLE[analysis.status];

  const remove = (id: number, label: string) =>
    Alert.alert('Delete weigh-in?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBodyweight(id) },
    ]);

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <WeighInRow schedule={schedule} />
        </View>
      }
    >
      <View style={styles.stats}>
        <Stat label="Trend" value={last ? formatWeight(last.trendKg, unit) : '–'} />
        <Stat
          label="Per week"
          value={analysis.weeklyKg === null ? '–' : weeklyLabel(analysis.weeklyKg, unit).replace(`/wk`, '')}
          color={analysis.weeklyKg === null ? undefined : s.color}
        />
        <Stat
          label="Since start"
          value={total === null ? '–' : `${total >= 0 ? '+' : '−'}${formatWeight(Math.abs(total), unit)}`}
        />
      </View>

      <Card style={{ gap: space.md }}>
        {entries.length > 1 && <RangeTabs value={range} onChange={setRange} />}
        <BodyweightChart
          entries={entries}
          unit={unit}
          height={200}
          days={range === null ? null : range * 7}
          targetKg={targetKg}
          showAxis
        />
        {entries.length > 1 && (
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: colors.muted, opacity: 0.6 }]} />
            <Text variant="caption">Weekly weigh-ins</Text>
            <View style={[styles.line, { backgroundColor: colors.volt }]} />
            <Text variant="caption">Trend</Text>
            {targetKg !== null && (
              <>
                <View style={[styles.line, styles.dashed]} />
                <Text variant="caption">Goal</Text>
              </>
            )}
          </View>
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={styles.row}>
          <Text variant="caption" style={[styles.status, { color: s.color, borderColor: s.color }]}>
            {s.label.toUpperCase()}
          </Text>
        </View>
        <Verdict analysis={analysis} unit={unit} targetKg={targetKg} />
      </Card>

      {calories && (
        <Card style={{ gap: space.md }}>
          <Text variant="title">Daily calories</Text>
          <CalorieBreakdown advice={calories} />
        </Card>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/bodyweight/goal')}
        style={({ pressed }) => [styles.goalRow, pressed && { opacity: 0.7 }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption">GOAL</Text>
          <Text style={{ fontWeight: '700', color: colors.chalk }}>
            {BODY_GOAL_LABEL[goal]}
            {targetKg !== null ? ` · ${formatWeight(targetKg, unit)}` : ''}
          </Text>
          <Text variant="caption">Weigh-in: {WEEKDAYS[weighInDay]} mornings</Text>
        </View>
        <Text variant="label" accent style={{ fontWeight: '700' }}>
          Change
        </Text>
      </Pressable>

      <Text variant="title" style={{ marginTop: space.sm }}>
        Weekly weigh-ins
      </Text>
      <Card style={{ paddingVertical: 0 }}>
        {[...trend].reverse().map((t, i, list) => {
          const entry = entries.find((e) => e.date.getTime() === t.date.getTime())!;
          const prev = list[i + 1];
          const diff = prev ? toDisplayWeight(t.weightKg - prev.weightKg, unit) : null;
          const label = `${t.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
          return (
            <View key={entry.id} style={[styles.entry, i > 0 && styles.entryDivider]}>
              <Text style={{ flex: 1, color: colors.chalk }}>{label}</Text>
              {diff !== null && Math.abs(diff) >= 0.05 && (
                <Text variant="caption" style={{ width: 56, textAlign: 'right' }}>
                  {diff > 0 ? '+' : '−'}
                  {Math.abs(diff).toFixed(1)}
                </Text>
              )}
              <Text style={styles.entryWeight}>
                {toDisplayWeight(t.weightKg, unit).toFixed(1)} {unit}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete weigh-in from ${label}`}
                onPress={() => remove(entry.id, `${label}: ${formatWeight(t.weightKg, unit)}`)}
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={17} color={colors.muted} />
              </Pressable>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  stat: {
    flex: 1,
    padding: space.md,
    gap: 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statValue: { color: colors.chalk, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  line: { width: 16, height: 3, borderRadius: 2, marginLeft: space.sm },
  dashed: { backgroundColor: 'transparent', borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.muted, height: 0 },
  row: { flexDirection: 'row' },
  status: { fontWeight: '800', letterSpacing: 1, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 50 },
  entryDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  entryWeight: { width: 76, textAlign: 'right', color: colors.chalk, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
