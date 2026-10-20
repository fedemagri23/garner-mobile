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
    return 'Mapa: tu ubicación';
  }
  return `Mapa: tu ubicación y ${stops.length === 1 ? 'una parada' : `${stops.length} paradas`}: ${stops
    .map((stop) => `${stop.order}, ${stop.name}`)
    .join('; ')}`;
}
