import type { components } from '@/api/types';
import type { Trip, TripItem } from '@/features/trip/stops';

/**
 * What a shopper does that the server has to hear about, kept until it has:
 * changes during a trip, prices reported from a shelf, and products added to
 * the catalog.
 *
 * The outbox is a list of these in the order they happened. Replaying them
 * in that order is safe because each one is absolute — "this line is bought
 * at 1.350", "the trip is paused" — never "one more", so sending the same
 * change twice lands the same state, which is what lets a lost connection
 * mid-send be retried blindly.
 */

export type Progress = components['schemas']['RecordItemProgressRequest'];
export type StatusAction = 'pause' | 'resume' | 'complete' | 'abandon';

export type ItemChange = { kind: 'item'; id: string; tripId: string; itemId: string; progress: Progress };
export type StatusChange = { kind: 'status'; id: string; tripId: string; action: StatusAction; at: string };

/**
 * A price seen on a shelf. Its `id` is the report's own id on the server, so
 * a send that is repeated lands one report, not two. The names are only for
 * showing it while it waits.
 */
export type ReportChange = {
  kind: 'report';
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  priceCents: number;
  currency: string;
  observedAt: string;
  /** A photo of the shelf label, kept on the phone until it is uploaded. */
  photoUri: string | null;
  /** Set once the photo is on the server, so a retry does not upload it again. */
  photoKey?: string;
};

/**
 * A product added to the catalog with no connection. Its `id` becomes the
 * product's id on the server, so sending it twice adds it once.
 */
export type ProductChange = {
  kind: 'product';
  id: string;
  addedAt: string;
  product: components['schemas']['CreateProductRequest'] & { id: string };
  /** For showing it while it waits. */
  brandLabel: string | null;
};

export type Change = ItemChange | StatusChange | ReportChange | ProductChange;

/** The changes that belong to a trip. */
export const isTripChange = (change: Change): change is ItemChange | StatusChange =>
  change.kind === 'item' || change.kind === 'status';

/** How one change ended when it was sent. */
export type SendResult =
  | { result: 'ok'; trip?: Trip }
  /** The server will never accept it (the trip is over, the line is gone). */
  | { result: 'drop' }
  /**
   * Try again later: no connection (`unreachable`), or a server that answered
   * but is busy or limiting us.
   */
  | { result: 'retry'; unreachable?: boolean; patch?: Partial<ReportChange> };

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
      const earlier = queue[index] as ItemChange;
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
): Promise<{
  remaining: Change[];
  sent: number;
  dropped: Change[];
  /** What each change that was sent was, to know what to refresh. */
  sentKinds: Set<Change['kind']>;
  lastTrip?: Trip;
}> {
  let index = 0;
  let sent = 0;
  let lastTrip: Trip | undefined;
  const dropped: Change[] = [];
  const sentKinds = new Set<Change['kind']>();
  let remainingFirst: Change | undefined;

  while (index < queue.length) {
    const outcome = await send(queue[index]);

    if (outcome.result === 'retry') {
      // Progress made before giving up — a photo already uploaded — is kept.
      const entry = queue[index];
      if (outcome.patch && entry.kind === 'report') {
        remainingFirst = { ...entry, ...outcome.patch };
      }
      break;
    }
    if (outcome.result === 'drop') {
      dropped.push(queue[index]);
    } else {
      sent += 1;
      sentKinds.add(queue[index].kind);
      lastTrip = outcome.trip ?? lastTrip;
    }
    index += 1;
  }

  const remaining = queue.slice(index);
  if (remainingFirst) {
    remaining[0] = remainingFirst;
  }
  return { remaining, sent, dropped, sentKinds, lastTrip };
}

/** The lines with something still waiting to be sent. */
export function pendingItemIds(queue: Change[], tripId: string): Set<string> {
  return new Set(
    queue.flatMap((change) => (change.kind === 'item' && change.tripId === tripId ? [change.itemId] : [])),
  );
}

/** Prices reported and not yet sent, oldest first. */
export const pendingReports = (queue: Change[]): ReportChange[] =>
  queue.filter((change): change is ReportChange => change.kind === 'report');

/** Products added and not yet sent, oldest first. */
export const pendingProducts = (queue: Change[]): ProductChange[] =>
  queue.filter((change): change is ProductChange => change.kind === 'product');

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
  const mine = queue.filter(isTripChange).filter((change) => change.tripId === trip.id);
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
