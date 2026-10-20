import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'garner.push-token';

/** The token this phone registered, kept to forget it on sign-out. */
export async function loadPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function savePushToken(token: string | null): Promise<void> {
  try {
    if (token === null) {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    // Not remembering it only means sign-out cannot forget it by itself.
  }
}
