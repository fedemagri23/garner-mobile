/**
 * Reads a price as a shopper types it, into minor units, without
 * floating-point arithmetic: "1.150" → 115000, "1150" → 115000,
 * "1,15" → 115, "2.380,50" → 238050. Null when it is not a price.
 *
 * A comma is the decimal mark, as in Spanish. A dot is a thousands separator
 * when three digits follow it ("1.150"), and a decimal point otherwise
 * ("1.15"), since phones often only offer a dot on the number pad.
 */
export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[\s$€]/g, '');
  if (!/^\d[\d.,]*$/.test(cleaned)) {
    return null;
  }

  let whole: string;
  let fraction = '';

  if (cleaned.includes(',')) {
    const [left, right, ...rest] = cleaned.split(',');
    if (rest.length > 0) return null;
    whole = left.replace(/\./g, '');
    fraction = right;
  } else {
    const parts = cleaned.split('.');
    const last = parts[parts.length - 1];
    if (parts.length > 1 && last.length !== 3) {
      fraction = parts.pop()!;
    }
    whole = parts.join('');
  }

  if (!/^\d+$/.test(whole) || !/^\d{0,2}$/.test(fraction)) {
    return null;
  }

  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0') || '0');
  return cents > 0 ? cents : null;
}

/** The other way round, for an editable field: 115000 → "1.150", 115 → "1,15". */
export function priceInput(cents: number): string {
  const whole = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = cents % 100;
  return fraction ? `${whole},${String(fraction).padStart(2, '0')}` : whole;
}
