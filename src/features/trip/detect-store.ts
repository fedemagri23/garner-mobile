import { CURRENCY_BY_COUNTRY } from '@/features/location/use-local-currency';

/**
 * How close the phone must be to a shop to say the shopper is in it: GPS
 * indoors is off by tens of metres, and a big supermarket's door can be far
 * from its pin, so "in it" is generous — but not so wide that the shop across
 * the avenue counts.
 */
export const HERE_KM = 0.3;

interface Nearby {
  distanceKm: number;
  country: string;
}

/**
 * The shop the shopper is standing in, as far as the phone can tell: the
 * nearest one within `HERE_KM`. Null when none is that close. Stores arrive
 * nearest first, but are not trusted to.
 */
export function detectStore<T extends Nearby>(stores: T[]): T | null {
  const nearest = stores.reduce<T | null>(
    (best, store) => (best === null || store.distanceKm < best.distanceKm ? store : best),
    null,
  );
  return nearest && nearest.distanceKm <= HERE_KM ? nearest : null;
}

/** Whether a shop prices in the list's currency, so the trip can follow its prices. */
export const pricesIn = (store: { country: string }, currency: string) =>
  CURRENCY_BY_COUNTRY[store.country] === currency;
