import Constants from 'expo-constants';

/**
 * Where the API is.
 *
 * Set `EXPO_PUBLIC_API_URL` to point anywhere explicitly. Without it, in
 * development, the app assumes the backend runs on the same computer as the
 * Expo dev server and uses that computer's address — which is what makes a
 * phone on the same network reach it, since `localhost` on a phone is the
 * phone.
 */
export function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${devHost ?? 'localhost'}:3000`;
}
