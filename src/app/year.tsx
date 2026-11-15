import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion/FadeIn';
import { MonthView } from '@/components/progress/MonthView';
import { YearCalendar } from '@/components/progress/YearCalendar';
import { Card, Screen, Text } from '@/components/ui';
import type { CalendarDay, DayWorkout } from '@/features/progress/year';
import { useYear } from '@/hooks/useYear';
import { colors, radius, space } from '@/theme/tokens';

export default function YearScreen() {
  const [year, setYearState] = useState(() => new Date().getFullYear());
  const [focus, setFocus] = useState<number | null>(null);
  const setYear = (next: number) => {
    setYearState(next);
    setFocus(null);
  };
  const y = useYear(year);
  const index = y.years.indexOf(year);
  const prev = index > 0 ? y.years[index - 1] : undefined;
  const next = index >= 0 && index < y.years.length - 1 ? y.years[index + 1] : undefined;

  const openWorkout = (w: DayWorkout) => router.push(`/history/${w.id}`);
  const openDay = (day: CalendarDay) => {
    if (day.workouts.length === 1) return openWorkout(day.workouts[0]);
    Alert.alert(
      'Pick a workout',
      undefined,
      [
        ...day.workouts.map((w) => ({
          text: `${w.name ?? 'Workout'} · ${w.startedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
          onPress: () => router.push(`/history/${w.id}`),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  return (
    <Screen>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.chalk} />
      </Pressable>
      <FadeIn style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="display">Workouts</Text>
          <View style={styles.years}>
            <YearArrow icon="chevron-back" target={prev} onPress={setYear} />
            <Text variant="title" accent style={styles.year}>
              {year}
            </Text>
            <YearArrow icon="chevron-forward" target={next} onPress={setYear} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
            {y.trainedDays}
            <Text variant="label"> of {y.countedDays} days</Text>
          </Text>
          <Text variant="caption">
            {y.countedDays > 0 ? `${Math.round((y.trainedDays / y.countedDays) * 100)}% trained` : 'Not started'}
          </Text>
        </View>
      </FadeIn>

      <FadeIn delay={80} style={styles.stats}>
        {year === new Date().getFullYear() && (
          <Stat icon="flame" value={`${y.currentStreak}`} label={y.currentStreak === 1 ? 'day streak' : 'days streak'} />
        )}
        <Stat icon="trending-up" value={`${y.longestStreak}`} label="longest" />
        <Stat icon="trophy" value={y.bestMonth?.label ?? '—'} label={y.bestMonth ? `best · ${y.bestMonth.days} ${y.bestMonth.days === 1 ? 'day' : 'days'}` : 'best month'} />
      </FadeIn>

      <FadeIn delay={160}>
        <Card style={{ gap: space.lg }}>
          {focus === null ? (
            <>
              <YearCalendar months={y.months} onPressMonth={setFocus} />
              <View style={styles.legend}>
                <View style={[styles.swatch, { backgroundColor: colors.surfaceRaised }]} />
                <Text variant="caption">Rest</Text>
                <View style={[styles.swatch, { backgroundColor: colors.volt }]} />
                <Text variant="caption">Trained</Text>
                <View style={[styles.swatch, styles.todaySwatch]} />
                <Text variant="caption">Today</Text>
                <Text variant="caption" style={{ marginLeft: 'auto' }}>
                  Tap a month
                </Text>
              </View>
            </>
          ) : (
            <MonthView
              month={y.months[focus]}
              year={year}
              onPrev={focus > 0 ? () => setFocus(focus - 1) : undefined}
              onNext={focus < 11 && !y.months[focus + 1].future ? () => setFocus(focus + 1) : undefined}
              onClose={() => setFocus(null)}
              onPressDay={openDay}
              onPressWorkout={openWorkout}
            />
          )}
        </Card>
      </FadeIn>
    </Screen>
  );
}

function YearArrow({
  icon,
  target,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  target?: number;
  onPress: (year: number) => void;
}) {
  return (
    <Pressable
      disabled={target === undefined}
      onPress={() => target !== undefined && onPress(target)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={target === undefined ? undefined : `Show ${target}`}
      style={{ opacity: target === undefined ? 0.25 : 1 }}
    >
      <Ionicons name={icon} size={18} color={colors.chalk} />
    </Pressable>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.volt} />
      <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  years: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
  year: { fontSize: 22, fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  todaySwatch: { borderWidth: 1.5, borderColor: colors.volt },
});
