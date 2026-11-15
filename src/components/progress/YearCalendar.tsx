import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { weeksOf, type CalendarDay, type CalendarMonth } from '@/features/progress/year';
import { colors } from '@/theme/tokens';

const COLUMNS = 3;
const COL_GAP = 16;
const GAP = 3;

interface YearCalendarProps {
  months: CalendarMonth[];
  onPressMonth: (month: number) => void;
}

/** Twelve small month grids, every training day filled. Tap a month to zoom into it. */
export function YearCalendar({ months, onPressMonth }: YearCalendarProps) {
  const [width, setWidth] = useState(0);
  const column = Math.floor((width - COL_GAP * (COLUMNS - 1)) / COLUMNS);
  const cell = Math.floor((column - GAP * 6) / 7);
  const grid = cell * 7 + GAP * 6;

  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 &&
        months.map((m) => (
          <Pressable
            key={m.month}
            onPress={() => onPressMonth(m.month)}
            accessibilityRole="button"
            accessibilityLabel={`${m.label}: trained ${m.trained} days. Open month`}
            style={({ pressed }) => [{ width: column, gap: 8 }, pressed && { opacity: 0.6, transform: [{ scale: 0.97 }] }]}
          >
            <View style={[styles.monthRow, { width: grid }]}>
              <Text variant="title" style={[styles.month, m.future && styles.dim]}>
                {m.label}
              </Text>
              {m.trained > 0 && (
                <Text variant="caption" style={styles.count}>
                  {m.trained}
                </Text>
              )}
            </View>
            <View style={{ gap: GAP, width: grid }}>
              {weeksOf(m).map((week, w) => (
                <View key={w} style={{ flexDirection: 'row', gap: GAP }}>
                  {week.map((d, i) => (
                    <MiniDay key={d?.key ?? `e${w}-${i}`} day={d} size={cell} />
                  ))}
                </View>
              ))}
            </View>
          </Pressable>
        ))}
    </View>
  );
}

function MiniDay({ day, size }: { day: CalendarDay | null; size: number }) {
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.28) };
  if (!day) return <View style={box} />;
  const trained = day.workouts.length > 0;
  return (
    <View
      style={[
        styles.day,
        box,
        trained ? { backgroundColor: colors.volt } : !day.future && { backgroundColor: colors.surfaceRaised },
        day.today && !trained && { borderWidth: 1.5, borderColor: colors.volt },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[
          styles.num,
          { fontSize: Math.max(7, Math.floor(size * 0.45)), lineHeight: size },
          trained && { color: colors.voltInk, fontWeight: '800' },
          day.today && !trained && { color: colors.volt, fontWeight: '800' },
          day.future && !day.today && { opacity: 0.35 },
        ]}
      >
        {day.day}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: COL_GAP, rowGap: 22 },
  monthRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  month: { fontSize: 17, letterSpacing: -0.3 },
  count: { color: colors.volt, fontWeight: '800', fontVariant: ['tabular-nums'] },
  dim: { color: colors.muted, opacity: 0.45 },
  day: { alignItems: 'center', justifyContent: 'center' },
  num: {
    width: '100%',
    textAlign: 'center',
    color: colors.muted,
    fontWeight: '600',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
});
