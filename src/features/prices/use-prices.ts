import { useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrap, type Api } from '@/api/client';
import type { components } from '@/api/types';
import { useShopperLocation } from '@/features/location/location-provider';
import { useSession } from '@/session/session-provider';

export type StorePrice = components['schemas']['StorePriceResponse'];
export type PriceDrop = components['schemas']['PriceDropResponse'];
export type PricePoint = components['schemas']['DailyPricePointResponse'];

type Point = { latitude: number; longitude: number };

/** One definition of the comparison query, shared by the hook and by one-off reads. */
function productPricesQuery(api: Api, productId: string, point: Point | null, radiusKm: number) {
  return {
    queryKey: ['prices', productId, point, radiusKm],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{id}/prices', {
          params: {
            path: { id: productId },
            query: point ? { ...point, radiusKm } : {},
          },
        }),
      ),
  };
}

/**
 * A product's current prices by store, cheapest first. Near the shopper when
 * there is a location; across every store otherwise, without distances.
 */
export function useProductPrices(productId: string) {
  const { api } = useSession();
  const { location, radiusKm } = useShopperLocation();
  const point = location.status === 'ready' ? location.point : null;

  return useQuery({
    ...productPricesQuery(api, productId, point, radiusKm),
    enabled: location.status !== 'locating',
  });
}

/**
 * Looks up the cheapest price near the shopper in a given currency — what a
 * list item is expected to cost when it is added. Undefined when nobody near
 * has reported it, or there is no location to be near.
 */
export function useCheapestNearby() {
  const { api } = useSession();
  const queryClient = useQueryClient();
  const { location, radiusKm } = useShopperLocation();

  return async (productId: string, currency: string): Promise<number | undefined> => {
    if (location.status !== 'ready') {
      return undefined;
    }
    try {
      const comparison = await queryClient.fetchQuery({
        ...productPricesQuery(api, productId, location.point, radiusKm),
        staleTime: 60_000,
      });
      return comparison.prices.find((price) => price.currency === currency)?.priceCents;
    } catch {
      // A list item without an expected price is still a list item.
      return undefined;
    }
  };
}

/**
 * The last 30 days across every store, oldest first, in one currency: the
 * one of the prices near the shopper when known (a product sold in Buenos
 * Aires and Vienna has a peso and a euro history), else the backend's pick.
 */
export function usePriceHistory(productId: string, currency: string | undefined, enabled = true) {
  const { api } = useSession();

  return useQuery({
    queryKey: ['price-history', productId, currency],
    enabled,
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{id}/prices/history', {
          params: { path: { id: productId }, query: { range: '30d', currency } },
        }),
      ),
  });
}

/** "Bajaron cerca tuyo": this week's biggest falls near the shopper. */
export function usePriceDrops(limit = 5) {
  const { api } = useSession();
  const { location, radiusKm } = useShopperLocation();
  const point = location.status === 'ready' ? location.point : null;

  return useQuery({
    queryKey: ['price-drops', point, radiusKm, limit],
    enabled: point !== null,
    queryFn: () =>
      unwrap(
        api.GET('/v1/price-drops', {
          params: { query: { ...point!, radiusKm, limit } },
        }),
      ),
  });
}
