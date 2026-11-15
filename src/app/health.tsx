import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { FadeIn } from '@/components/motion/FadeIn';
import { Button, Screen, Text } from '@/components/ui';
import { dayKeyOf } from '@/features/bodyweight/trend';
import { averageSteps, recentSleep } from '@/features/health/health';
import { health, type HealthStatus } from '@/lib/health';
import { syncHealth } from '@/lib/health/sync';
import { useHealth, type HealthShare } from '@/stores/useHealth';
import { useProfile } from '@/stores/useProfile';
import { colors, radius, space } from '@/theme/tokens';

const HEALTH_CONNECT_STORE = 'market://details?id=com.google.android.apps.healthdata';

const WATCHES =
  Platform.OS === 'ios'
    ? 'Apple Watch, Garmin, Fitbit, Oura, Withings and most smart scales already save to Apple Health. Your iPhone counts steps on its own too.'
    : 'Galaxy Watch (Samsung Health), Pixel Watch, Fitbit and Garmin save to Health Connect. Turn it on in their app, then connect here. Huawei watches need the Health Sync app as a bridge.';

export default function HealthScreen() {
  const s = useHealth();
  const bodyGoal = useProfile((p) => p.bodyGoal);
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!health) return setStatus('unavailable');
    const check = () => health!.status().then(setStatus).catch(() => setStatus('unavailable'));
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    return () => sub.remove();
  }, []);

  const connect = async () => {
    if (!health) return;
    setBusy(true);
    try {
      if (await health.requestAccess()) {
        s.connect();
        await syncHealth({ force: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      await syncHealth({ force: true });
    } finally {
      setBusy(false);
    }
  };

  const name = health?.name ?? 'your phone’s health app';
  const today = dayKeyOf(new Date());
  const avg = averageSteps(s.steps, today);
  const sleep = recentSleep(s.nights, today);

  return (
    <Screen edges={['bottom']}>
      <FadeIn style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="watch" size={28} color={colors.voltInk} />
        </View>
        <Text variant="title">Your watch, in Liftmark</Text>
        <Text variant="label" style={{ textAlign: 'center' }}>
          Liftmark reads steps, sleep and scale weigh-ins from {name}, and sends your workouts back. It’s read on this
          phone and never uploaded.
        </Text>
      </FadeIn>

      {status === null ? (
        <ActivityIndicator color={colors.volt} />
      ) : status === 'unavailable' ? (
        <Note icon="information-circle-outline">
          {health
            ? `${name} isn’t available here. It needs the installed Liftmark app (not Expo Go).`
            : 'Health data works in the phone app.'}
        </Note>
      ) : status === 'needs-install' ? (
        <View style={{ gap: space.md }}>
          <Note icon="download-outline">Health Connect needs to be installed or updated first.</Note>
          <Button title="Get Health Connect" onPress={() => Linking.openURL(HEALTH_CONNECT_STORE).catch(() => {})} />
        </View>
      ) : !s.connected ? (
        <FadeIn delay={60} style={{ gap: space.md }}>
          <Button title={busy ? 'Connecting…' : `Connect ${name}`} disabled={busy} onPress={connect} />
          <Text variant="caption" style={{ textAlign: 'center' }}>
            You choose exactly what to share on the next screen, and can change it any time.
          </Text>
        </FadeIn>
      ) : (
        <>
          <FadeIn delay={40}>
            <View style={styles.status}>
              <View style={styles.dot} />
              <Text style={{ flex: 1, fontWeight: '700' }}>Connected to {name}</Text>
              <Pressable onPress={syncNow} disabled={busy} hitSlop={8} accessibilityRole="button">
                {busy ? (
                  <ActivityIndicator color={colors.volt} />
                ) : (
                  <Text variant="label" accent style={{ fontWeight: '800' }}>
                    Sync now
                  </Text>
                )}
              </Pressable>
            </View>
            {s.lastSync && (
              <Text variant="caption" style={{ marginTop: space.xs }}>
                Last synced {new Date(s.lastSync).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
            )}
          </FadeIn>

          <FadeIn delay={80}>
            <View style={styles.section}>
              <Share
                k="steps"
                icon="footsteps-outline"
                title="Steps"
                subtitle={
                  avg
                    ? `About ${avg.toLocaleString('en-US')} a day. Your calorie target now uses them.`
                    : 'Shown on Today. After a few days they set your calorie target.'
                }
              />
              <Share
                k="sleep"
                icon="moon-outline"
                title="Sleep"
                subtitle={
                  sleep
                    ? `${sleep.avgHours.toFixed(1)} h a night lately. Short nights slow your recovery map.`
                    : 'Short nights slow your recovery map.'
                }
              />
              <Share
                k="weight"
                icon="scale-outline"
                title="Weigh-ins from your scale"
                subtitle={
                  bodyGoal
                    ? 'One morning reading a week becomes your weigh-in. Ones you log yourself are kept.'
                    : 'Starts once you set a bodyweight goal.'
                }
              />
              <Share
                k="workouts"
                icon="barbell-outline"
                title="Send workouts"
                subtitle={`Finished sessions appear in ${name}${Platform.OS === 'ios' ? ' and on your activity rings' : ''}.`}
              />
            </View>
          </FadeIn>

          <FadeIn delay={120} style={{ gap: space.sm }}>
            <Button title={`Choose what ${name} shares`} variant="secondary" onPress={() => health?.openSettings()} />
            <Pressable onPress={s.disconnect} hitSlop={8} style={{ alignSelf: 'center', padding: space.sm }}>
              <Text variant="label" style={{ color: colors.danger, fontWeight: '700' }}>
                Disconnect
              </Text>
            </Pressable>
          </FadeIn>
        </>
      )}

      <FadeIn delay={160}>
        <Note icon="watch-outline">{WATCHES}</Note>
      </FadeIn>
    </Screen>
  );
}

function Share({ k, icon, title, subtitle }: { k: HealthShare; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  const on = useHealth((s) => s.share[k]);
  const set = useHealth((s) => s.setShare);
  return (
    <Pressable onPress={() => set(k, !on)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <View style={[styles.icon, on && { backgroundColor: colors.voltSoft }]}>
        <Ionicons name={icon} size={18} color={on ? colors.volt : colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700' }}>{title}</Text>
        <Text variant="caption">{subtitle}</Text>
      </View>
      <Switch
        value={on}
        onValueChange={(v) => set(k, v)}
        trackColor={{ true: colors.volt, false: colors.surfaceRaised }}
        thumbColor={colors.chalk}
        accessibilityLabel={title}
      />
    </Pressable>
  );
}

function Note({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: ReactNode }) {
  return (
    <View style={styles.note}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text variant="label" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.volt },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
});
