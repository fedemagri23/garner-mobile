import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { RefreshTokenStorage } from './token-manager';

const KEY = 'garner.refreshToken';

/**
 * The refresh token lives in the device keychain/keystore. The web target —
 * used only in development — has no secure storage, so it keeps the token in
 * memory and a reload signs out.
 */
export function refreshTokenStorage(): RefreshTokenStorage {
  if (Platform.OS === 'web') {
    let value: string | null = null;
    return {
      get: async () => value,
      set: async (token) => {
        value = token;
      },
      clear: async () => {
        value = null;
      },
    };
  }

  return {
    get: () => SecureStore.getItemAsync(KEY),
    set: (token) => SecureStore.setItemAsync(KEY, token),
    clear: () => SecureStore.deleteItemAsync(KEY),
  };
}
