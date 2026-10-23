import type { ReactNode } from 'react';

import { LanguageSync } from '@/features/account/language-sync';
import { LocationProvider } from '@/features/location/location-provider';
import { OutboxProvider } from '@/features/outbox/outbox-provider';

/**
 * What every screen inside the tabs shares: where the shopper is, and what is
 * waiting to be sent; and, once signed in, the server kept told of the app's
 * language.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <OutboxProvider>
        <LanguageSync />
        {children}
      </OutboxProvider>
    </LocationProvider>
  );
}
