import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import { totals } from '@/features/nutrition/plan';
import { todayKey, useFoodDay, useFoodTargets } from '@/hooks/useFood';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Today screen: calories and protein at a glance, one tap to the food log. */
export function FoodTodayCard() {
  const entries = useFoodDay(todayKey());
  const { targets } = useFoodTargets();
  const eaten = totals(entries);
  const size = 52;
  const r = (size - 7) / 2;
  const c = 2 * Math.PI * r;
  const p = targets ? Math.min(1, eaten.kcal / targets.kcal) : 0;
  const over = targets !== null && eaten.kcal > targets.kcal * 1.05;

  const line = !targets
    ? 'Set a calorie target'
    : over
      ? `${fmt(eaten.kcal - targets.kcal)} kcal over`
      : `${fmt(targets.kcal - eaten.kcal)} kcal left`;
  const sub = !targets
    ? 'Liftmark works it out and suggests what to eat'
    : eaten.proteinG >= targets.proteinG
      ? 'Protein hit for today'
      : `${fmt(targets.proteinG - eaten.proteinG)} g protein to go`;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Food today: ${line}, ${sub}`}
      onPress={() => router.push('/(tabs)/food')}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={7} fill="none" />
          {p > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={over ? colors.warning : colors.volt}
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${c * p} ${c}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="restaurant" size={18} color={colors.chalk} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '800', color: colors.chalk }}>{line}</Text>
        <Text variant="caption">{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    paddingRight: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
