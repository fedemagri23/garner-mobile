import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useSession } from '@/session/session-provider';

import type { Trip } from './stops';

type Mode = components['schemas']['OptimizationResultResponse']['recommended'];
type Progress = components['schemas']['RecordItemProgressRequest'];

const currentKey = ['trip', 'current'] as const;
const tripKey = (id: string) => ['trip', id] as const;

/**
 * The trip in progress, if any: active first, then a paused one. A shopper
 * has at most one of each per list; the newest wins.
 */
export function useCurrentTrip() {
  const { api } = useSession();

  return useQuery({
    queryKey: currentKey,
    queryFn: async (): Promise<Trip | null> => {
      for (const status of ['ACTIVE', 'PAUSED'] as const) {
        const page = await unwrap(
          api.GET('/v1/shopping-sessions', { params: { query: { status, pageSize: 1 } } }),
        );
        const summary = page.data[0];
        if (summary) {
          return unwrap(
            api.GET('/v1/shopping-sessions/{id}', { params: { path: { id: summary.id } } }),
          );
        }
      }
      return null;
    },
  });
}

/** Keeps the current trip and its own entry in step with what the server answered. */
function useStoreTrip() {
  const queryClient = useQueryClient();

  return (trip: Trip) => {
    queryClient.setQueryData(tripKey(trip.id), trip);
    queryClient.setQueryData(
      currentKey,
      trip.status === 'ACTIVE' || trip.status === 'PAUSED' ? trip : null,
    );
  };
}

/**
 * Starts a trip from a list — following a plan when one is given. Starting
 * again while one is in progress returns that one, so a retried tap cannot
 * make two.
 */
export function useStartTrip() {
  const { api } = useSession();
  const store = useStoreTrip();

  return useMutation({
    mutationFn: (input: { listId: string; optimizationId?: string; mode?: Mode }) =>
      unwrap(api.POST('/v1/shopping-sessions', { body: { id: randomUUID(), ...input } })),
    onSuccess: store,
  });
}

/**
 * Marks a line bought (with what was paid) or not. The screen changes at
 * once; the server's answer then replaces the guess, or a failure puts the
 * line back.
 */
export function useRecordItem(trip: Trip) {
  const { api } = useSession();
  const queryClient = useQueryClient();
  const store = useStoreTrip();

  return useMutation({
    mutationFn: ({ itemId, progress }: { itemId: string; progress: Progress }) =>
      unwrap(
        api.PATCH('/v1/shopping-sessions/{id}/items/{itemId}', {
          params: { path: { id: trip.id, itemId } },
          body: progress,
        }),
      ),
    onMutate: ({ itemId, progress }) => {
      const before = queryClient.getQueryData<Trip | null>(currentKey);
      if (before) {
        queryClient.setQueryData<Trip>(currentKey, {
          ...before,
          items: before.items.map((item) => {
            if (item.id !== itemId) {
              return item;
            }
            // Undefined leaves the price as it was; null clears it.
            const price =
              progress.actualUnitPriceCents === undefined
                ? item.actualUnitPriceCents
                : progress.actualUnitPriceCents;
            return {
              ...item,
              isPurchased: progress.isPurchased ?? item.isPurchased,
              actualUnitPriceCents: price,
              actualLineTotalCents: price === null ? null : Math.round(price * item.quantity),
            };
          }),
        });
      }
      return { before };
    },
    onError: (_error, _input, context) => {
      if (context?.before) {
        queryClient.setQueryData(currentKey, context.before);
      }
    },
    onSuccess: store,
  });
}

/** Pause, resume, finish or give up. Each is safe to retry on the server. */
export function useTripStatus(tripId: string) {
  const { api } = useSession();
  const store = useStoreTrip();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: 'pause' | 'resume' | 'complete' | 'abandon') => {
      const params = { params: { path: { id: tripId } } };
      switch (action) {
        case 'pause':
          return unwrap(api.POST('/v1/shopping-sessions/{id}/pause', params));
        case 'resume':
          return unwrap(api.POST('/v1/shopping-sessions/{id}/resume', params));
        case 'complete':
          return unwrap(api.POST('/v1/shopping-sessions/{id}/complete', params));
        case 'abandon':
          return unwrap(api.POST('/v1/shopping-sessions/{id}/abandon', params));
      }
    },
    onSuccess: (trip) => {
      store(trip);
      // A finished trip's prices become contributions; the price screens
      // will want fresh data next time.
      if (trip.status === 'COMPLETED') {
        return queryClient.invalidateQueries({ queryKey: ['prices'] });
      }
    },
  });
}
