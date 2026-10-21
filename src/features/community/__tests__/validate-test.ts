import { cleanBarcode, nameProblem, parseSize } from '../validate';

describe('nameProblem', () => {
  it('accepts an ordinary name, accents and symbols included', () => {
    expect(nameProblem('Dulce de Leche "Tía Nené" 400g & más')).toBeNull();
  });

  it('asks for a few letters at least, ignoring spaces around', () => {
    expect(nameProblem('  a  ')).toBe('Escribí al menos 2 letras.');
  });

  it('caps the length', () => {
    expect(nameProblem('x'.repeat(81), { max: 80 })).toBe('Puede tener hasta 80 caracteres.');
  });

  it('refuses links and markup, as the server does', () => {
    for (const text of ['Oferta https://spam.test', 'www.spam.test', '<b>Leche</b>']) {
      expect(nameProblem(text)).toBe('Sin enlaces ni símbolos < >.');
    }
  });
});

describe('parseSize', () => {
  it('reads a whole number and both decimal marks', () => {
    expect(parseSize('500')).toBe(500);
    expect(parseSize('1,5')).toBe(1.5);
    expect(parseSize(' 2.25 ')).toBe(2.25);
  });

  it('refuses nothing, zero, words and too many decimals', () => {
    for (const text of ['', '0', 'medio', '1.2345', '-3']) {
      expect(parseSize(text)).toBeNull();
    }
  });
});

it('cleans a typed barcode', () => {
  expect(cleanBarcode('779 0070-410122')).toBe('7790070410122');
});
