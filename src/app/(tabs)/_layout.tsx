import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useCustomExerciseRegistry } from '@/hooks/useCustomExerciseRegistry';
import { usePlateauTracker } from '@/hooks/usePlateauTracker';
import { useHealthSync } from '@/hooks/useHealthSync';
import { useReminderSync } from '@/hooks/useReminderSync';
import { useSplitRotation } from '@/hooks/useSplitRotation';
import { useProfile } from '@/stores/useProfile';
import { colors } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />
  );

export default function TabsLayout() {
  // First launch: personalize before anything else.
  const onboarded = useProfile((s) => s.completedAt !== null);
  useCustomExerciseRegistry();
  usePlateauTracker();
  useReminderSync();
  useSplitRotation();
  useHealthSync();
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.ink, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.volt,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('barbell-outline') }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: icon('restaurant-outline') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('trending-up-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
