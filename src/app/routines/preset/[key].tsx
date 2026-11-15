import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeIn } from '@/components/motion/FadeIn';
import { MuscleMap } from '@/components/muscles/MuscleMap';
import { Button, Card, Screen, Text } from '@/components/ui';
import { createRoutineFromPreset } from '@/db/routines';
import { presetExercises } from '@/db/seed';
import { MUSCLE_LABEL, targetsForNames } from '@/features/muscles/targets';
import { getPreset } from '@/features/routines/presets';
import { colors, radius, space } from '@/theme/tokens';
import { loadTypeOf } from '@/features/progression';
import { formatRepRange } from '@/lib/format';

const repRange = new Map(
  presetExercises.map((e) => [
    e.name,
    formatRepRange(e.repRangeMin ?? 8, e.repRangeMax ?? 12, loadTypeOf({ equipment: e.equipment, measure: e.measure }), false),
  ]),
);

export default function PresetDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const preset = getPreset(key);
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  if (!preset) return null;

  const use = async () => {
    setSaving(true);
    try {
      const id = await createRoutineFromPreset(preset.key);
      router.dismissAll();
      router.push({ pathname: '/routines/[id]', params: { id: String(id) } });
    } finally {
      setSaving(false);
    }
  };

  const totalExercises = preset.days.reduce((n, d) => n + d.exercises.length, 0);

  return (
    <Screen
      edges={[]}
      footer={
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <Button title={saving ? 'Adding…' : `Use ${preset.name}`} onPress={use} disabled={saving} />
        </View>
      }
    >
      <Stack.Screen options={{ title: '' }} />

      <FadeIn>
        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(198,244,50,0.18)', 'rgba(198,244,50,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
          <Text variant="caption" style={styles.kicker}>
            {preset.level.toUpperCase()} · {preset.daysPerWeek.toUpperCase()}
          </Text>
          <Text variant="display">{preset.name}</Text>
          <Text variant="body" style={{ color: colors.muted, lineHeight: 22 }}>
            {preset.bestFor}
          </Text>
          <View style={styles.facts}>
            <Fact value={preset.days.length} label="days in cycle" />
            <Fact value={totalExercises} label="exercises" />
          </View>
        </View>
      </FadeIn>

      {preset.days.map((day, i) => {
        const targets = targetsForNames(day.exercises.map((e) => e.name));
        return (
          <FadeIn key={day.name} delay={80 + i * 60}>
            <Card>
              <View style={styles.dayHeader}>
                <View style={styles.dayIndex}>
                  <Text variant="caption" style={{ color: colors.voltInk, fontWeight: '700' }}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title">{day.name}</Text>
                  <Text variant="caption">{day.focus}</Text>
                </View>
              </View>
              <View style={styles.mapRow}>
                <MuscleMap targets={targets} height={120} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" style={styles.mapLabel}>
                    TRAINS
                  </Text>
                  <Text variant="label" style={{ color: colors.chalk }}>
                    {targets.primary.map((m) => MUSCLE_LABEL[m]).join(' · ')}
                  </Text>
                </View>
              </View>
              {day.exercises.map((e) => (
                <View key={e.name} style={styles.exercise}>
                  <Text style={{ flex: 1 }}>{e.name}</Text>
                  <Text variant="label" style={{ fontVariant: ['tabular-nums'] }}>
                    {e.sets} × {repRange.get(e.name)}
                  </Text>
                </View>
              ))}
            </Card>
          </FadeIn>
        );
      })}
    </Screen>
  );
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text style={{ color: colors.chalk, fontSize: 28, fontWeight: '700' }}>{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(198,244,50,0.35)',
    padding: space.lg,
    gap: space.sm,
    overflow: 'hidden',
  },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  facts: { flexDirection: 'row', gap: space.xxl, marginTop: space.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  dayIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.xs,
  },
  mapLabel: { color: colors.volt, fontWeight: '700', letterSpacing: 1.2 },
  exercise: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.ink,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
