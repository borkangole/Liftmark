import Ionicons from '@expo/vector-icons/Ionicons';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Button, Screen, Text } from '@/components/ui';
import { ExerciseBlock } from '@/components/workout/ExerciseBlock';
import { PrToast } from '@/components/workout/PrToast';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { db } from '@/db/client';
import { exercises, workouts, type Exercise, type WorkoutSet } from '@/db/schema';
import { pairsFromPlan, supersetOf, togglePair, type Pair } from '@/features/superset/superset';
import { useNow } from '@/hooks/useNow';
import { useWorkoutPlan } from '@/hooks/useRoutines';
import { useWorkout } from '@/hooks/useWorkout';
import { formatDuration } from '@/lib/format';
import { useActiveWorkout } from '@/stores/useActiveWorkout';
import { colors, space } from '@/theme/tokens';

const NO_IDS: number[] = [];

type Block = { exercise: Exercise; sets: WorkoutSet[]; plannedSets?: number };

/** Header title that ticks every second without re-rendering the whole screen. */
function ElapsedTitle({ startedAt }: { startedAt: Date }) {
  const now = useNow(1000);
  return <Stack.Screen options={{ title: formatDuration(now - startedAt.getTime()) }} />;
}

export default function WorkoutScreen() {
  const workoutId = Number(useLocalSearchParams<{ id: string }>().id);
  const { workout, rows } = useWorkout(workoutId);
  const { data: allExercises } = useLiveQuery(db.select().from(exercises));
  const addedIds = useActiveWorkout((s) => s.exerciseIdsByWorkout[workoutId] ?? NO_IDS);
  const clearWorkout = useActiveWorkout((s) => s.clearWorkout);
  const plan = useWorkoutPlan(workoutId);
  const savedPairs = useActiveWorkout((s) => s.pairsByWorkout[workoutId]);
  const setPairs = useActiveWorkout((s) => s.setPairs);
  const planPairs = useMemo(() => pairsFromPlan(plan), [plan]);
  const pairs: Pair[] = savedPairs ?? planPairs;

  // Routine plan first (in routine order), then anything else logged, then added-but-empty exercises.
  const blocks = useMemo(() => {
    const byExercise = new Map<number, WorkoutSet[]>();
    for (const { set } of rows) {
      byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
    }
    const plannedSets = new Map(plan.map((p) => [p.exerciseId, p.targetSets]));
    const all = [...new Set([...plannedSets.keys(), ...byExercise.keys(), ...addedIds])];
    // Keep each superset together: the partner goes right after the first one.
    const ids: number[] = [];
    for (const id of all) {
      if (ids.includes(id)) continue;
      ids.push(id);
      const pair = pairs.find((p) => p.includes(id));
      const partner = pair && (pair[0] === id ? pair[1] : pair[0]);
      if (partner !== undefined && all.includes(partner) && !ids.includes(partner)) ids.push(partner);
    }
    const exerciseById = new Map(allExercises.map((e) => [e.id, e]));
    return ids.flatMap((id) => {
      const exercise = exerciseById.get(id);
      return exercise
        ? [
            {
              exercise,
              sets: byExercise.get(id) ?? [],
              plannedSets: plannedSets.get(id),
            },
          ]
        : [];
    });
  }, [rows, addedIds, allExercises, plan, pairs]);

  const order = blocks.map((b) => b.exercise.id);
  const toggle = (a: number, b: number) => setPairs(workoutId, togglePair(pairs, a, b));
  const ssProps = (b: Block) => {
    const ss = supersetOf(pairs, order, b.exercise.id);
    const partner = ss && blocks.find((x) => x.exercise.id === ss.partnerId);
    if (!ss || !partner) return undefined;
    return {
      letter: ss.letter,
      position: ss.position,
      partner: partner.exercise,
      partnerSets: partner.sets,
      partnerTarget: partner.plannedSets ?? 3,
    };
  };
  const renderBlock = (b: Block) => (
    <ExerciseBlock
      key={b.exercise.id}
      workoutId={workoutId}
      exercise={b.exercise}
      sets={b.sets}
      nextOrder={nextOrder}
      plannedSets={b.plannedSets}
      superset={ssProps(b)}
    />
  );

  const nextOrder = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.set.order)) + 1;

  const openPicker = () =>
    router.push({
      pathname: '/workout/add-exercise',
      params: { workoutId: String(workoutId) },
    });

  const discard = () =>
    Alert.alert('Discard workout?', 'All sets in this workout will be deleted.', [
      { text: 'Keep training', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await db.delete(workouts).where(eq(workouts.id, workoutId));
          clearWorkout(workoutId);
          router.back();
        },
      },
    ]);

  const finish = async () => {
    if (rows.length === 0) {
      discard();
      return;
    }
    await db.update(workouts).set({ endedAt: new Date() }).where(eq(workouts.id, workoutId));
    clearWorkout(workoutId);
    router.replace({
      pathname: '/workout/summary',
      params: { id: String(workoutId) },
    });
  };

  if (!workout) return null;

  return (
    <Screen edges={[]} footer={<RestTimerBar />} overlay={<PrToast />}>
      <ElapsedTitle startedAt={workout.startedAt} />
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={finish} hitSlop={8} style={styles.finish}>
              <Text style={styles.finishText}>Finish</Text>
            </Pressable>
          ),
        }}
      />

      {workout.name && (
        <Text variant="display" style={{ fontSize: 32 }}>
          {workout.name}
        </Text>
      )}

      {blocks.length === 0 ? (
        <EmptyState title="Empty workout" message="Add your first exercise to start logging sets." />
      ) : (
        blocks.map((b, i) => {
          const prev = blocks[i - 1];
          const next = blocks[i + 1];
          const pairedWithPrev = prev && supersetOf(pairs, order, b.exercise.id)?.partnerId === prev.exercise.id;
          if (pairedWithPrev) return null; // rendered with its partner
          const ss = supersetOf(pairs, order, b.exercise.id);
          if (ss && next && ss.partnerId === next.exercise.id) {
            return (
              <View key={`ss${b.exercise.id}`} style={styles.ssGroup}>
                <View style={styles.ssHead}>
                  <Ionicons name="link" size={14} color={colors.volt} />
                  <Text variant="caption" style={styles.ssTitle}>
                    SUPERSET {ss.letter}
                  </Text>
                  <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                    Alternate sets, rest after both
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Unlink ${b.exercise.name} and ${next.exercise.name}`}
                    onPress={() => toggle(b.exercise.id, next.exercise.id)}
                    hitSlop={8}
                    style={styles.unlink}
                  >
                    <Text variant="caption" style={{ fontWeight: '700', color: colors.chalk }}>
                      Unlink
                    </Text>
                  </Pressable>
                </View>
                {renderBlock(b)}
                {renderBlock(next)}
              </View>
            );
          }
          const canLink = next && !supersetOf(pairs, order, next.exercise.id);
          return (
            <View key={b.exercise.id} style={{ gap: space.sm }}>
              {renderBlock(b)}
              {canLink && !ss && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Superset ${b.exercise.name} with ${next.exercise.name}`}
                  onPress={() => toggle(b.exercise.id, next.exercise.id)}
                  style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="link-outline" size={14} color={colors.muted} />
                  <Text variant="caption" style={{ fontWeight: '700' }}>
                    Superset with next
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      <Pressable accessibilityRole="button" onPress={openPicker} style={styles.add}>
        <Ionicons name="add-circle" size={22} color={colors.volt} />
        <Text style={styles.addText}>Add exercise</Text>
      </Pressable>

      <View style={styles.footerActions}>
        <Button title="Finish workout" onPress={finish} />
        <Pressable accessibilityRole="button" onPress={discard} style={styles.discard}>
          <Text variant="label" style={{ color: colors.danger }}>
            Discard workout
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  finish: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  finishText: { color: colors.volt, fontWeight: '700' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addText: { color: colors.chalk, fontWeight: '700' },
  footerActions: { gap: space.sm, marginTop: space.lg },
  discard: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ssGroup: {
    gap: space.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.volt,
    paddingLeft: space.sm,
    marginLeft: -space.sm - 3,
  },
  ssHead: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  ssTitle: { color: colors.volt, fontWeight: '800', letterSpacing: 1 },
  unlink: {
    minHeight: 30,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    minHeight: 36,
    paddingHorizontal: space.md,
  },
});
