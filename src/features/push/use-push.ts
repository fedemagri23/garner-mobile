import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { noContent, unwrap } from '@/api/client';
import { useSession } from '@/session/session-provider';

import { pushSupport } from './push';
import { loadPushToken, savePushToken } from './storage';

export type PushState = 'checking' | 'on' | 'off' | 'denied' | 'unsupported';

/** Why turning push on did not work, in words for the shopper. */
export type PushProblem = 'simulator' | 'no-project' | 'failed';

/**
 * Whether this phone gets avisos while the app is closed, and the means to
 * change it. "On" means this phone is registered with the server and the
 * system still allows notifications.
 */
export function usePush() {
  const { api } = useSession();
  const [state, setState] = useState<PushState>('checking');
  const [problem, setProblem] = useState<PushProblem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (pushSupport() !== 'ok') {
        return alive && setState('unsupported');
      }
      const [{ status }, token] = await Promise.all([Notifications.getPermissionsAsync(), loadPushToken()]);
      if (alive) {
        setState(status === 'denied' ? 'denied' : token && status === 'granted' ? 'on' : 'off');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setProblem(null);
    try {
      if (!Device.isDevice) {
        return setProblem('simulator');
      }
      if (Platform.OS === 'android') {
        // Android shows no permission prompt until a channel exists.
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Avisos de precio',
          importance: AndroidImportance.DEFAULT,
        });
      }
      const asked = await Notifications.requestPermissionsAsync();
      if (asked.status !== 'granted') {
        return setState('denied');
      }
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        return setProblem('no-project');
      }
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      await unwrap(api.POST('/v1/devices', { body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } }));
      await savePushToken(token);
      setState('on');
    } catch {
      setProblem('failed');
    } finally {
      setBusy(false);
    }
  }, [api]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const token = await loadPushToken();
      if (token) {
        await noContent(api.DELETE('/v1/devices/{token}', { params: { path: { token } } }));
      }
      await savePushToken(null);
      setState('off');
    } catch {
      setProblem('failed');
    } finally {
      setBusy(false);
    }
  }, [api]);

  return { state, problem, busy, enable, disable };
}

/** Asks the server to send a test message to this account's phones. */
export function useTestPush() {
  const { api } = useSession();
  return useCallback(() => unwrap(api.POST('/v1/devices/test')), [api]);
}
