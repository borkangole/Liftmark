import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { addDays, dayKey } from '@/features/progress/dates';
import { ACTIVITY_WEEKS } from '@/features/progress/overview';
import { colors, space } from '@/theme/tokens';

const CELL = 14;
const GAP = 4;
const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];

interface ConsistencyGridProps {
  activity: Record<string, number>;
  start: Date;
}

/** GitHub-style training calendar: one column per week, one row per weekday. */
export function ConsistencyGrid({ activity, start }: ConsistencyGridProps) {
  const today = dayKey(new Date());
  const activeDays = Object.keys(activity).length;

  return (
    <View
      style={{ gap: space.md }}
      accessible
      accessibilityLabel={`Trained on ${activeDays} days in the last ${ACTIVITY_WEEKS} weeks`}
    >
      <View style={styles.row}>
        <View style={styles.dayLabels}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} variant="caption" style={styles.dayLabel}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {Array.from({ length: ACTIVITY_WEEKS }, (_, w) => (
            <View key={w} style={styles.week}>
              {Array.from({ length: 7 }, (_, d) => {
                const date = addDays(start, w * 7 + d);
                const key = dayKey(date);
                const count = activity[key] ?? 0;
                const future = date > new Date();
                return (
                  <View
                    key={d}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: count === 0 ? colors.surfaceRaised : colors.volt,
                        opacity: future ? 0.25 : count === 0 ? 1 : count === 1 ? 0.6 : 1,
                      },
                      key === today && styles.today,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        <Text variant="caption">Less</Text>
        <View style={[styles.cell, { backgroundColor: colors.surfaceRaised }]} />
        <View style={[styles.cell, { backgroundColor: colors.volt, opacity: 0.6 }]} />
        <View style={[styles.cell, { backgroundColor: colors.volt }]} />
        <Text variant="caption">More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP + 2 },
  dayLabels: { gap: GAP },
  dayLabel: { height: CELL, lineHeight: CELL, fontSize: 9, width: 10 },
  grid: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  week: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 4 },
  today: { borderWidth: 1.5, borderColor: colors.chalk },
  legend: { flexDirection: 'row', alignItems: 'center', gap: GAP, alignSelf: 'flex-end' },
});
