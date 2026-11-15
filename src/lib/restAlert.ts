import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

/**
 * The "rest's over" alert. The in-app timer bar buzzes while Liftmark is open; this local
 * notification covers the rest of the time (phone locked, another app open). Nothing leaves the phone.
 */
const ID = 'liftmark-rest-over';
const CHANNEL = 'rest-timer';

export const restAlertsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export type AlertPermission = 'granted' | 'denied' | 'undetermined';

let configured = false;

/** Once per launch: show other notifications normally, but keep the rest alert quiet while the app is open. */
export async function configureRestAlerts() {
  if (!restAlertsSupported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const rest = n.request.identifier === ID;
      return { shouldShowBanner: !rest, shouldShowList: !rest, shouldPlaySound: !rest, shouldSetBadge: false };
    },
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Rest timer',
      description: 'Tells you when rest between sets is over',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 300, 150, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function restAlertPermission(ask: boolean): Promise<AlertPermission> {
  if (!restAlertsSupported) return 'denied';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  if (!ask || !current.canAskAgain) return current.canAskAgain ? 'undetermined' : 'denied';
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.granted ? 'granted' : asked.canAskAgain ? 'undetermined' : 'denied';
}

/** Replaces any earlier alert, so +30 s or a new set just moves it. */
export async function scheduleRestOver(endsAt: number) {
  await cancelRestOver();
  if (endsAt - Date.now() < 1500) return;
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: {
      title: 'Rest’s over',
      body: 'Time for your next set.',
      sound: 'default',
      ...(Platform.OS === 'android' && { priority: Notifications.AndroidNotificationPriority.HIGH }),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endsAt, channelId: CHANNEL },
  });
}

export async function cancelRestOver() {
  if (!restAlertsSupported) return;
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(ID).catch(() => {}),
    Notifications.dismissNotificationAsync(ID).catch(() => {}),
  ]);
}

export const openNotificationSettings = () => Linking.openSettings().catch(() => {});
