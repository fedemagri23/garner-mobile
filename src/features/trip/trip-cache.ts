import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { saveTrip } from '@/features/outbox/storage';

import type { Trip } from './stops';

/** The trip in progress, as the server last described it. */
export const currentTripKey = ['trip', 'current'] as const;
export const tripKey = (id: string) => ['trip', id] as const;

/**
 * Keeps the cache — and the copy on disk, for opening a trip offline — in
 * step with what the server just answered. A trip that is over is no longer
 * "the current one".
 */
export function useRememberTrip() {
  const queryClient = useQueryClient();

  // Stable, so effects that depend on it are not restarted on every render.
  return useCallback(
    (trip: Trip) => {
      const current = trip.status === 'ACTIVE' || trip.status === 'PAUSED' ? trip : null;
      queryClient.setQueryData(tripKey(trip.id), trip);
      queryClient.setQueryData(currentTripKey, current);
      return saveTrip(current);
    },
    [queryClient],
  );
}
