import { resolveLocation } from '../resolve-location';

const phone = { latitude: -34.61, longitude: -58.42 };
const centro = { latitude: -34.6037, longitude: -58.3816, label: 'Centro' };

describe('resolveLocation', () => {
  it('uses the phone when it is allowed', () => {
    expect(resolveLocation({ mode: 'auto', device: phone, saved: centro })).toEqual({
      status: 'ready',
      point: phone,
      source: 'device',
      label: 'Tu ubicación',
    });
  });

  it('falls back to the saved place when the phone says no', () => {
    expect(resolveLocation({ mode: 'auto', device: null, saved: centro })).toMatchObject({
      status: 'ready',
      source: 'saved',
      label: 'Centro',
      point: { latitude: centro.latitude, longitude: centro.longitude },
    });
  });

  it('waits for the phone before falling back', () => {
    expect(resolveLocation({ mode: 'auto', device: undefined, saved: centro })).toEqual({
      status: 'locating',
    });
  });

  it('honours an explicit choice of the saved place', () => {
    expect(resolveLocation({ mode: 'saved', device: phone, saved: centro })).toMatchObject({
      source: 'saved',
    });
  });

  it('uses the phone when the saved place was chosen but none exists', () => {
    expect(resolveLocation({ mode: 'saved', device: phone, saved: null })).toMatchObject({
      source: 'device',
    });
  });

  it('names an unlabelled saved place generically', () => {
    expect(
      resolveLocation({ mode: 'auto', device: null, saved: { ...centro, label: null } }),
    ).toMatchObject({ label: 'Ubicación guardada' });
  });

  it('has nowhere to look from with neither', () => {
    expect(resolveLocation({ mode: 'auto', device: null, saved: null })).toEqual({ status: 'none' });
  });
});
