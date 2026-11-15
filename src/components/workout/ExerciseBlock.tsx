import Ionicons from '@expo/vector-icons/Ionicons';
import { eq } from 'drizzle-orm';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { formatRest } from '@/components/rest/RestPicker';
import { Button, Card, Stepper, Text } from '@/components/ui';
import { db } from '@/db/client';
import { sets as setsTable, type Exercise, type WorkoutSet } from '@/db/schema';
import { startingWeight } from '@/features/profile/startingWeight';
import { useProfile } from '@/stores/useProfile';
import { parseNumberInput, prefillSet } from '@/features/logging/prefill';
import { compareSets, previousSetAt, type Change } from '@/features/logging/previous';
import { FIX_INFO, setScore, workingSets, type LoadType } from '@/features/progression';
import { useExerciseProgress } from '@/hooks/useExerciseProgress';
import { useRest, useRestResolver } from '@/hooks/useRest';
import { afterSupersetSet } from '@/features/superset/superset';
import { formatNumber, formatSeconds, formatSet, formatTarget, formatWeight } from '@/lib/format';
import { progressionStepDisplay, progressionStepKg, type WeightUnit } from '@/lib/units';
import { useActiveWorkout } from '@/stores/useActiveWorkout';
import { fromDisplayWeight, toDisplayWeight, useSettings } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

interface ExerciseBlockProps {
  workoutId: number;
  exercise: Exercise;
  /** This exercise's sets in the current workout, in order. */
  sets: WorkoutSet[];
  nextOrder: number;
  /** Target sets from the routine, if this workout was started from one. */
  plannedSets?: number;
  /** Set when this exercise is half of a superset. */
  superset?: {
    letter: string;
    position: 1 | 2;
    partner: Exercise;
    partnerSets: WorkoutSet[];
    partnerTarget: number;
  };
}

/** A set in table form, unit left to the column header: "77.5 × 8", "BW × 10", "+10 × 6", "45 s". */
function shortSet(set: { weight: number; reps: number }, type: LoadType, unit: WeightUnit) {
  if (type === 'timed') return formatSeconds(set.reps);
  const w = formatNumber(toDisplayWeight(set.weight, unit), 1);
  if (type === 'bodyweight') return set.weight > 0 ? `+${w} × ${set.reps}` : `BW × ${set.reps}`;
  return `${w} × ${set.reps}`;
}

/**
 * Logging card, kept to what matters mid-set: what to lift, what you did last time, and the log button.
 * Coaching notes, form demo, muscles and rest settings live on the exercise's info page (tap the name).
 */
export function ExerciseBlock({ workoutId, exercise, sets, nextOrder, plannedSets, superset }: ExerciseBlockProps) {
  const unit = useSettings((s) => s.unit);
  const rest = useRest(exercise);
  const restSeconds = rest?.seconds ?? 120;
  const restFor = useRestResolver();
  const startRest = useActiveWorkout((s) => s.startRest);
  const clearRest = useActiveWorkout((s) => s.clearRest);
  const goNext = useActiveWorkout((s) => s.goNext);
  const setGoNext = useActiveWorkout((s) => s.setGoNext);
  const isGo = goNext === exercise.id;
  const celebrate = useActiveWorkout((s) => s.celebrate);
  const { sessions, trend, suggestion, ctx, plan } = useExerciseProgress(exercise.id, { excludeWorkoutId: workoutId });
  const type = ctx.type;
  const timed = type === 'timed';

  const lastLogged = sets.at(-1);
  const lastSession = sessions.at(-1);
  const lastSessionTop = useMemo(() => {
    const working = workingSets(sessions.at(-1)?.sets ?? []);
    if (working.length === 0) return null;
    // Heaviest set, or the longest hold for timed lifts.
    return working.reduce((best, s) => ((timed ? s.reps > best.reps : s.weight > best.weight) ? s : best));
  }, [sessions, timed]);

  // First time on this exercise: estimate a starting weight from the user's profile.
  const profile = useProfile((s) => s.profile);
  const starterWeight = profile
    ? startingWeight({
        exerciseName: exercise.name,
        bodyweightKg: profile.weightKg,
        level: profile.level,
        sex: profile.sex,
        increment: progressionStepKg(exercise.weightIncrement, unit),
      })
    : null;
  // Holds start at the short end of their range; rep exercises at the top (a light first session).
  // Custom bodyweight and timed exercises have no table entry, but "just your bodyweight" is a safe start.
  const starterLoad = starterWeight ?? (type === 'weighted' ? null : 0);
  const starter =
    starterLoad === null
      ? null
      : {
          weight: starterLoad,
          reps: timed ? exercise.repRangeMin : exercise.repRangeMax,
        };

  const prefill = prefillSet({
    lastLogged: lastLogged ? { weight: lastLogged.weight, reps: lastLogged.reps } : undefined,
    suggestion,
    lastSessionTopSet: lastSessionTop,
    starter,
  });

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [warmup, setWarmup] = useState(false);
  const [touched, setTouched] = useState(false);
  const workingDone = sets.filter((s) => !s.isWarmup).length;
  const targetSets = plannedSets ?? suggestion?.sets ?? 3;

  // Fill the inputs from history/suggestion until the user edits them.
  useEffect(() => {
    if (touched) return;
    setWeight(prefill.weight === null ? '' : formatNumber(toDisplayWeight(prefill.weight, unit), 1));
    // Nothing to go on (a new custom weighted exercise): suggest the top of its rep range, weight left blank.
    setReps(String(prefill.reps ?? (timed ? exercise.repRangeMin : exercise.repRangeMax)));
  }, [prefill.weight, prefill.reps, unit, touched, timed, exercise.repRangeMin, exercise.repRangeMax]);

  const logSet = async () => {
    // Timed holds have no weight input: the "reps" field is the hold in seconds.
    const w = timed ? 0 : parseNumberInput(weight);
    const r = parseNumberInput(reps);
    if (w === null || r === null || r < 1 || !Number.isInteger(r)) {
      Alert.alert(
        'Check your set',
        timed
          ? 'Enter how many seconds you held, as a whole number.'
          : type === 'bodyweight'
            ? 'Enter any added weight (0 for just bodyweight) and a whole number of reps.'
            : 'Enter a weight and a whole number of reps.',
      );
      return;
    }
    const weightKg = fromDisplayWeight(w, unit);
    const bestSoFar = Math.max(trend.allTimeBestE1rm, ...workingSets(sets).map((s) => setScore(s, ctx)));
    const e1rm = setScore({ weight: weightKg, reps: r }, ctx);
    // Only celebrate against real history, and only when this set beats everything so far.
    const isNewPr = !warmup && trend.allTimeBestE1rm > 0 && e1rm > bestSoFar;

    await db.insert(setsTable).values({
      workoutId,
      exerciseId: exercise.id,
      order: nextOrder,
      weight: weightKg,
      reps: r,
      isWarmup: warmup,
    });
    if (isNewPr) {
      celebrate({
        title: exercise.name,
        detail: timed
          ? `${formatSeconds(r)} hold · previous best ${formatSeconds(bestSoFar)}`
          : `${formatSet({ weight: weightKg, reps: r }, type, unit)} · est. 1RM ${formatWeight(e1rm, unit)}`,
      });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setTouched(false);
    setWarmup(false);
    if (superset) {
      const next = afterSupersetSet({
        warmup,
        mySeconds: restSeconds,
        partnerSeconds: restFor(superset.partner),
        myWorking: workingSets(sets).length + (warmup ? 0 : 1),
        partnerWorking: workingSets(superset.partnerSets).length,
        partnerTarget: superset.partnerTarget,
      });
      if (next.action === 'switch') {
        // No rest mid-superset: straight to the partner.
        clearRest();
        setGoNext(superset.partner.id);
        return;
      }
      setGoNext(null);
      startRest(next.seconds);
      return;
    }
    if (isGo) setGoNext(null);
    startRest(warmup ? Math.min(60, restSeconds) : restSeconds);
  };

  const deleteSet = (set: WorkoutSet) =>
    Alert.alert('Delete set?', formatSet(set, type, unit), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => db.delete(setsTable).where(eq(setsTable.id, set.id)),
      },
    ]);

  const openInfo = () =>
    router.push({
      pathname: '/workout/exercise-info',
      params: {
        workoutId: String(workoutId),
        exerciseId: String(exercise.id),
        sets: String(targetSets),
        ...(superset ? { partnerId: String(superset.partner.id) } : {}),
      },
    });

  // Table rows: warm-ups first, then one row per working set (planned or logged, whichever is more).
  const warmups = sets.filter((s) => s.isWarmup);
  const working = sets.filter((s) => !s.isWarmup);
  const rowCount = Math.max(targetSets, working.length);
  const allDone = working.length >= targetSets;
  let runningBest = trend.allTimeBestE1rm;
  const prFlags = working.map((s) => {
    const score = setScore(s, ctx);
    const isPr = trend.allTimeBestE1rm > 0 && score > runningBest;
    if (score > runningBest) runningBest = score;
    return isPr;
  });

  const target = suggestion
    ? formatTarget({ ...suggestion, sets: targetSets }, type, unit)
    : starter
      ? `Start ${timed ? formatSeconds(starter.reps) : formatSet(starter, type, unit)}`
      : null;
  const columnUnit = type === 'weighted' ? ` (${unit})` : '';

  return (
    <Card style={[styles.card, isGo && styles.cardGo]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens form guide, coaching notes and rest settings"
        onPress={openInfo}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
      >
        {superset && (
          <View style={[styles.ssBadge, isGo && { backgroundColor: colors.volt }]}>
            <Text variant="caption" style={[styles.ssBadgeText, isGo && { color: colors.voltInk }]}>
              {superset.letter}
              {superset.position}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
              {exercise.name}
            </Text>
            {plan ? (
              <View style={[styles.chip, { borderColor: colors.volt }]}>
                <Text style={[styles.chipText, { color: colors.volt }]}>
                  FIX: {FIX_INFO[plan.fix].short.toUpperCase()}
                </Text>
              </View>
            ) : trend.status === 'stalling' || trend.status === 'regressing' ? (
              <View style={[styles.chip, { borderColor: colors.warning }]}>
                <Text style={[styles.chipText, { color: colors.warning }]}>STUCK</Text>
              </View>
            ) : trend.slowing ? (
              <View style={[styles.chip, { borderColor: colors.warning }]}>
                <Text style={[styles.chipText, { color: colors.warning }]}>MAKE IT COUNT</Text>
              </View>
            ) : null}
          </View>
          <Text variant="caption" numberOfLines={1}>
            {isGo ? (
              <Text variant="caption" style={{ color: colors.volt, fontWeight: '700' }}>
                Go now · no rest
              </Text>
            ) : (
              <>
                {target ? (
                  <Text variant="caption" style={{ color: colors.volt, fontWeight: '700' }}>
                    {target}
                  </Text>
                ) : (
                  'First time · pick a weight you can lift with good form'
                )}
                {` · rest ${formatRest(restSeconds)}`}
              </>
            )}
          </Text>
        </View>
        <Ionicons name="information-circle-outline" size={24} color={colors.muted} />
      </Pressable>

      <View style={styles.table}>
        <View style={styles.tr}>
          <Text variant="caption" style={[styles.th, styles.colSet]}>
            SET
          </Text>
          <Text variant="caption" style={[styles.th, styles.colPrev]}>
            LAST TIME
          </Text>
          <Text variant="caption" style={[styles.th, styles.colNow]}>
            TODAY{columnUnit.toUpperCase()}
          </Text>
        </View>

        {warmups.map((s) => (
          <Pressable
            key={s.id}
            onLongPress={() => deleteSet(s)}
            accessibilityHint="Long press to delete"
            style={styles.tr}
          >
            <Text variant="caption" style={[styles.colSet, styles.warmLabel]}>
              W
            </Text>
            <Text variant="caption" style={[styles.colPrev, styles.muted]}>
              warm-up
            </Text>
            <Text style={[styles.colNow, styles.done, styles.muted]}>{shortSet(s, type, unit)}</Text>
          </Pressable>
        ))}

        {Array.from({ length: rowCount }, (_, i) => {
          const done = working[i];
          const prev = previousSetAt(lastSession, i);
          const current = !done && i === working.length;
          const change: Change | null = done && prev ? compareSets(done, prev, ctx) : null;
          return (
            <Pressable
              key={done?.id ?? `p${i}`}
              disabled={!done}
              onLongPress={done ? () => deleteSet(done) : undefined}
              accessibilityHint={done ? 'Long press to delete' : undefined}
              style={[styles.tr, current && styles.trCurrent]}
            >
              <View style={styles.colSet}>
                <View style={[styles.setNum, done && styles.setNumDone, current && styles.setNumCurrent]}>
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={colors.voltInk} />
                  ) : (
                    <Text variant="caption" style={{ fontWeight: '700', color: current ? colors.chalk : colors.muted }}>
                      {i + 1}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[styles.colPrev, styles.prev, current && { color: colors.chalk }]}>
                {prev ? shortSet(prev, type, unit) : '—'}
              </Text>
              <View style={[styles.colNow, styles.nowCell]}>
                {done ? (
                  <>
                    <Text style={styles.done}>{shortSet(done, type, unit)}</Text>
                    {change && <ChangeMark change={change} />}
                    {prFlags[i] && (
                      <View style={styles.pr}>
                        <Text variant="caption" style={styles.prText}>
                          PR
                        </Text>
                      </View>
                    )}
                  </>
                ) : current ? (
                  <Text variant="caption" style={{ color: colors.volt, fontWeight: '700' }}>
                    UP NEXT
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.inputs}>
        {!timed && (
          <Stepper
            label={type === 'bodyweight' ? `Added (${unit})` : `Weight (${unit})`}
            value={weight}
            onChange={(v) => {
              setTouched(true);
              setWeight(v);
            }}
            step={progressionStepDisplay(exercise.weightIncrement, unit)}
            decimal
          />
        )}
        <Stepper
          label={timed ? 'Seconds' : 'Reps'}
          value={reps}
          onChange={(v) => {
            setTouched(true);
            setReps(v);
          }}
          step={timed ? 5 : 1}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: warmup }}
          onPress={() => setWarmup((w) => !w)}
          style={[styles.warmup, warmup && styles.warmupOn]}
        >
          <Text variant="label" style={{ color: warmup ? colors.chalk : colors.muted, fontWeight: '700' }}>
            Warm-up
          </Text>
        </Pressable>
        <Button
          title={warmup ? 'Log warm-up' : allDone ? 'Log extra set' : `Log set ${working.length + 1}`}
          onPress={logSet}
          variant={allDone && !warmup ? 'secondary' : undefined}
          style={styles.logBtn}
        />
      </View>
    </Card>
  );
}

/** ↑ / = / ↓ against the same set last session. */
function ChangeMark({ change }: { change: Change }) {
  const icon = change === 'up' ? 'arrow-up' : change === 'down' ? 'arrow-down' : 'remove';
  const color = change === 'up' ? colors.volt : change === 'down' ? colors.danger : colors.muted;
  const word = change === 'up' ? 'Beat last time' : change === 'down' ? 'Below last time' : 'Matched last time';
  return (
    <View accessible accessibilityLabel={word}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1 },
  chipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  card: { gap: space.md },
  cardGo: { borderWidth: 1.5, borderColor: colors.volt },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ssBadge: {
    minWidth: 30,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.voltSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ssBadgeText: { color: colors.volt, fontWeight: '800', letterSpacing: 0.5 },
  table: { gap: 2 },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 40, borderRadius: radius.sm, paddingHorizontal: 6 },
  trCurrent: { backgroundColor: colors.voltSoft },
  th: { fontWeight: '700', letterSpacing: 0.8, minHeight: 20 },
  colSet: { width: 40 },
  colPrev: { flex: 1 },
  colNow: { flex: 1.2 },
  setNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumDone: { backgroundColor: colors.volt },
  setNumCurrent: { borderWidth: 1.5, borderColor: colors.volt, backgroundColor: 'transparent' },
  warmLabel: { fontWeight: '700', paddingLeft: 8 },
  prev: { fontSize: 15, color: colors.muted, fontVariant: ['tabular-nums'] },
  nowCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  done: { fontSize: 16, fontWeight: '700', color: colors.chalk, fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontWeight: '400' },
  pr: { backgroundColor: colors.volt, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  prText: { color: colors.voltInk, fontWeight: '800', fontSize: 10 },
  inputs: { flexDirection: 'row', gap: space.md },
  actions: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  warmup: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  warmupOn: { borderColor: colors.steel, backgroundColor: colors.surfaceRaised },
  logBtn: { flex: 1 },
});
