import 'maplibre-gl/dist/maplibre-gl.css';

import type { LngLatLike, Map as MapLibreMap, Marker } from 'maplibre-gl';

import type { MapPoint } from './map-types';

/**
 * The web's map, with no account or key. Its attribution is required, and
 * MapLibre shows it. Declared in the privacy page: the browser asks for the
 * tiles itself, so OpenFreeMap sees its address and the area on screen.
 */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export type { MapLibreMap, Marker };

export const lngLat = (point: MapPoint): LngLatLike => [point.longitude, point.latitude];

/**
 * Opens a map in the element, or says it could not: no WebGL, or the map's
 * server out of reach. Loaded only when needed: it is large, and it touches
 * the browser's window on import, which the static pages do not have.
 */
export async function openMap(
  container: HTMLElement,
  center: MapPoint,
  zoom: number,
  onFailed: () => void,
): Promise<{ map: MapLibreMap; library: typeof import('maplibre-gl') } | null> {
  try {
    const library = await import('maplibre-gl');
    // Served from public/ (scripts/copy-map-worker.mjs): it cannot be found from a bundle.
    library.setWorkerUrl('/maplibre-gl-worker.mjs');
    const map = new library.Map({
      container,
      style: MAP_STYLE,
      center: lngLat(center),
      zoom,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.addControl(new library.NavigationControl({ showCompass: false }), 'bottom-right');

    let loaded = false;
    map.once('load', () => {
      loaded = true;
    });
    map.on('error', () => {
      if (!loaded) onFailed();
    });

    return { map, library };
  } catch {
    onFailed();
    return null;
  }
}
