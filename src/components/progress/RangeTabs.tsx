import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

export const RANGES = [
  { label: '4W', weeks: 4 },
  { label: '12W', weeks: 12 },
  { label: '6M', weeks: 26 },
  { label: 'All', weeks: null },
] as const;
export type RangeWeeks = (typeof RANGES)[number]['weeks'];

export function RangeTabs({ value, onChange }: { value: RangeWeeks; onChange: (v: RangeWeeks) => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {RANGES.map((r) => {
        const active = r.weeks === value;
        return (
          <Pressable
            key={r.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(r.weeks);
            }}
            style={[styles.tab, active && styles.active]}
          >
            <Text variant="label" style={{ color: active ? colors.voltInk : colors.muted, fontWeight: '700' }}>
              {r.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.volt },
});
