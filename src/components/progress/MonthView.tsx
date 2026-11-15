import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  weeksOf,
  type CalendarDay,
  type CalendarMonth,
  type DayWorkout,
} from '@/features/progress/year';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, radius, space } from '@/theme/tokens';

const GAP = 6;

interface MonthViewProps {
  month: CalendarMonth;
  year: number;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onPressDay: (day: CalendarDay) => void;
  onPressWorkout: (workout: DayWorkout) => void;
}

/** One month, zoomed: big day cells and the month's workouts underneath. */
export function MonthView({ month, year, onPrev, onNext, onClose, onPressDay, onPressWorkout }: MonthViewProps) {
  const [width, setWidth] = useState(0);
  const cell = Math.floor((width - GAP * 6) / 7);
  const grid = cell * 7 + GAP * 6;
  const zoom = useZoomIn(`${year}-${month.month}`);
  const workouts = month.days.flatMap((d) => d.workouts);

  return (
    <Animated.View style={[{ gap: space.lg }, zoom]}>
      <View style={styles.head}>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to the whole year"
          style={({ pressed }) => [styles.pill, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="grid-outline" size={14} color={colors.chalk} />
          <Text variant="label" style={{ color: colors.chalk, fontWeight: '700' }}>
            Year
          </Text>
        </Pressable>
        <View style={styles.nav}>
          <Arrow icon="chevron-back" onPress={onPrev} label="Previous month" />
          <Text variant="title" style={styles.title}>
            {MONTH_NAMES[month.month]}
          </Text>
          <Arrow icon="chevron-forward" onPress={onNext} label="Next month" />
        </View>
      </View>

      <Text variant="label">
        <Text variant="label" accent style={{ fontWeight: '800' }}>
          {month.trained}
        </Text>{' '}
        {month.trained === 1 ? 'day' : 'days'} trained · {month.workouts}{' '}
        {month.workouts === 1 ? 'workout' : 'workouts'}
      </Text>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ alignItems: 'center' }}>
        {width > 0 && (
          <View style={{ width: grid, gap: GAP }}>
            <View style={styles.row}>
              {WEEKDAY_LABELS.map((d, i) => (
                <Text key={i} variant="caption" style={[styles.weekday, { width: cell }]}>
                  {d}
                </Text>
              ))}
            </View>
            {weeksOf(month).map((week, w) =>
              week.every((d) => d === null) ? null : (
                <View key={w} style={styles.row}>
                  {week.map((d, i) => (
                    <BigDay key={d?.key ?? `e${w}-${i}`} day={d} size={cell} onPress={onPressDay} />
                  ))}
                </View>
              ),
            )}
          </View>
        )}
      </View>

      {workouts.length > 0 && (
        <View style={{ gap: space.xs }}>
          {workouts.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => onPressWorkout(w)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.workout, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.date}>
                <Text style={styles.dateNum}>{w.startedAt.getDate()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }} numberOfLines={1}>
                  {w.name ?? 'Workout'}
                </Text>
                <Text variant="caption">
                  {w.startedAt.toLocaleDateString([], { weekday: 'long' })} ·{' '}
                  {w.startedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

function BigDay({ day, size, onPress }: { day: CalendarDay | null; size: number; onPress: (d: CalendarDay) => void }) {
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.26) };
  if (!day) return <View style={box} />;
  const trained = day.workouts.length > 0;
  return (
    <Pressable
      disabled={!trained}
      onPress={() => onPress(day)}
      accessibilityRole={trained ? 'button' : undefined}
      accessibilityLabel={`${day.key}: ${trained ? day.workouts.map((w) => w.name ?? 'Workout').join(', ') : 'rest'}`}
      style={({ pressed }) => [
        styles.day,
        box,
        trained ? { backgroundColor: colors.volt } : !day.future && { backgroundColor: colors.surfaceRaised },
        day.future && { borderWidth: 1, borderColor: colors.border },
        day.today && !trained && { borderWidth: 2, borderColor: colors.volt },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[
          styles.bigNum,
          { fontSize: Math.floor(size * 0.36) },
          trained && { color: colors.voltInk, fontWeight: '800' },
          day.today && !trained && { color: colors.volt, fontWeight: '800' },
          day.future && !day.today && { opacity: 0.4 },
        ]}
      >
        {day.day}
      </Text>
      {day.workouts.length > 1 && (
        <View style={styles.dots}>
          {day.workouts.slice(0, 3).map((w) => (
            <View key={w.id} style={styles.dot} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

function Arrow({ icon, onPress, label }: { icon: 'chevron-back' | 'chevron-forward'; onPress?: () => void; label: string }) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ opacity: onPress ? 1 : 0.25, padding: 2 }}
    >
      <Ionicons name={icon} size={20} color={colors.chalk} />
    </Pressable>
  );
}

/** Scales up from the small grid each time the shown month changes. */
function useZoomIn(key: string) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return v.setValue(1);
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
  }, [key, reduced, v]);
  return {
    opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
  };
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  nav: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { fontSize: 20, minWidth: 110, textAlign: 'center' },
  row: { flexDirection: 'row', gap: GAP },
  weekday: { textAlign: 'center', fontWeight: '700' },
  day: { alignItems: 'center', justifyContent: 'center' },
  bigNum: { color: colors.muted, fontWeight: '600', fontVariant: ['tabular-nums'], includeFontPadding: false },
  dots: { position: 'absolute', bottom: 5, flexDirection: 'row', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.voltInk },
  workout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  date: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNum: { color: colors.voltInk, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
