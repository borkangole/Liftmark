import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MACRO_COLOR } from '@/components/food/MacroBars';
import { Card, Screen, Text } from '@/components/ui';
import { BODY_GOAL_LABEL } from '@/features/bodyweight/trend';
import { suggestForDay, weekInsight } from '@/features/nutrition/suggest';
import {
  shiftDay,
  todayKey,
  useAllFoods,
  useFoodDay,
  useFoodTargets,
  useFoodTotals,
  useRecentFoodKeys,
  useTrainedOn,
} from '@/hooks/useFood';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Everything the Food tab leaves out to stay clean: how the target is worked out, what the counter shows, why the picks. */
export default function FoodInfoScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const today = todayKey();
  const day = params.day ?? today;
  const { targets, advice, goal, analysis, measured, profile, customTarget } = useFoodTargets();
  const entries = useFoodDay(day);
  const { foods } = useAllFoods();
  const recentKeys = useRecentFoodKeys();
  const trained = useTrainedOn(day);
  const prev7 = useFoodTotals(shiftDay(today, -1), 7);

  const suggestions =
    targets && day === today
      ? suggestForDay({
          now: new Date(),
          targets,
          entries,
          foods,
          goal,
          weightKg: profile?.weightKg ?? 70,
          trainedToday: trained,
          recentKeys,
        })
      : [];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = shiftDay(shiftDay(today, -1), i - 6);
    return prev7.find((r) => r.day === d) ?? { day: d, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  });
  const insight = targets ? weekInsight(week, targets, goal, analysis?.status ?? null) : null;

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: space.md }}>
        <Head icon="flag-outline" title="Your target" />
        {targets ? (
          <>
            <Text style={styles.big}>
              {fmt(targets.kcal)} <Text variant="label">kcal a day</Text>
            </Text>
            <View style={styles.macros}>
              <Macro label="Protein" g={targets.proteinG} color={MACRO_COLOR.protein} />
              <Macro label="Carbs" g={targets.carbsG} color={MACRO_COLOR.carbs} />
              <Macro label="Fat" g={targets.fatG} color={MACRO_COLOR.fat} />
            </View>
            <Text variant="caption">
              {customTarget
                ? 'Your own numbers. Fat gets about a quarter of calories, carbs fill the rest.'
                : `${goal ? BODY_GOAL_LABEL[goal] : 'Your goal'} · ${targets.source === 'measured' ? 'maintenance measured from your logs' : 'maintenance estimated'}`}
            </Text>
            {!customTarget && advice && <Bullets items={advice.reasons} />}
            {advice?.caution && (
              <View style={styles.caution}>
                <Ionicons name="information-circle" size={16} color={colors.warning} />
                <Text variant="caption" style={{ flex: 1, color: colors.chalk }}>
                  {advice.caution}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text variant="label">No target yet. Set one in the calculator.</Text>
        )}
        <Link label="Calorie calculator" onPress={() => router.push('/food/calculator')} />
      </Card>

      <Card style={{ gap: space.md }}>
        <Head icon="pie-chart-outline" title="Reading the counter" />
        <Bullets
          items={[
            'Tap the ring to switch between calories left and eaten.',
            'The white tick is where your day should be by now. Behind it is fine early on.',
            'Orange means over your goal.',
            'Meal budgets share what’s left: a big lunch makes dinner smaller.',
          ]}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Head icon="sparkles-outline" title="Smart picks" />
        {suggestions.map((s) => (
          <View key={s.id} style={{ gap: 2 }}>
            <Text style={{ color: colors.chalk, fontWeight: '700' }}>{s.title}</Text>
            <Text variant="caption" style={{ lineHeight: 18 }}>
              {s.body}
            </Text>
          </View>
        ))}
        <Bullets
          items={[
            'Picks close your protein gap within the next meal’s calories, and favour foods you log often.',
            'Change the amount with − and +, tap a food to fix its values, ✓ logs it.',
            'Protein: about 1.6–2.2 g per kg of bodyweight a day (Morton et al. 2018), spread at about 0.4 g/kg per meal (Schoenfeld & Aragon 2018).',
          ]}
        />
      </Card>

      {insight && (
        <Card style={{ gap: space.md }}>
          <Head icon="calendar-outline" title="Your week" />
          <Text style={{ color: colors.chalk, fontWeight: '700' }}>{insight.title}</Text>
          <Text variant="caption" style={{ lineHeight: 18 }}>
            {insight.body}
          </Text>
          {insight.avgKcal !== null && (
            <Text variant="caption">
              Last 7 days: {insight.loggedDays} logged · avg {fmt(insight.avgKcal)} kcal ·{' '}
              {fmt(insight.avgProteinG ?? 0)} g protein
            </Text>
          )}
        </Card>
      )}

      <Card style={{ gap: space.md }}>
        <Head icon="analytics-outline" title="Your real maintenance" />
        {measured.ok ? (
          <Text variant="label" style={{ lineHeight: 20 }}>
            About <Text style={{ color: colors.chalk, fontWeight: '800' }}>{fmt(measured.value.maintenance)} kcal</Text>{' '}
            a day, from {measured.value.loggedDays} logged days and your weigh-ins.
          </Text>
        ) : (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(measured.progress * 100)}%` }]} />
            </View>
            <Text variant="caption">{measured.reason}</Text>
          </>
        )}
        <Text variant="caption">
          Formulas can be 10% or more off for one person. Two weeks of logging plus weekly weigh-ins shows what you
          really burn.
        </Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <Head icon="scale-outline" title="Weighing food" />
        <Bullets
          items={[
            'Weigh it the way its values are given: cooked and raw chicken differ a lot.',
            'Labels list values per 100 g. Copy those, then type what your scale shows.',
            'Filipino dishes in the list are typical home-cooked estimates. Edit them to match yours.',
          ]}
        />
      </Card>

      <Text variant="caption" style={{ textAlign: 'center' }}>
        Estimates to start from, not medical advice.
      </Text>
    </Screen>
  );
}

function Head({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.head}>
      <Ionicons name={icon} size={18} color={colors.volt} />
      <Text variant="title">{title}</Text>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((t) => (
        <View key={t} style={styles.bullet}>
          <View style={styles.dot} />
          <Text variant="caption" style={{ flex: 1, lineHeight: 18 }}>
            {t}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Macro({ label, g, color }: { label: string; g: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={{ color: colors.chalk, fontWeight: '700' }}>{g} g</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }): ReactNode {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name="calculator-outline" size={16} color={colors.chalk} />
      <Text style={{ color: colors.chalk, fontWeight: '700', flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  big: { color: colors.chalk, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  macros: { flexDirection: 'row', gap: space.xl },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
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
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.volt },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
