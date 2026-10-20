import type { Href } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export type PushSupport = 'ok' | 'web' | 'expo-go-android';

/**
 * Whether this build can receive push at all. Expo Go on Android cannot (since
 * SDK 53); the web has no push here. Expo Go on iOS is left to try: whether it
 * works is for the token request to say, and the screen says so if it fails.
 */
export function pushSupport(): PushSupport {
  if (Platform.OS === 'web') {
    return 'web';
  }
  if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'expo-go-android';
  }
  return 'ok';
}

/** Where a tapped notification goes: the product it is about, else the inbox. */
export function routeFor(data: Record<string, unknown> | undefined): Href {
  const productId = data?.productId;
  return typeof productId === 'string' && productId.length > 0 ? `/inbox/product/${productId}` : '/inbox';
}
