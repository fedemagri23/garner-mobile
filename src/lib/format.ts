import type { components } from '@/api/types';
import { currentLanguage, t } from '@/i18n';
import type { Language } from '@/i18n/languages';

type ConfidenceLevel = components['schemas']['StorePriceResponse']['confidence'];

/**
 * How numbers are written in each language: the thousands and decimal marks,
 * and where a currency symbol goes. Written out rather than left to `Intl`,
 * because the device engines disagree on the details (a space or none after
 * `$`, whether pesos show ",00") and prices must read the same everywhere.
 */
const STYLES: Record<
  Language,
  { group: string; decimal: string; symbolAfter: boolean; space: string; symbols: Record<string, string> }
> = {
  es: { group: '.', decimal: ',', symbolAfter: false, space: ' ', symbols: { ARS: '$', EUR: '€', USD: 'US$' } },
  en: { group: ',', decimal: '.', symbolAfter: false, space: '', symbols: { ARS: 'AR$', EUR: '€', USD: 'US$' } },
  de: { group: '.', decimal: ',', symbolAfter: true, space: '\u00a0', symbols: { ARS: 'ARS', EUR: '€', USD: 'US$' } },
};

const KNOWN: Record<string, { alwaysCents: boolean }> = {
  // Pesos hide centavos when there are none ("$ 1.390"), since prices in
  // Argentina rarely have them; euros and dollars always show cents.
  ARS: { alwaysCents: false },
  EUR: { alwaysCents: true },
  USD: { alwaysCents: true },
};

const grouped = (whole: number, mark: string) => String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, mark);

/**
 * A price the way a shopper reading this language writes it ("$ 1.390",
 * "€1.15", "1,15 €"). Money arrives in minor units (the backend's client
 * guide) and is formatted without floating-point arithmetic. A currency not
 * known here shows its ISO code instead of a symbol.
 */
export function formatPrice(cents: number, currency = 'ARS'): string {
  const style = STYLES[currentLanguage()];
  const { alwaysCents } = KNOWN[currency] ?? { alwaysCents: true };
  const symbol = style.symbols[currency];
  const absolute = Math.abs(Math.round(cents));
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  const number =
    grouped(whole, style.group) +
    (alwaysCents || fraction !== 0 ? `${style.decimal}${String(fraction).padStart(2, '0')}` : '');
  const sign = cents < 0 ? '\u2212' : '';

  if (symbol === undefined) {
    return `${sign}${currency} ${number}`;
  }
  return style.symbolAfter
    ? `${sign}${number}${style.space}${symbol}`
    : `${sign}${symbol}${style.space}${number}`;
}

/** A number with this language's decimal mark, one decimal at most: 1.2 → "1,2". */
export const decimal = (value: number) =>
  (Math.round(value * 10) / 10).toString().replace('.', STYLES[currentLanguage()].decimal);

/** "600 m" under a kilometre, "1,4 km" above it. */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  }

  return `${decimal(km)} km`;
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
export const confidenceLabel = (level: ConfidenceLevel): string => t(`common.confidence.${level}`);

/** Fresh prices read as good news, stale ones as a warning. */
export const confidenceTone: Record<ConfidenceLevel, 'accent' | 'muted' | 'signal'> = {
  VERY_RECENT: 'accent',
  RECENTLY_VERIFIED: 'accent',
  LIKELY_CURRENT: 'muted',
  POSSIBLY_OUTDATED: 'signal',
};

/** "hoy", "ayer", or "12 oct", on the phone's calendar. */
export function formatDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);

  if (days === 0) return t('common.time.today');
  if (days === 1) return t('common.time.yesterday');
  return shortDate(date);
}

/** "12 oct" / "12 Oct" / "12. Okt.": the day and month, as this language writes them. */
export function shortDate(date: Date): string {
  return dayAndMonth(date.getDate(), date.getMonth());
}

/** The names are the catalog's, not `Intl`'s: devices disagree on abbreviations ("sep" or "sept"). */
const dayAndMonth = (day: number, monthIndex: number) =>
  t('common.time.date.short', { day, month: t('common.time.date.months').split(',')[monthIndex] });

/** "domingo" … "sábado", for a date within the last week. */
export const weekdayName = (date: Date) => t('common.time.date.weekdays').split(',')[date.getDay()];

/** "19 sep" for a UTC calendar day such as "2026-09-19" (the price history's days). */
export function shortDay(day: string): string {
  const [, month, date] = day.split('-').map(Number);
  return dayAndMonth(date, month - 1);
}

/** "1 producto", "3 productos". */
export const productCount = (n: number) => t('common.products', { count: n });
