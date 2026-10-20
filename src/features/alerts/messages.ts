import type { components } from '@/api/types';
import { t } from '@/i18n';
import { formatPrice, shortDate, weekdayName } from '@/lib/format';

export type Notification = components['schemas']['NotificationResponse'];
export type Alert = components['schemas']['PriceAlertResponse'];

/**
 * The message a shopper reads, written here from the facts the server keeps:
 * why the alert fired, the price and the one before it, the product and the
 * store. The server's own `title` and `body` are English with a bare number —
 * fine for an email, not for an app in three languages with pesos and euros — so they
 * are only the fallback, for a message that carries no facts (a reminder, or
 * one from before they were kept).
 */
export function composeMessage(n: Notification): { title: string; body: string } {
  if (!n.reason || n.priceCents === null || n.currency === null || !n.productName) {
    return { title: n.title, body: n.body };
  }

  const price = formatPrice(n.priceCents, n.currency);
  const product = n.productName;
  const where = n.storeName ?? t('alerts.message.anyStoreNearby');
  const was =
    n.previousPriceCents !== null && n.previousPriceCents > n.priceCents
      ? { cents: n.previousPriceCents, percent: dropPercent(n.previousPriceCents, n.priceCents) }
      : null;

  switch (n.reason) {
    case 'BELOW_THRESHOLD':
      return {
        title: t('alerts.message.belowThreshold.title', { product, price }),
        body: t('alerts.message.belowThreshold.body', { where }),
      };
    case 'PRICE_DROP':
      return {
        title:
          was && was.percent >= 1
            ? t('alerts.message.drop.titlePercent', { product, percent: was.percent })
            : t('alerts.message.drop.title', { product }),
        body: was
          ? t('alerts.message.drop.bodyWas', { where, price, was: formatPrice(was.cents, n.currency) })
          : t('alerts.message.drop.body', { where, price }),
      };
    case 'CHEAPER_NEARBY':
      return {
        title: t('alerts.message.cheaperNearby.title', { product }),
        body: t('alerts.message.cheaperNearby.body', { where, price }),
      };
  }
}

/** Whole percent below the previous price. */
const dropPercent = (before: number, now: number) => Math.floor(((before - now) / before) * 100);

/** What an alert watches, in one line. */
export function describeAlert(a: Alert): string {
  const where =
    a.storeName ??
    (a.radiusKm ? t('alerts.describe.nearby', { km: a.radiusKm }) : t('alerts.describe.anywhere'));
  const money = a.currency ?? 'ARS';

  switch (a.type) {
    case 'BELOW_THRESHOLD':
      return t('alerts.describe.below', { price: formatPrice(a.thresholdCents ?? 0, money), where });
    case 'PRICE_DROP':
      return t('alerts.describe.drop', { percent: a.dropPercent ?? 0, where });
    case 'CHEAPER_NEARBY':
      return t('alerts.describe.cheaperNearby', { km: a.radiusKm ?? 0 });
  }
}

/** The inbox's sections, as keys the screen writes in the current language. */
export type Section = 'today' | 'week' | 'earlier';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;

/** Messages in the sections the inbox shows, each newest first, empty sections left out. */
export function groupByDay(messages: Notification[], now: Date = new Date()): { section: Section; items: Notification[] }[] {
  const sections: Record<Section, Notification[]> = { today: [], week: [], earlier: [] };

  for (const message of messages) {
    const days = Math.round((startOfDay(now) - startOfDay(new Date(message.createdAt))) / DAY);
    sections[days <= 0 ? 'today' : days < 7 ? 'week' : 'earlier'].push(message);
  }

  return (['today', 'week', 'earlier'] as const)
    .filter((section) => sections[section].length > 0)
    .map((section) => ({ section, items: sections[section] }));
}

/** "hace 5 min", "hace 2 h", "ayer", "martes", "12 oct". */
export function whenText(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);

  if (days <= 0) {
    if (minutes < 1) return t('common.time.now');
    if (minutes < 60) return t('common.time.minutesAgo', { count: minutes });
    return t('common.time.hoursAgo', { count: Math.floor(minutes / 60) });
  }
  if (days === 1) return t('common.time.yesterday');
  if (days < 7) return weekdayName(date);
  return shortDate(date);
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
