import Ionicons from '@expo/vector-icons/Ionicons';
import { asc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MuscleMap } from '@/components/muscles/MuscleMap';
import { ChoiceCard } from '@/components/onboarding/ChoiceCard';
import { Button, Card, Text } from '@/components/ui';
import { db } from '@/db/client';
import { createCustomExercise } from '@/db/exercises';
import { addExerciseToDay } from '@/db/routines';
import { exercises } from '@/db/schema';
import { checkName, cleanName, MAX_MUSCLES, MUSCLE_SECTIONS, NAME_MAX, toggleMuscle } from '@/features/custom/custom';
import { MUSCLE_LABEL, targetsForMuscles, type Muscle } from '@/features/muscles/targets';
import { repRangeFor } from '@/features/profile/recommend';
import type { LoadType } from '@/features/progression/measure';
import { useActiveWorkout } from '@/stores/useActiveWorkout';
import { useProfile } from '@/stores/useProfile';
import { colors, radius, space } from '@/theme/tokens';

const TYPES: {
  value: LoadType;
  title: string;
  subtitle: string;
  icon: 'barbell-outline' | 'body-outline' | 'timer-outline';
}[] = [
  { value: 'weighted', title: 'Weights', subtitle: 'Log weight × reps', icon: 'barbell-outline' },
  { value: 'bodyweight', title: 'Bodyweight', subtitle: 'Reps, with optional added weight', icon: 'body-outline' },
  { value: 'timed', title: 'Timed hold', subtitle: 'Log seconds, like a plank', icon: 'timer-outline' },
];

const NAME_ERROR = {
  too_short: 'Give it a name of at least 2 letters.',
  too_long: `Keep it under ${NAME_MAX} characters.`,
  taken: 'You already have an exercise with this name.',
} as const;

/**
 * Create a custom exercise in two steps: name it, then pick the muscle it trains from a list,
 * shown on the same muscle map the rest of the app uses.
 * Opened from the exercise picker (`workoutId` or `dayId` adds it straight away) or the Exercises tab.
 */
export default function NewExerciseScreen() {
  const params = useLocalSearchParams<{ name?: string; workoutId?: string; dayId?: string }>();
  const { data: existing } = useLiveQuery(
    db.select({ name: exercises.name }).from(exercises).orderBy(asc(exercises.name)),
  );
  const goal = useProfile((s) => s.profile?.goal);
  const addToWorkout = useActiveWorkout((s) => s.addExercise);

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(params.name ?? '');
  const [type, setType] = useState<LoadType>('weighted');
  // Every muscle the exercise works, in the order picked: the first is the main one.
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [pulse, setPulse] = useState(0);
  const targets = targetsForMuscles(muscles);

  const toggle = (m: Muscle) => {
    const next = toggleMuscle(muscles, m);
    if (next === muscles) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return; // at the limit
    }
    Haptics.selectionAsync().catch(() => {});
    setMuscles(next);
    if (next.length > muscles.length) setPulse((p) => p + 1); // flash the newly added muscle
  };
  const [showError, setShowError] = useState(false);
  const [saving, setSaving] = useState(false);

  const problem = checkName(
    name,
    existing.map((e) => e.name),
  );
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slide.setValue(24);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
  }, [step, slide]);

  const next = () => {
    if (problem) {
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setStep(2);
  };

  const save = async () => {
    if (muscles.length === 0 || problem || saving) return;
    setSaving(true);
    try {
      const repRange = goal ? repRangeFor(goal, cleanName(name)) : { min: 8, max: 12 };
      const id = await createCustomExercise({ name, muscles, type, repRange });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (params.workoutId) {
        addToWorkout(Number(params.workoutId), id);
        router.dismiss(2); // this screen and the exercise picker
      } else if (params.dayId) {
        await addExerciseToDay(Number(params.dayId), id);
        router.dismiss(2);
      } else {
        router.replace({ pathname: '/exercise/[id]', params: { id: String(id) } });
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
      Alert.alert("Couldn't save", 'Something went wrong saving this exercise. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'New exercise',
          headerBackVisible: step === 1,
          headerLeft:
            step === 2
              ? () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back to name"
                    onPress={() => setStep(1)}
                    hitSlop={10}
                  >
                    <Ionicons name="chevron-back" size={26} color={colors.chalk} />
                  </Pressable>
                )
              : undefined,
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.progress} accessibilityLabel={`Step ${step} of 2`}>
          <View style={[styles.bar, styles.barOn]} />
          <View style={[styles.bar, step === 2 && styles.barOn]} />
        </View>

        {step === 1 ? (
          <Animated.View style={[styles.flex, { transform: [{ translateY: slide }] }]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text variant="label" accent style={styles.kicker}>
                STEP 1 OF 2
              </Text>
              <Text variant="display" style={styles.title}>
                Name it
              </Text>
              <TextInput
                accessibilityLabel="Exercise name"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setShowError(false);
                }}
                placeholder="e.g. Cable crossover"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  showError && problem && styles.inputError,
                  Platform.OS === 'web' && styles.noOutline,
                ]}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={NAME_MAX + 10}
                returnKeyType="next"
                onSubmitEditing={next}
              />
              <Text variant="caption" style={[styles.helper, showError && problem && { color: colors.danger }]}>
                {showError && problem ? NAME_ERROR[problem] : 'It will show up in search, history and progress.'}
              </Text>

              <Text variant="title" style={styles.section}>
                How do you log it?
              </Text>
              <View style={{ gap: space.sm }}>
                {TYPES.map((t) => (
                  <ChoiceCard
                    key={t.value}
                    title={t.title}
                    subtitle={t.subtitle}
                    icon={t.icon}
                    selected={type === t.value}
                    onPress={() => setType(t.value)}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={styles.footer}>
              <Button title="Next: pick the muscle" onPress={next} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.flex, { transform: [{ translateY: slide }] }]}>
            {/* The map stays put while the muscle list scrolls, so the highlight is always in view. */}
            <View style={styles.stepTwoHead}>
              <Text variant="label" accent style={styles.kicker}>
                STEP 2 OF 2
              </Text>
              <Text variant="display" style={styles.title} numberOfLines={1}>
                What does it train?
              </Text>
              <Text variant="label" numberOfLines={1}>
                {cleanName(name)}
              </Text>
              <Card style={styles.mapCard}>
                <MuscleMap targets={targets} height={170} showDetails pulseKey={pulse} />
                {muscles.length === 0 && (
                  <Text variant="label" style={{ textAlign: 'center' }}>
                    Tap every muscle it works below.
                  </Text>
                )}
              </Card>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              <Text variant="caption" style={styles.howTo}>
                Pick up to {MAX_MUSCLES}. The first one is the main muscle; tap again to remove.
              </Text>
              {MUSCLE_SECTIONS.map((section) => (
                <View key={section.title} style={styles.section2} accessibilityLabel={section.title}>
                  <Text variant="caption" style={styles.sectionTitle}>
                    {section.title.toUpperCase()}
                  </Text>
                  <View style={styles.chips}>
                    {section.muscles.map((m) => {
                      const on = muscles.includes(m);
                      const main = muscles[0] === m;
                      return (
                        <Pressable
                          key={m}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={`${MUSCLE_LABEL[m]}${main ? ', main muscle' : ''}`}
                          onPress={() => toggle(m)}
                          style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.75 }]}
                        >
                          {on && <Ionicons name="checkmark" size={15} color={colors.voltInk} />}
                          <Text variant="label" style={[styles.chipText, on && styles.chipTextOn]}>
                            {MUSCLE_LABEL[m]}
                          </Text>
                          {main && (
                            <View style={styles.mainTag}>
                              <Text variant="caption" style={styles.mainTagText}>
                                MAIN
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <Button
                title={saving ? 'Saving…' : params.workoutId || params.dayId ? 'Create and add' : 'Create exercise'}
                onPress={save}
                disabled={muscles.length === 0 || saving}
                style={muscles.length === 0 ? { opacity: 0.45 } : undefined}
              />
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: space.lg, paddingTop: space.md },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  barOn: { backgroundColor: colors.volt },
  content: { padding: space.lg, gap: space.sm, paddingBottom: space.xl },
  kicker: { fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 32, lineHeight: 38 },
  input: {
    marginTop: space.md,
    minHeight: 58,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.chalk,
    fontSize: 20,
    fontWeight: '600',
  },
  inputError: { borderColor: colors.danger },
  noOutline: { outlineWidth: 0 } as object,
  helper: { marginLeft: 4 },
  section: { marginTop: space.xl, marginBottom: space.xs },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },

  stepTwoHead: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.xs },
  mapCard: { gap: space.sm, marginTop: space.sm, paddingVertical: space.md },
  list: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  section2: { gap: space.sm, marginTop: space.md },
  sectionTitle: { fontWeight: '700', letterSpacing: 1.1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  howTo: { marginTop: space.md },
  mainTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.voltInk },
  mainTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: colors.volt },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.volt, borderColor: colors.volt },
  chipText: { color: colors.chalk, fontWeight: '600' },
  chipTextOn: { color: colors.voltInk },
});
