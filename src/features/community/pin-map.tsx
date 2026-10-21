import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { t } from '@/i18n';
import type { MapPoint } from '@/features/plan/map-types';
import { radii } from '@/theme/tokens';

/** Where a new shop is: a pin that moves to wherever the map is tapped or dragged. */
export function PinMap({ point, onChange }: { point: MapPoint; onChange: (point: MapPoint) => void }) {
  return (
    <View style={styles.frame}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...point, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
        onPress={(event) => onChange(event.nativeEvent.coordinate)}
        toolbarEnabled={false}
        pitchEnabled={false}
        showsUserLocation>
        <Marker
          coordinate={point}
          draggable
          onDragEnd={(event) => onChange(event.nativeEvent.coordinate)}
          title={t('community.addStore.pin')}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 220, borderRadius: radii.lg, overflow: 'hidden' },
});
