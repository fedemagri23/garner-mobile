import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { unwrap } from '@/api/client';
import { useSession } from '@/session/session-provider';

import {
  resolveLocation,
  type LocationMode,
  type Point,
  type ShopperLocation,
} from './resolve-location';

export const preferencesQueryKey = ['preferences'] as const;

interface LocationContextValue {
  location: ShopperLocation;
  /** The shopper's search radius from preferences, in kilometres. */
  radiusKm: number;
  /** Whether both a phone position and a saved place exist to choose between. */
  canSwitch: boolean;
  /**
   * Where the phone itself is, whatever the chip says: what tells which shop
   * the shopper is standing in. Undefined while asking; null when unknown.
   */
  device: Point | null | undefined;
  mode: LocationMode;
  setMode: (mode: LocationMode) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * The phone's position, asked for once and kept a few minutes. Null when
 * permission is refused or the phone cannot say — a normal answer, not an
 * error.
 */
async function devicePosition(): Promise<Point | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) {
      return null;
    }

    // A recent fix is good enough to pick nearby stores, and instant.
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

/** Where "near me" is, for every screen under the tabs. */
export function LocationProvider({ children }: { children: ReactNode }) {
  const { api } = useSession();
  const [mode, setMode] = useState<LocationMode>('auto');

  const device = useQuery({
    queryKey: ['device-position'],
    queryFn: devicePosition,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const preferences = useQuery({
    queryKey: preferencesQueryKey,
    queryFn: () => unwrap(api.GET('/v1/users/me/preferences')),
  });

  const prefs = preferences.data;
  const saved =
    preferences.isPending
      ? undefined
      : prefs && prefs.latitude !== null && prefs.longitude !== null
        ? { latitude: prefs.latitude, longitude: prefs.longitude, label: prefs.locationLabel }
        : null;
  const devicePoint = device.isPending ? undefined : (device.data ?? null);

  return (
    <LocationContext.Provider
      value={{
        location: resolveLocation({ mode, device: devicePoint, saved }),
        radiusKm: prefs?.searchRadiusKm ?? 5,
        canSwitch: !!devicePoint && !!saved,
        device: devicePoint,
        mode,
        setMode,
      }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useShopperLocation(): LocationContextValue {
  const value = useContext(LocationContext);
  if (!value) {
    throw new Error('useShopperLocation must be used inside LocationProvider');
  }
  return value;
}
