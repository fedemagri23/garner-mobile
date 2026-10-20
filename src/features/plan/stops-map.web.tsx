import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, fonts } from '@/theme/tokens';

import { mapLabel, type MapPoint, type MapStop } from './map-types';

/**
 * The web build has no map library (react-native-maps is native only), so it
 * draws the trip schematically: positions to scale, no streets. The phone
 * shows the real map.
 */
export function StopsMap({ origin, stops }: { origin: MapPoint; stops: MapStop[] }) {
  const points = [origin, ...stops];
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  // Keep the aspect true: a degree of longitude shrinks away from the equator.
  const lonScale = Math.cos((origin.latitude * Math.PI) / 180);
  const span = Math.max((maxLat - minLat) || 0.01, ((maxLon - minLon) || 0.01) * lonScale);

  const place = (p: MapPoint) => ({
    // Inset so pins never touch an edge or the title above.
    left: `${22 + (((p.longitude - minLon) * lonScale) / span) * 56}%` as const,
    top: `${38 + ((maxLat - p.latitude) / span) * 34}%` as const,
  });

  return (
    <View style={styles.canvas} accessible accessibilityRole="image" accessibilityLabel={mapLabel(stops)}>
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
    </View>
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
