import type { components } from '@/api/types';

type ConfidenceLevel = components['schemas']['StorePriceResponse']['confidence'];

const thousands = (whole: number) => String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * A price as shoppers in Argentina write it: "$ 1.390", or "$ 1.390,50" when
 * there are centavos. Money arrives in minor units (the backend's client
 * guide) and is formatted here without floating-point arithmetic on it.
 */
export function formatPrice(cents: number): string {
  const sign = cents < 0 ? '−' : '';
  const absolute = Math.abs(Math.round(cents));
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;

  return `${sign}$ ${thousands(whole)}${fraction ? `,${String(fraction).padStart(2, '0')}` : ''}`;
}

/** "600 m" under a kilometre, "1,4 km" above it. */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  }

  return `${(Math.round(km * 10) / 10).toString().replace('.', ',')} km`;
}

/** Two letters for a product without a photo: "Leche Entera 1L" → "LE". */
export function initials(name: string): string {
  const [first = '?', second] = name.match(/\p{L}+/gu) ?? [];

  return (second ? first[0] + second[0] : first.slice(0, 2)).toUpperCase();
}

/**
 * How far a price can be relied on, in the product's words. The levels are
 * the backend's (price-confidence.ts): within a day, within a week, within a
 * month, older.
 */
export const confidenceLabel: Record<ConfidenceLevel, string> = {
  VERY_RECENT: 'Visto en las últimas 24 h',
  RECENTLY_VERIFIED: 'Verificado esta semana',
  LIKELY_CURRENT: 'Probablemente vigente',
  POSSIBLY_OUTDATED: 'Puede estar desactualizado',
};

/** Fresh prices read as good news, stale ones as a warning. */
export const confidenceTone: Record<ConfidenceLevel, 'accent' | 'muted' | 'signal'> = {
  VERY_RECENT: 'accent',
  RECENTLY_VERIFIED: 'accent',
  LIKELY_CURRENT: 'muted',
  POSSIBLY_OUTDATED: 'signal',
};
