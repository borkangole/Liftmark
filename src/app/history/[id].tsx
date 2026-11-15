import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SetEditor } from '@/components/history/SetEditor';
import { FadeIn } from '@/components/motion/FadeIn';
import { MuscleMap } from '@/components/muscles/MuscleMap';
import { Button, Card, PressableLink, Screen, Text } from '@/components/ui';
import { addSetLike, deleteWorkout, renameWorkout } from '@/db/history';
import type { Exercise, WorkoutSet } from '@/db/schema';
import { combineTargets, getTargets } from '@/features/muscles/targets';
import { useWorkoutDetail } from '@/hooks/useHistory';
import { loadTypeOf } from '@/features/progression';
import { formatCompact, formatMinutes, formatScore, formatSet } from '@/lib/format';
import { progressionStepDisplay } from '@/lib/units';
import { startWorkout } from '@/lib/startWorkout';
import { toDisplayWeight, useSettings } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

export default function WorkoutDetailScreen() {
  const workoutId = Number(useLocalSearchParams<{ id: string }>().id);
  const detail = useWorkoutDetail(workoutId);
  const unit = useSettings((s) => s.unit);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ set: WorkoutSet; exercise: Exercise } | null>(null);

  useEffect(() => {
    if (detail) setName(detail.workout.name ?? '');
  }, [detail?.workout.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!detail) return null;
  const { workout } = detail;

  const targets = combineTargets(detail.exercises.map((e) => getTargets(e.exercise.name, e.exercise.muscleGroup, e.exercise.primaryMuscle, e.exercise.targetMuscles)));
  const duration = workout.endedAt ? workout.endedAt.getTime() - workout.startedAt.getTime() : null;

  const confirmDelete = () =>
    Alert.alert('Delete this workout?', 'Its sets will be removed from your progress too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(workout.id);
          router.back();
        },
      },
    ]);

  const repeat = () =>
    startWorkout(workout.routineDayId ?? undefined, {
      name: workout.name,
      exerciseIds: detail.exercises.map((e) => e.exercise.id),
    });

  const addSet = async (exercise: Exercise, last: WorkoutSet) => {
    const set = await addSetLike(workout.id, exercise.id, { weight: last.weight, reps: last.reps });
    setEditing({ set, exercise });
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: '' }} />

      <FadeIn>
        <View style={{ gap: space.xs }}>
          <Text variant="caption" style={styles.kicker}>
            {workout.startedAt
              .toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
              .toUpperCase()}{' '}
            · {workout.startedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </Text>
          <TextInput
            accessibilityLabel="Workout name"
            value={name}
            onChangeText={setName}
            onEndEditing={() => renameWorkout(workout.id, name)}
            placeholder="Workout"
            placeholderTextColor={colors.chalk}
            style={styles.title}
            maxLength={40}
            returnKeyType="done"
          />
        </View>
      </FadeIn>

      <FadeIn delay={60}>
        <View style={styles.tiles}>
          {duration !== null && duration < 3_600_000 ? (
            <Tile label="Minutes" value={String(Math.max(1, Math.round(duration / 60_000)))} />
          ) : (
            <Tile label="Duration" value={duration === null ? 'Live' : formatMinutes(duration).replace(' min', 'm').replace(' h ', 'h ')} />
          )}
          <Tile label="Sets" value={String(detail.setCount)} />
          <Tile label={`${unit} lifted`} value={formatCompact(toDisplayWeight(detail.volume, unit))} />
          <Tile label="PRs" value={String(detail.prCount)} accent={detail.prCount > 0} />
        </View>
      </FadeIn>

      {detail.exercises.length > 0 && (
        <FadeIn delay={120}>
          <Card style={{ gap: space.md }}>
            <Text variant="title">Muscles trained</Text>
            <MuscleMap targets={targets} height={170} showDetails />
          </Card>
        </FadeIn>
      )}

      {detail.exercises.map(({ exercise, type, sets }, i) => {
        const best = Math.max(0, ...sets.map((s) => s.e1rm));
        let working = 0;
        return (
          <FadeIn key={exercise.id} delay={Math.min(180 + i * 50, 450)}>
            <Card style={{ gap: space.sm }}>
              <PressableLink href={{ pathname: '/exercise/[id]', params: { id: String(exercise.id) } }} accessibilityRole="link" style={styles.exerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="title" numberOfLines={1}>
                      {exercise.name}
                    </Text>
                    <Text variant="caption">
                      {type === 'timed' ? 'Longest hold' : 'Best est. 1RM'} {formatScore(best, type, unit)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </PressableLink>

              {sets.map(({ set, e1rm, isPr }) => (
                <Pressable
                  key={set.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit set: ${formatSet(set, type, unit)}`}
                  onPress={() => setEditing({ set, exercise })}
                  style={({ pressed }) => [styles.setRow, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.setIndex, set.isWarmup && styles.setIndexWarmup]}>
                    <Text
                      variant="caption"
                      style={{ fontWeight: '700', color: set.isWarmup ? colors.muted : colors.chalk }}
                    >
                      {set.isWarmup ? 'W' : ++working}
                    </Text>
                  </View>
                  <Text style={[styles.setText, set.isWarmup && { color: colors.muted }]}>
                    {formatSet(set, type, unit)}
                  </Text>
                  {isPr && (
                    <View style={styles.pr}>
                      <Ionicons name="trophy" size={10} color={colors.voltInk} />
                      <Text variant="caption" style={styles.prText}>
                        PR
                      </Text>
                    </View>
                  )}
                  {!set.isWarmup && type !== 'timed' && <Text variant="caption">{formatScore(e1rm, type, unit)}</Text>}
                  <Ionicons name="create-outline" size={16} color={colors.muted} />
                </Pressable>
              ))}

              <Pressable
                accessibilityRole="button"
                onPress={() => addSet(exercise, sets[sets.length - 1].set)}
                style={styles.addSet}
              >
                <Ionicons name="add" size={16} color={colors.chalk} />
                <Text variant="label" style={{ color: colors.chalk, fontWeight: '700' }}>
                  Add set
                </Text>
              </Pressable>
            </Card>
          </FadeIn>
        );
      })}

      <View style={{ gap: space.sm, marginTop: space.md }}>
        <Button title="Repeat this workout" onPress={repeat} />
        <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
          <Text variant="label" style={{ color: colors.danger }}>
            Delete workout
          </Text>
        </Pressable>
      </View>

      <SetEditor
        set={editing?.set ?? null}
        exerciseName={editing?.exercise.name ?? ''}
        type={editing ? loadTypeOf(editing.exercise) : 'weighted'}
        unit={unit}
        step={progressionStepDisplay(editing?.exercise.weightIncrement ?? 2.5, unit)}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, accent && { color: colors.volt }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.chalk, fontSize: 34, fontWeight: '700', letterSpacing: -1, paddingVertical: 0 },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.md,
    gap: 2,
  },
  tileValue: { color: colors.chalk, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  setIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndexWarmup: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  setText: { flex: 1, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.volt,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prText: { color: colors.voltInk, fontWeight: '700' },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginTop: space.xs,
  },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
