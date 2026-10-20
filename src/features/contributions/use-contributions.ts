import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useShopperLocation } from '@/features/location/location-provider';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { useSession } from '@/session/session-provider';

export type Contribution = components['schemas']['ContributionResponse'];
export type NearbyStore = components['schemas']['NearbyStoreResponse'];

/** The stores around the shopper, nearest first: where a price could have been seen. */
export function useStoresNear(limit = 6) {
  const { api } = useSession();
  const { location, radiusKm } = useShopperLocation();
  const point = location.status === 'ready' ? location.point : null;

  return useQuery({
    queryKey: ['stores-near', point, radiusKm, limit],
    enabled: point !== null,
    queryFn: () =>
      unwrap(api.GET('/v1/stores/nearby', { params: { query: { ...point!, radiusKm, limit } } })),
  });
}

/** The prices the shopper has reported or bought, newest first, a page at a time. */
export function useMyContributions() {
  const { api } = useSession();

  return useInfiniteQuery({
    queryKey: ['contributions'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      unwrap(api.GET('/v1/price-observations/mine', { params: { query: { page: pageParam, pageSize: 20 } } })),
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

/**
 * Reports a price seen on a shelf. It goes on the phone's queue at once and
 * is sent when it can; the returned id is how to tell when it has been.
 */
export function useReportPrice() {
  const outbox = useOutbox();

  return (input: {
    productId: string;
    productName: string;
    storeId: string;
    storeName: string;
    priceCents: number;
    currency: string;
    photoUri: string | null;
  }): string => {
    const id = randomUUID();
    outbox.add({ kind: 'report', id, observedAt: new Date().toISOString(), ...input });
    return id;
  };
}
