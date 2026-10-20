import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { pushSupport, routeFor } from './push';

// A notification that arrives while the app is open shows as a banner too.
if (pushSupport() === 'ok') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Opens the product a tapped notification is about, whether the app was open, in the background or closed. */
export function useNotificationTaps() {
  useEffect(() => {
    if (pushSupport() !== 'ok') {
      return;
    }
    const open = (response: Notifications.NotificationResponse | null) => {
      if (response) {
        router.push(routeFor(response.notification.request.content.data));
      }
    };
    // The one that launched the app from closed.
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
