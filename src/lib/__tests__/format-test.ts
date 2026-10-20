import { formatDistance, formatPrice, initials } from '../format';

describe('formatPrice', () => {
  it('writes pesos with dots for thousands', () => {
    expect(formatPrice(139000)).toBe('$ 1.390');
    expect(formatPrice(98000)).toBe('$ 980');
    expect(formatPrice(123456700)).toBe('$ 1.234.567');
  });

  it('shows centavos only when there are some', () => {
    expect(formatPrice(139050)).toBe('$ 1.390,50');
    expect(formatPrice(139005)).toBe('$ 1.390,05');
  });

  it('marks a negative amount', () => {
    expect(formatPrice(-6000)).toBe('−$ 60');
  });

  it('writes euros with their symbol and always with cents', () => {
    expect(formatPrice(115, 'EUR')).toBe('€ 1,15');
    expect(formatPrice(200, 'EUR')).toBe('€ 2,00');
    expect(formatPrice(123456, 'EUR')).toBe('€ 1.234,56');
  });

  it('falls back to the ISO code for a currency it does not know', () => {
    expect(formatPrice(5000, 'BRL')).toBe('BRL 50,00');
  });
});

describe('formatDistance', () => {
  it('uses metres under a kilometre, rounded to ten', () => {
    expect(formatDistance(0.604)).toBe('600 m');
    expect(formatDistance(0.001)).toBe('10 m');
  });

  it('uses kilometres with a decimal comma above it', () => {
    expect(formatDistance(1.42)).toBe('1,4 km');
    expect(formatDistance(3)).toBe('3 km');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Leche Entera La Serenísima 1L')).toBe('LE');
    expect(initials('Ñoquis de papa')).toBe('ÑD');
  });

  it('copes with a single word', () => {
    expect(initials('Yerba')).toBe('YE');
  });
});
