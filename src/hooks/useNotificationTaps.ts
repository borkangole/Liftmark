import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { restAlertsSupported } from '@/lib/restAlert';

/** Tapping a reminder opens the screen it's about. Mounted once the navigator is ready. */
export function useNotificationTaps(ready: boolean) {
  useEffect(() => {
    if (!ready || !restAlertsSupported) return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string' && url !== '/') router.push(url as Href);
    };
    // The tap that launched the app, then any tap while it runs.
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        open(r);
        return Notifications.clearLastNotificationResponseAsync?.();
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}
