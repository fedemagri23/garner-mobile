import { t } from '@/i18n';
import { decimal } from '@/lib/format';

const VIOLATIONS = [
  'TOO_MANY_STORES',
  'TOO_FAR',
  'TOO_LONG',
  'EXTRA_STORE_NOT_WORTH_IT',
  'EXCLUDED_SUPERMARKET',
] as const;

/** Why a cheaper plan was not offered, in the shopper's terms. */
export const violationText = (code: string): string =>
  (VIOLATIONS as readonly string[]).includes(code)
    ? t(`plan.violations.${code as (typeof VIOLATIONS)[number]}`)
    : code;

/** "Coto y Día", "Coto, Día y Carrefour". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${t('plan.and')} ${names[names.length - 1]}`;
}

/** "+1,2 km" — the extra distance against shopping at one convenient store. */
export const extraKm = (km: number) => (km < 0.05 ? t('plan.none') : `+${decimal(km)} km`);

export const extraMinutes = (minutes: number) =>
  minutes < 1 ? t('plan.none') : `+${Math.round(minutes)} min`;
