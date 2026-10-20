import { parsePrice, priceInput } from '../parse-price';

describe('parsePrice', () => {
  it('reads pesos with or without thousands dots', () => {
    expect(parsePrice('1.150')).toBe(115000);
    expect(parsePrice('1150')).toBe(115000);
    expect(parsePrice('$ 12.940')).toBe(1294000);
  });

  it('reads cents after a comma, or after a dot that is not thousands', () => {
    expect(parsePrice('1,15')).toBe(115);
    expect(parsePrice('1.15')).toBe(115);
    expect(parsePrice('€ 2,5')).toBe(250);
    expect(parsePrice('2.380,50')).toBe(238050);
  });

  it('refuses what is not a price', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('1,2,3')).toBeNull();
    expect(parsePrice('1,234')).toBeNull();
    expect(parsePrice('0')).toBeNull();
  });
});

describe('priceInput', () => {
  it('writes cents back as a field would show them, and reads them back the same', () => {
    expect(priceInput(115000)).toBe('1.150');
    expect(priceInput(123456789)).toBe('1.234.567,89');
    for (const cents of [115000, 115, 250, 123456789, 99]) {
      expect(parsePrice(priceInput(cents))).toBe(cents);
    }
    expect(priceInput(115)).toBe('1,15');
    expect(priceInput(250)).toBe('2,50');
  });
});
