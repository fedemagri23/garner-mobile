import { t } from '@/i18n';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface MapStop extends MapPoint {
  order: number;
  name: string;
  /** The chain, for the pin: "1 · Día". */
  shortName: string;
}

/** What a screen reader hears instead of the map. */
export function mapLabel(stops: MapStop[]): string {
  if (stops.length === 0) {
    return t('plan.map.you');
  }
  return t('plan.map.withStops', {
    count: stops.length,
    stops: stops.map((stop) => `${stop.order}, ${stop.name}`).join('; '),
  });
}
