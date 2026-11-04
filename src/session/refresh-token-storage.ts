import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { COOKIE_SESSION } from './browser-session';
import type { RefreshTokenStorage } from './token-manager';

const KEY = 'garner.refreshToken';

/**
 * The refresh token lives in the device keychain/keystore. In a browser it is
 * in a cookie the page cannot read, so all that is kept here is that there is
 * one, to know whether to try restoring a session.
 */
export function refreshTokenStorage(): RefreshTokenStorage {
  if (Platform.OS === 'web') {
    return {
      get: async () => (globalThis.localStorage?.getItem(KEY) ? COOKIE_SESSION : null),
      set: async () => {
        globalThis.localStorage?.setItem(KEY, COOKIE_SESSION);
      },
      clear: async () => {
        globalThis.localStorage?.removeItem(KEY);
      },
    };
  }

  return {
    get: () => SecureStore.getItemAsync(KEY),
    set: (token) => SecureStore.setItemAsync(KEY, token),
    clear: () => SecureStore.deleteItemAsync(KEY),
  };
}
