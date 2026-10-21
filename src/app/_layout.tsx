import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ApiError } from '@/api/client';
import { AppProviders } from '@/components/app-providers';
import { LanguageProvider } from '@/i18n/language-provider';
import { SessionProvider, useSession } from '@/session/session-provider';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx will not fix itself by asking again.
      retry: (failures, error) =>
        !(error instanceof ApiError && error.status < 500) && failures < 2,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {/* A font that fails to load falls back to the system font, not a blank app. */}
        {/* Inside the session so changing language never signs anyone out. */}
        <LanguageProvider>
          <RootNavigator fontsReady={fontsLoaded || fontError !== null} />
        </LanguageProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { status } = useSession();
  const ready = fontsReady && status !== 'restoring';

  // The splash stays up until we know whether the user is signed in, so the
  // first screen is the right one rather than a flash of the wrong one.
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  const signedIn = status === 'signedIn';

  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="report-price" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add-product" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add-store" options={{ presentation: 'fullScreenModal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );

  return (
    <>
      <StatusBar style="dark" />
      {/* Where the shopper is and what waits to be sent are shared by every
          screen — the full-screen ones above the tabs included. */}
      {signedIn ? <AppProviders>{stack}</AppProviders> : stack}
    </>
  );
}
