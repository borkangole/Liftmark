import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedReminder } from '@/features/reminders/plan';
import { restAlertsSupported } from './restAlert';

const PREFIX = 'lm-';
const CHANNEL = 'reminders';

let channelReady = false;

async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Reminders',
    description: 'Training days, food and weigh-ins',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

/**
 * Makes the phone's scheduled reminders match the plan: unchanged ones are left alone,
 * stale ones cancelled, new ones added. Other notifications (the rest alert) aren't touched.
 */
export async function syncReminders(plan: PlannedReminder[]) {
  if (!restAlertsSupported) return;
  await ensureChannel();
  const wanted = new Map(plan.map((r) => [r.id, r]));
  const keep = new Set<string>();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const s of scheduled) {
    if (!s.identifier.startsWith(PREFIX)) continue;
    const r = wanted.get(s.identifier);
    if (r && s.content.title === r.title && s.content.body === r.body) keep.add(s.identifier);
    else await Notifications.cancelScheduledNotificationAsync(s.identifier);
  }
  for (const r of plan) {
    if (keep.has(r.id)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { url: r.url }, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
}

/** Removes every scheduled reminder (used by "Reset all data"). */
export async function clearReminders() {
  if (!restAlertsSupported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((s) => s.identifier.startsWith(PREFIX))
      .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
  );
}
