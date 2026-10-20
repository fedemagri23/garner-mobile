import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from '@/features/trip/stops';

import type { Change } from '../changes';
import { clearOutboxStorage, loadQueue, loadTrip, saveQueue, saveTrip } from '../storage';

const change: Change = { kind: 'item', id: 'c1', tripId: 't1', itemId: 'i1', progress: { isPurchased: true } };

beforeEach(() => AsyncStorage.clear());

describe('the outbox on disk', () => {
  it('brings back the queue as it was saved, in order', async () => {
    const queue: Change[] = [change, { kind: 'status', id: 'c2', tripId: 't1', action: 'pause', at: 'T' }];
    await saveQueue(queue);

    expect(await loadQueue()).toEqual(queue);
  });

  it('brings back a price report, photo and all, and drops one missing its price', async () => {
    const report: Change = {
      kind: 'report',
      id: 'r1',
      productId: 'p1',
      productName: 'Leche',
      storeId: 's1',
      storeName: 'Coto',
      priceCents: 139000,
      currency: 'ARS',
      observedAt: 'T',
      photoUri: 'file:///label.jpg',
    };
    await AsyncStorage.setItem('garner.outbox.v1', JSON.stringify([report, { kind: 'report', id: 'r2' }]));

    expect(await loadQueue()).toEqual([report]);
  });

  it('is empty when nothing was saved', async () => {
    expect(await loadQueue()).toEqual([]);
    expect(await loadTrip()).toBeNull();
  });

  it('treats damaged data as empty, and drops entries it cannot read', async () => {
    await AsyncStorage.setItem('garner.outbox.v1', '{not json');
    expect(await loadQueue()).toEqual([]);

    await AsyncStorage.setItem('garner.outbox.v1', JSON.stringify([change, { nonsense: true }, 7]));
    expect(await loadQueue()).toEqual([change]);
  });

  it('remembers the last trip, and forgets it when there is none', async () => {
    const trip = { id: 't1', items: [] } as unknown as Trip;
    await saveTrip(trip);
    expect(await loadTrip()).toEqual(trip);

    await saveTrip(null);
    expect(await loadTrip()).toBeNull();
  });

  it('is wiped on sign-out', async () => {
    await saveQueue([change]);
    await saveTrip({ id: 't1' } as unknown as Trip);

    await clearOutboxStorage();

    expect(await loadQueue()).toEqual([]);
    expect(await loadTrip()).toBeNull();
  });
});
