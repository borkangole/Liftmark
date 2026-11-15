import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import { FadeIn } from '@/components/motion/FadeIn';
import { Button, Screen, Text } from '@/components/ui';
import { useLiveTables } from '@/hooks/useLiveTables';
import {
  ensureRoutines,
  loadSplitChoices,
  startRotation,
  switchSplit,
  type SplitChoices,
  type SplitOption,
} from '@/lib/splitSwitch';
import { useSplit } from '@/stores/useSplit';
import { colors, radius, space } from '@/theme/tokens';

const TABLES = ['routines', 'routine_days', 'routine_exercises', 'workouts', 'sets'];

export default function SwitchSplitScreen() {
  const choices = useLiveTables<SplitChoices | null>(() => loadSplitChoices(), TABLES, null);
  const rotation = useSplit((s) => s.rotation);
  const [busy, setBusy] = useState<string | null>(null);

  if (!choices) {
    return (
      <Screen edges={['bottom']}>
        <ActivityIndicator color={colors.volt} style={{ marginTop: space.xxl }} />
      </Screen>
    );
  }

  const current = choices.options.find((o) => o.isActive) ?? null;
  const go = async (option: SplitOption, dayIndex: number) => {
    setBusy(option.key);
    try {
      await switchSplit(option, dayIndex);
      router.back();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <FadeIn>
        <Text variant="label">
          Change splits whenever you like. Liftmark starts the new one on the day your muscles are most ready for.
        </Text>
      </FadeIn>

      <FadeIn delay={40} style={styles.recent}>
        <Text variant="caption" style={styles.kicker}>
          TRAINED LATELY
        </Text>
        {choices.recent.length === 0 ? (
          <Text variant="label">Nothing in the last 3 days. Any split, any day.</Text>
        ) : (
          <View style={styles.chips}>
            {choices.recent.map((p) => (
              <View key={p.label} style={styles.recentChip}>
                <Text style={{ fontWeight: '700' }}>{p.label}</Text>
                <Text variant="caption">{p.when}</Text>
              </View>
            ))}
          </View>
        )}
      </FadeIn>

      {choices.options.map((o, i) => (
        <FadeIn key={o.key} delay={80 + i * 40}>
          <OptionCard option={o} busy={busy === o.key} disabled={busy !== null} onSwitch={go} />
        </FadeIn>
      ))}

      <FadeIn delay={120 + choices.options.length * 40}>
        <RotationCard options={choices.options} current={current} active={rotation?.routineIds ?? null} />
      </FadeIn>
    </Screen>
  );
}

function OptionCard({
  option,
  busy,
  disabled,
  onSwitch,
}: {
  option: SplitOption;
  busy: boolean;
  disabled: boolean;
  onSwitch: (o: SplitOption, dayIndex: number) => void;
}) {
  const best = option.start?.index ?? 0;
  const [picked, setPicked] = useState(best);
  const custom = picked !== best;

  return (
    <View style={[styles.card, option.isActive && styles.cardActive]}>
      <View style={styles.cardHead}>
        <Text variant="title" style={{ flex: 1 }}>
          {option.name}
        </Text>
        {option.isActive && (
          <View style={styles.badge}>
            <Text variant="caption" style={{ color: colors.voltInk, fontWeight: '800' }}>
              CURRENT
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chips}>
        {option.days.map((d, i) => {
          const on = i === picked;
          return (
            <Pressable
              key={`${d.name}-${i}`}
              onPress={() => setPicked(i)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Start with ${d.name}${i === best ? ', recommended' : ''}`}
              style={[styles.day, on && styles.dayOn]}
            >
              {i === best && <Ionicons name="sparkles" size={12} color={on ? colors.voltInk : colors.volt} />}
              <Text style={[styles.dayText, on && { color: colors.voltInk }]}>{d.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption">
        {custom ? `Starting with ${option.days[picked].name}, your pick.` : option.start?.reason}
      </Text>

      <Button
        title={
          busy
            ? 'Switching…'
            : option.isActive
              ? `Next session: ${option.days[picked].name}`
              : `Switch · start with ${option.days[picked].name}`
        }
        variant={option.isActive ? 'secondary' : 'primary'}
        disabled={disabled}
        onPress={() => onSwitch(option, picked)}
      />
    </View>
  );
}

function RotationCard({
  options,
  current,
  active,
}: {
  options: SplitOption[];
  current: SplitOption | null;
  active: number[] | null;
}) {
  const setRotation = useSplit((s) => s.setRotation);
  const initial = active
    ? active.map((id) => options.find((o) => o.routineId === id)?.key).filter((k): k is string => Boolean(k))
    : current
      ? [current.key]
      : [];
  const [picked, setPicked] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const on = active !== null;
  const names = picked.map((k) => options.find((o) => o.key === k)?.name ?? '');

  const toggleOption = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const save = async () => {
    setSaving(true);
    try {
      const chosen = picked.map((k) => options.find((o) => o.key === k)!).filter(Boolean);
      const ids = await ensureRoutines(chosen);
      startRotation(ids, current?.routineId ?? null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name="repeat" size={20} color={colors.volt} />
        <View style={{ flex: 1 }}>
          <Text variant="title">Alternate every week</Text>
          <Text variant="caption">
            {on ? `Now: ${names.join(' → ')}, then repeat` : 'e.g. Upper / Lower one week, Push / Pull / Legs the next'}
          </Text>
        </View>
        <Switch
          value={on}
          onValueChange={(v) => (v ? undefined : setRotation(null))}
          disabled={!on}
          trackColor={{ true: colors.volt, false: colors.surfaceRaised }}
          thumbColor={colors.chalk}
          accessibilityLabel="Alternate splits every week"
        />
      </View>

      <Text variant="caption">Pick the splits in the order you want them. Each Monday the next one starts, on its most rested day.</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const n = picked.indexOf(o.key);
          return (
            <Pressable
              key={o.key}
              onPress={() => toggleOption(o.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: n >= 0 }}
              style={[styles.day, n >= 0 && styles.dayOn]}
            >
              {n >= 0 && <Text style={[styles.dayText, { color: colors.voltInk }]}>{n + 1}.</Text>}
              <Text style={[styles.dayText, n >= 0 && { color: colors.voltInk }]}>{o.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {picked.length >= 2 ? (
        <Button
          title={saving ? 'Saving…' : on ? 'Update rotation' : `Alternate ${names.join(' → ')}`}
          variant="secondary"
          disabled={saving}
          onPress={save}
        />
      ) : (
        <Text variant="caption">Pick at least two.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recent: { gap: space.sm },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardActive: { borderColor: colors.volt, borderWidth: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { backgroundColor: colors.volt, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  dayOn: { backgroundColor: colors.volt },
  dayText: { fontWeight: '700', color: colors.chalk },
});
