import { Text } from '@/components/text';
import type { MapPoint } from '@/features/plan/map-types';
import { t } from '@/i18n';

/**
 * The web build has no map library (react-native-maps is native only): the
 * shop goes where the shopper is now, said in numbers. The phone shows a map.
 */
export function PinMap({ point }: { point: MapPoint; onChange: (point: MapPoint) => void }) {
  return (
    <Text variant="caption" tone="muted">
      {t('community.addStore.whereWeb', { latitude: point.latitude.toFixed(5), longitude: point.longitude.toFixed(5) })}
    </Text>
  );
}
