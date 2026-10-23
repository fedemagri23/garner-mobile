import { switchLanguage } from '@/i18n';

import { lookupWorthy, prefillFrom } from '../prefill';

const found = {
  match: 'OPEN_FOOD_FACTS' as const,
  productId: null,
  name: 'Alfajor de chocolate',
  brandName: 'Havanna',
  packageSize: 1.5,
  unit: 'KILOGRAM' as const,
  categoryId: 'cat-1',
  imageUrl: 'https://images.test/front.jpg',
  sourceUrl: 'https://world.openfoodfacts.org/product/1',
};

afterEach(() => switchLanguage('es'));

describe('prefillFrom', () => {
  it('fills every field the lookup knows, the size written the shopper’s way', () => {
    expect(prefillFrom(found, {})).toEqual({
      name: 'Alfajor de chocolate',
      brandText: 'Havanna',
      sizeText: '1,5',
      unit: 'KILOGRAM',
      categoryId: 'cat-1',
    });
  });

  it('writes the size with a point in English', async () => {
    await switchLanguage('en');
    expect(prefillFrom(found, {}).sizeText).toBe('1.5');
  });

  it('never overwrites what the shopper typed', () => {
    expect(prefillFrom(found, { name: true, sizeText: true, categoryId: true })).toEqual({
      brandText: 'Havanna',
      unit: 'KILOGRAM',
    });
  });

  it('leaves out what the lookup does not know, and changes nothing for other answers', () => {
    expect(prefillFrom({ ...found, brandName: null, packageSize: null, unit: null, categoryId: null }, {})).toEqual({
      name: 'Alfajor de chocolate',
    });
    expect(prefillFrom({ ...found, match: 'CATALOG' }, {})).toEqual({});
    expect(prefillFrom({ ...found, match: 'NONE' }, {})).toEqual({});
  });
});

it('looks up only codes of a shelf barcode’s length', () => {
  expect(lookupWorthy('7790070410122')).toBe(true);
  expect(lookupWorthy('96385074')).toBe(true);
  expect(lookupWorthy('779007')).toBe(false);
  expect(lookupWorthy('77900704101x2')).toBe(false);
});
