import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { CountUp } from '@/components/motion/CountUp';
import { Text } from '@/components/ui';
import { BMI_LABEL, bmiCategory, bmiGaugePosition, type BmiCategory } from '@/features/profile/bmi';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatNumber } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

// Zones on a 15–40 scale.
const ZONES: { category: BmiCategory; from: number; to: number; color: string }[] = [
  { category: 'underweight', from: 15, to: 18.5, color: '#5B9BD5' },
  { category: 'healthy', from: 18.5, to: 25, color: colors.volt },
  { category: 'overweight', from: 25, to: 30, color: colors.warning },
  { category: 'obese', from: 30, to: 40, color: colors.danger },
];

/** Big BMI number, its category, and a marker sliding onto a colour-zoned scale. */
export function BmiGauge({ bmi }: { bmi: number }) {
  const reduced = useReducedMotion();
  const slide = useRef(new Animated.Value(0)).current;
  const category = bmiCategory(bmi);
  const zone = ZONES.find((z) => z.category === category)!;

  useEffect(() => {
    const to = bmiGaugePosition(bmi);
    if (reduced) {
      slide.setValue(to);
      return;
    }
    Animated.timing(slide, {
      toValue: to,
      duration: 900,
      delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [bmi, reduced, slide]);

  return (
    <View
      style={{ gap: space.lg }}
      accessible
      accessibilityLabel={`Your BMI is ${formatNumber(bmi, 1)}, ${BMI_LABEL[category]}`}
    >
      <View style={styles.readout}>
        <CountUp value={bmi} format={(n) => formatNumber(n, 1)} style={styles.number} />
        <View style={[styles.pill, { backgroundColor: zone.color }]}>
          <Text variant="caption" style={{ color: colors.voltInk, fontWeight: '700' }}>
            {BMI_LABEL[category]}
          </Text>
        </View>
      </View>

      <View>
        <View style={styles.track}>
          {ZONES.map((z) => (
            <View key={z.category} style={{ flex: z.to - z.from, backgroundColor: z.color, opacity: 0.85 }} />
          ))}
        </View>
        <Animated.View
          style={[styles.marker, { left: slide.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
        <View style={styles.ticks}>
          {[18.5, 25, 30].map((t) => (
            <Text key={t} variant="caption" style={[styles.tick, { left: `${bmiGaugePosition(t) * 100}%` }]}>
              {t}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  number: { color: colors.chalk, fontSize: 56, fontWeight: '700', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  pill: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 },
  track: { flexDirection: 'row', height: 12, borderRadius: radius.pill, overflow: 'hidden', gap: 2 },
  marker: {
    position: 'absolute',
    top: -6,
    width: 6,
    height: 24,
    marginLeft: -3,
    borderRadius: 3,
    backgroundColor: colors.chalk,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  ticks: { height: 18, marginTop: 6 },
  tick: { position: 'absolute', marginLeft: -20, width: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
