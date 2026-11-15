import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { CalorieAdvice } from '@/features/bodyweight/nutrition';
import { colors, radius, space } from '@/theme/tokens';

const kcal = (n: number) => `${Math.round(n).toLocaleString()} kcal`;
const MACRO_COLORS = { protein: colors.volt, carbs: colors.steel, fat: colors.warning } as const;

/** One line for the Progress card: "Eat 2,650 kcal a day · 130 g protein". */
export function CalorieSummary({ advice }: { advice: CalorieAdvice }) {
  return (
    <View
      style={styles.summary}
      accessibilityLabel={`Daily target ${kcal(advice.target)}, ${advice.macros.proteinG} grams protein`}
    >
      <Ionicons name="restaurant-outline" size={16} color={colors.volt} />
      <Text variant="label" style={{ color: colors.chalk, flex: 1 }}>
        Eat about <Text style={styles.bold}>{kcal(advice.target)}</Text> a day ·{' '}
        <Text style={styles.bold}>{advice.macros.proteinG} g</Text> protein
      </Text>
      {advice.fromTrend && (
        <View style={styles.adjusted}>
          <Text variant="caption" style={styles.adjustedText}>
            ADJUSTED
          </Text>
        </View>
      )}
    </View>
  );
}

/** The full picture: target, how it was worked out, macros, and anything to watch out for. */
/** `compact` drops the how-it's-worked-out lines (shown on the Food info page instead). */
export function CalorieBreakdown({ advice, compact }: { advice: CalorieAdvice; compact?: boolean }) {
  const { proteinG, carbsG, fatG } = advice.macros;
  const parts = [
    { key: 'protein' as const, label: 'Protein', grams: proteinG, kcal: proteinG * 4 },
    { key: 'carbs' as const, label: 'Carbs', grams: carbsG, kcal: carbsG * 4 },
    { key: 'fat' as const, label: 'Fat', grams: fatG, kcal: fatG * 9 },
  ];
  const total = parts.reduce((s, p) => s + p.kcal, 0) || 1;
  const diff = advice.adjustment;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.headline}>
        <View style={{ flex: 1 }}>
          <Text variant="caption">DAILY TARGET</Text>
          <Text style={styles.big}>{Math.round(advice.target).toLocaleString()}</Text>
          <Text variant="caption">kcal a day</Text>
        </View>
        <View style={styles.side}>
          <Text variant="caption">Maintenance</Text>
          <Text style={styles.sideValue}>{kcal(advice.maintenance)}</Text>
          <Text
            variant="caption"
            style={{ color: diff === 0 ? colors.muted : diff < 0 ? colors.warning : colors.volt, fontWeight: '700' }}
          >
            {diff === 0 ? 'At maintenance' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} kcal`}
          </Text>
        </View>
      </View>

      <View
        style={styles.bar}
        accessibilityRole="image"
        accessibilityLabel={`Protein ${proteinG} grams, carbs ${carbsG} grams, fat ${fatG} grams`}
      >
        {parts.map((p) => (
          <View key={p.key} style={{ flex: p.kcal / total, backgroundColor: MACRO_COLORS[p.key] }} />
        ))}
      </View>
      <View style={styles.macros}>
        {parts.map((p) => (
          <View key={p.key} style={styles.macro}>
            <View style={[styles.swatch, { backgroundColor: MACRO_COLORS[p.key] }]} />
            <View>
              <Text style={styles.macroValue}>{p.grams} g</Text>
              <Text variant="caption">{p.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {!compact && (
        <View style={{ gap: 6 }}>
          {advice.reasons.map((r) => (
            <View key={r} style={styles.reason}>
              <View style={styles.dot} />
              <Text variant="caption" style={{ flex: 1 }}>
                {r}
              </Text>
            </View>
          ))}
        </View>
      )}

      {advice.caution && (
        <View style={styles.caution}>
          <Ionicons name="information-circle" size={16} color={colors.warning} />
          <Text variant="caption" style={{ flex: 1, color: colors.chalk }}>
            {advice.caution}
          </Text>
        </View>
      )}
      {!compact && (
        <Text variant="caption">
          An estimate to start from, not medical advice. Your weekly weigh-ins fine-tune it.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  bold: { fontWeight: '700', color: colors.chalk },
  adjusted: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.voltSoft },
  adjustedText: { color: colors.volt, fontWeight: '800', fontSize: 9, letterSpacing: 0.6 },
  headline: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  big: { color: colors.chalk, fontSize: 40, lineHeight: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  side: { alignItems: 'flex-end', gap: 1 },
  sideValue: { color: colors.chalk, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  macros: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  macroValue: { color: colors.chalk, fontWeight: '700', fontVariant: ['tabular-nums'] },
  reason: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.muted, marginTop: 7 },
  caution: {
    flexDirection: 'row',
    gap: 8,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
});
