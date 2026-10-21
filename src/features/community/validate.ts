import { t } from '@/i18n';

/** The same rule the server applies to names others will read: no markup, no links. */
const PLAIN_TEXT = /^(?![\s\S]*(<|>|:\/\/|\bwww\.))[\s\S]*$/i;

/**
 * What is wrong with a name typed into a form, in the shopper's language, or
 * null when it is fine. Mirrors the server's checks so the answer comes
 * before sending, not after.
 */
export function nameProblem(text: string, { min = 2, max = 200 }: { min?: number; max?: number } = {}): string | null {
  const trimmed = text.trim();
  if (trimmed.length < min) return t('community.validation.tooShort', { min });
  if (trimmed.length > max) return t('community.validation.tooLong', { max });
  if (!PLAIN_TEXT.test(trimmed)) return t('community.validation.plainText');
  return null;
}

/**
 * A package size as typed: "500", "1,5" or "1.5". Null when empty or not a
 * positive number with at most three decimals (what the server stores).
 */
export function parseSize(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value > 0 ? value : null;
}

/** Digits only: what a barcode is once the spaces and dashes people type are gone. */
export const cleanBarcode = (text: string) => text.replace(/[\s-]/g, '');
