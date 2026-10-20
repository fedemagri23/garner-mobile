import type { components } from '@/api/types';

export type TripItem = components['schemas']['ShoppingSessionItemResponse'];
export type Trip = components['schemas']['ShoppingSessionDetailResponse'];

export interface Stop {
  /** The store's id, or "none" for lines with no store. */
  key: string;
  storeName: string | null;
  items: TripItem[];
}

/**
 * A trip's lines as stops, in the order the trip lists them — route order
 * when it follows a plan. Lines without a store make one stop of their own.
 */
export function stopsOf(trip: Trip): Stop[] {
  const stops: Stop[] = [];

  for (const item of trip.items) {
    const store = item.store ?? trip.store;
    const key = store?.id ?? 'none';
    let stop = stops.find((entry) => entry.key === key);
    if (!stop) {
      stop = { key, storeName: store?.name ?? null, items: [] };
      stops.push(stop);
    }
    stop.items.push(item);
  }

  return stops;
}

/** Where to start: the first stop with something left to buy. */
export function firstOpenStop(stops: Stop[]): number {
  const index = stops.findIndex((stop) => stop.items.some((item) => !item.isPurchased));
  return index === -1 ? Math.max(0, stops.length - 1) : index;
}

/** What has been spent at a stop: the price paid, or the expected one when none was typed. */
export function spentAt(stop: Stop): number {
  return stop.items
    .filter((item) => item.isPurchased)
    .reduce((sum, item) => sum + (item.actualLineTotalCents ?? item.expectedLineTotalCents ?? 0), 0);
}
