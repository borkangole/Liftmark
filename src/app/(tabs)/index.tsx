import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { AnimatedLiftmarkMark } from '@/components/brand/AnimatedLiftmarkMark';
import { FoodTodayCard } from '@/components/food/FoodTodayCard';
import { PlateauBroken } from '@/components/progress/PlateauBroken';
import { FadeIn } from '@/components/motion/FadeIn';
import { StepsCard } from '@/components/health/StepsCard';
import { RecoveryCard } from '@/components/recovery/RecoveryCard';
import { UpNextCard } from '@/components/routines/UpNextCard';
import { WeekStrip } from '@/components/WeekStrip';
import { Button, Card, PressableLink, Screen, Text } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { useRoutines, useUpNext } from '@/hooks/useRoutines';
import { useActiveWorkoutRow } from '@/hooks/useWorkout';
import { formatDuration } from '@/lib/format';
import { startWorkout } from '@/lib/startWorkout';
import { colors, radius, space } from '@/theme/tokens';

export default function TodayScreen() {
  const active = useActiveWorkoutRow();
  const upNext = useUpNext();
  const routines = useRoutines();
  const now = useNow(1000, Boolean(active));
  const [starting, setStarting] = useState(false);

  const start = async (dayId?: number) => {
    if (starting) return;
    setStarting(true);
    try {
      await startWorkout(dayId);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <AppHeader />

      <FadeIn delay={20}>
        <WeekStrip />
      </FadeIn>

      <PlateauBroken />

      <FadeIn delay={40}>
        {active ? (
          <Card style={{ borderWidth: 1, borderColor: colors.volt }}>
            <Text variant="label" accent style={styles.kicker}>
              IN PROGRESS · {formatDuration(now - active.startedAt.getTime())}
            </Text>
            <Text variant="title">{active.name ?? 'Your workout'} is still running</Text>
            <Button
              title="Resume workout"
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: String(active.id) } })}
            />
          </Card>
        ) : upNext ? (
          <UpNextCard upNext={upNext} onStart={() => start(upNext.day.id)} />
        ) : (
          <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
            <AnimatedLiftmarkMark size={64} progress={1} staggerOnMount />
            <Text variant="title">Pick a training split</Text>
            <Text variant="label" style={{ textAlign: 'center' }}>
              Choose Push/Pull/Legs, Upper/Lower and more. Liftmark tells you which day is next.
            </Text>
            <Button
              title="Browse splits"
              onPress={() => router.push('/routines/browse')}
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
        )}
      </FadeIn>

      {!active && (
        <FadeIn delay={100}>
          <Pressable accessibilityRole="button" onPress={() => start()} style={styles.quick} disabled={starting}>
            <Ionicons name="flash-outline" size={18} color={colors.chalk} />
            <Text style={{ fontWeight: '700', flex: 1 }}>Quick workout</Text>
            <Text variant="caption">No routine</Text>
          </Pressable>
        </FadeIn>
      )}

      <FadeIn delay={115}>
        <RecoveryCard upNext={active ? null : upNext} />
      </FadeIn>

      <FadeIn delay={130}>
        <FoodTodayCard />
      </FadeIn>

      <FadeIn delay={145}>
        <StepsCard />
      </FadeIn>

      {routines.length > 0 && (
        <FadeIn delay={160} style={{ gap: space.md }}>
          <View style={styles.sectionHeader}>
            <Text variant="title" style={{ flex: 1 }}>
              My routines
            </Text>
            <PressableLink href="/routines/browse" accessibilityRole="link" hitSlop={8}>
              <Text variant="label" accent style={{ fontWeight: '700' }}>
                + New
              </Text>
            </PressableLink>
          </View>
          {routines.map((r) => (
            <PressableLink
              key={r.id}
              href={{ pathname: '/routines/[id]', params: { id: String(r.id) } }}
              accessibilityRole="link"
              style={({ pressed }) => [styles.routine, pressed && { opacity: 0.85 }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Text style={{ fontWeight: '700' }}>{r.name}</Text>
                  {r.isActive && <View style={styles.activeDot} accessibilityLabel="Active routine" />}
                </View>
                <Text variant="caption" numberOfLines={1}>
                  {r.dayNames.join(' · ') || 'No days yet'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </PressableLink>
          ))}
        </FadeIn>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontWeight: '700', letterSpacing: 1.2 },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  routine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.volt },
});
