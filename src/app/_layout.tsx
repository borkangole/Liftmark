import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LaunchAnimation } from '@/components/LaunchAnimation';
import { Text } from '@/components/ui';
import { db } from '@/db/client';
import { seedIfEmpty } from '@/db/seed';
import { useNotificationTaps } from '@/hooks/useNotificationTaps';
import { useRestAlerts } from '@/hooks/useRestAlerts';
import { colors, isDark } from '@/theme/tokens';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [launchDone, setLaunchDone] = useState(false);
  useRestAlerts();
  useNotificationTaps(seeded);

  useEffect(() => {
    if (!success) return;
    seedIfEmpty(db)
      .catch(console.error)
      .finally(() => setSeeded(true));
  }, [success]);

  // Swap the static native splash for the animated loader as soon as it's on screen.
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  const finishLaunch = useCallback(() => setLaunchDone(true), []);

  if (error) {
    hideNativeSplash();
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, justifyContent: 'center', padding: 24 }}>
        <Text variant="title">Database error</Text>
        <Text variant="label">{error.message}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.ink }}>
        {seeded && (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.ink },
              headerTintColor: colors.chalk,
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.ink },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="workout/[id]" options={{ title: '', gestureEnabled: false }} />
            <Stack.Screen name="workout/exercise-info" options={{ title: '', presentation: 'modal' }} />
            <Stack.Screen name="workout/add-exercise" options={{ title: 'Add exercise', presentation: 'modal' }} />
            <Stack.Screen name="workout/summary" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="exercises" options={{ title: 'Exercise library' }} />
            <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
            <Stack.Screen name="exercise/new" options={{ title: 'New exercise', presentation: 'modal' }} />
            <Stack.Screen name="routines/browse" options={{ title: 'Choose a split' }} />
            <Stack.Screen name="routines/switch" options={{ title: 'Switch split', presentation: 'modal' }} />
            <Stack.Screen name="routines/preset/[key]" options={{ title: '' }} />
            <Stack.Screen name="routines/[id]" options={{ title: '' }} />
            <Stack.Screen name="history/[id]" options={{ title: '' }} />
            <Stack.Screen name="year" options={{ headerShown: false }} />
            <Stack.Screen name="bodyweight/index" options={{ title: 'Bodyweight' }} />
            <Stack.Screen name="bodyweight/goal" options={{ title: '', presentation: 'modal' }} />
            <Stack.Screen name="bodyweight/log" options={{ title: '', presentation: 'modal' }} />
            <Stack.Screen name="food/add" options={{ title: 'Add food', presentation: 'modal' }} />
            <Stack.Screen name="food/portion" options={{ title: '', presentation: 'modal' }} />
            <Stack.Screen name="food/quick" options={{ title: 'Quick add', presentation: 'modal' }} />
            <Stack.Screen name="food/custom" options={{ title: 'New food', presentation: 'modal' }} />
            <Stack.Screen name="food/calculator" options={{ title: 'Calorie calculator' }} />
            <Stack.Screen name="food/weigh" options={{ title: 'Weigh it', presentation: 'modal' }} />
            <Stack.Screen name="food/next" options={{ title: '', presentation: 'modal' }} />
            <Stack.Screen name="food/info" options={{ title: 'Food log', presentation: 'modal' }} />
            <Stack.Screen name="privacy" options={{ title: '' }} />
            <Stack.Screen name="rest-info" options={{ title: '' }} />
            <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
            <Stack.Screen name="health" options={{ title: 'Health & watch' }} />
          </Stack>
        )}
        {!launchDone && <LaunchAnimation ready={seeded} onFinish={finishLaunch} onLayout={hideNativeSplash} />}
      </View>
    </SafeAreaProvider>
  );
}
