import { switchLanguage } from '@/i18n';

import { formatDay, formatDistance, formatPrice, productCount, shortDay } from '../format';

afterAll(() => switchLanguage('es'));

describe('formatPrice by language', () => {
  it('writes pesos and euros the way each language does', async () => {
    await switchLanguage('es');
    expect([formatPrice(139000), formatPrice(115, 'EUR')]).toEqual(['$ 1.390', '€ 1,15']);

    await switchLanguage('en');
    expect([formatPrice(139000), formatPrice(115, 'EUR'), formatPrice(123456, 'EUR')]).toEqual([
      'AR$1,390',
      '€1.15',
      '€1,234.56',
    ]);

    await switchLanguage('de');
    expect([formatPrice(139000), formatPrice(115, 'EUR'), formatPrice(123456, 'EUR')]).toEqual([
      '1.390 ARS',
      '1,15 €',
      '1.234,56 €',
    ]);

    await switchLanguage('pt');
    expect([formatPrice(139000), formatPrice(115, 'EUR'), formatPrice(1990, 'BRL')]).toEqual([
      'AR$ 1.390',
      '€ 1,15',
      'R$ 19,90',
    ]);
  });

  it('marks a negative amount and shows an unknown currency by its code', async () => {
    await switchLanguage('en');
    expect(formatPrice(-6000, 'EUR')).toBe('−€60.00');
    expect(formatPrice(5000, 'BRL')).toBe('BRL 50.00');

    await switchLanguage('de');
    expect(formatPrice(5000, 'BRL')).toBe('BRL 50,00');
  });
});

describe('the rest of the formatting by language', () => {
  it('uses each language\'s decimal mark for distance', async () => {
    await switchLanguage('en');
    expect(formatDistance(1.42)).toBe('1.4 km');
    await switchLanguage('de');
    expect(formatDistance(1.42)).toBe('1,4 km');
  });

  it('says today, yesterday and counts in words', async () => {
    const now = new Date(2026, 9, 20, 15, 0);
    const earlier = (day: number) => new Date(2026, 9, day, 12).toISOString();

    await switchLanguage('en');
    expect([formatDay(earlier(20), now), formatDay(earlier(19), now), productCount(1), productCount(3)]).toEqual([
      'today',
      'yesterday',
      '1 product',
      '3 products',
    ]);

    await switchLanguage('de');
    expect([formatDay(earlier(20), now), formatDay(earlier(19), now), productCount(1), productCount(3)]).toEqual([
      'heute',
      'gestern',
      '1 Produkt',
      '3 Produkte',
    ]);
  });

  it('writes a history day in the language, on the UTC calendar day', async () => {
    await switchLanguage('de');
    expect(shortDay('2026-09-19')).toMatch(/^19\.?\s*Sep/);
    await switchLanguage('en');
    expect(shortDay('2026-09-19')).toMatch(/^19\s*Sep/);
  });
});
