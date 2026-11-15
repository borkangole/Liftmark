import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { LiftmarkIcon } from '@/components/brand/LiftmarkIcon';
import { FadeIn } from '@/components/motion/FadeIn';
import { Screen, Segmented, Text } from '@/components/ui';
import { BMI_LABEL, bmiCategory, calculateBmi, feetInchesFromCm } from '@/features/profile/bmi';
import { GOAL_LABEL, LEVEL_LABEL } from '@/features/profile/recommend';
import { applyTheme, exportCsv, resetAllData } from '@/lib/dataActions';
import { formatNumber, formatWeight } from '@/lib/format';
import { useProfile } from '@/stores/useProfile';
import { useSettings } from '@/stores/useSettings';
import { BRAND, colors, radius, space, themePreference, type ThemePreference } from '@/theme/tokens';

const REPO_URL = 'https://github.com/borkangole/Repster---Your-progress-partner';

const REST_OPTIONS = [
  { value: 60, label: '1:00' },
  { value: 90, label: '1:30' },
  { value: 120, label: '2:00' },
  { value: 180, label: '3:00' },
  { value: 240, label: '4:00' },
];

export default function SettingsScreen() {
  const { unit, setUnit, restMode, setRestMode, defaultRestSeconds, setDefaultRest } = useSettings();
  const [exporting, setExporting] = useState(false);
  const profile = useProfile((s) => s.profile);

  const chooseTheme = (pref: ThemePreference) => {
    if (pref === themePreference) return;
    Alert.alert('Change appearance?', 'Liftmark will restart to apply it. Your data stays put.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restart', onPress: () => applyTheme(pref).catch(console.error) },
    ]);
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const { rows } = await exportCsv();
      if (rows === 0) Alert.alert('Nothing to export yet', 'Finish a workout first.');
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const confirmReset = () =>
    Alert.alert(
      'Reset all data?',
      'This deletes every workout, set, routine, weigh-in and food log entry on this phone. Your exercise library and settings are kept. It can’t be undone. Export a CSV first if you want a backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'Last chance. All your training history will be gone.', [
              { text: 'Keep my data', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () =>
                  resetAllData()
                    .then(() => Alert.alert('Done', 'Liftmark is fresh. Time for a new PR.'))
                    .catch((e) => Alert.alert('Reset failed', String(e))),
              },
            ]),
        },
      ],
    );

  return (
    <Screen>
      <FadeIn>
        <Text variant="display">Settings</Text>
      </FadeIn>

      <FadeIn delay={30}>
        <View style={styles.brand}>
          <LiftmarkIcon size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.wordmark}>
              Liftmark<Text style={[styles.wordmark, { color: colors.volt }]}>.</Text>
            </Text>
            <Text variant="caption">Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </View>
        </View>
      </FadeIn>

      {profile && (
        <FadeIn delay={40}>
          <Section title="Profile" hint="Used to pick your split, tune rep ranges and estimate starting weights.">
            <View style={styles.stats}>
              <Stat label="Age" value={String(profile.age)} />
              <Stat
                label="Height"
                value={
                  unit === 'lb'
                    ? `${feetInchesFromCm(profile.heightCm).feet}′${feetInchesFromCm(profile.heightCm).inches}″`
                    : `${formatNumber(profile.heightCm, 0)} cm`
                }
              />
              <Stat label="Weight" value={formatWeight(profile.weightKg, unit)} />
              <Stat
                label={BMI_LABEL[bmiCategory(calculateBmi(profile.weightKg, profile.heightCm))]}
                value={`BMI ${formatNumber(calculateBmi(profile.weightKg, profile.heightCm), 1)}`}
              />
            </View>
            <Text variant="label" style={{ color: colors.chalk }}>
              {LEVEL_LABEL[profile.level]} · {GOAL_LABEL[profile.goal]} · {profile.daysPerWeek} days a week
            </Text>
            <Row
              icon="person-circle-outline"
              title="Edit profile"
              subtitle="Update your stats or get a new plan"
              onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })}
            />
          </Section>
        </FadeIn>
      )}

      <FadeIn delay={45}>
        <Section title="Library">
          <Row
            icon="list-outline"
            title="Exercise library"
            subtitle="Every exercise, form and muscles, your own"
            onPress={() => router.push('/exercises')}
          />
          <Row
            icon="calculator-outline"
            title="Calorie calculator"
            subtitle="Your daily target and macros"
            onPress={() => router.push('/food/calculator')}
          />
        </Section>
      </FadeIn>

      <FadeIn delay={50}>
        <Section title="Appearance">
          <Segmented
            accessibilityLabel="Appearance"
            value={themePreference}
            onChange={chooseTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
          <View style={styles.previews}>
            <ThemePreview mode="dark" selected={themePreference === 'dark'} onPress={() => chooseTheme('dark')} />
            <ThemePreview mode="light" selected={themePreference === 'light'} onPress={() => chooseTheme('light')} />
          </View>
        </Section>
      </FadeIn>

      <FadeIn delay={100}>
        <Section title="Units" hint="Your data is stored in kg and converted, so switching never loses precision.">
          <Segmented
            accessibilityLabel="Weight unit"
            value={unit}
            onChange={setUnit}
            options={[
              { value: 'kg', label: 'Kilograms (kg)' },
              { value: 'lb', label: 'Pounds (lb)' },
            ]}
          />
        </Section>
      </FadeIn>

      <FadeIn delay={150}>
        <Section
          title="Rest timer"
          hint={
            restMode === 'smart'
              ? 'Each exercise gets its own rest from the research: about 3 min on heavy lifts, 90 s on small ones. Change any exercise on its page.'
              : 'Every exercise uses this rest, unless you set one on its page. Warm-ups rest up to a minute.'
          }
        >
          <Segmented
            accessibilityLabel="How rest is chosen"
            value={restMode}
            onChange={setRestMode}
            options={[
              { value: 'smart', label: 'Per exercise' },
              { value: 'fixed', label: 'Same for all' },
            ]}
          />
          {restMode === 'fixed' && (
            <Segmented
              accessibilityLabel="Rest time for every exercise"
              value={defaultRestSeconds}
              onChange={setDefaultRest}
              options={REST_OPTIONS}
            />
          )}
          <Row
            icon="school-outline"
            title="Why these rest times?"
            subtitle="The studies behind the numbers"
            onPress={() => router.push('/rest-info')}
          />
        </Section>
      </FadeIn>

      <FadeIn delay={200}>
        <Section title="Your data" hint="Everything stays on this phone. No account, no cloud, no subscription.">
          <Row
            icon="download-outline"
            title="Export to CSV"
            subtitle="Every set, ready for Sheets or Excel"
            onPress={doExport}
            trailing={exporting ? <ActivityIndicator color={colors.volt} /> : undefined}
          />
          <Row
            icon="trash-outline"
            title="Reset all data"
            subtitle="Delete workouts, sets and routines"
            onPress={confirmReset}
            danger
          />
        </Section>
      </FadeIn>

      <FadeIn delay={250}>
        <Section title="About">
          <Row
            icon="logo-github"
            title="Source code"
            subtitle="Open source on GitHub"
            onPress={() => Linking.openURL(REPO_URL)}
          />
          <Row
            icon="shield-checkmark-outline"
            title="Privacy policy"
            subtitle="No account, no tracking, data stays here"
            onPress={() => router.push('/privacy')}
          />
          <Text variant="caption" style={{ textAlign: 'center', marginTop: space.sm }}>
            Built by Mhel Bustamante · Iloilo, Philippines
          </Text>
        </Section>
      </FadeIn>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" style={styles.sectionTitle} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {children}
      {hint && <Text variant="caption">{hint}</Text>}
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  const tint = danger ? colors.danger : colors.chalk;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.rowIcon, danger && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: tint }}>{title}</Text>
        <Text variant="caption">{subtitle}</Text>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </Pressable>
  );
}

/** A tiny mock of the app in each theme, so the choice is visual. */
function ThemePreview({ mode, selected, onPress }: { mode: 'dark' | 'light'; selected: boolean; onPress: () => void }) {
  const p =
    mode === 'dark'
      ? { bg: '#0E0F12', card: '#1A1C21', line: '#2E3138', text: '#F4F5F0', accent: BRAND.volt }
      : { bg: '#F2F3EE', card: '#FFFFFF', line: '#D6D9D0', text: '#121316', accent: '#4E7A00' };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mode === 'dark' ? 'Dark' : 'Light'} appearance`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.preview, { backgroundColor: p.bg, borderColor: selected ? colors.volt : colors.border }]}
    >
      <View style={[styles.previewBar, { backgroundColor: p.text, width: '45%' }]} />
      <View style={[styles.previewCard, { backgroundColor: p.card, borderColor: p.line }]}>
        <View style={[styles.previewBar, { backgroundColor: p.text, width: '60%', opacity: 0.8 }]} />
        <View style={[styles.previewBar, { backgroundColor: p.text, width: '35%', opacity: 0.4 }]} />
        <View style={[styles.previewButton, { backgroundColor: p.accent }]} />
      </View>
      <Text variant="caption" style={{ color: p.text, fontWeight: '700', textAlign: 'center' }}>
        {mode === 'dark' ? 'Dark' : 'Light'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
  },
  wordmark: { color: colors.chalk, fontSize: 26, fontWeight: '700', letterSpacing: -1 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  sectionTitle: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  previews: { flexDirection: 'row', gap: space.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
  },
  preview: { flex: 1, borderRadius: radius.md, borderWidth: 2, padding: space.md, gap: space.sm },
  previewCard: { borderRadius: 8, borderWidth: 1, padding: space.sm, gap: 6 },
  previewBar: { height: 6, borderRadius: 3 },
  previewButton: { height: 14, borderRadius: 7, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
