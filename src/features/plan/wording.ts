/** Why a cheaper plan was not offered, in the shopper's terms. */
export const VIOLATION: Record<string, string> = {
  TOO_MANY_STORES: 'tiene más paradas de las que elegiste',
  TOO_FAR: 'te hace caminar o manejar más de lo que elegiste',
  TOO_LONG: 'lleva más tiempo del que elegiste',
  EXTRA_STORE_NOT_WORTH_IT: 'una parada más ahorra menos de lo que vale la pena',
  EXCLUDED_SUPERMARKET: 'pasa por un súper que excluiste',
};

/** "Coto y Día", "Coto, Día y Carrefour". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** "+1,2 km" — the extra distance against shopping at one convenient store. */
export const extraKm = (km: number) =>
  km < 0.05 ? 'nada' : `+${(Math.round(km * 10) / 10).toString().replace('.', ',')} km`;

export const extraMinutes = (minutes: number) => (minutes < 1 ? 'nada' : `+${Math.round(minutes)} min`);
