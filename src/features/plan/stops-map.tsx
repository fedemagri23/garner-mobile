import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { Text } from '@/components/text';
import { t } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

import { mapLabel, type MapPoint, type MapStop } from './map-types';

/**
 * The trip on a real map: where the shopper starts, and each stop numbered
 * in route order, joined in that order and back home.
 */
export function StopsMap({ origin, stops }: { origin: MapPoint; stops: MapStop[] }) {
  const map = useRef<MapView>(null);
  const route = [origin, ...stops, origin];

  // Frame the whole trip whenever the stops change (another alternative).
  useEffect(() => {
    map.current?.fitToCoordinates(route, {
      edgePadding: { top: 80, right: 50, bottom: 60, left: 50 },
      animated: true,
    });
  }, [stops]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      accessibilityLabel={mapLabel(stops)}
      initialRegion={{ ...origin, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
      onMapReady={() =>
        map.current?.fitToCoordinates(route, {
          edgePadding: { top: 80, right: 50, bottom: 60, left: 50 },
          animated: false,
        })
      }
      toolbarEnabled={false}
      pitchEnabled={false}>
      <Polyline coordinates={route} strokeColor={colors.accent} strokeWidth={3} />
      <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }} title={t('plan.map.youMarker')}>
        <View style={styles.you} />
      </Marker>
      {stops.map((stop) => (
        <Marker
          key={`${stop.order}-${stop.latitude}`}
          coordinate={stop}
          title={stop.name}
          anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pin}>
            <Text style={styles.pinText} tone="onAccent">
              {stop.order} · {stop.shortName}
            </Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
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
