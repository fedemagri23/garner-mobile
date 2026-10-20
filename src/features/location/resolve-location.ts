import { t } from '@/i18n';

export interface Point {
  latitude: number;
  longitude: number;
}

/** Where to look from: the phone's position, or the one saved in preferences. */
export type LocationSource = 'device' | 'saved';

/** `auto` uses the phone's position when allowed, the saved one otherwise. */
export type LocationMode = 'auto' | LocationSource;

export type ShopperLocation =
  | { status: 'locating' }
  | { status: 'none' }
  | { status: 'ready'; point: Point; source: LocationSource; label: string };

export interface LocationInputs {
  mode: LocationMode;
  /** Undefined while still asking; null when denied or unavailable. */
  device: Point | null | undefined;
  /** Undefined while loading preferences; null when none is saved. */
  saved: (Point & { label: string | null }) | null | undefined;
}

/**
 * Which point the app searches from. Pure, so the fallbacks are testable
 * without a phone: an explicit choice wins when it is available, and `auto`
 * waits for the phone's answer before falling back, so the screen does not
 * flash the saved place and then jump.
 */
export function resolveLocation({ mode, device, saved }: LocationInputs): ShopperLocation {
  const fromDevice = (point: Point): ShopperLocation => ({
    status: 'ready',
    point,
    source: 'device',
    label: t('shell.location.current'),
  });
  const fromSaved = (place: Point & { label: string | null }): ShopperLocation => ({
    status: 'ready',
    point: { latitude: place.latitude, longitude: place.longitude },
    source: 'saved',
    label: place.label ?? t('shell.location.saved'),
  });

  if (mode === 'saved' && saved) {
    return fromSaved(saved);
  }

  if (mode !== 'saved' || saved === null) {
    if (device) {
      return fromDevice(device);
    }
    if (device === undefined) {
      return { status: 'locating' };
    }
  }

  if (saved) {
    return fromSaved(saved);
  }

  return saved === undefined ? { status: 'locating' } : { status: 'none' };
}
