import type { components } from '@/api/types';
import { currentLanguage } from '@/i18n';

type Lookup = components['schemas']['BarcodeLookupResponse'];
type Unit = components['schemas']['CreateProductRequest']['unit'];
export type Label = components['schemas']['ProductResponse']['labels'][number];

/** The fields of "Agregar producto" a barcode lookup can fill in. */
export interface PrefillFields {
  name: string;
  brandText: string;
  sizeText: string;
  unit: Unit;
  categoryId: string | null;
  labels: Label[];
}

/** Fields the shopper has changed by hand: a lookup never overwrites those. */
export type Edited = Partial<Record<keyof PrefillFields, boolean>>;

/** "1.5" as this language writes it, so the field reads naturally ("1,5"). */
const sizeText = (size: number) => (currentLanguage() === 'en' ? String(size) : String(size).replace('.', ','));

/**
 * What a lookup found, as changes to the form: only what it knows, and
 * never a field the shopper already edited — an answer that arrives late
 * must not undo their typing.
 */
export function prefillFrom(lookup: Lookup, edited: Edited): Partial<PrefillFields> {
  if (lookup.match !== 'OPEN_FOOD_FACTS') return {};
  const changes: Partial<PrefillFields> = {};

  if (lookup.name && !edited.name) changes.name = lookup.name;
  if (lookup.brandName && !edited.brandText) changes.brandText = lookup.brandName;
  if (lookup.packageSize !== null && !edited.sizeText) changes.sizeText = sizeText(lookup.packageSize);
  if (lookup.unit && !edited.unit) changes.unit = lookup.unit;
  if (lookup.categoryId && !edited.categoryId) changes.categoryId = lookup.categoryId;
  if (lookup.labels.length > 0 && !edited.labels) changes.labels = lookup.labels;
  return changes;
}

/** Codes a shelf carries (EAN-8, UPC-A, EAN-13, GTIN-14): worth looking up. */
export const lookupWorthy = (code: string) => /^(\d{8}|\d{12,14})$/.test(code);
