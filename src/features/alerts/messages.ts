import type { components } from '@/api/types';
import { formatPrice } from '@/lib/format';

export type Notification = components['schemas']['NotificationResponse'];
export type Alert = components['schemas']['PriceAlertResponse'];

/**
 * The message a shopper reads, written here from the facts the server keeps:
 * why the alert fired, the price and the one before it, the product and the
 * store. The server's own `title` and `body` are English with a bare number —
 * fine for an email, not for an app in Spanish with pesos and euros — so they
 * are only the fallback, for a message that carries no facts (a reminder, or
 * one from before they were kept).
 */
export function composeMessage(n: Notification): { title: string; body: string } {
  if (!n.reason || n.priceCents === null || n.currency === null || !n.productName) {
    return { title: n.title, body: n.body };
  }

  const price = formatPrice(n.priceCents, n.currency);
  const where = n.storeName ?? 'un súper cerca tuyo';
  const was =
    n.previousPriceCents !== null && n.previousPriceCents > n.priceCents
      ? { cents: n.previousPriceCents, percent: dropPercent(n.previousPriceCents, n.priceCents) }
      : null;

  switch (n.reason) {
    case 'BELOW_THRESHOLD':
      return {
        title: `${n.productName} bajó a ${price}`,
        body: `En ${where}, por debajo del precio que pediste.`,
      };
    case 'PRICE_DROP':
      return {
        title: was && was.percent >= 1 ? `${n.productName}: −${was.percent}%` : `${n.productName} bajó de precio`,
        body: was
          ? `${where} lo tiene a ${price}, antes ${formatPrice(was.cents, n.currency)}.`
          : `${where} lo tiene a ${price}.`,
      };
    case 'CHEAPER_NEARBY':
      return {
        title: `${n.productName} más barato cerca`,
        body: `${where} es ahora el más barato cerca tuyo, a ${price}.`,
      };
  }
}

/** Whole percent below the previous price. */
const dropPercent = (before: number, now: number) => Math.floor(((before - now) / before) * 100);

/** What an alert watches, in one line. */
export function describeAlert(a: Alert): string {
  const where = a.storeName ?? (a.radiusKm ? `cerca tuyo (${a.radiusKm} km)` : 'en cualquier súper');
  const money = a.currency ?? 'ARS';

  switch (a.type) {
    case 'BELOW_THRESHOLD':
      return `Cuando baje de ${formatPrice(a.thresholdCents ?? 0, money)} · ${where}`;
    case 'PRICE_DROP':
      return `Cuando baje ${a.dropPercent ?? 0}% o más · ${where}`;
    case 'CHEAPER_NEARBY':
      return `Cuando un súper cerca tuyo sea el más barato (${a.radiusKm ?? 0} km)`;
  }
}

export type Section = 'Hoy' | 'Esta semana' | 'Antes';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;

/** Messages in the sections the inbox shows, each newest first, empty sections left out. */
export function groupByDay(messages: Notification[], now: Date = new Date()): { section: Section; items: Notification[] }[] {
  const sections: Record<Section, Notification[]> = { Hoy: [], 'Esta semana': [], Antes: [] };

  for (const message of messages) {
    const days = Math.round((startOfDay(now) - startOfDay(new Date(message.createdAt))) / DAY);
    sections[days <= 0 ? 'Hoy' : days < 7 ? 'Esta semana' : 'Antes'].push(message);
  }

  return (['Hoy', 'Esta semana', 'Antes'] as const)
    .filter((section) => sections[section].length > 0)
    .map((section) => ({ section, items: sections[section] }));
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "hace 5 min", "hace 2 h", "ayer", "martes", "12 oct". */
export function whenText(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);

  if (days <= 0) {
    if (minutes < 1) return 'ahora';
    if (minutes < 60) return `hace ${minutes} min`;
    return `hace ${Math.floor(minutes / 60)} h`;
  }
  if (days === 1) return 'ayer';
  if (days < 7) return WEEKDAYS[date.getDay()];
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/**
 * Quiet hours are kept in UTC by the server and chosen in local time by the
 * shopper. Converts with the phone's offset as it is now — see MCON on
 * daylight saving.
 */
export const localToUtcHour = (hour: number, offsetMinutes = new Date().getTimezoneOffset()) =>
  (((hour + Math.round(offsetMinutes / 60)) % 24) + 24) % 24;

export const utcToLocalHour = (hour: number, offsetMinutes = new Date().getTimezoneOffset()) =>
  (((hour - Math.round(offsetMinutes / 60)) % 24) + 24) % 24;
