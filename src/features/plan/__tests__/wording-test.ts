import { extraKm, extraMinutes, joinNames } from '../wording';

describe('plan wording', () => {
  it('joins store names the Spanish way', () => {
    expect(joinNames(['Coto'])).toBe('Coto');
    expect(joinNames(['Coto', 'Día'])).toBe('Coto y Día');
    expect(joinNames(['Coto', 'Día', 'Carrefour'])).toBe('Coto, Día y Carrefour');
  });

  it('writes extra distance and time, or says there is none', () => {
    expect(extraKm(1.24)).toBe('+1,2 km');
    expect(extraKm(0)).toBe('nada');
    expect(extraMinutes(14.4)).toBe('+14 min');
    expect(extraMinutes(0)).toBe('nada');
  });
});
