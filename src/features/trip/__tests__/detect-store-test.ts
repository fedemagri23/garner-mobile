import { detectStore, HERE_KM, pricesIn } from '../detect-store';

const store = (name: string, distanceKm: number, country = 'AR') => ({ name, distanceKm, country });

describe('detectStore', () => {
  it('picks the nearest shop when the phone is in it', () => {
    expect(detectStore([store('Día', 0.25), store('Coto', 0.08)])?.name).toBe('Coto');
  });

  it('detects nothing when the nearest shop is further than a shop’s width', () => {
    expect(detectStore([store('Coto', HERE_KM + 0.01)])).toBeNull();
    expect(detectStore([])).toBeNull();
  });
});

it('knows which shops price in the list’s currency', () => {
  expect(pricesIn(store('Billa', 0.1, 'AT'), 'EUR')).toBe(true);
  expect(pricesIn(store('Billa', 0.1, 'AT'), 'ARS')).toBe(false);
});
