import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from '@/features/trip/stops';

import type { Change } from './changes';

const QUEUE_KEY = 'garner.outbox.v1';
const TRIP_KEY = 'garner.trip.v1';

/**
 * What survives the app being closed: the changes still waiting to be sent,
 * and the last trip the server told us about, so a trip opens offline.
 *
 * Reads never throw — a missing or damaged entry is an empty one. Losing the
 * snapshot costs a refetch; the queue is what matters, and is written on
 * every change.
 */
export async function loadQueue(): Promise<Change[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Change[]).filter(isChange) : [];
  } catch {
    return [];
  }
}

export async function saveQueue(queue: Change[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable: the queue still lives in memory.
  }
}

export async function loadTrip(): Promise<Trip | null> {
  try {
    const raw = await AsyncStorage.getItem(TRIP_KEY);
    return raw ? (JSON.parse(raw) as Trip) : null;
  } catch {
    return null;
  }
}

export async function saveTrip(trip: Trip | null): Promise<void> {
  try {
    if (trip) {
      await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(trip));
    } else {
      await AsyncStorage.removeItem(TRIP_KEY);
    }
  } catch {
    // See saveQueue.
  }
}

/** On sign-out: the next account must not inherit this one's trip or changes. */
export async function clearOutboxStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([QUEUE_KEY, TRIP_KEY]);
  } catch {
    // Nothing more to do.
  }
}

function isChange(value: unknown): value is Change {
  if (typeof value !== 'object' || value === null) return false;
  const change = value as Record<string, unknown>;
  if (typeof change.id !== 'string') return false;

  switch (change.kind) {
    case 'item':
      return typeof change.tripId === 'string' && typeof change.itemId === 'string';
    case 'status':
      return typeof change.tripId === 'string' && typeof change.action === 'string';
    case 'report':
      return (
        typeof change.productId === 'string' &&
        typeof change.storeId === 'string' &&
        typeof change.priceCents === 'number' &&
        typeof change.currency === 'string'
      );
    default:
      return false;
  }
}
