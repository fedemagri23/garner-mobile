import type { components } from '@/api/types';
import type { Trip, TripItem } from '@/features/trip/stops';

/**
 * What a shopper changes during a trip, kept until the server has it.
 *
 * The outbox is a list of these in the order they happened. Replaying them
 * in that order is safe because each one is absolute — "this line is bought
 * at 1.350", "the trip is paused" — never "one more", so sending the same
 * change twice lands the same state, which is what lets a lost connection
 * mid-send be retried blindly.
 */

export type Progress = components['schemas']['RecordItemProgressRequest'];
export type StatusAction = 'pause' | 'resume' | 'complete' | 'abandon';

export type Change =
  | { kind: 'item'; id: string; tripId: string; itemId: string; progress: Progress }
  | { kind: 'status'; id: string; tripId: string; action: StatusAction; at: string };

/** How one change ended when it was sent. */
export type SendResult =
  | { result: 'ok'; trip?: Trip }
  /** The server will never accept it (the trip is over, the line is gone). */
  | { result: 'drop' }
  /**
   * Try again later: no connection (`unreachable`), or a server that answered
   * but is busy or limiting us.
   */
  | { result: 'retry'; unreachable?: boolean };

/**
 * Adds a change at the end. Changes to the same line merge into its earlier
 * entry while nothing about the trip's status came in between: ticking,
 * unticking and ticking again with a price is one change to send, not three.
 *
 * The first `frozen` entries are being sent right now and are never merged
 * into: a change folded into one the server already has would be lost.
 */
export function enqueue(queue: Change[], change: Change, frozen = 0): Change[] {
  if (change.kind === 'item') {
    const lastStatus = queue.findLastIndex((entry) => entry.kind === 'status');
    const index = queue.findLastIndex(
      (entry, i) =>
        i >= frozen &&
        i > lastStatus &&
        entry.kind === 'item' &&
        entry.tripId === change.tripId &&
        entry.itemId === change.itemId,
    );

    if (index !== -1) {
      const earlier = queue[index] as Extract<Change, { kind: 'item' }>;
      return queue.map((entry, i) =>
        i === index ? { ...earlier, progress: { ...earlier.progress, ...change.progress } } : entry,
      );
    }
  }

  return [...queue, change];
}

/**
 * Sends the queue in order until one change cannot go yet. Everything before
 * it is done (or dropped, if the server will never take it); it and what
 * follows stay, in order.
 */
export async function drain(
  queue: Change[],
  send: (change: Change) => Promise<SendResult>,
): Promise<{ remaining: Change[]; sent: number; dropped: Change[]; lastTrip?: Trip }> {
  let index = 0;
  let sent = 0;
  let lastTrip: Trip | undefined;
  const dropped: Change[] = [];

  while (index < queue.length) {
    const outcome = await send(queue[index]);

    if (outcome.result === 'retry') {
      break;
    }
    if (outcome.result === 'drop') {
      dropped.push(queue[index]);
    } else {
      sent += 1;
      lastTrip = outcome.trip ?? lastTrip;
    }
    index += 1;
  }

  return { remaining: queue.slice(index), sent, dropped, lastTrip };
}

/** The lines with something still waiting to be sent. */
export function pendingItemIds(queue: Change[], tripId: string): Set<string> {
  return new Set(
    queue.flatMap((change) => (change.kind === 'item' && change.tripId === tripId ? [change.itemId] : [])),
  );
}

const STATUS_AFTER: Record<StatusAction, Trip['status']> = {
  pause: 'PAUSED',
  resume: 'ACTIVE',
  complete: 'COMPLETED',
  abandon: 'ABANDONED',
};

/**
 * The trip as the shopper sees it: the server's copy with everything still
 * waiting to be sent applied on top, totals included. When the queue empties
 * the server's own answer replaces this, and the two agree.
 */
export function applyChanges(trip: Trip, queue: Change[]): Trip {
  const mine = queue.filter((change) => change.tripId === trip.id);
  if (mine.length === 0) {
    return trip;
  }

  let status = trip.status;
  const items = new Map<string, TripItem>(trip.items.map((item) => [item.id, item]));

  for (const change of mine) {
    if (change.kind === 'status') {
      status = STATUS_AFTER[change.action];
      continue;
    }

    const item = items.get(change.itemId);
    if (!item) {
      continue;
    }
    const { progress } = change;
    const price =
      progress.actualUnitPriceCents === undefined ? item.actualUnitPriceCents : progress.actualUnitPriceCents;
    const purchased = progress.isPurchased ?? item.isPurchased;

    items.set(change.itemId, {
      ...item,
      isPurchased: purchased,
      purchasedAt: purchased ? (progress.purchasedAt ?? item.purchasedAt) : null,
      actualUnitPriceCents: price,
      actualLineTotalCents: price === null ? null : Math.round(price * item.quantity),
    });
  }

  const lines = [...items.values()];
  const bought = lines.filter((item) => item.isPurchased);
  const total = (item: TripItem) => item.actualLineTotalCents ?? item.expectedLineTotalCents ?? 0;
  const actual = bought.reduce((sum, item) => sum + total(item), 0);
  const remaining = lines
    .filter((item) => !item.isPurchased)
    .reduce((sum, item) => sum + (item.expectedLineTotalCents ?? 0), 0);

  return {
    ...trip,
    status,
    items: lines,
    totals: {
      ...trip.totals,
      actualTotalCents: actual,
      remainingExpectedTotalCents: remaining,
      projectedTotalCents: actual + remaining,
      purchasedItemCount: bought.length,
    },
  };
}
