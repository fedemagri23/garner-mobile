import type { ReactNode } from 'react';

import { LocationProvider } from '@/features/location/location-provider';
import { OutboxProvider } from '@/features/outbox/outbox-provider';

/** What every screen inside the tabs shares: where the shopper is, and what is waiting to be sent. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <OutboxProvider>{children}</OutboxProvider>
    </LocationProvider>
  );
}
