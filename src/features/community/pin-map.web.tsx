import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import type { MapPoint } from '@/features/plan/map-types';
import { lngLat, openMap, type MapLibreMap, type Marker } from '@/features/plan/web-map';
import { t } from '@/i18n';
import { mapHeightFor, useLayout } from '@/lib/use-layout';
import { colors, radii } from '@/theme/tokens';

/** Where a new shop is: a pin that moves to wherever the map is clicked or dragged. */
export function PinMap({ point, onChange }: { point: MapPoint; onChange: (point: MapPoint) => void }) {
  const { height } = useLayout();
  const [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const start = useRef(point);
  const report = useRef(onChange);

  useEffect(() => {
    report.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let closed = false;
    openMap(container.current!, start.current, 16, () => setFailed(true)).then((ready) => {
      if (!ready) return;
      if (closed) {
        ready.map.remove();
        return;
      }
      map.current = ready.map;
      const move = (next: MapPoint) => report.current(next);
      pin.current = new ready.library.Marker({ draggable: true, color: colors.accent })
        .setLngLat(lngLat(start.current))
        .addTo(ready.map);
      pin.current.on('dragend', () => {
        const { lat, lng } = pin.current!.getLngLat();
        move({ latitude: lat, longitude: lng });
      });
      ready.map.on('click', ({ lngLat: where }) => move({ latitude: where.lat, longitude: where.lng }));
    });
    return () => {
      closed = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    pin.current?.setLngLat(lngLat(point));
  }, [point]);

  if (failed) {
    return (
      <Text variant="caption" tone="muted">
        {t('community.addStore.whereWeb', { latitude: point.latitude.toFixed(5), longitude: point.longitude.toFixed(5) })}
      </Text>
    );
  }

  return (
    <View
      style={[styles.frame, { height: mapHeightFor(height) }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('community.addStore.pin')}>
      <div ref={container} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radii.lg, overflow: 'hidden' },
});
