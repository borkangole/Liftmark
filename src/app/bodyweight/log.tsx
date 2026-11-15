import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Screen, Stepper, Text } from '@/components/ui';
import { logBodyweight } from '@/db/bodyweight';
import { isMorning, WEEKDAYS } from '@/features/bodyweight/trend';
import { parseNumberInput } from '@/features/logging/prefill';
import { useBodyweight } from '@/hooks/useBodyweight';
import { formatNumber, formatWeight } from '@/lib/format';
import { fromDisplayWeight, toDisplayWeight } from '@/lib/units';
import { useProfile } from '@/stores/useProfile';
import { colors, radius, space } from '@/theme/tokens';

const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

/** This week's morning weigh-in. Prefilled with last week's weight, so it's usually a few taps. */
export default function LogBodyweightScreen() {
  const { entries, unit, weighInDay, schedule } = useBodyweight();
  const profileKg = useProfile((s) => s.profile?.weightKg);
  const updateWeight = useProfile((s) => s.updateWeight);
  const last = entries.at(-1);
  const existing = schedule.loggedThisWeek;
  const now = new Date();
  const morning = isMorning(now);
  const onDay = now.getDay() === weighInDay;

  const [value, setValue] = useState(formatNumber(toDisplayWeight(last?.weightKg ?? profileKg ?? 70, unit), 1));
  const [touched, setTouched] = useState(false);
  // Weigh-ins load a moment after the sheet opens: start from the latest one unless the user has typed.
  useEffect(() => {
    if (!touched && last) setValue(formatNumber(toDisplayWeight(last.weightKg, unit), 1));
  }, [last?.weightKg, unit, touched]);

  const save = async () => {
    const w = parseNumberInput(value);
    if (w === null || w <= 0) {
      Alert.alert('Check your weight', 'Enter your weight, for example 72.4.');
      return;
    }
    const kg = fromDisplayWeight(w, unit);
    await logBodyweight(new Date(), kg, weighInDay);
    // The newest weigh-in becomes your profile weight (starting weights, pull-up scores).
    updateWeight(kg);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <Button title={existing ? "Replace this week's weigh-in" : 'Save weigh-in'} onPress={save} />
        </View>
      }
    >
      <Text variant="label" accent style={styles.kicker}>
        WEEKLY WEIGH-IN
      </Text>
      <Text variant="display" style={styles.title}>
        {morning ? "This morning's weight" : "This week's weight"}
      </Text>

      <View style={styles.checklist}>
        {['On waking, after the bathroom', 'Before eating or drinking', 'Same scale, same day each week'].map((t) => (
          <View key={t} style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.volt} />
            <Text variant="label" style={{ color: colors.chalk }}>
              {t}
            </Text>
          </View>
        ))}
      </View>

      <Stepper
        label={`Weight (${unit})`}
        value={value}
        onChange={(v) => {
          setTouched(true);
          setValue(v);
        }}
        step={unit === 'kg' ? 0.1 : 0.2}
        decimal
      />

      {!morning && (
        <Text variant="caption" style={{ color: colors.warning }}>
          It's past the morning. Later in the day most people read 0.5–1 kg heavier, so if you can, weigh in tomorrow
          morning instead.
        </Text>
      )}
      {!onDay && morning && (
        <Text variant="caption">
          Your weigh-in day is {WEEKDAYS[weighInDay]}. Logging today counts as this week's weigh-in.
        </Text>
      )}
      <Text variant="caption" style={{ color: existing ? colors.warning : colors.muted }}>
        {existing
          ? `You already logged ${formatWeight(existing.weightKg, unit)} on ${dayLabel(existing.date)}. Saving replaces it.`
          : last
            ? `Last weigh-in: ${formatWeight(last.weightKg, unit)} on ${dayLabel(last.date)}.`
            : 'Your first weigh-in. Liftmark reads the trend after three weeks.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontWeight: '700', letterSpacing: 1.2, marginTop: space.md },
  title: { fontSize: 30, lineHeight: 36 },
  checklist: { gap: 6, padding: space.md, borderRadius: radius.md, backgroundColor: colors.voltSoft },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
});
