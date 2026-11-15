import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ExerciseDemo } from '@/components/demo/ExerciseDemo';
import { EmptyState } from '@/components/EmptyState';
import { MuscleMap } from '@/components/muscles/MuscleMap';
import { ActiveFixCard, FixPicker } from '@/components/progress/PlateauFix';
import { recommendRest } from '@/features/rest/rest';
import { useProfile } from '@/stores/useProfile';
import { StallDiagnosis } from '@/components/progress/StallDiagnosis';
import { RestCard } from '@/components/rest/RestCard';
import { useLiftDiagnosis } from '@/hooks/useLiftDiagnosis';
import { TrendBadge } from '@/components/TrendBadge';
import { Card, Screen, Text } from '@/components/ui';
import { getDemo } from '@/features/demos/library';
import { getTargets } from '@/features/muscles/targets';
import { deleteCustomExercise, loggedSetCount } from '@/db/exercises';
import { useExerciseProgress } from '@/hooks/useExerciseProgress';
import { recapSessions, relativeDay, type SessionRecap } from '@/features/logging/previous';
import type { LoadType } from '@/features/progression';
import { formatNumber, formatScore, formatSet, formatTarget, plural, scoreLabel } from '@/lib/format';
import type { WeightUnit } from '@/stores/useSettings';
import { toDisplayWeight, useSettings } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercise, sessions, summaries, trend, suggestion, ctx, plan } = useExerciseProgress(Number(id));
  const { diagnosis } = useLiftDiagnosis(Number(id));
  const profile = useProfile((s) => s.profile);
  const unit = useSettings((s) => s.unit);
  const recaps = useMemo(() => recapSessions(sessions, ctx), [sessions, ctx]);

  if (!exercise) return null;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: exercise.name }} />

      {getDemo(exercise.name) && (
        <Card>
          <ExerciseDemo spec={getDemo(exercise.name)!} size={260} />
        </Card>
      )}

      <Card style={{ gap: space.md }}>
        <Text variant="title">Muscles worked</Text>
        <MuscleMap
          targets={getTargets(exercise.name, exercise.muscleGroup, exercise.primaryMuscle, exercise.targetMuscles)}
          height={220}
          showDetails
        />
      </Card>

      <Card>
        <TrendBadge status={trend.status} slowing={trend.slowing} />
        <Text variant="body">{trend.reason}</Text>
      </Card>

      {plan && exercise && (
        <ActiveFixCard
          plan={plan}
          name={exercise.name}
          sessionsSince={sessions.filter((s) => s.date.getTime() > Date.parse(plan.startedAt)).length}
        />
      )}
      <StallDiagnosis diagnosis={diagnosis}>
        {!plan && exercise && diagnosis.causes.length > 0 && (
          <FixPicker
            exerciseId={exercise.id}
            cause={diagnosis.causes.find((c) => c.id !== 'no_food_log')?.id ?? null}
            bestE1rm={trend.allTimeBestE1rm}
            sessionCount={summaries.filter((x) => x.bestE1rm > 0).length}
            repRange={{ min: exercise.repRangeMin, max: exercise.repRangeMax }}
            lastSession={sessions.at(-1)}
            restSeconds={recommendRest(exercise, profile ? { goal: profile.goal, level: profile.level } : null).seconds}
          />
        )}
      </StallDiagnosis>

      {suggestion && (
        <Card>
          <Text variant="label">Next session</Text>
          <Text variant="title" accent>
            {formatTarget(suggestion, ctx.type, unit)}
          </Text>
          <Text variant="label">{suggestion.reason}</Text>
        </Card>
      )}

      <RestCard exercise={exercise} />

      <Card>
        <Text variant="label">
          {ctx.type === 'timed'
            ? 'Best hold (seconds)'
            : ctx.type === 'bodyweight'
              ? `Estimated 1RM, incl. bodyweight (${unit})`
              : `Estimated 1RM (${unit})`}
        </Text>
        {summaries.length < 2 ? (
          <EmptyState title="Not enough data" message="Your chart appears after two sessions." />
        ) : (
          <E1rmChart
            values={summaries.map((s) =>
              Math.round(ctx.type === 'timed' ? s.bestE1rm : toDisplayWeight(s.bestE1rm, unit)),
            )}
          />
        )}
      </Card>
      <RecentSessions recaps={recaps} type={ctx.type} unit={unit} />

      {exercise.isCustom && (
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            const n = await loggedSetCount(exercise.id);
            Alert.alert(
              `Delete ${exercise.name}?`,
              n > 0
                ? `This also deletes ${n} logged set${n === 1 ? '' : 's'} and removes it from your routines. This can't be undone.`
                : "It will be removed from your routines. This can't be undone.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteCustomExercise(exercise.id);
                    router.back();
                  },
                },
              ],
            );
          }}
          style={({ pressed }) => [
            { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text variant="label" style={{ color: colors.danger, fontWeight: '700' }}>
            Delete exercise
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}

/**
 * Zoomed to the lift's own range (not 0–max) so real progress is visible, and sized to the card so the
 * line never runs off the edge.
 */
function E1rmChart({ values }: { values: number[] }) {
  const [width, setWidth] = useState(0);
  const lo = Math.max(0, Math.floor((Math.min(...values) * 0.95) / 5) * 5);
  const hi = Math.max(lo + 10, Math.ceil((Math.max(...values) * 1.03) / 5) * 5);
  const span = hi - lo;
  const Y_LABEL = 36;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ marginTop: space.sm }}>
      {width > 0 && (
        <LineChart
          data={values.map((value) => ({ value }))}
          width={width - Y_LABEL - 8}
          adjustToWidth
          initialSpacing={6}
          endSpacing={6}
          yAxisOffset={lo}
          maxValue={span}
          noOfSections={4}
          stepValue={span / 4}
          yAxisLabelWidth={Y_LABEL}
          color={colors.volt}
          dataPointsColor={colors.volt}
          dataPointsRadius={3}
          thickness={3}
          curved
          areaChart
          startFillColor={colors.volt}
          endFillColor={colors.volt}
          startOpacity={0.22}
          endOpacity={0}
          rulesColor={colors.border}
          rulesType="solid"
          yAxisTextStyle={{ color: colors.muted, fontSize: 11 }}
          xAxisColor={colors.border}
          yAxisColor="transparent"
          height={160}
        />
      )}
    </View>
  );
}

const PREVIEW = 4;

/** Every past session of this lift, newest first, set by set. Tap one to open the full workout. */
function RecentSessions({ recaps, type, unit }: { recaps: SessionRecap[]; type: LoadType; unit: WeightUnit }) {
  const [showAll, setShowAll] = useState(false);
  if (recaps.length === 0) {
    return (
      <Card style={{ gap: space.sm }}>
        <Text variant="title">Recent sessions</Text>
        <Text variant="caption">Log this exercise once and every set shows up here.</Text>
      </Card>
    );
  }
  const shown = showAll ? recaps : recaps.slice(0, PREVIEW);
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="title">Recent sessions</Text>
        <Text variant="caption">{plural(recaps.length, 'session')}</Text>
      </View>
      {shown.map((r, i) => (
        <SessionRow key={r.workoutId ?? r.date.getTime()} recap={r} type={type} unit={unit} first={i === 0} />
      ))}
      {recaps.length > PREVIEW && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll((v) => !v)}
          style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}
        >
          <Text variant="label" style={{ fontWeight: '700', color: colors.chalk }}>
            {showAll ? 'Show less' : `Show all ${recaps.length}`}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

function SessionRow({
  recap,
  type,
  unit,
  first,
}: {
  recap: SessionRecap;
  type: LoadType;
  unit: WeightUnit;
  first: boolean;
}) {
  const { date, delta } = recap;
  const deltaText =
    delta === null || Math.abs(delta) < 0.05
      ? delta === null
        ? 'First session'
        : 'No change'
      : `${delta > 0 ? '+' : '−'}${formatScore(Math.abs(delta), type, unit)}`;
  const deltaColor = delta === null || Math.abs(delta) < 0.05 ? colors.muted : delta > 0 ? colors.volt : colors.danger;
  const open = recap.workoutId === undefined ? undefined : () => router.push(`/history/${recap.workoutId}`);
  return (
    <Pressable
      accessibilityRole={open ? 'button' : undefined}
      accessibilityHint={open ? 'Opens the full workout' : undefined}
      onPress={open}
      style={({ pressed }) => [styles.session, !first && styles.sessionDivider, pressed && open && { opacity: 0.7 }]}
    >
      <View style={styles.sessionHead}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700' }}>
            {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
          <Text variant="caption">{relativeDay(date)}</Text>
        </View>
        {recap.isPr && (
          <View style={styles.pr}>
            <Text variant="caption" style={styles.prText}>
              PR
            </Text>
          </View>
        )}
        {open && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
      </View>

      <View style={{ gap: 2 }}>
        {recap.sets.map(({ set, label, isTop }, j) => (
          <View key={j} style={styles.setLine}>
            <Text variant="caption" style={[styles.setLabel, label === 'W' && { opacity: 0.7 }]}>
              {label}
            </Text>
            <Text
              style={[
                styles.setValue,
                label === 'W' && { color: colors.muted, fontWeight: '400' },
                isTop && { color: colors.chalk },
              ]}
            >
              {formatSet(set, type, unit)}
            </Text>
            {isTop && (
              <Text variant="caption" style={{ color: colors.volt, fontWeight: '700' }}>
                TOP
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.sessionStats}>
        <Stat label={scoreLabel(type)} value={formatScore(recap.best, type, unit)} />
        <Stat label="vs last" value={deltaText} color={deltaColor} />
        {type === 'weighted' ? (
          <Stat
            label="Volume"
            value={`${Math.round(toDisplayWeight(recap.volumeKg, unit)).toLocaleString()} ${unit}`}
          />
        ) : (
          <Stat
            label={type === 'timed' ? 'Total' : 'Reps'}
            value={type === 'timed' ? formatScore(recap.totalReps, type, unit) : formatNumber(recap.totalReps, 0)}
          />
        )}
      </View>
    </Pressable>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <Text variant="caption">{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontWeight: '700', fontSize: 15, color: color ?? colors.chalk, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  session: { gap: space.sm },
  sessionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.md },
  sessionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  setLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 22 },
  setLabel: { width: 18, textAlign: 'center', fontWeight: '700', color: colors.muted },
  setValue: { fontSize: 15, fontWeight: '600', color: colors.steel, fontVariant: ['tabular-nums'] },
  sessionStats: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: space.sm,
  },
  pr: { backgroundColor: colors.volt, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  prText: { color: colors.voltInk, fontWeight: '700' },
  more: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
