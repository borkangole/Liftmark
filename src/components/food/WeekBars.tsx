import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

const LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Seven days of calories against the target line. */
export function WeekBars({
  days,
  target,
  height = 96,
}: {
  days: { day: string; kcal: number }[];
  target: number | null;
  height?: number;
}) {
  const max = Math.max(target ?? 0, ...days.map((d) => d.kcal), 1) * 1.1;
  const y = (v: number) => (v / max) * height;
  return (
    <View accessibilityRole="image" accessibilityLabel={`Calories for the last ${days.length} days`}>
      <View style={[styles.plot, { height }]}>
        {target !== null && <View style={[styles.line, { bottom: y(target) }]} />}
        {days.map((d) => {
          const near = target !== null && Math.abs(d.kcal - target) <= target * 0.1;
          const over = target !== null && d.kcal > target * 1.1;
          return (
            <View key={d.day} style={styles.col}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(d.kcal > 0 ? 4 : 0, y(d.kcal)),
                    backgroundColor:
                      d.kcal === 0 ? 'transparent' : over ? colors.warning : near ? colors.volt : colors.steel,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {days.map((d) => {
          const [yy, mm, dd] = d.day.split('-').map(Number);
          return (
            <Text key={d.day} variant="caption" style={styles.label}>
              {LETTER[new Date(yy, mm - 1, dd).getDay()]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  col: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  bar: { borderRadius: 4, width: '100%' },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    zIndex: 1,
  },
  labels: { flexDirection: 'row', gap: space.sm, marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontWeight: '700' },
});
