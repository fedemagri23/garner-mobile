import { useQuery } from '@tanstack/react-query';

import { unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { useShopperLocation } from '@/features/location/location-provider';
import { useSession } from '@/session/session-provider';

export type StorePrice = components['schemas']['StorePriceResponse'];
export type PriceDrop = components['schemas']['PriceDropResponse'];
export type PricePoint = components['schemas']['DailyPricePointResponse'];

/**
 * A product's current prices by store, cheapest first. Near the shopper when
 * there is a location; across every store otherwise, without distances.
 */
export function useProductPrices(productId: string) {
  const { api } = useSession();
  const { location, radiusKm } = useShopperLocation();
  const point = location.status === 'ready' ? location.point : null;

  return useQuery({
    queryKey: ['prices', productId, point, radiusKm],
    enabled: location.status !== 'locating',
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{id}/prices', {
          params: {
            path: { id: productId },
            query: point ? { ...point, radiusKm } : {},
          },
        }),
      ),
  });
}

/** The last 30 days across every store, oldest first. */
export function usePriceHistory(productId: string) {
  const { api } = useSession();

  return useQuery({
    queryKey: ['price-history', productId],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{id}/prices/history', {
          params: { path: { id: productId }, query: { range: '30d' } },
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
