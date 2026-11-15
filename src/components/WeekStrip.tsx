import { gte } from 'drizzle-orm';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { db } from '@/db/client';
import { workouts } from '@/db/schema';
import { addDays, dayKey, startOfWeek } from '@/features/progress/dates';
import { useLiveTables } from '@/hooks/useLiveTables';
import { colors, radius, space } from '@/theme/tokens';

const fetchWeek = () =>
  db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(gte(workouts.startedAt, startOfWeek(new Date())));
const TABLES = ['workouts'];

/** This week at a glance: today highlighted, a dot under every day you trained. */
export function WeekStrip() {
  const rows = useLiveTables(fetchWeek, TABLES, []);
  const now = new Date();
  const monday = startOfWeek(now);
  const trained = new Set(rows.map((r) => dayKey(r.startedAt)));
  const todayKey = dayKey(now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const count = days.filter((d) => trained.has(dayKey(d))).length;

  return (
    <View
      style={styles.strip}
      accessible
      accessibilityLabel={`Today is ${now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })}. ${count} training day${count === 1 ? '' : 's'} this week.`}
    >
      {days.map((d) => {
        const key = dayKey(d);
        const isToday = key === todayKey;
        const future = d > now && !isToday;
        return (
          <View key={key} style={styles.day}>
            <Text variant="caption" style={[styles.weekday, isToday && { color: colors.volt }]}>
              {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </Text>
            <View style={[styles.num, isToday && styles.numToday]}>
              <Text
                style={[styles.numText, { color: isToday ? colors.voltInk : future ? colors.muted : colors.chalk }]}
              >
                {d.getDate()}
              </Text>
            </View>
            <View style={[styles.dot, trained.has(key) && styles.dotOn]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
  },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  weekday: { fontWeight: '700', letterSpacing: 0.6 },
  num: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numToday: { backgroundColor: colors.volt },
  numText: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.volt },
});
