import type { Trip, TripItem } from '@/features/trip/stops';

import {
  applyChanges,
  drain,
  enqueue,
  pendingItemIds,
  pendingReports,
  type Change,
  type Progress,
  type ReportChange,
} from '../changes';

const item = (id: string, overrides: Partial<TripItem> = {}): TripItem =>
  ({
    id,
    product: { id: `p-${id}`, name: id },
    quantity: 2,
    isPurchased: false,
    purchasedAt: null,
    actualUnitPriceCents: null,
    actualLineTotalCents: null,
    expectedUnitPriceCents: 100,
    expectedLineTotalCents: 200,
    ...overrides,
  }) as TripItem;

const trip = (items: TripItem[]): Trip =>
  ({
    id: 'trip-1',
    status: 'ACTIVE',
    items,
    totals: {
      expectedTotalCents: 400,
      actualTotalCents: 0,
      remainingExpectedTotalCents: 400,
      projectedTotalCents: 400,
      itemCount: 2,
      purchasedItemCount: 0,
      unpricedItemCount: 0,
    },
  }) as Trip;

let counter = 0;
const tick = (itemId: string, progress: Progress, tripId = 'trip-1'): Change => ({
  kind: 'item',
  id: `change-${++counter}`,
  tripId,
  itemId,
  progress,
});
const status = (action: 'pause' | 'resume' | 'complete' | 'abandon'): Change => ({
  kind: 'status',
  id: `change-${++counter}`,
  tripId: 'trip-1',
  action,
  at: '2026-10-21T10:00:00Z',
});

describe('enqueue', () => {
  it('keeps changes in the order they happened', () => {
    const queue = [tick('a', { isPurchased: true }), tick('b', { isPurchased: true })].reduce(
      (all, change) => enqueue(all, change),
      [] as Change[],
    );

    expect(queue.map((change) => (change.kind === 'item' ? change.itemId : '')).join()).toBe('a,b');
  });

  it('merges changes to one line into a single one to send', () => {
    let queue: Change[] = [];
    queue = enqueue(queue, tick('a', { isPurchased: true, purchasedAt: 'T1' }));
    queue = enqueue(queue, tick('b', { isPurchased: true }));
    queue = enqueue(queue, tick('a', { isPurchased: false }));
    queue = enqueue(queue, tick('a', { isPurchased: true, actualUnitPriceCents: 150, purchasedAt: 'T2' }));

    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({
      itemId: 'a',
      progress: { isPurchased: true, actualUnitPriceCents: 150, purchasedAt: 'T2' },
    });
  });

  it('does not merge across a status change: that order has to be kept', () => {
    let queue: Change[] = [];
    queue = enqueue(queue, tick('a', { isPurchased: true }));
    queue = enqueue(queue, status('pause'));
    queue = enqueue(queue, tick('a', { isPurchased: false }));

    expect(queue.map((change) => change.kind)).toEqual(['item', 'status', 'item']);
  });

  it('never merges into entries that are being sent', () => {
    let queue: Change[] = [];
    queue = enqueue(queue, tick('a', { isPurchased: true }));
    // The first entry is on its way to the server: a later change is its own.
    queue = enqueue(queue, tick('a', { isPurchased: false }), 1);

    expect(queue).toHaveLength(2);
  });

  it('keeps changes to different trips apart', () => {
    let queue: Change[] = [];
    queue = enqueue(queue, tick('a', { isPurchased: true }, 'trip-1'));
    queue = enqueue(queue, tick('a', { isPurchased: true }, 'trip-2'));

    expect(queue).toHaveLength(2);
  });
});

describe('drain', () => {
  const three = [tick('a', { isPurchased: true }), tick('b', { isPurchased: true }), status('complete')];

  it('sends everything in order when the server takes it all', async () => {
    const order: string[] = [];
    const result = await drain(three, async (change) => {
      order.push(change.kind === 'item' ? change.itemId : change.kind === 'status' ? change.action : 'report');
      return { result: 'ok' };
    });

    expect(order).toEqual(['a', 'b', 'complete']);
    expect(result).toMatchObject({ remaining: [], sent: 3, dropped: [] });
  });

  it('stops at the first change that cannot go, keeping it and what follows', async () => {
    let calls = 0;
    const result = await drain(three, async () => (++calls === 2 ? { result: 'retry' } : { result: 'ok' }));

    expect(calls).toBe(2);
    expect(result.sent).toBe(1);
    expect(result.remaining).toEqual(three.slice(1));
  });

  it('drops what the server will never take and carries on', async () => {
    const result = await drain(three, async (change) =>
      change.kind === 'item' && change.itemId === 'a' ? { result: 'drop' } : { result: 'ok' },
    );

    expect(result.dropped).toEqual([three[0]]);
    expect(result).toMatchObject({ remaining: [], sent: 2 });
  });

  it('hands back the last trip the server answered with', async () => {
    const answered = trip([]);
    const result = await drain(three, async (change) =>
      change.kind === 'status' ? { result: 'ok', trip: answered } : { result: 'ok' },
    );

    expect(result.lastTrip).toBe(answered);
  });

  it('is a no-op on an empty queue', async () => {
    expect(await drain([], async () => ({ result: 'ok' }))).toEqual({
      remaining: [],
      sent: 0,
      dropped: [],
      sentKinds: new Set(),
    });
  });
});

describe('pendingItemIds', () => {
  it('names the lines of a trip that still have something to send', () => {
    const queue = [tick('a', { isPurchased: true }), tick('b', { isPurchased: true }, 'trip-2'), status('pause')];

    expect([...pendingItemIds(queue, 'trip-1')]).toEqual(['a']);
  });
});

describe('applyChanges', () => {
  it('shows a ticked line as bought, at the price paid, with totals to match', () => {
    const view = applyChanges(trip([item('a'), item('b')]), [
      tick('a', { isPurchased: true, actualUnitPriceCents: 150, purchasedAt: 'T1' }),
    ]);

    expect(view.items[0]).toMatchObject({ isPurchased: true, actualUnitPriceCents: 150, actualLineTotalCents: 300 });
    expect(view.totals).toMatchObject({
      purchasedItemCount: 1,
      actualTotalCents: 300,
      remainingExpectedTotalCents: 200,
      projectedTotalCents: 500,
    });
  });

  it('counts a line bought without a price at what was expected', () => {
    const view = applyChanges(trip([item('a')]), [tick('a', { isPurchased: true })]);

    expect(view.totals.actualTotalCents).toBe(200);
  });

  it('puts an unticked line back, and clears a price set to null', () => {
    const bought = item('a', { isPurchased: true, actualUnitPriceCents: 150, actualLineTotalCents: 300 });
    const view = applyChanges(trip([bought]), [tick('a', { isPurchased: false, actualUnitPriceCents: null })]);

    expect(view.items[0]).toMatchObject({ isPurchased: false, actualUnitPriceCents: null, actualLineTotalCents: null });
  });

  it('follows status changes in order', () => {
    const base = trip([item('a')]);

    expect(applyChanges(base, [status('pause')]).status).toBe('PAUSED');
    expect(applyChanges(base, [status('pause'), status('resume')]).status).toBe('ACTIVE');
    expect(applyChanges(base, [status('complete')]).status).toBe('COMPLETED');
  });

  it('leaves the trip alone when nothing is waiting for it', () => {
    const base = trip([item('a')]);

    expect(applyChanges(base, [])).toBe(base);
    expect(applyChanges(base, [tick('a', { isPurchased: true }, 'trip-2')])).toBe(base);
  });
});

const report = (id: string, overrides: Partial<ReportChange> = {}): ReportChange => ({
  kind: 'report',
  id,
  productId: 'p1',
  productName: 'Leche',
  storeId: 's1',
  storeName: 'Coto',
  priceCents: 139000,
  currency: 'ARS',
  observedAt: '2026-10-21T10:00:00Z',
  photoUri: null,
  ...overrides,
});

describe('price reports in the queue', () => {
  it('are never merged, and wait in order with the trip\'s changes', () => {
    let queue: Change[] = [];
    queue = enqueue(queue, tick('a', { isPurchased: true }));
    queue = enqueue(queue, report('r1'));
    queue = enqueue(queue, report('r2', { priceCents: 135000 }));

    expect(queue.map((change) => change.kind)).toEqual(['item', 'report', 'report']);
    expect(pendingReports(queue).map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('do not touch a trip\'s view', () => {
    const base = trip([item('a')]);

    expect(applyChanges(base, [report('r1')])).toBe(base);
    expect(pendingItemIds([report('r1')], 'trip-1').size).toBe(0);
  });

  it('keep a photo that is already up when their own send has to be retried', async () => {
    const queue: Change[] = [report('r1', { photoUri: 'file:///label.jpg' }), tick('a', { isPurchased: true })];

    const result = await drain(queue, async () => ({ result: 'retry', patch: { photoKey: 'user/photo.jpg' } }));

    expect(result.sent).toBe(0);
    expect(result.remaining).toHaveLength(2);
    expect(result.remaining[0]).toMatchObject({ id: 'r1', photoKey: 'user/photo.jpg' });
    // The queue the caller passed is not changed behind its back.
    expect(queue[0]).not.toHaveProperty('photoKey');
  });

  it('say what kinds were sent, to know what to refresh', async () => {
    const result = await drain([tick('a', { isPurchased: true }), report('r1')], async () => ({ result: 'ok' }));

    expect([...result.sentKinds].sort()).toEqual(['item', 'report']);
  });
});
