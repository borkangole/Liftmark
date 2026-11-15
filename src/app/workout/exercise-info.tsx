import Ionicons from '@expo/vector-icons/Ionicons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExerciseDemo } from '@/components/demo/ExerciseDemo';
import { MuscleMap } from '@/components/muscles/MuscleMap';
import { ActiveFixCard, FixPicker } from '@/components/progress/PlateauFix';
import { StallDiagnosis } from '@/components/progress/StallDiagnosis';
import { RestCard } from '@/components/rest/RestCard';
import { useLiftDiagnosis } from '@/hooks/useLiftDiagnosis';
import { formatRest } from '@/components/rest/RestPicker';
import { Card, Screen, Text } from '@/components/ui';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { getDemo } from '@/features/demos/library';
import { getTargets } from '@/features/muscles/targets';
import { sameMuscle } from '@/features/superset/superset';
import { useExerciseProgress } from '@/hooks/useExerciseProgress';
import { useRestResolver } from '@/hooks/useRest';
import { formatRepRange, formatTarget } from '@/lib/format';
import { useSettings } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

/** Everything about an exercise that isn't needed to log a set: coaching, superset notes, rest, form, muscles. */
export default function ExerciseInfoScreen() {
  const params = useLocalSearchParams<{ workoutId: string; exerciseId: string; partnerId?: string; sets?: string }>();
  const exerciseId = Number(params.exerciseId);
  const { diagnosis } = useLiftDiagnosis(exerciseId);
  const { exercise, trend, suggestion, ctx, plan, sessions, summaries } = useExerciseProgress(exerciseId, {
    excludeWorkoutId: Number(params.workoutId),
  });
  const { data: partnerRows } = useLiveQuery(
    db
      .select()
      .from(exercises)
      .where(eq(exercises.id, Number(params.partnerId ?? -1))),
    [params.partnerId],
  );
  const partner = partnerRows[0];
  const unit = useSettings((s) => s.unit);
  const restFor = useRestResolver();

  if (!exercise) return null;
  const demo = getDemo(exercise.name);
  const targets = getTargets(exercise.name, exercise.muscleGroup, exercise.primaryMuscle, exercise.targetMuscles);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />
      <View style={{ gap: 4, paddingTop: space.md }}>
        <Text variant="display" style={{ fontSize: 30 }}>
          {exercise.name}
        </Text>
        <Text variant="label">{formatRepRange(exercise.repRangeMin, exercise.repRangeMax, ctx.type)}</Text>
      </View>

      <Card style={{ gap: space.sm }}>
        <View style={styles.head}>
          <Ionicons name="sparkles" size={16} color={colors.volt} />
          <Text variant="title">Today’s target</Text>
        </View>
        {suggestion ? (
          <>
            <Text style={styles.target}>
              {formatTarget({ ...suggestion, sets: Number(params.sets) || suggestion.sets }, ctx.type, unit)}
            </Text>
            <Text variant="label" style={{ lineHeight: 20 }}>
              {suggestion.reason}
            </Text>
          </>
        ) : (
          <Text variant="label" style={{ lineHeight: 20 }}>
            First time on this one. The starting weight is estimated from your profile, so adjust it if it feels too
            easy or too hard. Liftmark takes over from your second session.
          </Text>
        )}
        {trend.status !== 'insufficient_data' && (
          <Text variant="caption" style={{ lineHeight: 18 }}>
            {trend.reason}
          </Text>
        )}
      </Card>

      {plan && exercise && (
        <ActiveFixCard
          plan={plan}
          name={exercise.name}
          sessionsSince={sessions.filter((s) => s.date.getTime() > Date.parse(plan.startedAt)).length}
        />
      )}
      <StallDiagnosis diagnosis={diagnosis} compact>
        {!plan && exercise && diagnosis.causes.length > 0 && (
          <FixPicker
            exerciseId={exercise.id}
            cause={diagnosis.causes.find((c) => c.id !== 'no_food_log')?.id ?? null}
            bestE1rm={trend.allTimeBestE1rm}
            sessionCount={summaries.filter((x) => x.bestE1rm > 0).length}
            repRange={{ min: exercise.repRangeMin, max: exercise.repRangeMax }}
            lastSession={sessions.at(-1)}
            restSeconds={restFor(exercise)}
          />
        )}
      </StallDiagnosis>

      {partner && (
        <Card style={{ gap: space.sm }}>
          <View style={styles.head}>
            <Ionicons name="link" size={16} color={colors.volt} />
            <Text variant="title">Superset</Text>
          </View>
          <Text variant="label" style={{ lineHeight: 20 }}>
            Paired with {partner.name}. Do a set of each back to back, then rest{' '}
            {formatRest(Math.max(restFor(exercise), restFor(partner)))} (the longer of the two).
          </Text>
          {sameMuscle(exercise, partner) && (
            <Text variant="label" style={{ lineHeight: 20, color: colors.warning }}>
              Both work your {exercise.muscleGroup.replace('_', ' ')}, so expect fewer reps on the second one. Opposing
              muscles (like a press with a row) keep your numbers up.
            </Text>
          )}
        </Card>
      )}

      <RestCard exercise={exercise} />

      <Card style={{ gap: space.md }}>
        <Text variant="title">Form and muscles</Text>
        {demo && (
          <View style={styles.demo}>
            <ExerciseDemo spec={demo} size={240} />
          </View>
        )}
        <MuscleMap targets={targets} height={180} showDetails />
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/exercise/${exercise.id}`)}
        style={({ pressed }) => [styles.history, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="stats-chart-outline" size={18} color={colors.chalk} />
        <Text style={{ flex: 1, fontWeight: '700' }}>Full history and progress</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  target: { fontSize: 24, fontWeight: '700', color: colors.volt, fontVariant: ['tabular-nums'] },
  demo: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: space.md },
  history: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
