import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useShopperLocation } from '@/features/location/location-provider';
import { useSession } from '@/session/session-provider';

export type Optimization = components['schemas']['OptimizationResponse'];
export type OptimizationResult = components['schemas']['OptimizationResultResponse'];
export type Plan = components['schemas']['PlanResponse'];
export type PlanStop = components['schemas']['PlanStoreResponse'];
export type Mode = OptimizationResult['recommended'];
export type Preferences = components['schemas']['OptimizationPreferencesResponse'];

/** The three alternatives, in the order the tabs show them. */
export const MODES: { mode: Mode; key: 'simplest' | 'bestBalance' | 'cheapest'; label: string }[] = [
  { mode: 'SIMPLEST', key: 'simplest', label: 'Más simple' },
  { mode: 'BEST_BALANCE', key: 'bestBalance', label: 'Equilibrado' },
  { mode: 'CHEAPEST', key: 'cheapest', label: 'Más barato' },
];

export const planFor = (result: OptimizationResult, mode: Mode): Plan | null =>
  result[MODES.find((entry) => entry.mode === mode)!.key] ?? null;

const optimizationKey = (id: string) => ['optimization', id] as const;
const latestKey = (listId: string) => ['optimizations', 'latest', listId] as const;

/**
 * Asks where to buy a list, from where the shopper is, under their standing
 * preferences. The backend answers a repeated question from its recent
 * answer, so asking again on every visit is cheap.
 */
export function useRequestPlan(listId: string) {
  const { api } = useSession();
  const { location } = useShopperLocation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (location.status !== 'ready') {
        throw new Error('No location');
      }
      return unwrap(
        api.POST('/v1/shopping-lists/{id}/optimize', {
          params: { path: { id: listId } },
          body: { ...location.point },
        }),
      );
    },
    onSuccess: (optimization) => {
      queryClient.setQueryData(optimizationKey(optimization.id), optimization);
      return queryClient.invalidateQueries({ queryKey: latestKey(listId) });
    },
  });
}

/** One optimization, re-read every second while the worker is on it. */
export function useOptimization(id: string | undefined) {
  const { api } = useSession();

  return useQuery({
    queryKey: optimizationKey(id ?? 'none'),
    enabled: !!id,
    queryFn: () =>
      unwrap(api.GET('/v1/optimizations/{id}', { params: { path: { id: id! } } })),
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' || query.state.data?.status === 'RUNNING' ? 1000 : false,
  });
}

/** The newest finished plan for a list, if there is one — for Inicio's card. */
export function useLatestPlan(listId: string | undefined) {
  const { api } = useSession();

  return useQuery({
    queryKey: latestKey(listId ?? 'none'),
    enabled: !!listId,
    queryFn: async () => {
      const page = await unwrap(
        api.GET('/v1/optimizations', { params: { query: { listId, pageSize: 5 } } }),
      );
      const done = page.data.find((summary) => summary.status === 'COMPLETED');
      return done
        ? unwrap(api.GET('/v1/optimizations/{id}', { params: { path: { id: done.id } } }))
        : null;
    },
  });
}

export function usePlanPreferences() {
  const { api } = useSession();

  return useQuery({
    queryKey: ['optimization-preferences'],
    queryFn: () => unwrap(api.GET('/v1/optimization-preferences')),
  });
}

export function useSavePlanPreferences() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: components['schemas']['UpdateOptimizationPreferencesRequest']) =>
      unwrap(api.PATCH('/v1/optimization-preferences', { body: changes })),
    onSuccess: (saved) => queryClient.setQueryData(['optimization-preferences'], saved),
  });
}
