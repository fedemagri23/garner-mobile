import { firstOpenStop, spentAt, stopsOf, type Trip, type TripItem } from '../stops';

const line = (id: string, store: string | null, overrides: Partial<TripItem> = {}): TripItem =>
  ({
    id,
    product: { id: `p-${id}`, name: id },
    quantity: 1,
    store: store ? { id: store, name: `Store ${store}`, supermarketName: store } : null,
    isPurchased: false,
    actualLineTotalCents: null,
    expectedLineTotalCents: 100,
    ...overrides,
  }) as TripItem;

const trip = (items: TripItem[], store: Trip['store'] = null) => ({ items, store }) as Trip;

describe('stopsOf', () => {
  it('groups lines by store, in the order the trip lists them', () => {
    const stops = stopsOf(trip([line('a', 'x'), line('b', 'y'), line('c', 'x')]));

    expect(stops.map((stop) => [stop.key, stop.items.map((item) => item.id)])).toEqual([
      ['x', ['a', 'c']],
      ['y', ['b']],
    ]);
  });

  it('puts lines without a store together, or under the trip\'s store', () => {
    expect(stopsOf(trip([line('a', null), line('b', null)]))[0]).toMatchObject({ key: 'none', storeName: null });
    expect(
      stopsOf(trip([line('a', null)], { id: 's', name: 'Coto', supermarketName: 'Coto' }))[0],
    ).toMatchObject({ key: 's', storeName: 'Coto' });
  });
});

describe('firstOpenStop', () => {
  it('starts where something is still to buy', () => {
    const stops = stopsOf(trip([line('a', 'x', { isPurchased: true }), line('b', 'y')]));
    expect(firstOpenStop(stops)).toBe(1);
  });

  it('stays on the last stop when everything is bought', () => {
    const stops = stopsOf(trip([line('a', 'x', { isPurchased: true }), line('b', 'y', { isPurchased: true })]));
    expect(firstOpenStop(stops)).toBe(1);
  });
});

describe('spentAt', () => {
  it('adds what was paid, or the expected price where nothing was typed', () => {
    const [stop] = stopsOf(
      trip([
        line('a', 'x', { isPurchased: true, actualLineTotalCents: 250 }),
        line('b', 'x', { isPurchased: true }),
        line('c', 'x'),
      ]),
    );
    expect(spentAt(stop)).toBe(350);
  });
});
