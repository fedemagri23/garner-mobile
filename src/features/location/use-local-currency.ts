import { useQuery } from '@tanstack/react-query';

import { unwrap } from '@/api/client';
import { useSession } from '@/session/session-provider';

import { useShopperLocation } from './location-provider';

/** The money shops are priced in, by the country they are in. */
export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  AR: 'ARS',
  AT: 'EUR',
  BE: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  BR: 'BRL',
  CL: 'CLP',
  UY: 'UYU',
  US: 'USD',
};

/**
 * The currency of the nearest store to the shopper — what a new list should
 * be in, since a list is priced at the stores around it. `currency` is null
 * while looking, and when there is no location, no store within 50 km, or
 * the lookup failed: then the screen asks rather than guessing.
 */
export function useLocalCurrency(): { currency: string | null; looking: boolean } {
  const { api } = useSession();
  const { location } = useShopperLocation();
  const point = location.status === 'ready' ? location.point : null;

  const nearest = useQuery({
    queryKey: ['nearest-store', point],
    enabled: point !== null,
    staleTime: 10 * 60_000,
    queryFn: () =>
      unwrap(
        api.GET('/v1/stores/nearby', {
          params: { query: { ...point!, radiusKm: 50, limit: 1 } },
        }),
      ),
  });

  const country = nearest.data?.[0]?.country;
  return {
    currency: country ? (CURRENCY_BY_COUNTRY[country] ?? null) : null,
    looking: location.status === 'locating' || (point !== null && nearest.isPending),
  };
}
