import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, fonts } from '@/theme/tokens';

import { mapLabel, type MapPoint, type MapStop } from './map-types';
import { lngLat, openMap, type Marker } from './web-map';

const ROUTE_SOURCE = 'route';

/** The trip on a real map; the drawing below if the map cannot open. */
export function StopsMap({ origin, stops }: { origin: MapPoint; stops: MapStop[] }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.canvas} accessible accessibilityRole="image" accessibilityLabel={mapLabel(stops)}>
      {failed ? (
        <Schematic origin={origin} stops={stops} />
      ) : (
        <RealMap origin={origin} stops={stops} onFailed={() => setFailed(true)} />
      )}
    </View>
  );
}

type OpenedMap = NonNullable<Awaited<ReturnType<typeof openMap>>>;

/** Puts the trip on the map: pins, the route between them, and a frame around it all. */
function drawTrip({ map, library }: OpenedMap, markers: Marker[], origin: MapPoint, stops: MapStop[]): Marker[] {
  for (const marker of markers) marker.remove();

  const line = {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: [origin, ...stops, origin].map((p) => [p.longitude, p.latitude]),
    },
  };
  const source = map.getSource(ROUTE_SOURCE) as { setData(data: typeof line): void } | undefined;
  if (source) {
    source.setData(line);
  } else {
    map.addSource(ROUTE_SOURCE, { type: 'geojson', data: line });
    map.addLayer({
      id: ROUTE_SOURCE,
      type: 'line',
      source: ROUTE_SOURCE,
      paint: { 'line-color': colors.accent, 'line-width': 3, 'line-opacity': 0.7 },
    });
  }

  const bounds = new library.LngLatBounds();
  for (const point of [origin, ...stops]) bounds.extend(lngLat(point));
  // Clear of the title above and the controls; never closer than a street.
  map.fitBounds(bounds, { padding: { top: 80, bottom: 30, left: 60, right: 60 }, maxZoom: 15, duration: 0 });

  return [
    new library.Marker({ element: youDot() }).setLngLat(lngLat(origin)).addTo(map),
    ...stops.map((stop) =>
      new library.Marker({ element: stopPin(`${stop.order} · ${stop.shortName}`) }).setLngLat(lngLat(stop)).addTo(map),
    ),
  ];
}

function RealMap({ origin, stops, onFailed }: { origin: MapPoint; stops: MapStop[]; onFailed: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<OpenedMap | null>(null);
  const failed = useRef(onFailed);

  useEffect(() => {
    failed.current = onFailed;
  }, [onFailed]);

  // Opens once, where the shopper is; the trip is drawn when it has loaded.
  const start = useRef(origin);
  useEffect(() => {
    let closed = false;
    let opened: OpenedMap | null = null;
    openMap(container.current!, start.current, 14, () => failed.current()).then((map) => {
      if (closed) {
        map?.map.remove();
        return;
      }
      opened = map;
      map?.map.once('load', () => setReady(map));
    });
    return () => {
      closed = true;
      opened?.map.remove();
    };
  }, []);

  const markers = useRef<Marker[]>([]);
  useEffect(() => {
    if (ready) {
      markers.current = drawTrip(ready, markers.current, origin, stops);
    }
  }, [ready, origin, stops]);

  // The sheet below rises over the map's last 20 px: the credit stays above it.
  return <div ref={container} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 20 }} />;
}

function youDot(): HTMLElement {
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    width: '22px',
    height: '22px',
    borderRadius: '11px',
    backgroundColor: colors.you,
    border: `4px solid ${colors.surface}`,
    boxSizing: 'border-box',
  });
  return dot;
}

function stopPin(label: string): HTMLElement {
  const pin = document.createElement('div');
  pin.textContent = label;
  Object.assign(pin.style, {
    padding: '6px 10px',
    borderRadius: '15px',
    backgroundColor: colors.accent,
    color: colors.onAccent,
    fontFamily: fonts.bodyBold,
    fontSize: '13px',
    whiteSpace: 'nowrap',
  });
  return pin;
}

/** Positions to scale, no streets. */
function Schematic({ origin, stops }: { origin: MapPoint; stops: MapStop[] }) {
  const points = [origin, ...stops];
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  // Keep the aspect true: a degree of longitude shrinks away from the equator.
  const lonScale = Math.cos((origin.latitude * Math.PI) / 180);
  const span = Math.max(maxLat - minLat || 0.01, (maxLon - minLon || 0.01) * lonScale);

  const place = (p: MapPoint) => ({
    // Inset so pins never touch an edge or the title above.
    left: `${22 + (((p.longitude - minLon) * lonScale) / span) * 56}%` as const,
    top: `${38 + ((maxLat - p.latitude) / span) * 34}%` as const,
  });

  return (
    <>
      <View style={[styles.marker, place(origin)]}>
        <View style={styles.you} />
      </View>
      {stops.map((stop) => (
        <View key={stop.order} style={[styles.marker, place(stop)]}>
          <View style={styles.pin}>
            <Text style={styles.pinText} tone="onAccent" numberOfLines={1}>
              {stop.order} · {stop.shortName}
            </Text>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  canvas: { ...StyleSheet.absoluteFill, backgroundColor: '#E4E9E1' },
  marker: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  you: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.you,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  pin: { height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: colors.accent, justifyContent: 'center' },
  pinText: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
