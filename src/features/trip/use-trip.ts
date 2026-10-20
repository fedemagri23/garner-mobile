import { useMutation, useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { ApiError, unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { applyChanges, type Progress, type StatusAction } from '@/features/outbox/changes';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { loadTrip, saveTrip } from '@/features/outbox/storage';
import { useSession } from '@/session/session-provider';

import type { Trip } from './stops';
import { currentTripKey, useRememberTrip } from './trip-cache';

type Mode = components['schemas']['OptimizationResultResponse']['recommended'];

/**
 * The trip in progress, if any — as the shopper should see it: what the
 * server last said, with every change still waiting to be sent applied on
 * top. Active first, then a paused one.
 *
 * Without a connection the server cannot be asked, so the copy remembered on
 * the phone stands in: a trip opens offline.
 */
export function useCurrentTrip() {
  const { api } = useSession();
  const { queue } = useOutbox();

  return useQuery({
    queryKey: currentTripKey,
    // Offline is the case this exists for: do not wait for a connection.
    networkMode: 'always',
    queryFn: async (): Promise<Trip | null> => {
      try {
        for (const status of ['ACTIVE', 'PAUSED'] as const) {
          const page = await unwrap(
            api.GET('/v1/shopping-sessions', { params: { query: { status, pageSize: 1 } } }),
          );
          const summary = page.data[0];
          if (summary) {
            const trip = await unwrap(
              api.GET('/v1/shopping-sessions/{id}', { params: { path: { id: summary.id } } }),
            );
            await saveTrip(trip);
            return trip;
          }
        }
        await saveTrip(null);
        return null;
      } catch (error) {
        // The server answered with an error: that is an error. Anything else
        // is no connection, and the remembered trip is the best there is.
        if (error instanceof ApiError) {
          throw error;
        }
        return loadTrip();
      }
    },
    select: (trip) => (trip ? applyChanges(trip, queue) : null),
  });
}

/**
 * Starts a trip from a list — following a plan when one is given. Starting
 * again while one is in progress returns that one, so a retried tap cannot
 * make two. Needs the server: a trip begins with its copy of the list.
 */
export function useStartTrip() {
  const { api } = useSession();
  const remember = useRememberTrip();

  return useMutation({
    mutationFn: (input: { listId: string; optimizationId?: string; mode?: Mode }) =>
      unwrap(api.POST('/v1/shopping-sessions', { body: { id: randomUUID(), ...input } })),
    onSuccess: remember,
  });
}

/**
 * What a shopper does on a trip. Each is on the queue and on the phone the
 * moment it is called, and shows on screen at once; whether the server has
 * it yet is the outbox's business.
 */
export function useTripActions(trip: Trip) {
  const outbox = useOutbox();

  return {
    record(itemId: string, progress: Progress) {
      outbox.add({ kind: 'item', id: randomUUID(), tripId: trip.id, itemId, progress });
    },

    /** Returns the trip as it is once this change is made. */
    status(action: StatusAction): Trip {
      const change = { kind: 'status' as const, id: randomUUID(), tripId: trip.id, action, at: new Date().toISOString() };
      outbox.add(change);
      return applyChanges(trip, [change]);
    },
  };
}
